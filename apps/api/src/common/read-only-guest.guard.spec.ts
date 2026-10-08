import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ReadOnlyGuestGuard } from './read-only-guest.guard.js';

const ctx = (method: string, role?: string) => ({
  switchToHttp: () => ({ getRequest: () => ({ method, user: role ? { role } : undefined }) }),
}) as any;

describe('ReadOnlyGuestGuard', () => {
  const guard = new ReadOnlyGuestGuard();
  it('lets a guest read', () => {
    expect(guard.canActivate(ctx('GET', 'GUEST'))).toBe(true);
  });
  it.each(['POST', 'PATCH', 'PUT', 'DELETE'])('blocks a guest %s', (m) => {
    expect(() => guard.canActivate(ctx(m, 'GUEST'))).toThrow(ForbiddenException);
  });
  it('does not affect other roles or public routes', () => {
    expect(guard.canActivate(ctx('POST', 'MEMBER'))).toBe(true);
    expect(guard.canActivate(ctx('POST'))).toBe(true);
  });
});
