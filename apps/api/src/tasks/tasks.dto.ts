import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '../database/schema.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normLabels = ({ value }: { value: unknown }) =>
  Array.isArray(value) ? [...new Set(value.map((l) => String(l).trim().toLowerCase()).filter(Boolean))] : value;

export class CreateTaskDto {
  @ApiProperty() @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'Add login page' })
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES, default: 'TODO' }) @IsOptional() @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES, default: 'MEDIUM' }) @IsOptional() @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31' }) @IsOptional() @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['frontend', 'bug'] })
  @IsOptional() @Transform(normLabels) @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(30, { each: true })
  labels?: string[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MinLength(3) @MaxLength(120)
  title?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES }) @IsOptional() @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES }) @IsOptional() @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({ nullable: true, description: 'null to unassign' })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @Transform(normLabels) @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(30, { each: true })
  labels?: string[];
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TASK_STATUSES }) @IsIn(TASK_STATUSES)
  status: TaskStatus;
}

const SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'number'] as const;

export class ListTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES }) @IsOptional() @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES }) @IsOptional() @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'User id, or "me"' })
  @IsOptional() @ValidateIf((_, v) => v !== 'me') @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Only tasks past their due date and not DONE' })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  overdue?: boolean;

  @ApiPropertyOptional() @IsOptional() @Type(() => String) @IsString()
  label?: string;

  @ApiPropertyOptional({ enum: SORT_FIELDS, default: 'createdAt' }) @IsOptional() @IsIn(SORT_FIELDS)
  sortBy: (typeof SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' }) @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class CreateCommentDto {
  @ApiProperty({ example: 'Looks good, merging.' })
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(2000)
  body: string;
}
