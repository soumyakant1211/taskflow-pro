/** Demo accounts shared by the seed script and the API (guest login). No side effects. */
export const SEED_USERS = [
  { email: 'admin@taskflow.dev', name: 'Asha Admin', role: 'ADMIN' as const },
  { email: 'manager@taskflow.dev', name: 'Manoj Manager', role: 'MANAGER' as const },
  { email: 'member@taskflow.dev', name: 'Meera Member', role: 'MEMBER' as const },
];
export const SEED_PASSWORD = 'Password@123';

/** The read-only guest account behind "Continue as guest". It has no usable password. */
export const GUEST_EMAIL = 'guest@taskflow.dev';
export const GUEST_NAME = 'Guest User';
