import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { PROJECT_STATUSES } from '../database/schema.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateProjectDto {
  @ApiProperty({ example: 'CRM', description: '2-6 uppercase letters, unique. Used as task prefix e.g. CRM-12' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2,6}$/, { message: 'key must be 2-6 letters' })
  key: string;

  @ApiProperty({ example: 'CRM Integration' })
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'Integrate Salesforce with our billing system' })
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MinLength(3) @MaxLength(80)
  name?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES }) @IsOptional() @IsIn(PROJECT_STATUSES)
  status?: (typeof PROJECT_STATUSES)[number];
}

export class ListProjectsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PROJECT_STATUSES }) @IsOptional() @IsIn(PROJECT_STATUSES)
  status?: (typeof PROJECT_STATUSES)[number];
}

export class AddMemberDto {
  @ApiProperty() @IsUUID()
  userId: string;
}
