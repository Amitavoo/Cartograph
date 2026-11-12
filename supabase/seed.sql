-- Seed Data for Phase 2 Verification

-- 1. Organizations
insert into organizations (id, name, slug)
values
  ('org_3LzTeXqZy9Hog8FciCsWOIzvxpn', 'Amitava''s Workspace', 'amitava-s-workspace-1794455991241775588'),
  ('org_3LzfE0tHwhcQNfVvzipJlQmLKqc', 'A', 'a-1794461701696127175'),
  ('org_demo_acme_corp', 'Acme Architecture Team', 'acme-arch')
on conflict (id) do update set name = excluded.name, slug = excluded.slug;

-- 2. Projects
insert into projects (id, organization_id, name, repository_url, default_branch)
values
  ('11111111-1111-1111-1111-111111111111', 'org_3LzTeXqZy9Hog8FciCsWOIzvxpn', 'Cartograph Engine', 'https://github.com/Amitavoo/cartograph', 'main'),
  ('22222222-2222-2222-2222-222222222222', 'org_3LzTeXqZy9Hog8FciCsWOIzvxpn', 'Antigravity Core', 'https://github.com/Amitavoo/antigravity', 'main'),
  ('55555555-5555-5555-5555-555555555555', 'org_3LzfE0tHwhcQNfVvzipJlQmLKqc', 'Cartograph Web Client', 'https://github.com/Amitavoo/cartograph-web', 'main'),
  ('33333333-3333-3333-3333-333333333333', 'org_demo_acme_corp', 'Acme Cloud Gateway', 'https://github.com/acme/gateway', 'main'),
  ('44444444-4444-4444-4444-444444444444', 'org_demo_acme_corp', 'Acme Identity Service', 'https://github.com/acme/identity', 'master')
on conflict (id) do nothing;

-- 3. Analyses
insert into analyses (id, organization_id, project_id, status, commit_hash, branch, file_count, edge_count, coverage_percentage, created_at, completed_at, error_message)
values
  ('a1111111-1111-1111-1111-111111111111', 'org_3LzTeXqZy9Hog8FciCsWOIzvxpn', '11111111-1111-1111-1111-111111111111', 'completed', 'e546c4f', 'main', 42, 128, 94.50, now() - interval '2 hours', now() - interval '1 hour 58 minutes', null),
  ('a1111111-1111-1111-1111-222222222222', 'org_3LzTeXqZy9Hog8FciCsWOIzvxpn', '11111111-1111-1111-1111-111111111111', 'running', '7b89d12', 'feature/parser-ast', 48, 142, 89.20, now() - interval '15 minutes', null, null),
  ('a2222222-2222-2222-2222-111111111111', 'org_3LzTeXqZy9Hog8FciCsWOIzvxpn', '22222222-2222-2222-2222-222222222222', 'completed', '9a431c0', 'main', 115, 430, 98.10, now() - interval '1 day', now() - interval '23 hours 55 minutes', null),
  ('a5555555-5555-5555-5555-111111111111', 'org_3LzfE0tHwhcQNfVvzipJlQmLKqc', '55555555-5555-5555-5555-555555555555', 'completed', 'b842df1', 'main', 34, 96, 92.40, now() - interval '45 minutes', now() - interval '41 minutes', null),
  ('a5555555-5555-5555-5555-222222222222', 'org_3LzfE0tHwhcQNfVvzipJlQmLKqc', '55555555-5555-5555-5555-555555555555', 'running', 'f901c23', 'feat/visual-map', 41, 118, 88.00, now() - interval '8 minutes', null, null),
  ('a3333333-3333-3333-3333-111111111111', 'org_demo_acme_corp', '33333333-3333-3333-3333-333333333333', 'completed', '3c21a4f', 'main', 28, 84, 91.00, now() - interval '3 days', now() - interval '3 days', null),
  ('a3333333-3333-3333-3333-222222222222', 'org_demo_acme_corp', '33333333-3333-3333-3333-333333333333', 'failed', '5d98e11', 'develop', 12, 0, 0.00, now() - interval '5 hours', null, 'Parse error in src/legacy.js: unexpected token'),
  ('a4444444-4444-4444-4444-111111111111', 'org_demo_acme_corp', '44444444-4444-4444-4444-444444444444', 'pending', '1f80c33', 'master', 0, 0, null, now() - interval '30 minutes', null, null)
on conflict (id) do nothing;
