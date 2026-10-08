import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { ROLES, type Role } from '../database/schema.js';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ROLES })
  @IsOptional() @IsIn(ROLES)
  role?: Role;
}

export class UpdateRoleDto {
  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES)
  role: Role;
}

export class UpdateUserStatusDto {
  @ApiProperty()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive: boolean;
}
