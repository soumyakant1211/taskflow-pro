import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
const PASSWORD_MSG = 'password must be 8-64 chars with upper, lower, number and special character';
const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60)
  name: string;

  @ApiProperty({ example: 'ravi@example.com' })
  @Transform(trimLower) @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secret@123' })
  @IsString() @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@taskflow.dev' })
  @Transform(trimLower) @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString() @MinLength(1)
  password: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'Ravi K.' })
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60)
  name: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(1)
  currentPassword: string;

  @ApiProperty({ example: 'NewSecret@123' })
  @IsString() @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  newPassword: string;
}
