export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'GUEST';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done',
};

export interface User {
  id: string; email: string; name: string; role: Role; isActive: boolean; createdAt: string;
}
export interface Paginated<T> {
  data: T[]; meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface ProjectSummary {
  id: string; key: string; name: string; description: string | null; status: 'ACTIVE' | 'ARCHIVED';
  owner: { id: string; name: string }; taskCount: number; openTaskCount: number; memberCount: number; createdAt: string;
}
export interface Member { id: string; name: string; email: string; role: Role; joinedAt: string }
export interface ProjectDetail extends Omit<ProjectSummary, 'owner' | 'taskCount' | 'openTaskCount' | 'memberCount'> {
  owner: { id: string; name: string; email: string };
  ownerId: string;
  members: Member[];
  taskStats: Record<TaskStatus, number>;
  canManage: boolean;
}
export interface Task {
  id: string; number: number; key: string; title: string; description: string | null;
  status: TaskStatus; priority: TaskPriority; labels: string[]; dueDate: string | null;
  createdAt: string; updatedAt: string;
  project: { id: string; key: string; name: string };
  assignee: { id: string; name: string; email: string } | null;
  reporter: { id: string; name: string };
}
export interface Comment { id: string; body: string; createdAt: string; author: { id: string; name: string } }
export interface Activity {
  id: string; action: string; entityType: string; entityId: string; message: string; createdAt: string;
  user: { id: string; name: string };
}
export interface DashboardStats {
  totals: { projects: number; tasks: number; myOpenTasks: number; overdue: number; doneThisWeek: number };
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  myTasks: Pick<Task, 'id' | 'key' | 'title' | 'status' | 'priority' | 'dueDate'>[];
  recentActivity: Activity[];
}
