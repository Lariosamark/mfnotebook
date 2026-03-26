import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date) {
  const d = new Date(date)
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`
  return format(d, 'MMM d, yyyy')
}

export function formatRelative(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function generateColor() {
  const colors = [
    '#2f72fc', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str, n = 60) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}

export const NOTEBOOK_EMOJIS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️', '📋', '🗂️']
export const SECTION_COLORS = [
  '#2f72fc', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#84cc16', '#14b8a6',
]
