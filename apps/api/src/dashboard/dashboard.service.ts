import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, gte, inArray, lt, ne, SQL, sql } from 'drizzle-orm';
import { ActivityService } from '../activity/activity.service.js';
import { AuthUser } from '../common/auth.decorators.js';
import { Database, InjectDb } from '../database/database.module.js';
import { projects, tasks, TASK_PRIORITIES, TASK_STATUSES } from '../database/schema.js';
import { ProjectsService } from '../projects/projects.service.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly projects: ProjectsService,
    private readonly activity: ActivityService,
  ) {}

  async stats(user: AuthUser) {
    const visible = await this.projects.visibleProjectIds(user);
    const scope: SQL | undefined = visible ? inArray(tasks.projectId, visible.length ? visible : ['00000000-0000-0000-0000-000000000000']) : undefined;
    const projectScope = visible ? inArray(projects.id, visible.length ? visible : ['00000000-0000-0000-0000-000000000000']) : undefined;
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);

    const [[{ projectCount }], [{ taskCount }], [{ myOpenTasks }], [{ overdue }], [{ doneThisWeek }], byStatus, byPriority, myTasks, recent] =
      await Promise.all([
        this.db.select({ projectCount: count() }).from(projects).where(projectScope),
        this.db.select({ taskCount: count() }).from(tasks).where(scope),
        this.db.select({ myOpenTasks: count() }).from(tasks).where(and(scope, eq(tasks.assigneeId, user.id), ne(tasks.status, 'DONE'))),
        this.db.select({ overdue: count() }).from(tasks).where(and(scope, lt(tasks.dueDate, new Date()), ne(tasks.status, 'DONE'))),
        this.db.select({ doneThisWeek: count() }).from(tasks).where(and(scope, eq(tasks.status, 'DONE'), gte(tasks.updatedAt, weekAgo))),
        this.db.select({ k: tasks.status, n: count() }).from(tasks).where(scope).groupBy(tasks.status),
        this.db.select({ k: tasks.priority, n: count() }).from(tasks).where(scope).groupBy(tasks.priority),
        this.db.select({
          id: tasks.id, key: sql<string>`${projects.key} || '-' || ${tasks.number}`, title: tasks.title,
          status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate,
        }).from(tasks).innerJoin(projects, eq(projects.id, tasks.projectId))
          .where(and(eq(tasks.assigneeId, user.id), ne(tasks.status, 'DONE')))
          .orderBy(sql`${tasks.dueDate} asc nulls last`, asc(tasks.createdAt)).limit(5),
        this.activity.list(1, 10, user.role === 'ADMIN' || user.role === 'GUEST' ? undefined : user.id),
      ]);

    const toMap = (keys: readonly string[], rows: { k: string; n: number }[]) =>
      Object.fromEntries(keys.map((k) => [k, rows.find((r) => r.k === k)?.n ?? 0]));

    return {
      totals: { projects: projectCount, tasks: taskCount, myOpenTasks, overdue, doneThisWeek },
      tasksByStatus: toMap(TASK_STATUSES, byStatus),
      tasksByPriority: toMap(TASK_PRIORITIES, byPriority),
      myTasks,
      recentActivity: recent.data,
    };
  }
}
