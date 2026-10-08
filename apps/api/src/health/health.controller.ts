import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { Public } from '../common/auth.decorators.js';
import { Database, InjectDb } from '../database/database.module.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDb() private readonly db: Database) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Liveness + database check (used by CI and uptime monitors)' })
  async check() {
    const started = Date.now();
    let database = 'up';
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      version: process.env.APP_VERSION ?? '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      responseTimeMs: Date.now() - started,
    };
  }
}
