import { BadRequestException, ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { ActivityService } from '../activity/activity.service.js';
import { Database, InjectDb } from '../database/database.module.js';
import { users } from '../database/schema.js';
import { GUEST_EMAIL } from '../database/seed-data.js';
import { toPublicUser } from '../users/users.service.js';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly activity: ActivityService,
  ) {}

  async register(dto: RegisterDto) {
    const [exists] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, dto.email));
    if (exists) throw new ConflictException('Email is already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const [user] = await this.db.insert(users).values({ name: dto.name, email: dto.email, passwordHash }).returning();
    await this.activity.log(user.id, 'USER_REGISTERED', 'USER', user.id, `${user.name} joined TaskFlow`);
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const [user] = await this.db.select().from(users).where(eq(users.email, dto.email));
    // Same message for unknown email and wrong password: don't leak which emails exist.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated. Contact your administrator.');
    return this.issueToken(user);
  }

  /** One-click read-only demo access. Disable with GUEST_LOGIN_ENABLED=false. */
  async guestLogin() {
    if (process.env.GUEST_LOGIN_ENABLED === 'false') throw new ForbiddenException('Guest access is disabled');
    const [guest] = await this.db.select().from(users).where(eq(users.email, GUEST_EMAIL));
    if (!guest || guest.role !== 'GUEST' || !guest.isActive) {
      throw new ServiceUnavailableException('Guest access is not available right now');
    }
    return this.issueToken(guest);
  }

  async me(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    return toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const [user] = await this.db.update(users).set({ name: dto.name }).where(eq(users.id, userId)).returning();
    return toPublicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }
    await this.db.update(users).set({ passwordHash: await bcrypt.hash(dto.newPassword, 10) }).where(eq(users.id, userId));
    return { message: 'Password updated successfully' };
  }

  private async issueToken(user: typeof users.$inferSelect) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { accessToken, tokenType: 'Bearer', user: toPublicUser(user) };
  }
}
