import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RolesGuard } from './roles.guard.js';

const ctxFor = (role?: string) => ({
  getHandler: () => ({}),
  getClass: () => ({}),
  switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
}) as any;

const guardWith = (roles?: string[]) => {
  const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
  return new RolesGuard(reflector);
};

describe('RolesGuard', () => {
  it('allows any user when the route has no @Roles', () => {
    expect(guardWith(undefined).canActivate(ctxFor('MEMBER'))).toBe(true);
  });
  it('allows a user whose role is listed', () => {
    expect(guardWith(['ADMIN', 'MANAGER']).canActivate(ctxFor('MANAGER'))).toBe(true);
  });
  it('rejects a user whose role is not listed', () => {
    expect(() => guardWith(['ADMIN']).canActivate(ctxFor('MEMBER'))).toThrow(ForbiddenException);
  });
});
