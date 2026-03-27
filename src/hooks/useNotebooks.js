import { useState, useCallback } from 'react'
import { dbQuery } from '../lib/neon'
import { useAuth } from '../contexts/AuthContext'

export function useNotebooks() {
  const { profile } = useAuth()
  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchNotebooks = useCallback(async (userId = null) => {
    if (!profile) return
    setLoading(true)
    try {
      const id = userId || profile.id
      const rows = await dbQuery(
        `SELECT n.*, u.full_name as owner_name, u.email as owner_email
         FROM mf_notebooks n
         JOIN mf_users u ON u.id = n.user_id
         WHERE n.user_id = $1
         ORDER BY n.updated_at DESC`,
        [id]
      )
      setNotebooks(rows)
    } finally {
      setLoading(false)
    }
  }, [profile])

  const fetchAllNotebooks = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await dbQuery(
        `SELECT n.*, u.full_name as owner_name, u.email as owner_email, u.role as owner_role
         FROM mf_notebooks n
         JOIN mf_users u ON u.id = n.user_id
         ORDER BY u.full_name, n.updated_at DESC`
      )
      setNotebooks(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch admin notebooks the current user has been granted access to
  const fetchAdminNotebooks = useCallback(async () => {
    if (!profile) return []
    try {
      const rows = await dbQuery(
        `SELECT n.*, u.full_name as owner_name, u.email as owner_email
         FROM mf_notebooks n
         JOIN mf_users u ON u.id = n.user_id
         JOIN mf_notebook_access a ON a.notebook_id = n.id
         WHERE u.role = 'admin'
           AND a.user_id = $1
         ORDER BY n.updated_at DESC`,
        [profile.id]
      )
      return rows
    } catch (e) {
      console.error(e)
      return []
    }
  }, [profile])

  // Fetch which user_ids have access to a specific notebook
  const fetchNotebookAccess = useCallback(async (notebookId) => {
    try {
      const rows = await dbQuery(
        'SELECT user_id FROM mf_notebook_access WHERE notebook_id = $1',
        [notebookId]
      )
      return rows.map(r => r.user_id)
    } catch (e) {
      console.error(e)
      return []
    }
  }, [])

  // Replace all access entries for a notebook with the new list
  const setNotebookAccess = useCallback(async (notebookId, userIds) => {
    // Delete existing
    await dbQuery('DELETE FROM mf_notebook_access WHERE notebook_id = $1', [notebookId])
    // Insert new entries
    if (userIds.length > 0) {
      for (const uid of userIds) {
        await dbQuery(
          'INSERT INTO mf_notebook_access (notebook_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [notebookId, uid]
        )
      }
    }
  }, [])

  const createNotebook = async (title, color, emoji) => {
    const rows = await dbQuery(
      `INSERT INTO mf_notebooks (user_id, title, color, emoji)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [profile.id, title, color, emoji]
    )
    setNotebooks((prev) => [rows[0], ...prev])
    return rows[0]
  }

  const updateNotebook = async (id, updates) => {
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const rows = await dbQuery(
      `UPDATE mf_notebooks SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    setNotebooks((prev) => prev.map((n) => (n.id === id ? { ...n, ...rows[0] } : n)))
    return rows[0]
  }

  const deleteNotebook = async (id) => {
    await dbQuery('DELETE FROM mf_notebooks WHERE id = $1', [id])
    setNotebooks((prev) => prev.filter((n) => n.id !== id))
  }

  return { notebooks, loading, fetchNotebooks, fetchAllNotebooks, fetchAdminNotebooks, fetchNotebookAccess, setNotebookAccess, createNotebook, updateNotebook, deleteNotebook }
}

export function useSections() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchSections = useCallback(async (notebookId) => {
    if (!notebookId) return
    setSections([])  // clear stale sections immediately so old data never flashes
    setLoading(true)
    try {
      const rows = await dbQuery(
        'SELECT * FROM mf_sections WHERE notebook_id = $1 ORDER BY sort_order, created_at',
        [notebookId]
      )
      setSections(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  const createSection = async (notebookId, title, color) => {
    const rows = await dbQuery(
      `INSERT INTO mf_sections (notebook_id, title, color)
       VALUES ($1, $2, $3) RETURNING *`,
      [notebookId, title, color]
    )
    setSections((prev) => [...prev, rows[0]])
    return rows[0]
  }

  const updateSection = async (id, updates) => {
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const rows = await dbQuery(
      `UPDATE mf_sections SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...rows[0] } : s)))
    return rows[0]
  }

  const deleteSection = async (id) => {
    await dbQuery('DELETE FROM mf_sections WHERE id = $1', [id])
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  return { sections, loading, fetchSections, createSection, updateSection, deleteSection }
}

export function usePages() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchPages = useCallback(async (sectionId) => {
    if (!sectionId) return
    setPages([])   // clear stale pages immediately — no old content flashes
    setLoading(true)
    try {
      const rows = await dbQuery(
        'SELECT * FROM mf_pages WHERE section_id = $1 ORDER BY is_pinned DESC, sort_order, created_at',
        [sectionId]
      )
      setPages(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  // Call this when a section is deselected so stale pages don't linger in memory
  const clearPages = useCallback(() => {
    setPages([])
    setLoading(false)
  }, [])

  const createPage = async (sectionId, title = 'Untitled Page') => {
    const rows = await dbQuery(
      `INSERT INTO mf_pages (section_id, title) VALUES ($1, $2) RETURNING *`,
      [sectionId, title]
    )
    setPages((prev) => [...prev, rows[0]])
    return rows[0]
  }

  const updatePage = async (id, updates) => {
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const rows = await dbQuery(
      `UPDATE mf_pages SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...rows[0] } : p)))
    return rows[0]
  }

  const deletePage = async (id) => {
    await dbQuery('DELETE FROM mf_pages WHERE id = $1', [id])
    setPages((prev) => prev.filter((p) => p.id !== id))
  }

  const fetchComments = async (pageId) => {
    return dbQuery(
      `SELECT c.*, u.full_name, u.avatar_url, u.role as commenter_role
       FROM mf_page_comments c
       JOIN mf_users u ON u.id = c.admin_id
       WHERE c.page_id = $1
       ORDER BY c.created_at ASC`,
      [pageId]
    )
  }

  const addComment = async (pageId, userId, comment) => {
    return dbQuery(
      'INSERT INTO mf_page_comments (page_id, admin_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [pageId, userId, comment]
    )
  }

  const deleteComment = async (id) => {
    return dbQuery('DELETE FROM mf_page_comments WHERE id = $1', [id])
  }

  return { pages, loading, fetchPages, clearPages, createPage, updatePage, deletePage, fetchComments, addComment, deleteComment }
}
