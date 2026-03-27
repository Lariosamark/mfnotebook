-- ============================================================
-- MFNotebook Database Schema for Neon (PostgreSQL)
-- Run this in your Neon SQL editor to set up the database
-- ============================================================

-- Users / Profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS mf_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url  TEXT,
  department  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notebooks
CREATE TABLE IF NOT EXISTS mf_notebooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES mf_users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled Notebook',
  color       TEXT NOT NULL DEFAULT '#2f72fc',
  emoji       TEXT DEFAULT '📓',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sections (tabs inside a notebook)
CREATE TABLE IF NOT EXISTS mf_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES mf_notebooks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New Section',
  color       TEXT NOT NULL DEFAULT '#2f72fc',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Pages (inside sections)
CREATE TABLE IF NOT EXISTS mf_pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID NOT NULL REFERENCES mf_sections(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled Page',
  content     TEXT DEFAULT '',
  is_pinned   BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Comments on pages
CREATE TABLE IF NOT EXISTS mf_page_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES mf_pages(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES mf_users(id),
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Site Folders
CREATE TABLE IF NOT EXISTS mf_site_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES mf_users(id) ON DELETE CASCADE,
  site_name   TEXT NOT NULL,
  location    TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Site Images (inside site folders)
CREATE TABLE IF NOT EXISTS mf_site_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id   UUID NOT NULL REFERENCES mf_site_folders(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   BIGINT,
  caption     TEXT,
  uploaded_by UUID REFERENCES mf_users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Notebook Access Control (which employees can see which admin notebooks)
CREATE TABLE IF NOT EXISTS mf_notebook_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES mf_notebooks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES mf_users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notebook_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notebooks_user       ON mf_notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_notebook    ON mf_sections(notebook_id);
CREATE INDEX IF NOT EXISTS idx_pages_section        ON mf_pages(section_id);
CREATE INDEX IF NOT EXISTS idx_comments_page        ON mf_page_comments(page_id);
CREATE INDEX IF NOT EXISTS idx_site_folders_user    ON mf_site_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_site_images_folder   ON mf_site_images(folder_id);
CREATE INDEX IF NOT EXISTS idx_notebook_access_nb   ON mf_notebook_access(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_access_user ON mf_notebook_access(user_id);

-- ============================================================
-- After creating your first user via the app, run this to
-- promote them to admin:
--
-- UPDATE mf_users SET role = 'admin' WHERE email = 'your@email.com';
-- ============================================================
