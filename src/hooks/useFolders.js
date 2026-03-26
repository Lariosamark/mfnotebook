import { useState, useCallback } from 'react'
import { dbQuery } from '../lib/neon'
import { useAuth } from '../contexts/AuthContext'

export function useFolders() {
  const { profile, isAdmin } = useAuth()
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFolders = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const rows = isAdmin
        ? await dbQuery(
            `SELECT f.*, u.full_name as owner_name
             FROM mf_site_folders f
             JOIN mf_users u ON u.id = f.user_id
             ORDER BY f.updated_at DESC`
          )
        : await dbQuery(
            `SELECT f.*, u.full_name as owner_name
             FROM mf_site_folders f
             JOIN mf_users u ON u.id = f.user_id
             WHERE f.user_id = $1
             ORDER BY f.updated_at DESC`,
            [profile.id]
          )
      setFolders(rows)
    } finally {
      setLoading(false)
    }
  }, [profile, isAdmin])

  const createFolder = async ({ siteName, location, description }) => {
    const rows = await dbQuery(
      `INSERT INTO mf_site_folders (user_id, site_name, location, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [profile.id, siteName, location, description || null]
    )
    setFolders((prev) => [rows[0], ...prev])
    return rows[0]
  }

  const updateFolder = async (id, updates) => {
    const map = {
      siteName: 'site_name',
      location: 'location',
      description: 'description',
      cover_image: 'cover_image',
    }
    const fields = Object.keys(updates).map((k) => map[k] || k)
    const values = Object.values(updates)
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const rows = await dbQuery(
      `UPDATE mf_site_folders SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...rows[0] } : f)))
    return rows[0]
  }

  const deleteFolder = async (id) => {
    await dbQuery('DELETE FROM mf_site_folders WHERE id = $1', [id])
    setFolders((prev) => prev.filter((f) => f.id !== id))
  }

  const fetchImages = async (folderId) => {
    return dbQuery(
      `SELECT i.*, u.full_name as uploader_name
       FROM mf_site_images i
       LEFT JOIN mf_users u ON u.id = i.uploaded_by
       WHERE i.folder_id = $1
       ORDER BY i.created_at DESC`,
      [folderId]
    )
  }

  const addImage = async ({ folderId, fileName, fileUrl, fileSize, caption }) => {
    const rows = await dbQuery(
      `INSERT INTO mf_site_images (folder_id, file_name, file_url, file_size, caption, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [folderId, fileName, fileUrl, fileSize || null, caption || null, profile.id]
    )
    return rows[0]
  }

  const deleteImage = async (id) => {
    return dbQuery('DELETE FROM mf_site_images WHERE id = $1', [id])
  }

  return {
    folders, loading,
    fetchFolders, createFolder, updateFolder, deleteFolder,
    fetchImages, addImage, deleteImage,
  }
}

export function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await dbQuery(
        'SELECT * FROM mf_users ORDER BY role, full_name'
      )
      setUsers(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateUser = async (id, updates) => {
    const fields = Object.keys(updates)
    const values = Object.values(updates)
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ')
    const rows = await dbQuery(
      `UPDATE mf_users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...rows[0] } : u)))
    return rows[0]
  }

  const deleteUser = async (id) => {
    await dbQuery('DELETE FROM mf_users WHERE id = $1', [id])
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return { users, loading, fetchUsers, updateUser, deleteUser }
}
