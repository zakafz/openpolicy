-- openpolicy/migrations/2025_11_17_add_slug_to_workspaces_and_documents.sql
-- Add `slug` columns (if missing) and case-insensitive unique indexes on lower(slug).
-- Populate existing rows with deterministic unique slugs where missing.
-- This migration is idempotent: it uses IF NOT EXISTS and checks pg_class before creating indexes.

BEGIN;

-- 1) Add slug column to workspaces, pending_workspaces, documents (if not exists)
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.pending_workspaces ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS slug text;

-- 2) Populate missing slugs with a deterministic, unique fallback:
--    Use a normalized version of the name/title and append a short id suffix to avoid collisions.
--    This strategy guarantees uniqueness without attempting expensive deduplication loops.

-- For workspaces: use `name`
UPDATE public.workspaces
SET slug = (
  -- normalized name (lower, non-alnum -> -, collapse dashes, trim)
  regexp_replace(
    regexp_replace(lower(coalesce(name, 'workspace')), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  )
  || '-' || substr(id::text, 1, 8)
)
WHERE slug IS NULL;

-- For pending_workspaces: use `name`
UPDATE public.pending_workspaces
SET slug = (
  regexp_replace(
    regexp_replace(lower(coalesce(name, 'pending')), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  )
  || '-' || substr(id::text, 1, 8)
)
WHERE slug IS NULL;

-- For documents: use `title`
UPDATE public.documents
SET slug = (
  regexp_replace(
    regexp_replace(lower(coalesce(title, 'doc')), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  )
  || '-' || substr(id::text, 1, 8)
)
WHERE slug IS NULL;

-- 3) Create case-insensitive unique indexes on lower(slug) where slug IS NOT NULL.
--    We check pg_class to avoid errors if the index already exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'uniq_workspaces_slug_lower'
  ) THEN
    CREATE UNIQUE INDEX uniq_workspaces_slug_lower ON public.workspaces (lower(slug)) WHERE slug IS NOT NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'uniq_pending_workspaces_slug_lower'
  ) THEN
    CREATE UNIQUE INDEX uniq_pending_workspaces_slug_lower ON public.pending_workspaces (lower(slug)) WHERE slug IS NOT NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'uniq_documents_slug_lower'
  ) THEN
    CREATE UNIQUE INDEX uniq_documents_slug_lower ON public.documents (lower(slug)) WHERE slug IS NOT NULL;
  END IF;
END;
$$;

-- 4) Optional: add brief comments for clarity
COMMENT ON COLUMN public.workspaces.slug IS 'URL-friendly slug; lower-case unique index enforced on lower(slug)';
COMMENT ON COLUMN public.pending_workspaces.slug IS 'URL-friendly slug for pending workspace; lower-case unique index enforced on lower(slug)';
COMMENT ON COLUMN public.documents.slug IS 'URL-friendly slug for documents; lower-case unique index enforced on lower(slug)';

COMMIT;
