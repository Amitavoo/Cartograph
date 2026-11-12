-- Phase 2 Migration: 8 Core Tables + Organizations with Cascade Delete and RLS

-- Helper function to extract organization ID from JWT claims
create or replace function auth_org_id()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'org_id', ''),
    nullif((auth.jwt() -> 'app_metadata') ->> 'org_id', ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', '')
  );
$$;

-- Parent table: organizations
create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text,
  created_at timestamptz not null default now()
);

-- 1. projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  repository_url text not null,
  default_branch text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. analyses
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  commit_hash text,
  branch text not null default 'main',
  file_count integer not null default 0,
  edge_count integer not null default 0,
  coverage_percentage numeric(5, 2),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 3. files
create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  path text not null,
  language text not null default 'typescript',
  size_bytes integer not null default 0,
  fan_in integer not null default 0,
  fan_out integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. edges
create table if not exists edges (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  source_file_id uuid not null references files(id) on delete cascade,
  target_file_id uuid not null references files(id) on delete cascade,
  import_type text not null check (import_type in ('static', 'dynamic', 'reexport', 'require')),
  specifier text not null,
  created_at timestamptz not null default now()
);

-- 5. routes
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  http_method text not null,
  path text not null,
  created_at timestamptz not null default now()
);

-- 6. explanations
create table if not exists explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  summary text not null,
  hash text not null,
  created_at timestamptz not null default now()
);

-- 7. file_roles
create table if not exists file_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

-- 8. insights
create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  analysis_id uuid not null references analyses(id) on delete cascade,
  title text not null,
  description text not null,
  kind text not null,
  created_at timestamptz not null default now()
);

-- Enable and force Row Level Security across all tables
alter table organizations enable row level security;
alter table organizations force row level security;

alter table projects enable row level security;
alter table projects force row level security;

alter table analyses enable row level security;
alter table analyses force row level security;

alter table files enable row level security;
alter table files force row level security;

alter table edges enable row level security;
alter table edges force row level security;

alter table routes enable row level security;
alter table routes force row level security;

alter table explanations enable row level security;
alter table explanations force row level security;

alter table file_roles enable row level security;
alter table file_roles force row level security;

alter table insights enable row level security;
alter table insights force row level security;

-- Covering indexes on foreign keys
create index if not exists idx_projects_org on projects(organization_id);
create index if not exists idx_analyses_org on analyses(organization_id);
create index if not exists idx_analyses_project on analyses(project_id);
create index if not exists idx_files_org on files(organization_id);
create index if not exists idx_files_analysis on files(analysis_id);
create index if not exists idx_edges_org on edges(organization_id);
create index if not exists idx_edges_analysis on edges(analysis_id);
create index if not exists idx_edges_source on edges(source_file_id);
create index if not exists idx_edges_target on edges(target_file_id);
create index if not exists idx_routes_org on routes(organization_id);
create index if not exists idx_routes_analysis on routes(analysis_id);
create index if not exists idx_routes_file on routes(file_id);
create index if not exists idx_explanations_org on explanations(organization_id);
create index if not exists idx_explanations_analysis on explanations(analysis_id);
create index if not exists idx_explanations_file on explanations(file_id);
create index if not exists idx_file_roles_org on file_roles(organization_id);
create index if not exists idx_file_roles_analysis on file_roles(analysis_id);
create index if not exists idx_file_roles_file on file_roles(file_id);
create index if not exists idx_insights_org on insights(organization_id);
create index if not exists idx_insights_analysis on insights(analysis_id);

-- Row Level Security Policies
-- Organizations
create policy "org_select_policy" on organizations for select to authenticated, anon using (id = (select auth_org_id()));
create policy "org_insert_policy" on organizations for insert to authenticated, anon with check (id = (select auth_org_id()));
create policy "org_update_policy" on organizations for update to authenticated, anon using (id = (select auth_org_id())) with check (id = (select auth_org_id()));
create policy "org_delete_policy" on organizations for delete to authenticated, anon using (id = (select auth_org_id()));

-- Projects
create policy "projects_select_policy" on projects for select to authenticated, anon using (organization_id = (select auth_org_id()));
create policy "projects_insert_policy" on projects for insert to authenticated, anon with check (organization_id = (select auth_org_id()));
create policy "projects_update_policy" on projects for update to authenticated, anon using (organization_id = (select auth_org_id())) with check (organization_id = (select auth_org_id()));
create policy "projects_delete_policy" on projects for delete to authenticated, anon using (organization_id = (select auth_org_id()));

-- Analyses
create policy "analyses_select_policy" on analyses for select to authenticated, anon using (organization_id = (select auth_org_id()));
create policy "analyses_insert_policy" on analyses for insert to authenticated, anon with check (organization_id = (select auth_org_id()));
create policy "analyses_update_policy" on analyses for update to authenticated, anon using (organization_id = (select auth_org_id())) with check (organization_id = (select auth_org_id()));
create policy "analyses_delete_policy" on analyses for delete to authenticated, anon using (organization_id = (select auth_org_id()));

-- Files
create policy "files_select_policy" on files for select to authenticated, anon using (organization_id = (select auth_org_id()));
create policy "files_insert_policy" on files for insert to authenticated, anon with check (organization_id = (select auth_org_id()));
create policy "files_update_policy" on files for update to authenticated, anon using (organization_id = (select auth_org_id())) with check (organization_id = (select auth_org_id()));
create policy "files_delete_policy" on files for delete to authenticated, anon using (organization_id = (select auth_org_id()));

-- Edges
create policy "edges_select_policy" on edges for select to authenticated, anon using (organization_id = (select auth_org_id()));
create policy "edges_insert_policy" on edges for insert to authenticated, anon with check (organization_id = (select auth_org_id()));
create policy "edges_update_policy" on edges for update to authenticated, anon using (organization_id = (select auth_org_id())) with check (organization_id = (select auth_org_id()));
create policy "edges_delete_policy" on edges for delete to authenticated, anon using (organization_id = (select auth_org_id()));

-- Routes
create policy "routes_select_policy" on routes for select to authenticated, anon using (organization_id = (select auth_org_id()));
create policy "routes_insert_policy" on routes for insert to authenticated, anon with check (organization_id = (select auth_org_id()));
create policy "routes_update_policy" on routes for update to authenticated, anon using (organization_id = (select auth_org_id())) with check (organization_id = (select auth_org_id()));
create policy "routes_delete_policy" on routes for delete to authenticated, anon using (organization_id = (select auth_org_id()));

-- Explanations
create policy "explanations_select_policy" on explanations for select to authenticated, anon using (organization_id = (select auth_org_id()));
create policy "explanations_insert_policy" on explanations for insert to authenticated, anon with check (organization_id = (select auth_org_id()));
create policy "explanations_update_policy" on explanations for update to authenticated, anon using (organization_id = (select auth_org_id())) with check (organization_id = (select auth_org_id()));
create policy "explanations_delete_policy" on explanations for delete to authenticated, anon using (organization_id = (select auth_org_id()));

-- File Roles
create policy "file_roles_select_policy" on file_roles for select to authenticated, anon using (organization_id = (select auth_org_id()));
create policy "file_roles_insert_policy" on file_roles for insert to authenticated, anon with check (organization_id = (select auth_org_id()));
create policy "file_roles_update_policy" on file_roles for update to authenticated, anon using (organization_id = (select auth_org_id())) with check (organization_id = (select auth_org_id()));
create policy "file_roles_delete_policy" on file_roles for delete to authenticated, anon using (organization_id = (select auth_org_id()));

-- Insights
create policy "insights_select_policy" on insights for select to authenticated, anon using (organization_id = (select auth_org_id()));
create policy "insights_insert_policy" on insights for insert to authenticated, anon with check (organization_id = (select auth_org_id()));
create policy "insights_update_policy" on insights for update to authenticated, anon using (organization_id = (select auth_org_id())) with check (organization_id = (select auth_org_id()));
create policy "insights_delete_policy" on insights for delete to authenticated, anon using (organization_id = (select auth_org_id()));
