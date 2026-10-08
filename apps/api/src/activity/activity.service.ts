import { Injectable } from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';
import { paginate } from '../common/pagination.dto.js';
import { Database, InjectDb } from '../database/database.module.js';
import { activityLogs, users } from '../database/schema.js';

export type EntityType = 'USER' | 'PROJECT' | 'TASK' | 'COMMENT';

@Injectable()
export class ActivityService {
  constructor(@InjectDb() private readonly db: Database) {}

  async log(userId: string, action: string, entityType: EntityType, entityId: string, message: string) {
    await this.db.insert(activityLogs).values({ userId, action, entityType, entityId, message });
  }

  async list(page: number, limit: number, userId?: string) {
    const where = userId ? eq(activityLogs.userId, userId) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: activityLogs.id, action: activityLogs.action, entityType: activityLogs.entityType,
          entityId: activityLogs.entityId, message: activityLogs.message, createdAt: activityLogs.createdAt,
          user: { id: users.id, name: users.name },
        })
        .from(activityLogs)
        .innerJoin(users, eq(users.id, activityLogs.userId))
        .where(where)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(activityLogs).where(where),
    ]);
    return paginate(rows, total, page, limit);
  }
}
