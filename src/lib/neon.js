// ─────────────────────────────────────────────────────────────────────────────
// MFNotebook Database Layer
//
// MODE A — LocalStorage (no .env needed, works immediately)
//   Activated when VITE_DATABASE_URL is not set.
//   All data lives in the browser. Great for local development / demo.
//
// MODE B — Neon PostgreSQL (production)
//   Activated when VITE_DATABASE_URL is set to a valid postgresql:// URL.
//   Run schema.sql in your Neon project first.
// ─────────────────────────────────────────────────────────────────────────────

const connectionString = import.meta.env.VITE_DATABASE_URL
const USE_NEON = connectionString && connectionString.startsWith('postgresql')

// ─── Lazy-load Neon only when configured ─────────────────────────────────────
let _neonSql = null
async function getNeon() {
  if (!_neonSql) {
    const { neon } = await import('@neondatabase/serverless')
    _neonSql = neon(connectionString)
  }
  return _neonSql
}

// ─── UUID helper (works in every modern browser) ──────────────────────────────
function uuid() {
  return crypto.randomUUID()
}

function now() {
  return new Date().toISOString()
}

// ─── LocalStorage store ───────────────────────────────────────────────────────
const LS_KEY = 'mfnotebook_db'

function loadStore() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return {
    mf_users: [],
    mf_notebooks: [],
    mf_sections: [],
    mf_pages: [],
    mf_page_comments: [],
    mf_site_folders: [],
    mf_site_images: [],
    mf_notebook_access: [],
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store))
  } catch (e) {
    console.error('localStorage write failed:', e)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage query engine — interprets a small subset of SQL-like operations
// via a structured API (not actual SQL parsing).
// ─────────────────────────────────────────────────────────────────────────────
const localDB = {
  // mf_users ─────────────────────────────────────────────────────────────────
  getUserByAuthId(authId) {
    const store = loadStore()
    return store.mf_users.find((u) => u.auth_id === authId) || null
  },
  upsertUser({ auth_id, email, full_name, role = 'employee' }) {
    const store = loadStore()
    let user = store.mf_users.find((u) => u.auth_id === auth_id)
    if (user) {
      user.email = email
      user.updated_at = now()
    } else {
      user = { id: uuid(), auth_id, email, full_name, role, avatar_url: null, department: null, is_active: true, created_at: now(), updated_at: now() }
      store.mf_users.push(user)
    }
    saveStore(store)
    return user
  },
  getUsers() {
    return loadStore().mf_users.sort((a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name))
  },
  updateUser(id, fields) {
    const store = loadStore()
    const user = store.mf_users.find((u) => u.id === id)
    if (!user) return null
    Object.assign(user, fields, { updated_at: now() })
    saveStore(store)
    return user
  },
  deleteUser(id) {
    const store = loadStore()
    store.mf_users = store.mf_users.filter((u) => u.id !== id)
    store.mf_notebooks = store.mf_notebooks.filter((n) => n.user_id !== id)
    store.mf_site_folders = store.mf_site_folders.filter((f) => f.user_id !== id)
    saveStore(store)
  },

  // mf_notebooks ─────────────────────────────────────────────────────────────
  getNotebooks(userId) {
    const store = loadStore()
    const rows = userId
      ? store.mf_notebooks.filter((n) => n.user_id === userId)
      : store.mf_notebooks
    return rows
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .map((n) => {
        const owner = store.mf_users.find((u) => u.id === n.user_id) || {}
        return { ...n, owner_name: owner.full_name || '', owner_email: owner.email || '', owner_role: owner.role || '' }
      })
  },
  createNotebook({ user_id, title, color, emoji }) {
    const store = loadStore()
    const nb = { id: uuid(), user_id, title, color, emoji, created_at: now(), updated_at: now() }
    store.mf_notebooks.push(nb)
    saveStore(store)
    return nb
  },
  updateNotebook(id, fields) {
    const store = loadStore()
    const nb = store.mf_notebooks.find((n) => n.id === id)
    if (!nb) return null
    Object.assign(nb, fields, { updated_at: now() })
    saveStore(store)
    return nb
  },
  deleteNotebook(id) {
    const store = loadStore()
    store.mf_notebooks = store.mf_notebooks.filter((n) => n.id !== id)
    const sectionIds = store.mf_sections.filter((s) => s.notebook_id === id).map((s) => s.id)
    store.mf_sections = store.mf_sections.filter((s) => s.notebook_id !== id)
    const pageIds = store.mf_pages.filter((p) => sectionIds.includes(p.section_id)).map((p) => p.id)
    store.mf_pages = store.mf_pages.filter((p) => !sectionIds.includes(p.section_id))
    store.mf_page_comments = store.mf_page_comments.filter((c) => !pageIds.includes(c.page_id))
    saveStore(store)
  },

  // mf_sections ──────────────────────────────────────────────────────────────
  getSections(notebookId) {
    return loadStore().mf_sections
      .filter((s) => s.notebook_id === notebookId)
      .sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at))
  },
  createSection({ notebook_id, title, color }) {
    const store = loadStore()
    const s = { id: uuid(), notebook_id, title, color, sort_order: 0, created_at: now(), updated_at: now() }
    store.mf_sections.push(s)
    saveStore(store)
    return s
  },
  updateSection(id, fields) {
    const store = loadStore()
    const s = store.mf_sections.find((x) => x.id === id)
    if (!s) return null
    Object.assign(s, fields, { updated_at: now() })
    saveStore(store)
    return s
  },
  deleteSection(id) {
    const store = loadStore()
    store.mf_sections = store.mf_sections.filter((s) => s.id !== id)
    const pageIds = store.mf_pages.filter((p) => p.section_id === id).map((p) => p.id)
    store.mf_pages = store.mf_pages.filter((p) => p.section_id !== id)
    store.mf_page_comments = store.mf_page_comments.filter((c) => !pageIds.includes(c.page_id))
    saveStore(store)
  },

  // mf_pages ─────────────────────────────────────────────────────────────────
  getPages(sectionId) {
    return loadStore().mf_pages
      .filter((p) => p.section_id === sectionId)
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at))
  },
  createPage({ section_id, title = 'Untitled Page' }) {
    const store = loadStore()
    const p = { id: uuid(), section_id, title, content: '', is_pinned: false, sort_order: 0, created_at: now(), updated_at: now() }
    store.mf_pages.push(p)
    saveStore(store)
    return p
  },
  updatePage(id, fields) {
    const store = loadStore()
    const p = store.mf_pages.find((x) => x.id === id)
    if (!p) return null
    Object.assign(p, fields, { updated_at: now() })
    saveStore(store)
    return p
  },
  deletePage(id) {
    const store = loadStore()
    store.mf_pages = store.mf_pages.filter((p) => p.id !== id)
    store.mf_page_comments = store.mf_page_comments.filter((c) => c.page_id !== id)
    saveStore(store)
  },

  // mf_page_comments ─────────────────────────────────────────────────────────
  getComments(pageId) {
    const store = loadStore()
    return store.mf_page_comments
      .filter((c) => c.page_id === pageId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((c) => {
        const admin = store.mf_users.find((u) => u.id === c.admin_id) || {}
        return { ...c, full_name: admin.full_name || 'Admin', avatar_url: admin.avatar_url || null }
      })
  },
  addComment({ page_id, admin_id, comment }) {
    const store = loadStore()
    const c = { id: uuid(), page_id, admin_id, comment, created_at: now(), updated_at: now() }
    store.mf_page_comments.push(c)
    saveStore(store)
    return c
  },
  deleteComment(id) {
    const store = loadStore()
    store.mf_page_comments = store.mf_page_comments.filter((c) => c.id !== id)
    saveStore(store)
  },

  // mf_site_folders ──────────────────────────────────────────────────────────
  getFolders(userId = null) {
    const store = loadStore()
    const rows = userId
      ? store.mf_site_folders.filter((f) => f.user_id === userId)
      : store.mf_site_folders
    return rows
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .map((f) => {
        const owner = store.mf_users.find((u) => u.id === f.user_id) || {}
        return { ...f, owner_name: owner.full_name || '' }
      })
  },
  createFolder({ user_id, site_name, location, description }) {
    const store = loadStore()
    const f = { id: uuid(), user_id, site_name, location, description: description || null, cover_image: null, created_at: now(), updated_at: now() }
    store.mf_site_folders.push(f)
    saveStore(store)
    return f
  },
  updateFolder(id, fields) {
    const store = loadStore()
    const f = store.mf_site_folders.find((x) => x.id === id)
    if (!f) return null
    Object.assign(f, fields, { updated_at: now() })
    saveStore(store)
    return f
  },
  deleteFolder(id) {
    const store = loadStore()
    store.mf_site_folders = store.mf_site_folders.filter((f) => f.id !== id)
    store.mf_site_images = store.mf_site_images.filter((i) => i.folder_id !== id)
    saveStore(store)
  },

  // mf_notebook_access ───────────────────────────────────────────────────────
  getNotebookAccess(notebookId) {
    const store = loadStore()
    if (!store.mf_notebook_access) store.mf_notebook_access = []
    return store.mf_notebook_access
      .filter((a) => a.notebook_id === notebookId)
      .map((a) => ({ user_id: a.user_id }))
  },
  getSharedNotebooks(userId) {
    const store = loadStore()
    if (!store.mf_notebook_access) store.mf_notebook_access = []
    const accessedIds = store.mf_notebook_access
      .filter((a) => a.user_id === userId)
      .map((a) => a.notebook_id)
    return store.mf_notebooks
      .filter((n) => accessedIds.includes(n.id) && n.user_id !== userId)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .map((n) => {
        const owner = store.mf_users.find((u) => u.id === n.user_id) || {}
        return { ...n, owner_name: owner.full_name || '', owner_email: owner.email || '' }
      })
  },
  setNotebookAccess(notebookId, userIds) {
    const store = loadStore()
    if (!store.mf_notebook_access) store.mf_notebook_access = []
    // Remove existing access for this notebook
    store.mf_notebook_access = store.mf_notebook_access.filter((a) => a.notebook_id !== notebookId)
    // Add new entries
    for (const uid of userIds) {
      store.mf_notebook_access.push({ id: uuid(), notebook_id: notebookId, user_id: uid, created_at: now() })
    }
    saveStore(store)
  },

  // mf_site_images ───────────────────────────────────────────────────────────
  getImages(folderId) {
    const store = loadStore()
    return store.mf_site_images
      .filter((i) => i.folder_id === folderId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((i) => {
        const uploader = store.mf_users.find((u) => u.id === i.uploaded_by) || {}
        return { ...i, uploader_name: uploader.full_name || '' }
      })
  },
  addImage({ folder_id, file_name, file_url, file_size, caption, uploaded_by }) {
    const store = loadStore()
    const i = { id: uuid(), folder_id, file_name, file_url, file_size: file_size || null, caption: caption || null, uploaded_by: uploaded_by || null, created_at: now() }
    store.mf_site_images.push(i)
    saveStore(store)
    return i
  },
  deleteImage(id) {
    const store = loadStore()
    store.mf_site_images = store.mf_site_images.filter((i) => i.id !== id)
    saveStore(store)
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — dbQuery is used throughout the app.
// In localStorage mode we intercept the SQL string and route to localDB.
// In Neon mode we pass it straight through.
// ─────────────────────────────────────────────────────────────────────────────

export async function dbQuery(query, params = []) {
  if (USE_NEON) {
    const sql = await getNeon()
    return sql(query, params)
  }

  // ── LocalStorage router ──────────────────────────────────────────────────
  const q = query.replace(/\s+/g, ' ').trim()

  // mf_users
  if (q.includes('FROM mf_users') && q.includes('WHERE auth_id')) {
    const user = localDB.getUserByAuthId(params[0])
    return user ? [user] : []
  }
  if (q.startsWith('INSERT INTO mf_users') && q.includes('ON CONFLICT')) {
    const user = localDB.upsertUser({ auth_id: params[0], email: params[1], full_name: params[2], role: params[3] })
    return [user]
  }
  if (q.startsWith('SELECT * FROM mf_users')) {
    return localDB.getUsers()
  }
  if (q.startsWith('UPDATE mf_users')) {
    const fields = {}
    const keys = Object.keys(params).length > 1 ? parseUpdateFields(q, params) : {}
    const user = localDB.updateUser(params[0], keys)
    return user ? [user] : []
  }
  if (q.startsWith('DELETE FROM mf_users')) {
    localDB.deleteUser(params[0])
    return []
  }

  // mf_notebooks
  if (q.includes('FROM mf_notebooks') && q.includes('WHERE n.user_id')) {
    return localDB.getNotebooks(params[0])
  }
  if (q.includes('FROM mf_notebooks') && !q.includes('WHERE')) {
    return localDB.getNotebooks(null)
  }
  if (q.startsWith('INSERT INTO mf_notebooks')) {
    const nb = localDB.createNotebook({ user_id: params[0], title: params[1], color: params[2], emoji: params[3] })
    return [nb]
  }
  if (q.startsWith('UPDATE mf_notebooks')) {
    const fields = parseUpdateFields(q, params)
    const nb = localDB.updateNotebook(params[0], fields)
    return nb ? [nb] : []
  }
  if (q.startsWith('DELETE FROM mf_notebooks')) {
    localDB.deleteNotebook(params[0])
    return []
  }

  // mf_sections
  if (q.includes('FROM mf_sections') && q.includes('WHERE notebook_id')) {
    return localDB.getSections(params[0])
  }
  if (q.startsWith('INSERT INTO mf_sections')) {
    const s = localDB.createSection({ notebook_id: params[0], title: params[1], color: params[2] })
    return [s]
  }
  if (q.startsWith('UPDATE mf_sections')) {
    const fields = parseUpdateFields(q, params)
    const s = localDB.updateSection(params[0], fields)
    return s ? [s] : []
  }
  if (q.startsWith('DELETE FROM mf_sections')) {
    localDB.deleteSection(params[0])
    return []
  }

  // mf_pages
  if (q.includes('FROM mf_pages') && q.includes('WHERE section_id')) {
    return localDB.getPages(params[0])
  }
  if (q.startsWith('INSERT INTO mf_pages')) {
    const p = localDB.createPage({ section_id: params[0], title: params[1] })
    return [p]
  }
  if (q.startsWith('UPDATE mf_pages')) {
    const fields = parseUpdateFields(q, params)
    const p = localDB.updatePage(params[0], fields)
    return p ? [p] : []
  }
  if (q.startsWith('DELETE FROM mf_pages')) {
    localDB.deletePage(params[0])
    return []
  }

  // mf_page_comments
  if (q.includes('FROM mf_page_comments') || (q.includes('mf_page_comments c') && q.includes('WHERE c.page_id'))) {
    return localDB.getComments(params[0])
  }
  if (q.startsWith('INSERT INTO mf_page_comments')) {
    const c = localDB.addComment({ page_id: params[0], admin_id: params[1], comment: params[2] })
    return [c]
  }
  if (q.startsWith('DELETE FROM mf_page_comments')) {
    localDB.deleteComment(params[0])
    return []
  }

  // mf_site_folders
  if (q.includes('FROM mf_site_folders') && q.includes('WHERE f.user_id')) {
    return localDB.getFolders(params[0])
  }
  if (q.includes('FROM mf_site_folders') && !q.includes('WHERE')) {
    return localDB.getFolders(null)
  }
  if (q.startsWith('INSERT INTO mf_site_folders')) {
    const f = localDB.createFolder({ user_id: params[0], site_name: params[1], location: params[2], description: params[3] })
    return [f]
  }
  if (q.startsWith('UPDATE mf_site_folders')) {
    const fields = parseUpdateFields(q, params)
    const f = localDB.updateFolder(params[0], fields)
    return f ? [f] : []
  }
  if (q.startsWith('DELETE FROM mf_site_folders')) {
    localDB.deleteFolder(params[0])
    return []
  }

  // mf_notebook_access
  if (q.includes('mf_notebook_access') && q.includes('WHERE notebook_id')) {
    return localDB.getNotebookAccess(params[0])
  }
  if (q.includes('mf_notebook_access') && q.includes('WHERE n.user_id != $1')) {
    return localDB.getSharedNotebooks(params[0])
  }
  if (q.startsWith('DELETE FROM mf_notebook_access')) {
    // Handled atomically inside setNotebookAccess localDB method
    return []
  }
  if (q.startsWith('INSERT INTO mf_notebook_access')) {
    // Handled atomically inside setNotebookAccess localDB method
    return []
  }

  // mf_site_images
  if (q.includes('FROM mf_site_images') && q.includes('WHERE i.folder_id')) {
    return localDB.getImages(params[0])
  }
  if (q.startsWith('INSERT INTO mf_site_images')) {
    const i = localDB.addImage({ folder_id: params[0], file_name: params[1], file_url: params[2], file_size: params[3], caption: params[4], uploaded_by: params[5] })
    return [i]
  }
  if (q.startsWith('DELETE FROM mf_site_images')) {
    localDB.deleteImage(params[0])
    return []
  }

  console.warn('[localDB] Unhandled query:', q)
  return []
}

// ─── Helper: parse SET fields from parameterised UPDATE ──────────────────────
// e.g. "UPDATE mf_users SET role = $2, updated_at = NOW() WHERE id = $1"
// params = [id, roleValue]  → returns { role: roleValue }
function parseUpdateFields(query, params) {
  const setMatch = query.match(/SET (.+?) WHERE/i)
  if (!setMatch) return {}
  const setPart = setMatch[1]
  const fields = {}
  for (const assignment of setPart.split(',')) {
    const m = assignment.trim().match(/^(\w+)\s*=\s*\$(\d+)/)
    if (m) {
      const col = m[1]
      const idx = parseInt(m[2], 10) - 1  // $1 = params[0], but first param is the id (WHERE id = $1)
      // $1 is always the WHERE id; field params start at $2 → params[1]
      if (col !== 'updated_at') {
        fields[col] = params[idx]
      }
    }
  }
  return fields
}

// ─── Direct localDB export for admin section queries ─────────────────────────
export { localDB }

// ─── Schema SQL (for Neon setup) ─────────────────────────────────────────────
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS mf_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), auth_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT, department TEXT, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mf_notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES mf_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Notebook', color TEXT NOT NULL DEFAULT '#2f72fc',
  emoji TEXT DEFAULT '📓', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mf_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), notebook_id UUID NOT NULL REFERENCES mf_notebooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Section', color TEXT NOT NULL DEFAULT '#2f72fc',
  sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mf_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), section_id UUID NOT NULL REFERENCES mf_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Page', content TEXT DEFAULT '',
  is_pinned BOOLEAN DEFAULT FALSE, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mf_page_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), page_id UUID NOT NULL REFERENCES mf_pages(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES mf_users(id), comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mf_site_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES mf_users(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL, location TEXT NOT NULL, description TEXT, cover_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS mf_site_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), folder_id UUID NOT NULL REFERENCES mf_site_folders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL, file_url TEXT NOT NULL, file_size BIGINT, caption TEXT,
  uploaded_by UUID REFERENCES mf_users(id), created_at TIMESTAMPTZ DEFAULT NOW()
);
`

export const IS_LOCAL_MODE = !USE_NEON
export default { dbQuery, localDB, IS_LOCAL_MODE }
