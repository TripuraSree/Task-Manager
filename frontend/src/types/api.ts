export type ProjectRole = "admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type ProjectListItem = {
  role: ProjectRole;
  projects: Project;
};

export type ProjectMember = {
  project_id: string;
  user_id: string;
  email: string | null;
  role: ProjectRole;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  created_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardSummary = {
  projects: number;
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
  };
  assignedToMe: number;
  memberships: Array<{
    project_id: string;
    role: ProjectRole;
  }>;
};
