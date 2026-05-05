create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_role') then
    create type public.project_role as enum ('admin', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('todo', 'in_progress', 'done');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high');
  end if;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.is_project_member(project_uuid uuid, user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = project_uuid
      and user_id = user_uuid
  );
$$;

create or replace function public.is_project_admin(project_uuid uuid, user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = project_uuid
      and user_id = user_uuid
      and role = 'admin'
  );
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Members can read their projects" on public.projects;
create policy "Members can read their projects"
on public.projects for select
to authenticated
using (public.is_project_member(id, auth.uid()));

drop policy if exists "Users can create owned projects" on public.projects;
create policy "Users can create owned projects"
on public.projects for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Admins can update projects" on public.projects;
create policy "Admins can update projects"
on public.projects for update
to authenticated
using (public.is_project_admin(id, auth.uid()))
with check (public.is_project_admin(id, auth.uid()));

drop policy if exists "Admins can delete projects" on public.projects;
create policy "Admins can delete projects"
on public.projects for delete
to authenticated
using (public.is_project_admin(id, auth.uid()));

drop policy if exists "Members can read project members" on public.project_members;
create policy "Members can read project members"
on public.project_members for select
to authenticated
using (public.is_project_member(project_id, auth.uid()));

drop policy if exists "Admins can add project members" on public.project_members;
create policy "Admins can add project members"
on public.project_members for insert
to authenticated
with check (public.is_project_admin(project_id, auth.uid()));

drop policy if exists "Admins can update project members" on public.project_members;
create policy "Admins can update project members"
on public.project_members for update
to authenticated
using (public.is_project_admin(project_id, auth.uid()))
with check (public.is_project_admin(project_id, auth.uid()));

drop policy if exists "Admins can remove project members" on public.project_members;
create policy "Admins can remove project members"
on public.project_members for delete
to authenticated
using (public.is_project_admin(project_id, auth.uid()));

drop policy if exists "Members can read project tasks" on public.tasks;
create policy "Members can read project tasks"
on public.tasks for select
to authenticated
using (public.is_project_member(project_id, auth.uid()));

drop policy if exists "Members can create project tasks" on public.tasks;
create policy "Members can create project tasks"
on public.tasks for insert
to authenticated
with check (
  public.is_project_member(project_id, auth.uid())
  and created_by = auth.uid()
  and (assignee_id is null or public.is_project_member(project_id, assignee_id))
);

drop policy if exists "Members can update project tasks" on public.tasks;
create policy "Members can update project tasks"
on public.tasks for update
to authenticated
using (public.is_project_member(project_id, auth.uid()))
with check (
  public.is_project_member(project_id, auth.uid())
  and (assignee_id is null or public.is_project_member(project_id, assignee_id))
);

drop policy if exists "Admins can delete project tasks" on public.tasks;
create policy "Admins can delete project tasks"
on public.tasks for delete
to authenticated
using (public.is_project_admin(project_id, auth.uid()));
