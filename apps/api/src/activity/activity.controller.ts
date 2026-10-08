import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/auth.decorators.js';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { ActivityService } from './activity.service.js';

@ApiTags('Activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Audit log of all actions (admin only)' })
  list(@Query() q: PaginationQueryDto) {
    return this.activity.list(q.page, q.limit);
  }
}
