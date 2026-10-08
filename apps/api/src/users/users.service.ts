import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike, or, SQL } from 'drizzle-orm';
import { ActivityService } from '../activity/activity.service.js';
import { AuthUser } from '../common/auth.decorators.js';
import { paginate } from '../common/pagination.dto.js';
import { Database, InjectDb } from '../database/database.module.js';
import { Role, users } from '../database/schema.js';
import { ListUsersQueryDto } from './users.dto.js';

export function toPublicUser(u: typeof users.$inferSelect) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

const publicCols = {
  id: users.id, email: users.email, name: users.name, role: users.role,
  isActive: users.isActive, createdAt: users.createdAt, updatedAt: users.updatedAt,
};

@Injectable()
export class UsersService {
  constructor(@InjectDb() private readonly db: Database, private readonly activity: ActivityService) {}

  async list(q: ListUsersQueryDto) {
    const filters: SQL[] = [];
    if (q.role) filters.push(eq(users.role, q.role));
    if (q.search) filters.push(or(ilike(users.name, `%${q.search}%`), ilike(users.email, `%${q.search}%`))!);
    const where = filters.length ? and(...filters) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db.select(publicCols).from(users).where(where).orderBy(asc(users.name)).limit(q.limit).offset((q.page - 1) * q.limit),
      this.db.select({ total: count() }).from(users).where(where),
    ]);
    return paginate(rows, total, q.page, q.limit);
  }

  async findOne(id: string) {
    const [u] = await this.db.select(publicCols).from(users).where(eq(users.id, id));
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async updateRole(actor: AuthUser, id: string, role: Role) {
    if (actor.id === id) throw new BadRequestException('You cannot change your own role');
    const target = await this.findOne(id);
    const [u] = await this.db.update(users).set({ role }).where(eq(users.id, id)).returning(publicCols);
    await this.activity.log(actor.id, 'USER_ROLE_CHANGED', 'USER', id, `${actor.name} changed ${target.name}'s role from ${target.role} to ${role}`);
    return u;
  }

  async updateStatus(actor: AuthUser, id: string, isActive: boolean) {
    if (actor.id === id) throw new BadRequestException('You cannot deactivate yourself');
    const target = await this.findOne(id);
    const [u] = await this.db.update(users).set({ isActive }).where(eq(users.id, id)).returning(publicCols);
    await this.activity.log(actor.id, isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'USER', id,
      `${actor.name} ${isActive ? 'activated' : 'deactivated'} ${target.name}`);
    return u;
  }
}
