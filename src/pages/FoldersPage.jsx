import { useEffect, useState, useCallback } from 'react'
import { useFolders } from '../hooks/useFolders'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { Modal, ConfirmModal } from '../components/ui/Toast'
import {
  Folder, FolderPlus, MapPin, Image as ImageIcon, Upload,
  Trash2, Pencil, X, Plus, ArrowLeft, Eye, Loader2,
  Grid3x3, List, Search, Building2, Calendar
} from 'lucide-react'
import { formatDate, fileSize } from '../lib/utils'
import { useDropzone } from 'react-dropzone'

export default function FoldersPage() {
  const { folders, loading, fetchFolders, createFolder, updateFolder, deleteFolder, fetchImages, addImage, deleteImage } = useFolders()
  const { isAdmin } = useAuth()
  const { showToast } = useApp()

  const [selectedFolder, setSelectedFolder] = useState(null)
  const [images, setImages] = useState([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editFolder, setEditFolder] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteImageId, setDeleteImageId] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [lightboxImg, setLightboxImg] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  useEffect(() => { fetchFolders() }, [])

  useEffect(() => {
    if (selectedFolder) loadImages(selectedFolder.id)
  }, [selectedFolder?.id])

  const loadImages = async (folderId) => {
    setLoadingImages(true)
    try {
      const imgs = await fetchImages(folderId)
      setImages(imgs)
    } finally {
      setLoadingImages(false)
    }
  }

  const handleCreateFolder = async (data) => {
    try {
      const f = await createFolder(data)
      setCreateOpen(false)
      setSelectedFolder(f)
      showToast('Site folder created')
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleUpdateFolder = async (data) => {
    try {
      await updateFolder(editFolder.id, data)
      setEditFolder(null)
      showToast('Folder updated')
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleDeleteFolder = async () => {
    await deleteFolder(deleteId)
    if (selectedFolder?.id === deleteId) setSelectedFolder(null)
    showToast('Folder deleted')
  }

  const handleDeleteImage = async () => {
    await deleteImage(deleteImageId)
    setImages((prev) => prev.filter((i) => i.id !== deleteImageId))
    showToast('Image deleted')
  }

  const filtered = folders.filter(
    (f) =>
      f.site_name.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Folder List Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-brand-600" />
              <h2 className="font-semibold text-slate-800 text-sm">Site Folders</h2>
              <span className="text-xs bg-slate-100 text-slate-400 rounded-full px-2 py-0.5">{folders.length}</span>
            </div>
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1 text-xs bg-brand-600 hover:bg-brand-500 text-slate-800 px-2.5 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search folders…"
              className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-brand-400 transition-colors" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Building2 className="w-10 h-10 text-surface-600 mb-3" />
              <p className="text-slate-400 text-sm">No site folders</p>
              <button onClick={() => setCreateOpen(true)} className="text-brand-600 text-xs mt-2 hover:text-brand-300">
                Create your first
              </button>
            </div>
          ) : (
            filtered.map((f) => (
              <FolderItem
                key={f.id}
                folder={f}
                active={selectedFolder?.id === f.id}
                onClick={() => setSelectedFolder(f)}
                onEdit={() => setEditFolder(f)}
                onDelete={() => setDeleteId(f.id)}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>
      </div>

      {/* Image Gallery Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFolder ? (
          <>
            {/* Gallery Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white/60 backdrop-blur-sm flex-shrink-0">
              <button onClick={() => setSelectedFolder(null)} className="lg:hidden text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-800 truncate">{selectedFolder.site_name}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-brand-600" />
                  <span className="text-xs text-slate-400">{selectedFolder.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  <button onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-800'}`}>
                    <Grid3x3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-800'}`}>
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button onClick={() => setUploadOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-slate-800 px-3 py-2 rounded-lg transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload Images
                </button>
              </div>
            </div>

            {/* Images */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingImages ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <ImageIcon className="w-9 h-9 text-slate-400" />
                  </div>
                  <h3 className="text-slate-800 font-medium mb-1">No images yet</h3>
                  <p className="text-slate-400 text-sm mb-4">Upload site photos to this folder</p>
                  <button onClick={() => setUploadOpen(true)}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-slate-800 text-sm px-4 py-2 rounded-xl transition-colors">
                    <Upload className="w-4 h-4" /> Upload Images
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <ImageGrid
                  images={images}
                  onView={setLightboxImg}
                  onDelete={(id) => setDeleteImageId(id)}
                  isAdmin={isAdmin}
                />
              ) : (
                <ImageList
                  images={images}
                  onView={setLightboxImg}
                  onDelete={(id) => setDeleteImageId(id)}
                  isAdmin={isAdmin}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Folder className="w-9 h-9 text-slate-400" />
            </div>
            <h3 className="text-slate-800 font-medium mb-1">Select a Site Folder</h3>
            <p className="text-slate-400 text-sm">Choose a folder to view and manage site images</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <FolderFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreateFolder} />
      {editFolder && (
        <FolderFormModal open onClose={() => setEditFolder(null)} onSave={handleUpdateFolder} initialData={editFolder} />
      )}
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDeleteFolder}
        title="Delete Folder" message="This will delete the folder and all its images permanently." danger />
      <ConfirmModal open={!!deleteImageId} onClose={() => setDeleteImageId(null)} onConfirm={handleDeleteImage}
        title="Delete Image" message="This image will be permanently removed." danger />

      {/* Upload Modal */}
      {uploadOpen && selectedFolder && (
        <UploadModal
          folderId={selectedFolder.id}
          onClose={() => setUploadOpen(false)}
          onUploaded={async () => { await loadImages(selectedFolder.id); showToast('Images uploaded') }}
          addImage={addImage}
        />
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 text-slate-800 bg-slate-100 p-2 rounded-full hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
          <img src={lightboxImg.file_url} alt={lightboxImg.file_name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          {lightboxImg.caption && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-slate-800 text-sm px-4 py-2 rounded-full">
              {lightboxImg.caption}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FolderItem({ folder, active, onClick, onEdit, onDelete, isAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
        active ? 'bg-brand-600/15 border border-brand-200' : 'hover:bg-slate-100 border border-transparent'
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-brand-600/10 border border-brand-200 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{folder.site_name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-slate-400" />
          <p className="text-xs text-slate-400 truncate">{folder.location}</p>
        </div>
        {folder.owner_name && (
          <p className="text-xs text-surface-600 mt-0.5">{folder.owner_name}</p>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-2 top-8 w-32 bg-slate-100 border border-slate-200 rounded-xl shadow-lifted z-10 animate-scale-in overflow-hidden">
            <button onClick={() => { onEdit(); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-200 transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {isAdmin && (
              <button onClick={() => { onDelete(); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ImageGrid({ images, onView, onDelete, isAdmin }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {images.map((img) => (
        <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer"
          onClick={() => onView(img)}>
          <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button className="bg-white/10 hover:bg-white/20 text-slate-800 p-2 rounded-full transition-colors backdrop-blur-sm"
              onClick={(e) => { e.stopPropagation(); onView(img) }}>
              <Eye className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button className="bg-red-500/20 hover:bg-red-500/40 text-red-300 p-2 rounded-full transition-colors backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); onDelete(img.id) }}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {img.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-slate-800 text-xs truncate">{img.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ImageList({ images, onView, onDelete, isAdmin }) {
  return (
    <div className="space-y-2">
      {images.map((img) => (
        <div key={img.id} className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-200 transition-colors">
          <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer" onClick={() => onView(img)}>
            <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-800 truncate">{img.file_name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {img.file_size && <span className="text-xs text-slate-400">{fileSize(img.file_size)}</span>}
              <span className="text-xs text-slate-400">{formatDate(img.created_at)}</span>
              {img.uploader_name && <span className="text-xs text-slate-400">by {img.uploader_name}</span>}
            </div>
            {img.caption && <p className="text-xs text-slate-400 mt-0.5 truncate">{img.caption}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => onView(img)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors">
              <Eye className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button onClick={() => onDelete(img.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function FolderFormModal({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState({
    siteName: initialData?.site_name || '',
    location: initialData?.location || '',
    description: initialData?.description || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.siteName.trim() || !form.location.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={initialData ? 'Edit Site Folder' : 'New Site Folder'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">Site Name *</label>
          <input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            className="w-full bg-slate-100 border border-slate-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none"
            placeholder="e.g., North Tower Construction" autoFocus />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">Location *</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full bg-slate-100 border border-slate-200 focus:border-brand-400 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none"
              placeholder="e.g., 123 Main St, City" />
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1.5">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full bg-slate-100 border border-slate-200 focus:border-brand-400 rounded-xl px-4 py-2.5 text-slate-800 text-sm outline-none resize-none"
            placeholder="Optional notes about this site…" />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">Cancel</button>
          <button type="submit" disabled={!form.siteName.trim() || !form.location.trim() || saving}
            className="px-4 py-2 text-sm rounded-xl bg-brand-600 hover:bg-brand-500 text-slate-800 font-medium disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : initialData ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function UploadModal({ folderId, onClose, onUploaded, addImage }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [captions, setCaptions] = useState({})

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => [...prev, ...accepted])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] },
    multiple: true,
  })

  const handleUpload = async () => {
    setUploading(true)
    try {
      for (const file of files) {
        const reader = new FileReader()
        const dataUrl = await new Promise((res) => { reader.onload = (e) => res(e.target.result); reader.readAsDataURL(file) })
        await addImage({
          folderId,
          fileName: file.name,
          fileUrl: dataUrl,
          fileSize: file.size,
          caption: captions[file.name] || '',
        })
      }
      await onUploaded()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Upload Images" size="lg">
      <div className="space-y-4">
        <div {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-brand-500 bg-brand-600/10' : 'border-slate-200 hover:border-slate-300 bg-slate-100/50'
          }`}>
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 text-sm">{isDragActive ? 'Drop images here…' : 'Drag & drop images, or click to browse'}</p>
          <p className="text-slate-400 text-xs mt-1">JPG, PNG, GIF, WebP, SVG</p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-3 bg-slate-100 rounded-xl p-3">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-12 h-10 object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{fileSize(f.size)}</p>
                </div>
                <input
                  value={captions[f.name] || ''}
                  onChange={(e) => setCaptions({ ...captions, [f.name]: e.target.value })}
                  placeholder="Caption…"
                  className="w-32 bg-slate-200 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-brand-400"
                />
                <button onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                  className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">Cancel</button>
          <button onClick={handleUpload} disabled={files.length === 0 || uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-brand-600 hover:bg-brand-500 text-slate-800 font-medium disabled:opacity-50 transition-colors">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
