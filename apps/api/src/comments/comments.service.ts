import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { ActivityService } from '../activity/activity.service.js';
import { AuthUser } from '../common/auth.decorators.js';
import { Database, InjectDb } from '../database/database.module.js';
import { comments, projects, tasks, users } from '../database/schema.js';
import { ProjectsService } from '../projects/projects.service.js';

@Injectable()
export class CommentsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly projects: ProjectsService,
    private readonly activity: ActivityService,
  ) {}

  private async taskOrThrow(user: AuthUser, taskId: string) {
    const [t] = await this.db.select({ id: tasks.id, projectId: tasks.projectId, key: projects.key, number: tasks.number })
      .from(tasks).innerJoin(projects, eq(projects.id, tasks.projectId)).where(eq(tasks.id, taskId));
    if (!t) throw new NotFoundException('Task not found');
    await this.projects.getAccessible(t.projectId, user);
    return t;
  }

  async list(user: AuthUser, taskId: string) {
    await this.taskOrThrow(user, taskId);
    return this.db.select({
      id: comments.id, body: comments.body, createdAt: comments.createdAt,
      author: { id: users.id, name: users.name },
    }).from(comments).innerJoin(users, eq(users.id, comments.authorId))
      .where(eq(comments.taskId, taskId)).orderBy(asc(comments.createdAt));
  }

  async create(user: AuthUser, taskId: string, body: string) {
    const t = await this.taskOrThrow(user, taskId);
    const [c] = await this.db.insert(comments).values({ taskId, body, authorId: user.id }).returning();
    await this.activity.log(user.id, 'COMMENT_ADDED', 'TASK', taskId, `${user.name} commented on ${t.key}-${t.number}`);
    return { id: c.id, body: c.body, createdAt: c.createdAt, author: { id: user.id, name: user.name } };
  }

  async remove(user: AuthUser, id: string) {
    const [c] = await this.db.select().from(comments).where(eq(comments.id, id));
    if (!c) throw new NotFoundException('Comment not found');
    await this.taskOrThrow(user, c.taskId);
    if (c.authorId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.db.delete(comments).where(eq(comments.id, id));
  }
}
