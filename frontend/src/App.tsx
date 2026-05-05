import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  FolderKanban,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users
} from "lucide-react";
import { apiRequest, jsonBody } from "./lib/api";
import { supabase } from "./lib/supabase";
import type {
  DashboardSummary,
  Project,
  ProjectListItem,
  ProjectMember,
  ProjectRole,
  Task,
  TaskPriority,
  TaskStatus
} from "./types/api";

type Toast = {
  type: "success" | "error";
  message: string;
};

type ProjectForm = {
  name: string;
  description: string;
};

type TaskForm = {
  title: string;
  description: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
};

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
};

const emptyTaskForm: TaskForm = {
  title: "",
  description: "",
  assigneeId: "",
  status: "todo",
  priority: "medium",
  dueDate: ""
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done"
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [projectForm, setProjectForm] = useState<ProjectForm>({ name: "", description: "" });
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<ProjectRole>("member");
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const token = session?.access_token;
  const selectedMembership = projects.find((project) => project.projects.id === selectedProjectId);
  const isAdmin = selectedRole === "admin";

  const tasksByStatus = useMemo(
    () => ({
      todo: tasks.filter((task) => task.status === "todo"),
      in_progress: tasks.filter((task) => task.status === "in_progress"),
      done: tasks.filter((task) => task.status === "done")
    }),
    [tasks]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadWorkspace();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedProjectId) {
      return;
    }

    void loadProjectDetails(selectedProjectId);
  }, [selectedProjectId, token]);

  async function loadWorkspace() {
    if (!token) return;
    setLoadingData(true);

    try {
      const [dashboardResponse, projectsResponse] = await Promise.all([
        apiRequest<DashboardSummary>("/api/dashboard", { token }),
        apiRequest<{ projects: ProjectListItem[] }>("/api/projects", { token })
      ]);

      setDashboard(dashboardResponse);
      setProjects(projectsResponse.projects);

      const firstProjectId = projectsResponse.projects[0]?.projects.id ?? "";
      setSelectedProjectId((current) => current || firstProjectId);

      if (!firstProjectId) {
        setSelectedProject(null);
        setSelectedRole(null);
        setMembers([]);
        setTasks([]);
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoadingData(false);
    }
  }

  async function loadProjectDetails(projectId: string) {
    if (!token) return;
    setLoadingData(true);

    try {
      const [projectResponse, memberResponse, taskResponse] = await Promise.all([
        apiRequest<{ project: Project; role: ProjectRole }>(`/api/projects/${projectId}`, { token }),
        apiRequest<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`, { token }),
        apiRequest<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`, { token })
      ]);

      setSelectedProject(projectResponse.project);
      setSelectedRole(projectResponse.role);
      setMembers(memberResponse.members);
      setTasks(taskResponse.tasks);
    } catch (error) {
      showError(error);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const action =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;

    if (error) {
      showError(error);
      return;
    }

    setToast({
      type: "success",
      message: mode === "login" ? "Logged in successfully." : "Account created. Check email confirmation if enabled."
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setDashboard(null);
    setProjects([]);
    setSelectedProjectId("");
    setSelectedProject(null);
    setMembers([]);
    setTasks([]);
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    try {
      const response = await apiRequest<{ project: Project }>("/api/projects", {
        method: "POST",
        token,
        body: jsonBody({
          name: projectForm.name,
          description: projectForm.description || null
        })
      });

      setProjectForm({ name: "", description: "" });
      setSelectedProjectId(response.project.id);
      setToast({ type: "success", message: "Project created." });
      await loadWorkspace();
    } catch (error) {
      showError(error);
    }
  }

  async function deleteProject() {
    if (!token || !selectedProjectId || !selectedProject) return;

    const projectId = selectedProjectId;
    const projectName = selectedProject.name;

    setConfirmDialog({
      title: "Delete project?",
      message: `This will permanently delete "${projectName}" and all tasks inside it.`,
      confirmLabel: "Delete project",
      onConfirm: async () => {
        await apiRequest(`/api/projects/${projectId}`, {
          method: "DELETE",
          token
        });

        setToast({ type: "success", message: "Project deleted." });
        setSelectedProjectId("");
        setSelectedProject(null);
        setMembers([]);
        setTasks([]);
        await loadWorkspace();
      }
    });
  }

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedProjectId) return;

    try {
      await apiRequest(`/api/projects/${selectedProjectId}/members`, {
        method: "POST",
        token,
        body: jsonBody({
          email: memberEmail,
          role: memberRole
        })
      });

      setMemberEmail("");
      setMemberRole("member");
      setToast({ type: "success", message: "Member added." });
      await loadProjectDetails(selectedProjectId);
    } catch (error) {
      showError(error);
    }
  }

  async function removeMember(userId: string) {
    if (!token || !selectedProjectId) return;

    const projectId = selectedProjectId;
    const memberName = memberLabel(members, userId);

    setConfirmDialog({
      title: "Remove member?",
      message: `${memberName} will lose access to this project.`,
      confirmLabel: "Remove member",
      onConfirm: async () => {
        await apiRequest(`/api/projects/${projectId}/members/${userId}`, {
          method: "DELETE",
          token
        });
        setToast({ type: "success", message: "Member removed." });
        await loadProjectDetails(projectId);
      }
    });
  }

  async function updateMemberRole(userId: string, role: ProjectRole) {
    if (!token || !selectedProjectId) return;

    try {
      await apiRequest(`/api/projects/${selectedProjectId}/members/${userId}`, {
        method: "PATCH",
        token,
        body: jsonBody({ role })
      });
      await loadProjectDetails(selectedProjectId);
    } catch (error) {
      showError(error);
    }
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedProjectId) return;

    try {
      await apiRequest(`/api/projects/${selectedProjectId}/tasks`, {
        method: "POST",
        token,
        body: jsonBody({
          title: taskForm.title,
          description: taskForm.description || null,
          assigneeId: taskForm.assigneeId || null,
          status: taskForm.status,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate || null
        })
      });

      setTaskForm(emptyTaskForm);
      setShowTaskForm(false);
      setToast({ type: "success", message: "Task created." });
      await Promise.all([loadProjectDetails(selectedProjectId), loadWorkspace()]);
    } catch (error) {
      showError(error);
    }
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    if (!token) return;
    if (!canEditTaskStatus(task)) {
      setToast({ type: "error", message: "Only assigned members can update this task." });
      return;
    }

    try {
      await apiRequest(`/api/tasks/${task.id}`, {
        method: "PATCH",
        token,
        body: jsonBody({ status })
      });

      if (selectedProjectId) {
        await Promise.all([loadProjectDetails(selectedProjectId), loadWorkspace()]);
      }
    } catch (error) {
      showError(error);
    }
  }

  async function deleteTask(task: Task) {
    if (!token || !selectedProjectId) return;

    const projectId = selectedProjectId;

    setConfirmDialog({
      title: "Delete task?",
      message: `This will permanently delete "${task.title}".`,
      confirmLabel: "Delete task",
      onConfirm: async () => {
        await apiRequest(`/api/tasks/${task.id}`, {
          method: "DELETE",
          token
        });

        setToast({ type: "success", message: "Task deleted." });
        await Promise.all([loadProjectDetails(projectId), loadWorkspace()]);
      }
    });
  }

  async function handleConfirmAction() {
    if (!confirmDialog) return;

    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (error) {
      showError(error);
    } finally {
      setConfirmLoading(false);
    }
  }

  function showError(error: unknown) {
    setToast({
      type: "error",
      message: error instanceof Error ? error.message : "Something went wrong"
    });
  }

  function canEditTaskStatus(task: Task) {
    return isAdmin || task.assignee_id === session?.user.id;
  }

  if (authLoading) {
    return (
      <main className="center-stage">
        <Loader2 className="spin" aria-hidden="true" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-panel" aria-label="Authentication">
          <div>
            <p className="eyebrow">Project workspace</p>
            <h1>Task Management</h1>
            <p className="muted">Create projects, assign team tasks, and track progress with role-based access.</p>
          </div>

          <div className="segmented" role="tablist" aria-label="Authentication mode">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
              Login
            </button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
              Signup
            </button>
          </div>

          <form className="stack" onSubmit={handleAuth}>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  required
                />
                <button
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </label>
            <button className="primary-action" type="submit">
              {mode === "login" ? "Login" : "Create account"}
            </button>
          </form>
          {toast && <ToastMessage toast={toast} />}
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">
            <FolderKanban size={20} aria-hidden="true" />
          </div>
          <div>
            <h1>TaskFlow</h1>
            <p>{session.user.email}</p>
          </div>
        </div>

        <form className="mini-form" onSubmit={createProject}>
          <label>
            Project name
            <input
              value={projectForm.name}
              onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
              placeholder="Website launch"
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={projectForm.description}
              onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })}
              placeholder="Scope, goals, and team notes"
              rows={3}
            />
          </label>
          <button className="primary-action" type="submit">
            <Plus size={16} aria-hidden="true" />
            New project
          </button>
        </form>

        <section className="projects-section" aria-label="Projects section">
          <div className="sidebar-section-heading">
            <span>Projects</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="project-list" aria-label="Projects">
            {projects.map((project) => (
              <button
                className={selectedProjectId === project.projects.id ? "project-item active" : "project-item"}
                key={project.projects.id}
                onClick={() => setSelectedProjectId(project.projects.id)}
                type="button"
              >
                <span>{project.projects.name}</span>
                <small>{project.role}</small>
              </button>
            ))}
          </div>
        </section>

        <button className="ghost-action" onClick={handleSignOut} type="button">
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>{selectedProject?.name ?? "Your workspace"}</h2>
          </div>
          <div className="topbar-actions">
            {selectedProject && (
              <span className={`role-chip ${selectedRole ?? "member"}`}>
                <Shield size={14} aria-hidden="true" />
                {selectedRole ?? "member"}
              </span>
            )}
            <button className="icon-action" onClick={loadWorkspace} type="button" aria-label="Refresh dashboard">
              <RefreshCw size={18} aria-hidden="true" />
            </button>
            {selectedProject && isAdmin && (
              <button className="danger-icon-action" onClick={deleteProject} type="button" aria-label="Delete project">
                <Trash2 size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        {toast && <ToastMessage toast={toast} />}

        <section className="metrics" aria-label="Workspace summary">
          <Metric icon={<FolderKanban />} label="Projects" value={dashboard?.projects ?? 0} />
          <Metric icon={<ClipboardList />} label="Tasks" value={dashboard?.tasks.total ?? 0} />
          <Metric icon={<CalendarClock />} label="Overdue" value={dashboard?.tasks.overdue ?? 0} />
          <Metric icon={<CheckCircle2 />} label="Done" value={dashboard?.tasks.done ?? 0} />
        </section>

        {!selectedProject ? (
          <section className="empty-state">
            <FolderKanban size={32} aria-hidden="true" />
            <h3>Create your first project</h3>
            <p>Use the project form on the left to start organizing tasks.</p>
          </section>
        ) : (
          <div className="content-grid">
            <section className="panel tasks-panel">
              <div className="panel-heading">
                <div>
                  <h3>Tasks</h3>
                  <p>{selectedMembership?.role ?? selectedRole} access</p>
                </div>
                <div className="panel-actions">
                  {loadingData && <Loader2 className="spin subtle" size={18} aria-hidden="true" />}
                  {isAdmin && (
                    <button
                      className="primary-action compact-action"
                      onClick={() => setShowTaskForm((current) => !current)}
                      type="button"
                    >
                      <Plus size={16} aria-hidden="true" />
                      {showTaskForm ? "Close" : "New task"}
                    </button>
                  )}
                </div>
              </div>

              {isAdmin && showTaskForm ? (
                <form className="task-form" onSubmit={createTask}>
                  <input
                    value={taskForm.title}
                    onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                    placeholder="Task title"
                    required
                  />
                  <textarea
                    value={taskForm.description}
                    onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                    placeholder="Task details"
                    rows={3}
                  />
                  <div className="form-row">
                    <select
                      value={taskForm.assigneeId}
                      onChange={(event) => setTaskForm({ ...taskForm, assigneeId: event.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.email ?? member.user_id.slice(0, 8)} ({member.role})
                        </option>
                      ))}
                    </select>
                    <select
                      value={taskForm.priority}
                      onChange={(event) =>
                        setTaskForm({ ...taskForm, priority: event.target.value as TaskPriority })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <input
                      value={taskForm.dueDate}
                      onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })}
                      type="date"
                    />
                  </div>
                  <button className="primary-action" type="submit">
                    <Plus size={16} aria-hidden="true" />
                    Add task
                  </button>
                </form>
              ) : null}

              {!isAdmin ? (
                <div className="notice">
                  <Shield size={18} aria-hidden="true" />
                  Members can update status for assigned tasks. Admins create, assign, and delete tasks.
                </div>
              ) : null}

              <div className="task-board">
                {(["todo", "in_progress", "done"] as TaskStatus[]).map((status) => (
                  <section className={`task-column status-${status}`} key={status}>
                    <div className="column-heading">
                      <span>{statusLabels[status]}</span>
                      <strong>{tasksByStatus[status].length}</strong>
                    </div>

                    <div className="column-list">
                      {tasksByStatus[status].map((task) => (
                        <article className="task-card" key={task.id}>
                          <div>
                            <h4>{task.title}</h4>
                            {task.description && <p>{task.description}</p>}
                            <div className="task-meta">
                              <span className={`pill priority-${task.priority}`}>{priorityLabels[task.priority]}</span>
                              <span>{task.due_date ? `Due ${task.due_date}` : "No due date"}</span>
                              <span>
                                {task.assignee_id ? `Assigned ${memberLabel(members, task.assignee_id)}` : "Unassigned"}
                              </span>
                            </div>
                          </div>
                          <div className="task-actions">
                            <select
                              className={!canEditTaskStatus(task) ? "locked-control" : ""}
                              disabled={!canEditTaskStatus(task)}
                              value={task.status}
                              onChange={(event) => updateTaskStatus(task, event.target.value as TaskStatus)}
                              aria-label={`Update status for ${task.title}`}
                            >
                              <option value="todo">Todo</option>
                              <option value="in_progress">In progress</option>
                              <option value="done">Done</option>
                            </select>
                            {!canEditTaskStatus(task) && <span className="lock-note">Assigned member only</span>}
                            {isAdmin && (
                              <button className="danger-action" onClick={() => deleteTask(task)} type="button">
                                <Trash2 size={16} aria-hidden="true" />
                                Delete
                              </button>
                            )}
                          </div>
                        </article>
                      ))}

                      {tasksByStatus[status].length === 0 && (
                        <div className="empty-inline compact-empty">
                          <ClipboardList size={20} aria-hidden="true" />
                          <span>No tasks</span>
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Team</h3>
                  <p>{members.length} members</p>
                </div>
                <div className="panel-icon">
                  <Users size={18} aria-hidden="true" />
                </div>
              </div>

              {isAdmin && (
                <form className="member-form" onSubmit={addMember}>
                  <input
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="Member email"
                    type="email"
                    required
                  />
                  <select value={memberRole} onChange={(event) => setMemberRole(event.target.value as ProjectRole)}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="primary-action" type="submit">
                    <UserPlus size={16} aria-hidden="true" />
                    Add
                  </button>
                </form>
              )}

              <div className="member-list">
                {members.map((member) => (
                  <article className="member-row" key={member.user_id}>
                    <div className="member-identity">
                      <strong>{member.email ?? `${member.user_id.slice(0, 8)}...`}</strong>
                      <span>{member.user_id}</span>
                    </div>
                    {isAdmin ? (
                      <div className="member-actions">
                        <select
                          value={member.role}
                          onChange={(event) => updateMemberRole(member.user_id, event.target.value as ProjectRole)}
                          aria-label="Member role"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        {member.user_id !== session.user.id && (
                          <button
                            className="icon-danger-small"
                            onClick={() => removeMember(member.user_id)}
                            type="button"
                            aria-label="Remove member"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="role-badge">
                        <Shield size={14} aria-hidden="true" />
                        {member.role}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
      </main>
      {confirmDialog && (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          loading={confirmLoading}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={handleConfirmAction}
          title={confirmDialog.title}
        />
      )}
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function ToastMessage({ toast }: { toast: Toast }) {
  return (
    <div className={`toast ${toast.type}`} role="status">
      <AlertCircle size={16} aria-hidden="true" />
      {toast.message}
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  loading,
  onCancel,
  onConfirm
}: {
  title: string;
  message: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="modal-icon">
          <Trash2 size={22} aria-hidden="true" />
        </div>
        <div>
          <h3 id="confirm-title">{title}</h3>
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button className="ghost-action" onClick={onCancel} type="button" disabled={loading}>
            Cancel
          </button>
          <button className="danger-action" onClick={onConfirm} type="button" disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function memberLabel(members: ProjectMember[], userId: string) {
  const member = members.find((item) => item.user_id === userId);
  return member?.email ?? `${userId.slice(0, 8)}...`;
}

export default App;
