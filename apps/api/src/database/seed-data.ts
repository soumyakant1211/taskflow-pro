/**
 * Demo data for TaskFlow Pro, shared by the seed script and the API (guest login). No side effects.
 *
 * A fictional company: 28 people, 8 projects (one archived), ~70 tasks and comments.
 * Every demo account uses SEED_PASSWORD. The data is fixed (no randomness), so every
 * environment you seed looks the same, which makes test results comparable.
 */
export const SEED_PASSWORD = 'Password@123';

/** The read-only guest account behind "Continue as guest". It has no usable password. */
export const GUEST_EMAIL = 'guest@taskflow.dev';
export const GUEST_NAME = 'Guest User';

type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';
export interface SeedUser { key: string; email: string; name: string; role: Role; isActive?: boolean }

const person = (first: string, last: string, role: Role, isActive = true): SeedUser => ({
  key: `${first}.${last}`.toLowerCase(),
  email: `${first}.${last}@taskflow.dev`.toLowerCase(),
  name: `${first} ${last}`,
  role,
  isActive,
});

/** The three original accounts (kept exactly as before: tests and docs rely on them). */
export const SEED_USERS: SeedUser[] = [
  { key: 'admin', email: 'admin@taskflow.dev', name: 'Asha Admin', role: 'ADMIN' },
  { key: 'manager', email: 'manager@taskflow.dev', name: 'Manoj Manager', role: 'MANAGER' },
  { key: 'member', email: 'member@taskflow.dev', name: 'Meera Member', role: 'MEMBER' },
];

/** Everyone else in the demo company. */
export const TEAM_USERS: SeedUser[] = [
  person('Priya', 'Sharma', 'ADMIN'),
  person('Rahul', 'Verma', 'MANAGER'),
  person('Ananya', 'Iyer', 'MANAGER'),
  person('Vikram', 'Singh', 'MANAGER'),
  person('Neha', 'Kapoor', 'MANAGER'),
  person('Arjun', 'Reddy', 'MEMBER'),
  person('Kavya', 'Nair', 'MEMBER'),
  person('Rohan', 'Das', 'MEMBER'),
  person('Sneha', 'Patel', 'MEMBER'),
  person('Aditya', 'Joshi', 'MEMBER'),
  person('Isha', 'Gupta', 'MEMBER'),
  person('Karan', 'Mehta', 'MEMBER'),
  person('Divya', 'Menon', 'MEMBER'),
  person('Siddharth', 'Rao', 'MEMBER'),
  person('Pooja', 'Kulkarni', 'MEMBER'),
  person('Amit', 'Mishra', 'MEMBER'),
  person('Riya', 'Banerjee', 'MEMBER'),
  person('Nikhil', 'Jain', 'MEMBER'),
  person('Tanvi', 'Desai', 'MEMBER'),
  person('Varun', 'Pillai', 'MEMBER'),
  person('Meghna', 'Chatterjee', 'MEMBER'),
  person('Sameer', 'Khan', 'MEMBER'),
  person('Lakshmi', 'Subramanian', 'MEMBER'),
  person('Farhan', 'Ali', 'MEMBER'), // in no project: good for "empty state" tests
  person('Harsh', 'Agarwal', 'MEMBER', false), // deactivated: has left the company
];

export const ALL_SEED_USERS = [...SEED_USERS, ...TEAM_USERS];

type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/** [title, status, priority, labels, assigneeKey | null, due in days from today | null, reporterKey] */
export type SeedTask = [string, Status, Priority, string[], string | null, number | null, string];

export interface SeedProject {
  key: string;
  name: string;
  description: string;
  owner: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  members: string[];
  tasks: SeedTask[];
}

export const SEED_PROJECTS: SeedProject[] = [
  {
    key: 'WEB', name: 'Website Revamp', description: 'Redesign of the public marketing website', owner: 'manager',
    members: ['manager', 'member', 'admin', 'arjun.reddy', 'kavya.nair', 'rohan.das'],
    tasks: [
      ['Design new homepage hero', 'DONE', 'HIGH', ['design'], 'member', -3, 'manager'],
      ['Implement responsive navbar', 'IN_PROGRESS', 'MEDIUM', ['frontend'], 'member', 4, 'manager'],
      ['Set up analytics tracking', 'TODO', 'LOW', ['analytics'], null, 10, 'manager'],
      ['Fix broken contact form', 'IN_REVIEW', 'CRITICAL', ['bug'], 'manager', -1, 'member'],
      ['Write SEO meta tags for all pages', 'TODO', 'MEDIUM', ['seo'], 'kavya.nair', 6, 'manager'],
      ['Optimise images for faster load', 'IN_PROGRESS', 'HIGH', ['performance'], 'arjun.reddy', 2, 'manager'],
      ['Add cookie consent banner', 'DONE', 'HIGH', ['legal', 'frontend'], 'rohan.das', -8, 'admin'],
      ['Footer links point to old blog', 'TODO', 'LOW', ['bug'], 'rohan.das', -2, 'kavya.nair'],
      ['Accessibility audit (WCAG 2.2)', 'TODO', 'HIGH', ['a11y'], null, 14, 'manager'],
      ['Migrate blog to new CMS', 'IN_REVIEW', 'MEDIUM', ['backend'], 'arjun.reddy', 1, 'manager'],
    ],
  },
  {
    key: 'MOB', name: 'Mobile App', description: 'Customer mobile app v2', owner: 'admin',
    members: ['admin', 'member', 'sneha.patel', 'aditya.joshi', 'isha.gupta'],
    tasks: [
      ['Push notification service', 'TODO', 'HIGH', ['backend'], 'member', 7, 'admin'],
      ['Dark mode support', 'TODO', 'MEDIUM', ['ui'], null, null, 'admin'],
      ['Biometric login on Android', 'IN_PROGRESS', 'HIGH', ['security', 'android'], 'sneha.patel', 5, 'admin'],
      ['App crashes when offline on iOS 18', 'IN_REVIEW', 'CRITICAL', ['bug', 'ios'], 'aditya.joshi', -1, 'isha.gupta'],
      ['Onboarding carousel screens', 'DONE', 'MEDIUM', ['ui'], 'isha.gupta', -12, 'admin'],
      ['Deep links for order tracking', 'TODO', 'MEDIUM', ['feature'], 'aditya.joshi', 9, 'admin'],
      ['Reduce APK size below 30 MB', 'IN_PROGRESS', 'LOW', ['performance', 'android'], 'sneha.patel', 15, 'admin'],
      ['Play Store listing screenshots', 'DONE', 'LOW', ['release'], 'member', -20, 'admin'],
    ],
  },
  {
    key: 'CRM', name: 'CRM Integration', description: 'Sync customer data between Salesforce and billing', owner: 'rahul.verma',
    members: ['rahul.verma', 'karan.mehta', 'divya.menon', 'siddharth.rao', 'member'],
    tasks: [
      ['Map Salesforce fields to billing schema', 'DONE', 'HIGH', ['analysis'], 'divya.menon', -10, 'rahul.verma'],
      ['Build nightly sync job', 'IN_PROGRESS', 'CRITICAL', ['backend'], 'karan.mehta', 3, 'rahul.verma'],
      ['Handle duplicate customer records', 'TODO', 'HIGH', ['data-quality'], 'siddharth.rao', 8, 'rahul.verma'],
      ['OAuth connection to Salesforce sandbox', 'DONE', 'HIGH', ['security'], 'karan.mehta', -15, 'rahul.verma'],
      ['Retry and alerting for failed syncs', 'TODO', 'MEDIUM', ['backend', 'monitoring'], null, 12, 'rahul.verma'],
      ['Sync status dashboard', 'IN_REVIEW', 'MEDIUM', ['frontend'], 'divya.menon', 2, 'rahul.verma'],
      ['Currency mismatch on EUR invoices', 'IN_PROGRESS', 'CRITICAL', ['bug'], 'siddharth.rao', -2, 'member'],
      ['Write integration runbook', 'TODO', 'LOW', ['docs'], 'member', 20, 'rahul.verma'],
      ['Load test with 100k records', 'TODO', 'MEDIUM', ['performance'], null, 18, 'karan.mehta'],
    ],
  },
  {
    key: 'HR', name: 'HR Portal', description: 'Self-service portal for leave, payslips and onboarding', owner: 'ananya.iyer',
    members: ['ananya.iyer', 'pooja.kulkarni', 'amit.mishra', 'riya.banerjee', 'lakshmi.subramanian'],
    tasks: [
      ['Leave request and approval flow', 'IN_PROGRESS', 'HIGH', ['feature'], 'pooja.kulkarni', 4, 'ananya.iyer'],
      ['Payslip PDF download', 'DONE', 'MEDIUM', ['feature'], 'amit.mishra', -6, 'ananya.iyer'],
      ['New-joiner onboarding checklist', 'TODO', 'MEDIUM', ['feature'], 'riya.banerjee', 10, 'ananya.iyer'],
      ['Leave balance shows negative days', 'IN_REVIEW', 'HIGH', ['bug'], 'pooja.kulkarni', -1, 'lakshmi.subramanian'],
      ['Holiday calendar for 2027', 'TODO', 'LOW', ['content'], 'lakshmi.subramanian', 30, 'ananya.iyer'],
      ['Role-based access for HR admins', 'IN_PROGRESS', 'CRITICAL', ['security'], 'amit.mishra', 2, 'ananya.iyer'],
      ['Employee directory search', 'DONE', 'LOW', ['feature'], 'riya.banerjee', -25, 'ananya.iyer'],
      ['Mobile-friendly layout', 'TODO', 'MEDIUM', ['ui'], null, 16, 'ananya.iyer'],
    ],
  },
  {
    key: 'PAY', name: 'Payments Gateway', description: 'UPI and card payments for the checkout', owner: 'vikram.singh',
    members: ['vikram.singh', 'nikhil.jain', 'tanvi.desai', 'varun.pillai', 'siddharth.rao', 'priya.sharma'],
    tasks: [
      ['UPI intent flow', 'DONE', 'CRITICAL', ['upi'], 'nikhil.jain', -9, 'vikram.singh'],
      ['Card tokenisation (RBI guidelines)', 'IN_PROGRESS', 'CRITICAL', ['compliance', 'security'], 'tanvi.desai', 3, 'vikram.singh'],
      ['Refund API', 'IN_REVIEW', 'HIGH', ['backend'], 'varun.pillai', 1, 'vikram.singh'],
      ['Webhook signature verification', 'DONE', 'HIGH', ['security'], 'siddharth.rao', -14, 'vikram.singh'],
      ['Double charge on retry after timeout', 'IN_PROGRESS', 'CRITICAL', ['bug'], 'nikhil.jain', -3, 'priya.sharma'],
      ['Settlement reconciliation report', 'TODO', 'HIGH', ['finance'], 'varun.pillai', 7, 'vikram.singh'],
      ['PCI-DSS self-assessment', 'TODO', 'HIGH', ['compliance'], 'priya.sharma', 21, 'vikram.singh'],
      ['Payment failure analytics', 'TODO', 'MEDIUM', ['analytics'], null, 25, 'vikram.singh'],
      ['Sandbox test cards documentation', 'DONE', 'LOW', ['docs'], 'tanvi.desai', -30, 'vikram.singh'],
      ['Rate limit on payment status polling', 'TODO', 'MEDIUM', ['backend'], 'siddharth.rao', 11, 'nikhil.jain'],
    ],
  },
  {
    key: 'DATA', name: 'Data Warehouse', description: 'Central reporting warehouse and BI dashboards', owner: 'neha.kapoor',
    members: ['neha.kapoor', 'meghna.chatterjee', 'harsh.agarwal', 'amit.mishra', 'kavya.nair'],
    tasks: [
      ['Design star schema for sales', 'DONE', 'HIGH', ['modelling'], 'meghna.chatterjee', -18, 'neha.kapoor'],
      ['ETL pipeline for orders', 'IN_PROGRESS', 'HIGH', ['etl'], 'amit.mishra', 5, 'neha.kapoor'],
      ['Revenue dashboard in BI tool', 'TODO', 'MEDIUM', ['bi'], 'kavya.nair', 12, 'neha.kapoor'],
      ['Data retention policy', 'DONE', 'MEDIUM', ['compliance'], 'harsh.agarwal', -40, 'neha.kapoor'],
      ['Late-arriving data breaks daily totals', 'IN_REVIEW', 'HIGH', ['bug'], 'meghna.chatterjee', -1, 'kavya.nair'],
      ['Partition large fact tables', 'TODO', 'LOW', ['performance'], null, 28, 'neha.kapoor'],
      ['PII masking in staging', 'IN_PROGRESS', 'CRITICAL', ['security'], 'amit.mishra', 2, 'neha.kapoor'],
      ['Data dictionary', 'TODO', 'LOW', ['docs'], null, null, 'neha.kapoor'],
    ],
  },
  {
    key: 'QA', name: 'QA Automation', description: 'Test automation framework and CI quality gates', owner: 'manager',
    members: ['manager', 'member', 'arjun.reddy', 'isha.gupta', 'tanvi.desai', 'sameer.khan'],
    tasks: [
      ['Choose automation framework', 'DONE', 'HIGH', ['spike'], 'sameer.khan', -21, 'manager'],
      ['Login and RBAC regression suite', 'IN_PROGRESS', 'HIGH', ['regression'], 'isha.gupta', 6, 'manager'],
      ['API contract tests', 'TODO', 'MEDIUM', ['api'], 'tanvi.desai', 13, 'manager'],
      ['Flaky test on Kanban drag and drop', 'IN_REVIEW', 'MEDIUM', ['flaky', 'bug'], 'arjun.reddy', 0, 'sameer.khan'],
      ['Run tests on every pull request', 'IN_PROGRESS', 'HIGH', ['ci'], 'sameer.khan', 3, 'manager'],
      ['Publish HTML report to GitHub Pages', 'TODO', 'LOW', ['ci', 'reporting'], 'member', 9, 'manager'],
      ['Test data cleanup job', 'TODO', 'MEDIUM', ['test-data'], null, 17, 'isha.gupta'],
      ['Cross-browser runs (Firefox, Safari)', 'TODO', 'LOW', ['browsers'], null, 24, 'manager'],
      ['Smoke tests against production', 'DONE', 'CRITICAL', ['smoke'], 'isha.gupta', -5, 'manager'],
    ],
  },
  {
    key: 'OPS', name: 'Cloud Migration', description: 'Move on-prem services to AWS (completed, archived)', owner: 'priya.sharma', status: 'ARCHIVED',
    members: ['priya.sharma', 'varun.pillai', 'rohan.das', 'harsh.agarwal'],
    tasks: [
      ['Inventory on-prem servers', 'DONE', 'HIGH', ['planning'], 'harsh.agarwal', -90, 'priya.sharma'],
      ['Set up VPC and subnets', 'DONE', 'CRITICAL', ['aws', 'network'], 'varun.pillai', -75, 'priya.sharma'],
      ['Migrate PostgreSQL to RDS', 'DONE', 'CRITICAL', ['aws', 'database'], 'rohan.das', -60, 'priya.sharma'],
      ['Cut over DNS', 'DONE', 'HIGH', ['aws'], 'varun.pillai', -45, 'priya.sharma'],
      ['Decommission old data centre', 'DONE', 'MEDIUM', ['ops'], 'harsh.agarwal', -30, 'priya.sharma'],
      ['Post-migration cost review', 'TODO', 'LOW', ['finance'], null, null, 'priya.sharma'],
    ],
  },
];

/** [projectKey, taskNumber, authorKey, body], in the order they were written */
export const SEED_COMMENTS: [string, number, string, string][] = [
  ['WEB', 4, 'member', 'Form submits but no email arrives. Reproduced on Chrome and Firefox.'],
  ['WEB', 4, 'manager', 'Root cause: missing CSRF header after the proxy change. Fix is in review.'],
  ['WEB', 6, 'arjun.reddy', 'WebP versions cut the homepage weight from 3.1 MB to 900 KB.'],
  ['WEB', 10, 'kavya.nair', 'Redirects for old blog URLs still need testing.'],
  ['MOB', 4, 'isha.gupta', 'Happens when the app starts in airplane mode. Crash log attached in Slack.'],
  ['MOB', 4, 'aditya.joshi', 'Added an offline cache guard. Please verify on a real device.'],
  ['MOB', 3, 'sneha.patel', 'Works on Pixel 8; testing on Samsung next.'],
  ['CRM', 2, 'karan.mehta', 'Job runs in 18 minutes for 40k records. Target is under 10.'],
  ['CRM', 7, 'member', 'EUR invoices show amounts in INR. Customer escalation from Berlin office.'],
  ['CRM', 7, 'siddharth.rao', 'Exchange rate table was not refreshed. Adding a daily refresh.'],
  ['CRM', 6, 'rahul.verma', 'Looks good. Can we show the last successful sync time?'],
  ['HR', 4, 'lakshmi.subramanian', 'Two employees see -2 days after cancelling approved leave.'],
  ['HR', 4, 'pooja.kulkarni', 'Cancelled leave was subtracted twice. Fixed and added a unit test.'],
  ['HR', 6, 'ananya.iyer', 'Payroll team must not see performance reviews.'],
  ['PAY', 5, 'priya.sharma', 'Three customers charged twice yesterday. Highest priority.'],
  ['PAY', 5, 'nikhil.jain', 'Adding an idempotency key on retries; refunds issued for the three cases.'],
  ['PAY', 3, 'varun.pillai', 'Partial refunds supported. Full refund on cancelled orders is automatic.'],
  ['PAY', 2, 'tanvi.desai', 'Waiting for the token vault credentials from the bank.'],
  ['DATA', 5, 'kavya.nair', 'Yesterday\'s total was 4% lower than the finance report.'],
  ['DATA', 5, 'meghna.chatterjee', 'Orders arriving after midnight UTC were skipped. Reprocessing window added.'],
  ['QA', 4, 'sameer.khan', 'Fails about 1 in 15 runs in CI only.'],
  ['QA', 4, 'arjun.reddy', 'Replaced a fixed wait with a web-first assertion; 50 runs green.'],
  ['QA', 2, 'isha.gupta', 'Admin and member flows covered; guest flows next.'],
  ['OPS', 3, 'rohan.das', 'Migration finished with 4 minutes of downtime.'],
];
