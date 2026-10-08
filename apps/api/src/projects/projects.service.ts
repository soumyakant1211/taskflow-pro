import { ConflictException, ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, ne, or, SQL, sql } from 'drizzle-orm';
import { ActivityService } from '../activity/activity.service.js';
import { AuthUser } from '../common/auth.decorators.js';
import { compact, paginate } from '../common/pagination.dto.js';
import { Database, InjectDb } from '../database/database.module.js';
import { projectMembers, projects, tasks, users } from '../database/schema.js';
import { CreateProjectDto, ListProjectsQueryDto, UpdateProjectDto } from './projects.dto.js';

type Project = typeof projects.$inferSelect;

@Injectable()
export class ProjectsService {
  constructor(@InjectDb() private readonly db: Database, private readonly activity: ActivityService) {}

  /** Returns the project if the user may see it. 404 if missing, 403 if not a member. */
  async getAccessible(projectId: string, user: AuthUser): Promise<Project> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) throw new NotFoundException('Project not found');
    // Admins see everything; guests may *read* everything (all writes are blocked by ReadOnlyGuestGuard).
    if (user.role === 'ADMIN' || user.role === 'GUEST') return project;
    const [m] = await this.db.select().from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)));
    if (!m) throw new ForbiddenException('You are not a member of this project');
    return project;
  }

  canManage(project: Project, user: AuthUser) {
    return user.role === 'ADMIN' || project.ownerId === user.id;
  }

  private assertCanManage(project: Project, user: AuthUser) {
    if (!this.canManage(project, user)) throw new ForbiddenException('Only the project owner or an admin can do this');
  }

  /** Project ids the user can see (null = all, for admins). */
  async visibleProjectIds(user: AuthUser): Promise<string[] | null> {
    if (user.role === 'ADMIN' || user.role === 'GUEST') return null;
    const rows = await this.db.select({ id: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, user.id));
    return rows.map((r) => r.id);
  }

  async list(user: AuthUser, q: ListProjectsQueryDto) {
    const filters: SQL[] = [];
    const visible = await this.visibleProjectIds(user);
    if (visible) {
      if (!visible.length) return paginate([], 0, q.page, q.limit);
      filters.push(inArray(projects.id, visible));
    }
    if (q.status) filters.push(eq(projects.status, q.status));
    if (q.search) filters.push(or(ilike(projects.name, `%${q.search}%`), ilike(projects.key, `%${q.search}%`))!);
    const where = filters.length ? and(...filters) : undefined;

    const taskCount = sql<number>`(select count(*) from ${tasks} where ${tasks.projectId} = ${projects.id})`.mapWith(Number);
    const openTaskCount = sql<number>`(select count(*) from ${tasks} where ${tasks.projectId} = ${projects.id} and ${tasks.status} <> 'DONE')`.mapWith(Number);
    const memberCount = sql<number>`(select count(*) from ${projectMembers} where ${projectMembers.projectId} = ${projects.id})`.mapWith(Number);

    const [rows, [{ total }]] = await Promise.all([
      this.db.select({
        id: projects.id, key: projects.key, name: projects.name, description: projects.description,
        status: projects.status, createdAt: projects.createdAt, updatedAt: projects.updatedAt,
        owner: { id: users.id, name: users.name }, taskCount, openTaskCount, memberCount,
      })
        .from(projects).innerJoin(users, eq(users.id, projects.ownerId))
        .where(where).orderBy(desc(projects.createdAt)).limit(q.limit).offset((q.page - 1) * q.limit),
      this.db.select({ total: count() }).from(projects).where(where),
    ]);
    return paginate(rows, total, q.page, q.limit);
  }

  async create(user: AuthUser, dto: CreateProjectDto) {
    const [dup] = await this.db.select({ id: projects.id }).from(projects).where(eq(projects.key, dto.key));
    if (dup) throw new ConflictException(`Project key ${dto.key} is already in use`);
    const project = await this.db.transaction(async (tx) => {
      const [p] = await tx.insert(projects).values({ ...dto, ownerId: user.id }).returning();
      await tx.insert(projectMembers).values({ projectId: p.id, userId: user.id });
      return p;
    });
    await this.activity.log(user.id, 'PROJECT_CREATED', 'PROJECT', project.id, `${user.name} created project ${project.key} – ${project.name}`);
    return project;
  }

  async findOne(user: AuthUser, id: string) {
    const project = await this.getAccessible(id, user);
    const [owner] = await this.db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, project.ownerId));
    const members = await this.members(id);
    const statusCounts = await this.db.select({ status: tasks.status, count: count() }).from(tasks)
      .where(eq(tasks.projectId, id)).groupBy(tasks.status);
    const taskStats = { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 } as Record<string, number>;
    statusCounts.forEach((s) => (taskStats[s.status] = s.count));
    return { ...project, owner, members, taskStats, canManage: this.canManage(project, user) };
  }

  members(projectId: string) {
    return this.db.select({ id: users.id, name: users.name, email: users.email, role: users.role, joinedAt: projectMembers.joinedAt })
      .from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId)).orderBy(asc(users.name));
  }

  async update(user: AuthUser, id: string, dto: UpdateProjectDto) {
    const project = await this.getAccessible(id, user);
    this.assertCanManage(project, user);
    const changes = compact(dto);
    if (!Object.keys(changes).length) throw new BadRequestException('Nothing to update');
    const [p] = await this.db.update(projects).set(changes).where(eq(projects.id, id)).returning();
    await this.activity.log(user.id, 'PROJECT_UPDATED', 'PROJECT', id, `${user.name} updated project ${p.key}`);
    return p;
  }

  async remove(user: AuthUser, id: string) {
    const project = await this.getAccessible(id, user);
    this.assertCanManage(project, user);
    await this.db.delete(projects).where(eq(projects.id, id));
    await this.activity.log(user.id, 'PROJECT_DELETED', 'PROJECT', id, `${user.name} deleted project ${project.key}`);
  }

  async addMember(user: AuthUser, id: string, userId: string) {
    const project = await this.getAccessible(id, user);
    this.assertCanManage(project, user);
    const [target] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!target) throw new NotFoundException('User not found');
    if (!target.isActive) throw new BadRequestException('Cannot add a deactivated user');
    const [existing] = await this.db.select().from(projectMembers)
      .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)));
    if (existing) throw new ConflictException('User is already a member');
    await this.db.insert(projectMembers).values({ projectId: id, userId });
    await this.activity.log(user.id, 'MEMBER_ADDED', 'PROJECT', id, `${user.name} added ${target.name} to ${project.key}`);
    return this.members(id);
  }

  async removeMember(user: AuthUser, id: string, userId: string) {
    const project = await this.getAccessible(id, user);
    this.assertCanManage(project, user);
    if (userId === project.ownerId) throw new BadRequestException('The project owner cannot be removed');
    const deleted = await this.db.delete(projectMembers)
      .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId))).returning();
    if (!deleted.length) throw new NotFoundException('User is not a member of this project');
    // Unassign their open tasks in this project so nothing is assigned to a non-member.
    await this.db.update(tasks).set({ assigneeId: null })
      .where(and(eq(tasks.projectId, id), eq(tasks.assigneeId, userId), ne(tasks.status, 'DONE')));
    await this.activity.log(user.id, 'MEMBER_REMOVED', 'PROJECT', id, `${user.name} removed a member from ${project.key}`);
    return this.members(id);
  }

  async isMember(projectId: string, userId: string) {
    const [m] = await this.db.select().from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
    return !!m;
  }
}
