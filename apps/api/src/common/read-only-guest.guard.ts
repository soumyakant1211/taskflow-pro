import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const GUEST_READ_ONLY_MESSAGE = 'Guest accounts are read-only. Create a free account to make changes.';

/**
 * Global guard: a GUEST may only read. Any POST/PATCH/PUT/DELETE from a guest is rejected with 403,
 * whatever the endpoint, so new endpoints are read-only for guests by default.
 * Runs after JwtAuthGuard, so request.user is already set (public routes have no user and pass).
 */
@Injectable()
export class ReadOnlyGuestGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.role === 'GUEST' && !SAFE_METHODS.has(String(req.method).toUpperCase())) {
      throw new ForbiddenException(GUEST_READ_ONLY_MESSAGE);
    }
    return true;
  }
}
