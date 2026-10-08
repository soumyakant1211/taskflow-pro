import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { aliasedTable, and, asc, arrayContains, count, desc, eq, ilike, inArray, lt, ne, or, SQL, sql } from 'drizzle-orm';
import { ActivityService } from '../activity/activity.service.js';
import { AuthUser } from '../common/auth.decorators.js';
import { compact, paginate } from '../common/pagination.dto.js';
import { Database, InjectDb } from '../database/database.module.js';
import { projects, tasks, TaskPriority, TaskStatus, users } from '../database/schema.js';
import { ProjectsService } from '../projects/projects.service.js';
import { CreateTaskDto, ListTasksQueryDto, UpdateTaskDto } from './tasks.dto.js';

const assignee = aliasedTable(users, 'assignee');
const reporter = aliasedTable(users, 'reporter');

/** Business rule: work can't be reviewed or completed without an owner. */
interface RawTaskRow {
  id: string; number: number; key: string; title: string; description: string | null;
  status: TaskStatus; priority: TaskPriority; labels: string[]; dueDate: Date | null;
  createdAt: Date; updatedAt: Date;
  project: { id: string; key: string; name: string };
  assignee: { id: string | null; name: string | null; email: string | null } | null;
  reporter: { id: string; name: string };
}
export type TaskView = Omit<RawTaskRow, 'assignee'> & { assignee: { id: string; name: string; email: string } | null };

const NEEDS_ASSIGNEE: TaskStatus[] = ['IN_REVIEW', 'DONE'];

@Injectable()
export class TasksService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly projects: ProjectsService,
    private readonly activity: ActivityService,
  ) {}

  private baseSelect() {
    // explicit row type keeps inference fast and readable
    return this.db.select({
      id: tasks.id, number: tasks.number, key: sql<string>`${projects.key} || '-' || ${tasks.number}`,
      title: tasks.title, description: tasks.description, status: tasks.status, priority: tasks.priority,
      labels: tasks.labels, dueDate: tasks.dueDate, createdAt: tasks.createdAt, updatedAt: tasks.updatedAt,
      project: { id: projects.id, key: projects.key, name: projects.name },
      assignee: { id: assignee.id, name: assignee.name, email: assignee.email },
      reporter: { id: reporter.id, name: reporter.name },
    })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .leftJoin(assignee, eq(assignee.id, tasks.assigneeId))
      .innerJoin(reporter, eq(reporter.id, tasks.reporterId));
  }

  async list(user: AuthUser, q: ListTasksQueryDto) {
    const filters: SQL[] = [];
    if (q.projectId) {
      await this.projects.getAccessible(q.projectId, user);
      filters.push(eq(tasks.projectId, q.projectId));
    } else {
      const visible = await this.projects.visibleProjectIds(user);
      if (visible) {
        if (!visible.length) return paginate([], 0, q.page, q.limit);
        filters.push(inArray(tasks.projectId, visible));
      }
    }
    if (q.status) filters.push(eq(tasks.status, q.status));
    if (q.priority) filters.push(eq(tasks.priority, q.priority));
    if (q.assigneeId) filters.push(eq(tasks.assigneeId, q.assigneeId === 'me' ? user.id : q.assigneeId));
    if (q.label) filters.push(arrayContains(tasks.labels, [q.label.toLowerCase()]));
    if (q.overdue) filters.push(and(lt(tasks.dueDate, new Date()), ne(tasks.status, 'DONE'))!);
    if (q.search) {
      const s = `%${q.search}%`;
      filters.push(or(ilike(tasks.title, s), ilike(tasks.description, s), ilike(sql`${projects.key} || '-' || ${tasks.number}`, s))!);
    }
    const where = filters.length ? and(...filters) : undefined;
    const dir = q.sortOrder === 'asc' ? asc : desc;
    const sortCol = tasks[q.sortBy];
    const order = q.sortBy === 'dueDate' ? sql`${tasks.dueDate} ${sql.raw(q.sortOrder)} nulls last` : dir(sortCol);

    const [rows, [{ total }]] = await Promise.all([
      this.baseSelect().where(where).orderBy(order, desc(tasks.id)).limit(q.limit).offset((q.page - 1) * q.limit),
      this.db.select({ total: count() }).from(tasks).innerJoin(projects, eq(projects.id, tasks.projectId)).where(where),
    ]);
    return paginate(rows.map((r) => this.clean(r)), total, q.page, q.limit);
  }

  async findOne(user: AuthUser, id: string) {
    const rows: RawTaskRow[] = await this.baseSelect().where(eq(tasks.id, id));
    const row = rows[0];
    if (!row) throw new NotFoundException('Task not found');
    await this.projects.getAccessible(row.project.id, user);
    return this.clean(row);
  }

  async create(user: AuthUser, dto: CreateTaskDto) {
    const project = await this.projects.getAccessible(dto.projectId, user);
    if (project.status === 'ARCHIVED') throw new BadRequestException('Cannot add tasks to an archived project');
    if (dto.assigneeId) await this.assertAssignable(project.id, dto.assigneeId);
    const status = dto.status ?? 'TODO';
    if (NEEDS_ASSIGNEE.includes(status) && !dto.assigneeId) {
      throw new BadRequestException(`A task must have an assignee before it can move to ${status}`);
    }

    const created = await this.db.transaction(async (tx) => {
      const [{ taskCounter }] = await tx.update(projects)
        .set({ taskCounter: sql`${projects.taskCounter} + 1` })
        .where(eq(projects.id, project.id))
        .returning({ taskCounter: projects.taskCounter });
      const [t] = await tx.insert(tasks).values({
        projectId: project.id, number: taskCounter, title: dto.title, description: dto.description,
        status, priority: dto.priority ?? 'MEDIUM', assigneeId: dto.assigneeId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null, labels: dto.labels ?? [], reporterId: user.id,
      }).returning();
      return t;
    });
    await this.activity.log(user.id, 'TASK_CREATED', 'TASK', created.id, `${user.name} created ${project.key}-${created.number}: ${created.title}`);
    return this.findOne(user, created.id);
  }

  async update(user: AuthUser, id: string, body: UpdateTaskDto) {
    const dto = compact(body);
    const current = await this.findOne(user, id);
    if (!Object.keys(dto).length) throw new BadRequestException('Nothing to update');
    if (dto.assigneeId) await this.assertAssignable(current.project.id, dto.assigneeId);
    const nextStatus = dto.status ?? current.status;
    const nextAssignee = dto.assigneeId !== undefined ? dto.assigneeId : current.assignee?.id;
    if (NEEDS_ASSIGNEE.includes(nextStatus) && !nextAssignee) {
      throw new BadRequestException(`A task must have an assignee before it can move to ${nextStatus}`);
    }
    const { dueDate, ...rest } = dto;
    await this.db.update(tasks).set({
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    }).where(eq(tasks.id, id));
    const changed = Object.keys(dto).join(', ');
    await this.activity.log(user.id, 'TASK_UPDATED', 'TASK', id, `${user.name} updated ${current.key} (${changed})`);
    return this.findOne(user, id);
  }

  async updateStatus(user: AuthUser, id: string, status: TaskStatus) {
    const current = await this.findOne(user, id);
    if (current.status === status) return current;
    if (NEEDS_ASSIGNEE.includes(status) && !current.assignee) {
      throw new BadRequestException(`A task must have an assignee before it can move to ${status}`);
    }
    await this.db.update(tasks).set({ status }).where(eq(tasks.id, id));
    await this.activity.log(user.id, 'TASK_STATUS_CHANGED', 'TASK', id, `${user.name} moved ${current.key} from ${current.status} to ${status}`);
    return this.findOne(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const current = await this.findOne(user, id);
    const project = await this.projects.getAccessible(current.project.id, user);
    if (current.reporter.id !== user.id && !this.projects.canManage(project, user)) {
      throw new ForbiddenException('Only the reporter, project owner or an admin can delete this task');
    }
    await this.db.delete(tasks).where(eq(tasks.id, id));
    await this.activity.log(user.id, 'TASK_DELETED', 'TASK', id, `${user.name} deleted ${current.key}: ${current.title}`);
  }

  private async assertAssignable(projectId: string, userId: string) {
    if (!(await this.projects.isMember(projectId, userId))) {
      throw new BadRequestException('Assignee must be a member of the project');
    }
  }

  /** leftJoin returns { id: null, ... } for no assignee – turn that into null. */
  private clean(row: RawTaskRow): TaskView {
    return { ...row, assignee: row.assignee?.id ? (row.assignee as TaskView['assignee']) : null };
  }
}
