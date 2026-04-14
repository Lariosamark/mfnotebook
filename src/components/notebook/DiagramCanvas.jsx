import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, ZoomIn, ZoomOut, Maximize2, Link2,
  MousePointer, ChevronDown, RotateCcw, Pencil, Square, Minus
} from 'lucide-react'

const NODE_TYPES = [
  { id: 'rect',          label: 'Process',  color: '#3b82f6', bg: '#eff6ff',  shape: 'rect' },
  { id: 'rounded',       label: 'Action',   color: '#22c55e', bg: '#f0fdf4',  shape: 'rounded' },
  { id: 'diamond',       label: 'Decision', color: '#f59e0b', bg: '#fffbeb',  shape: 'diamond' },
  { id: 'circle',        label: 'Terminal', color: '#8b5cf6', bg: '#f5f3ff',  shape: 'circle' },
  { id: 'parallelogram', label: 'I/O',      color: '#06b6d4', bg: '#ecfeff',  shape: 'parallelogram' },
  { id: 'server',        label: 'Server',   color: '#64748b', bg: '#f8fafc',  shape: 'server' },
  { id: 'database',      label: 'Database', color: '#ec4899', bg: '#fdf2f8',  shape: 'database' },
  { id: 'cloud',         label: 'Cloud',    color: '#6366f1', bg: '#eef2ff',  shape: 'cloud' },
  { id: 'switch',        label: 'Switch',   color: '#0891b2', bg: '#ecfeff',  shape: 'switch' },
]
const W = 130, H = 54
let _uid = 1
const uid = () => `n${Date.now()}_${_uid++}`
const DRAW_COLORS = ['#374151','#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2','#ec4899']

function NodeShape({ type, w, h, color, bg, selected, connecting }) {
  const t = NODE_TYPES.find(n => n.id === type) || NODE_TYPES[0]
  const c = color || t.color
  const b = bg   || t.bg
  const stroke = selected ? '#2563eb' : connecting ? '#f59e0b' : c
  const sw = selected || connecting ? 2.5 : 1.5

  if (t.shape === 'diamond') {
    const pts = `${w/2},4 ${w-4},${h/2} ${w/2},${h-4} 4,${h/2}`
    return <polygon points={pts} fill={b} stroke={stroke} strokeWidth={sw} />
  }
  if (t.shape === 'circle') {
    const r = Math.min(w, h) / 2 - 3
    return <circle cx={w/2} cy={h/2} r={r} fill={b} stroke={stroke} strokeWidth={sw} />
  }
  if (t.shape === 'parallelogram') {
    const s = 12
    const pts = `${s},2 ${w-2},2 ${w-s},${h-2} 2,${h-2}`
    return <polygon points={pts} fill={b} stroke={stroke} strokeWidth={sw} />
  }
  if (t.shape === 'database') {
    const ry = 8
    return (
      <g>
        <rect x={2} y={ry} width={w-4} height={h-ry*2} fill={b} stroke={stroke} strokeWidth={sw} rx={2} />
        <ellipse cx={w/2} cy={ry}   rx={(w-4)/2} ry={ry} fill={b} stroke={stroke} strokeWidth={sw} />
        <ellipse cx={w/2} cy={h-ry} rx={(w-4)/2} ry={ry} fill={b} stroke={stroke} strokeWidth={sw} />
      </g>
    )
  }
  if (t.shape === 'server') {
    const rows = 3, rh = (h - 8) / rows
    return (
      <g>
        <rect x={2} y={2} width={w-4} height={h-4} fill={b} stroke={stroke} strokeWidth={sw} rx={4} />
        {Array.from({length: rows}).map((_, i) => (
          <g key={i}>
            <rect x={6} y={6+i*rh} width={w-12} height={rh-4} fill="transparent" stroke={stroke} strokeWidth={0.8} rx={2} opacity={0.5} />
            <circle cx={w-14} cy={6+i*rh+(rh-4)/2} r={3} fill={stroke} opacity={0.7} />
          </g>
        ))}
      </g>
    )
  }
  if (t.shape === 'cloud') {
    const cx = w/2, cy = h/2
    return (
      <g>
        <ellipse cx={cx-18} cy={cy+8} rx={18} ry={14} fill={b} stroke={stroke} strokeWidth={sw} />
        <ellipse cx={cx+18} cy={cy+8} rx={18} ry={14} fill={b} stroke={stroke} strokeWidth={sw} />
        <ellipse cx={cx}    cy={cy-2} rx={22} ry={18} fill={b} stroke={stroke} strokeWidth={sw} />
        <rect x={2} y={cy+6} width={w-4} height={h/2-8} fill={b} stroke="none" />
        <line x1={2} y1={cy+14} x2={w-2} y2={cy+14} stroke={stroke} strokeWidth={sw} />
      </g>
    )
  }
  if (t.shape === 'switch') {
    return (
      <g>
        <rect x={2} y={h/2-10} width={w-4} height={20} fill={b} stroke={stroke} strokeWidth={sw} rx={10} />
        {[0.2, 0.4, 0.6, 0.8].map((x, i) => (
          <g key={i}>
            <line x1={w*x} y1={h/2-10} x2={w*x} y2={h/2-18} stroke={stroke} strokeWidth={1.5} />
            <circle cx={w*x} cy={h/2-20} r={3} fill={stroke} />
            <line x1={w*x} y1={h/2+10} x2={w*x} y2={h/2+18} stroke={stroke} strokeWidth={1.5} />
            <circle cx={w*x} cy={h/2+20} r={3} fill={stroke} />
          </g>
        ))}
      </g>
    )
  }
  const rx = t.shape === 'rounded' ? 20 : 6
  return <rect x={2} y={2} width={w-4} height={h-4} rx={rx} fill={b} stroke={stroke} strokeWidth={sw} />
}

function edgePath(n1, n2) {
  if (!n1 || !n2) return ''
  const x1 = n1.x + (n1.w||W)/2, y1 = n1.y + (n1.h||H)/2
  const x2 = n2.x + (n2.w||W)/2, y2 = n2.y + (n2.h||H)/2
  const dx = Math.abs(x2-x1), dy = Math.abs(y2-y1)
  const cx  = dx > dy ? (x1+x2)/2 : x1
  const cy  = dx > dy ? y1         : (y1+y2)/2
  const cx2 = dx > dy ? (x1+x2)/2 : x2
  const cy2 = dx > dy ? y2         : (y1+y2)/2
  return `M ${x1} ${y1} C ${cx} ${cy}, ${cx2} ${cy2}, ${x2} ${y2}`
}

export default function DiagramCanvas({ data, onChange, readOnly, style }) {
  const [nodes,        setNodes]       = useState(data?.nodes    || [])
  const [edges,        setEdges]       = useState(data?.edges    || [])
  const [drawings,     setDrawings]    = useState(data?.drawings || [])
  const [selected,     setSelected]    = useState(null)
  const [mode,         setMode]        = useState('select')
  const [connectSrc,   setConnectSrc]  = useState(null)
  const [editingNode,  setEditingNode] = useState(null)
  const [editLabel,    setEditLabel]   = useState('')
  const [zoom,         setZoom]        = useState(1)
  const [pan,          setPan]         = useState({ x: 20, y: 20 })
  const [dragging,     setDragging]    = useState(null)
  const [panning,      setPanning]     = useState(null)
  const [showAddMenu,  setShowAddMenu] = useState(false)
  const [mousePos,     setMousePos]    = useState({ x: 0, y: 0 })
  const [activeStroke, setActiveStroke] = useState(null)
  const [drawColor,    setDrawColor]   = useState('#374151')
  const [showColorRow, setShowColorRow] = useState(false)
  // tracks whether we've auto-fit once on mount (read-only)
  const didAutoFit = useRef(false)

  const svgRef        = useRef(null)
  const didDrag       = useRef(false)
  const isDrawing     = useRef(false)
  const lastPinchDist = useRef(null)
  const lastPinchMid  = useRef(null)
  const skipNotify    = useRef(true)

  // ── fit-view helper (extracted so we can call it on mount too) ──
  const fitView = useCallback(() => {
    const allNodes = nodes.length ? nodes : (data?.nodes || [])
    if (allNodes.length === 0) { setPan({ x: 20, y: 20 }); setZoom(1); return }
    const xs = allNodes.map(n => n.x)
    const ys = allNodes.map(n => n.y)
    const minX = Math.min(...xs) - 40
    const minY = Math.min(...ys) - 40
    const maxX = Math.max(...xs.map((x, i) => x + (allNodes[i].w || W))) + 40
    const maxY = Math.max(...ys.map((y, i) => y + (allNodes[i].h || H))) + 40
    const svgW = svgRef.current?.clientWidth  || 400
    const svgH = svgRef.current?.clientHeight || 280
    const s = Math.min(1.4, svgW / (maxX - minX), svgH / (maxY - minY))
    setZoom(s)
    setPan({
      x: -minX * s + (svgW - (maxX - minX) * s) / 2,
      y: -minY * s + (svgH - (maxY - minY) * s) / 2,
    })
  }, [nodes, data])

  // ── AUTO FIT on first render when read-only (shared view) ──
  useEffect(() => {
    if (!readOnly || didAutoFit.current) return
    // Wait one frame so the SVG has its real dimensions
    const raf = requestAnimationFrame(() => {
      fitView()
      didAutoFit.current = true
    })
    return () => cancelAnimationFrame(raf)
  }, [readOnly, fitView])

  // ── Re-fit when the container resizes (sidebar open/close on mobile) ──
  useEffect(() => {
    if (!readOnly || !svgRef.current) return
    const ro = new ResizeObserver(() => fitView())
    ro.observe(svgRef.current)
    return () => ro.disconnect()
  }, [readOnly, fitView])

  useEffect(() => {
    if (skipNotify.current) { skipNotify.current = false; return }
    const id = setTimeout(() => onChange?.({ nodes, edges, drawings }), 0)
    return () => clearTimeout(id)
  }, [nodes, edges, drawings])

  useEffect(() => {
    if (data) {
      skipNotify.current = true
      setNodes(data.nodes    || [])
      setEdges(data.edges    || [])
      setDrawings(data.drawings || [])
      // re-fit if read-only data changes
      if (readOnly) {
        didAutoFit.current = false
      }
    }
  }, [data?.nodes?.length, data?.edges?.length, data?.drawings?.length])

  const toSvg = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    }
  }, [pan, zoom])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const rect = svgRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => {
      const newZ = Math.min(3, Math.max(0.2, z * factor))
      setPan(p => ({
        x: mx - (mx - p.x) * (newZ / z),
        y: my - (my - p.y) * (newZ / z),
      }))
      return newZ
    })
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  useEffect(() => {
    const h = (e) => {
      if (readOnly || ['INPUT','TEXTAREA'].includes(e.target.tagName)) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        if (selected.type === 'node') {
          setNodes(ns => ns.filter(n => n.id !== selected.id))
          setEdges(es => es.filter(ed => ed.from !== selected.id && ed.to !== selected.id))
        } else if (selected.type === 'edge') {
          setEdges(es => es.filter(ed => ed.id !== selected.id))
        } else if (selected.type === 'drawing') {
          setDrawings(ds => ds.filter(d => d.id !== selected.id))
        }
        setSelected(null)
      }
      if (e.key === 'Escape') { setMode('select'); setConnectSrc(null); setSelected(null); setShowAddMenu(false) }
      if (e.key === 'v') setMode('select')
      if (e.key === 'c') { setMode('connect'); setConnectSrc(null); setSelected(null) }
      if (e.key === 'p') setMode('pen')
      if (e.key === 'b') setMode('box')
      if (e.key === 'l') setMode('line')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selected, readOnly])

  const addNode = (type) => {
    if (readOnly) return
    const t = NODE_TYPES.find(n => n.id === type) || NODE_TYPES[0]
    const id = uid()
    setNodes(ns => [...ns, { id, x: 80 + (ns.length * 25) % 500, y: 80 + (ns.length * 18) % 280, w: W, h: H, label: t.label, type }])
    setSelected({ type: 'node', id })
    setShowAddMenu(false)
  }

  const getSvgPos = (e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 }
  }

  const onSvgMouseDown = (e) => {
    if (e.button === 1) {
      e.preventDefault()
      setPanning({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y })
      return
    }
    if (e.button !== 0) return
    if (mode === 'pen' || mode === 'box' || mode === 'line') {
      e.preventDefault()
      isDrawing.current = true
      const pt = toSvg(e.clientX, e.clientY)
      if (mode === 'pen') setActiveStroke({ type: 'pen', pts: [pt], color: drawColor })
      else                setActiveStroke({ type: mode, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, color: drawColor })
    }
  }

  const onSvgMouseMove = (e) => {
    setMousePos(getSvgPos(e))
    if (panning) {
      setPan({ x: panning.px + (e.clientX - panning.sx), y: panning.py + (e.clientY - panning.sy) })
      return
    }
    if (dragging) {
      didDrag.current = true
      const pt = toSvg(e.clientX, e.clientY)
      setNodes(ns => ns.map(n => n.id === dragging.nodeId ? { ...n, x: pt.x - dragging.ox, y: pt.y - dragging.oy } : n))
      return
    }
    if (isDrawing.current && activeStroke) {
      const pt = toSvg(e.clientX, e.clientY)
      if (activeStroke.type === 'pen') setActiveStroke(s => ({ ...s, pts: [...s.pts, pt] }))
      else                             setActiveStroke(s => ({ ...s, x2: pt.x, y2: pt.y }))
    }
  }

  const onSvgMouseUp = (e) => {
    if (panning) { setPanning(null); return }
    if (dragging) { setDragging(null); return }
    if (isDrawing.current && activeStroke) {
      isDrawing.current = false
      const pt = toSvg(e.clientX, e.clientY)
      let stroke = activeStroke
      if (stroke.type === 'pen') stroke = { ...stroke, pts: [...stroke.pts, pt] }
      else                       stroke = { ...stroke, x2: pt.x, y2: pt.y }
      const hasSize = stroke.type === 'pen'
        ? stroke.pts.length > 2
        : (Math.abs(stroke.x2 - stroke.x1) > 3 || Math.abs(stroke.y2 - stroke.y1) > 3)
      if (hasSize) setDrawings(ds => [...ds, { ...stroke, id: uid() }])
      setActiveStroke(null)
    }
  }

  /* ── Touch ── */
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const [t0, t1] = e.touches
      const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY
      lastPinchDist.current = Math.sqrt(dx*dx + dy*dy)
      lastPinchMid.current  = { x: (t0.clientX + t1.clientX)/2, y: (t0.clientY + t1.clientY)/2 }
      setPanning(null); isDrawing.current = false; return
    }
    if (e.touches.length === 1) {
      const t = e.touches[0]
      if (mode === 'pen' || mode === 'box' || mode === 'line') {
        e.preventDefault()
        isDrawing.current = true
        const pt = toSvg(t.clientX, t.clientY)
        if (mode === 'pen') setActiveStroke({ type: 'pen', pts: [pt], color: drawColor })
        else                setActiveStroke({ type: mode, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, color: drawColor })
      } else {
        setPanning({ sx: t.clientX, sy: t.clientY, px: pan.x, py: pan.y })
      }
    }
  }

  const onTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const [t0, t1] = e.touches
      const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY
      const dist = Math.sqrt(dx*dx + dy*dy)
      const mid  = { x: (t0.clientX + t1.clientX)/2, y: (t0.clientY + t1.clientY)/2 }
      if (lastPinchDist.current && lastPinchMid.current) {
        const scale = dist / lastPinchDist.current
        const rect  = svgRef.current?.getBoundingClientRect()
        if (rect) {
          const mx = mid.x - rect.left, my = mid.y - rect.top
          setZoom(z => {
            const newZ = Math.min(3, Math.max(0.2, z * scale))
            setPan(p => ({ x: mx - (mx - p.x) * (newZ/z), y: my - (my - p.y) * (newZ/z) }))
            return newZ
          })
        }
        const pmx = lastPinchMid.current
        setPan(p => ({ x: p.x + (mid.x - pmx.x), y: p.y + (mid.y - pmx.y) }))
      }
      lastPinchDist.current = dist
      lastPinchMid.current  = mid
      return
    }
    if (e.touches.length === 1) {
      const t = e.touches[0]
      if (panning) setPan({ x: panning.px + (t.clientX - panning.sx), y: panning.py + (t.clientY - panning.sy) })
      if (isDrawing.current && activeStroke) {
        const pt = toSvg(t.clientX, t.clientY)
        if (activeStroke.type === 'pen') setActiveStroke(s => ({ ...s, pts: [...s.pts, pt] }))
        else                             setActiveStroke(s => ({ ...s, x2: pt.x, y2: pt.y }))
      }
    }
  }

  const onTouchEnd = (e) => {
    if (e.touches.length < 2) { lastPinchDist.current = null; lastPinchMid.current = null }
    if (e.touches.length === 0) {
      if (panning) { setPanning(null); return }
      if (isDrawing.current && activeStroke) {
        isDrawing.current = false
        const hasSize = activeStroke.type === 'pen'
          ? activeStroke.pts.length > 2
          : (Math.abs(activeStroke.x2 - activeStroke.x1) > 3 || Math.abs(activeStroke.y2 - activeStroke.y1) > 3)
        if (hasSize) setDrawings(ds => [...ds, { ...activeStroke, id: uid() }])
        setActiveStroke(null)
      }
    }
  }

  const onNodeMouseDown = (e, nodeId) => {
    if (readOnly) return
    e.stopPropagation()
    didDrag.current = false
    if (mode !== 'select') return
    const pt   = toSvg(e.clientX, e.clientY)
    const node = nodes.find(n => n.id === nodeId)
    setDragging({ nodeId, ox: pt.x - node.x, oy: pt.y - node.y })
  }

  const onNodeClick = (e, nodeId) => {
    e.stopPropagation()
    if (readOnly) return
    if (didDrag.current) { didDrag.current = false; return }
    if (mode === 'connect') {
      if (!connectSrc) {
        setConnectSrc(nodeId)
      } else if (connectSrc !== nodeId) {
        const exists = edges.find(ed =>
          (ed.from === connectSrc && ed.to === nodeId) ||
          (ed.from === nodeId && ed.to === connectSrc)
        )
        if (!exists) setEdges(es => [...es, { id: uid(), from: connectSrc, to: nodeId, label: '' }])
        setConnectSrc(null); setMode('select')
      }
      return
    }
    setSelected({ type: 'node', id: nodeId })
  }

  const onNodeDblClick = (e, nodeId) => {
    e.stopPropagation()
    if (readOnly) return
    const node = nodes.find(n => n.id === nodeId)
    setEditingNode(nodeId); setEditLabel(node.label)
  }

  const commitEdit = () => {
    if (editingNode) {
      setNodes(ns => ns.map(n => n.id === editingNode ? { ...n, label: editLabel } : n))
      setEditingNode(null)
    }
  }

  const onBgClick = () => {
    if (mode === 'connect' && connectSrc) { setConnectSrc(null); return }
    setSelected(null)
  }

  const nodeById    = id => nodes.find(n => n.id === id)
  const selectedNode = selected?.type === 'node' ? nodeById(selected.id) : null

  const penPath = (pts) =>
    pts.length < 2 ? '' :
    pts.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '')

  const isDrawMode = mode === 'pen' || mode === 'box' || mode === 'line'

  const deleteSelected = () => {
    if (!selected) return
    if (selected.type === 'node') {
      setNodes(ns => ns.filter(n => n.id !== selected.id))
      setEdges(es => es.filter(e => e.from !== selected.id && e.to !== selected.id))
    } else if (selected.type === 'edge') {
      setEdges(es => es.filter(e => e.id !== selected.id))
    } else {
      setDrawings(ds => ds.filter(d => d.id !== selected.id))
    }
    setSelected(null)
  }

  const setModeAndReset = (m) => {
    setMode(m)
    if (m !== 'connect') setConnectSrc(null)
    setShowColorRow(m === 'pen' || m === 'box' || m === 'line')
  }

  const toolBtnCls = (id) => {
    const active = mode === id
    if (!active) return 'p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors'
    const map = {
      connect: 'p-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200',
      pen:     'p-1.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-200',
      box:     'p-1.5 rounded-lg bg-green-100 text-green-700 border border-green-200',
      line:    'p-1.5 rounded-lg bg-cyan-100 text-cyan-700 border border-cyan-200',
      select:  'p-1.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-200',
    }
    return map[id] || 'p-1.5 rounded-lg bg-blue-100 text-blue-700'
  }

  const isEmpty = nodes.length === 0 && drawings.length === 0

  return (
    <div
      className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
      style={{ display: 'flex', flexDirection: 'column', minHeight: 280, ...style }}
    >
      {/* ── TOOLBAR (editor only) ── */}
      {!readOnly && (
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">

            {/* Add node */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowAddMenu(v => !v)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Node</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showAddMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowAddMenu(false)} />
                  <div className="absolute top-full left-0 mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-lg w-40">
                    <div className="p-1.5 space-y-0.5">
                      {NODE_TYPES.map(t => (
                        <button key={t.id} onClick={() => addNode(t.id)}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg font-medium">
                          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: t.color }} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />

            <button onClick={() => setModeAndReset('select')} title="Select (V)" className={toolBtnCls('select')}>
              <MousePointer className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setModeAndReset('connect')} title="Connect (C)" className={`${toolBtnCls('connect')} flex items-center gap-1`}>
              <Link2 className="w-3.5 h-3.5" />
              {mode === 'connect' && (
                <span className="text-xs font-medium hidden sm:inline">{connectSrc ? 'Target…' : 'Source…'}</span>
              )}
            </button>
            <button onClick={() => setModeAndReset('pen')}  title="Draw (P)" className={toolBtnCls('pen')}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setModeAndReset('box')}  title="Box (B)"  className={toolBtnCls('box')}>
              <Square className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setModeAndReset('line')} title="Line (L)" className={toolBtnCls('line')}>
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Mobile colour swatch toggle */}
            {isDrawMode && (
              <button onClick={() => setShowColorRow(v => !v)}
                className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Pick colour">
                <div className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: drawColor }} />
              </button>
            )}

            {/* Desktop colour swatches */}
            {isDrawMode && (
              <div className="hidden sm:flex items-center gap-1 ml-1">
                <div className="w-px h-5 bg-gray-200 mr-0.5 flex-shrink-0" />
                {DRAW_COLORS.map(c => (
                  <button key={c} onClick={() => setDrawColor(c)} title={c}
                    style={{ backgroundColor: c, width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                      border: drawColor === c ? '2px solid #111' : '1px solid #d1d5db' }}
                    className="transition-transform hover:scale-110" />
                ))}
              </div>
            )}

            <div className="flex-1" />

            {selected && (
              <button onClick={deleteSelected}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Del</span>
              </button>
            )}

            <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />

            <button onClick={() => setZoom(z => Math.min(3, z*1.2))}  className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg" title="Zoom in"><ZoomIn  className="w-3.5 h-3.5" /></button>
            <span className="text-xs text-gray-400 w-7 text-center font-mono flex-shrink-0">{Math.round(zoom*100)}%</span>
            <button onClick={() => setZoom(z => Math.max(0.2, z*0.8))} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
            <button onClick={fitView} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg" title="Fit view"><Maximize2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setNodes([]); setEdges([]); setDrawings([]); setSelected(null) }}
              className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg" title="Clear all">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile colour row */}
          {isDrawMode && showColorRow && (
            <div className="sm:hidden flex items-center gap-2 px-3 pb-2">
              <span className="text-xs text-gray-400 flex-shrink-0">Colour</span>
              <div className="flex items-center gap-2 flex-wrap">
                {DRAW_COLORS.map(c => (
                  <button key={c} onClick={() => setDrawColor(c)}
                    style={{ backgroundColor: c, width: 20, height: 20, borderRadius: '50%',
                      border: drawColor === c ? '2.5px solid #111' : '1.5px solid #d1d5db' }}
                    className="transition-transform active:scale-95" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── READ-ONLY TOOLBAR: fit button + zoom only ── */}
      {readOnly && !isEmpty && (
        <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-gray-50 border-b border-gray-200">
          <button onClick={fitView}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium">
            <Maximize2 className="w-3 h-3" /> Fit
          </button>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button onClick={() => setZoom(z => Math.min(3, z*1.2))}  className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><ZoomIn  className="w-3.5 h-3.5" /></button>
          <span className="text-xs text-gray-400 w-7 text-center font-mono">{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.2, z*0.8))} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><ZoomOut className="w-3.5 h-3.5" /></button>
          <span className="ml-auto text-xs text-gray-300 hidden sm:inline">Pinch or scroll to zoom · drag to pan</span>
        </div>
      )}

      {/* ── CANVAS ── */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ cursor: mode !== 'select' ? 'crosshair' : 'default', flex: '1 1 0', minHeight: 0 }}
      >
        {/* Read-only empty state */}
        {readOnly && isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="8" width="7" height="5" rx="1" strokeWidth="1.5"/>
                <rect x="14" y="8" width="7" height="5" rx="1" strokeWidth="1.5"/>
                <path d="M7 10.5h10" strokeWidth="1.5" strokeDasharray="2 2"/>
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">No diagram content yet</p>
            <p className="text-gray-300 text-xs">The author hasn't added any nodes</p>
          </div>
        )}

        {/* Editor empty state */}
        {!readOnly && isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center gap-1.5 px-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="8" width="7" height="5" rx="1" strokeWidth="1.5"/>
                <rect x="14" y="8" width="7" height="5" rx="1" strokeWidth="1.5"/>
                <path d="M7 10.5h10" strokeWidth="1.5" strokeDasharray="2 2"/>
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">Add a node or pick a draw tool</p>
            <p className="text-gray-300 text-xs hidden sm:block">Connect (C) · Draw (P) · Box (B) · Line (L) · Double-click to rename</p>
            <p className="text-gray-300 text-xs sm:hidden">Pinch to zoom · drag to pan</p>
          </div>
        )}

        <svg
          ref={svgRef}
          className="w-full h-full select-none"
          onMouseDown={onSvgMouseDown}
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
          onMouseLeave={onSvgMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={onBgClick}
          style={{
            background: 'radial-gradient(circle at 1px 1px, #e5e7eb 1px, transparent 0)',
            backgroundSize: '24px 24px',
            touchAction: 'none',
          }}
        >
          <defs>
            <marker id="dg-arrow"     markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0,10 3.5,0 7" fill="#94a3b8" />
            </marker>
            <marker id="dg-arrow-sel" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0,10 3.5,0 7" fill="#2563eb" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

            {/* Drawings */}
            {drawings.map(d => {
              const isSel  = selected?.type === 'drawing' && selected.id === d.id
              const stroke = isSel ? '#2563eb' : (d.color || '#374151')
              const sw     = isSel ? 3 : 2
              if (d.type === 'pen') {
                return <path key={d.id} d={penPath(d.pts)} fill="none"
                  stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
                  style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); if (!readOnly) setSelected({ type: 'drawing', id: d.id }) }} />
              }
              if (d.type === 'box') {
                const x = Math.min(d.x1, d.x2), y = Math.min(d.y1, d.y2)
                const bw = Math.abs(d.x2 - d.x1), bh = Math.abs(d.y2 - d.y1)
                return <rect key={d.id} x={x} y={y} width={bw} height={bh}
                  fill="transparent" stroke={stroke} strokeWidth={sw} rx={3}
                  style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); if (!readOnly) setSelected({ type: 'drawing', id: d.id }) }} />
              }
              if (d.type === 'line') {
                return <line key={d.id} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
                  stroke={stroke} strokeWidth={sw} strokeLinecap="round"
                  style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); if (!readOnly) setSelected({ type: 'drawing', id: d.id }) }} />
              }
              return null
            })}

            {/* Active stroke preview */}
            {activeStroke && (() => {
              const c = activeStroke.color || '#374151'
              if (activeStroke.type === 'pen')
                return <path d={penPath(activeStroke.pts)} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              if (activeStroke.type === 'box') {
                const x = Math.min(activeStroke.x1, activeStroke.x2), y = Math.min(activeStroke.y1, activeStroke.y2)
                const bw = Math.abs(activeStroke.x2 - activeStroke.x1), bh = Math.abs(activeStroke.y2 - activeStroke.y1)
                return <rect x={x} y={y} width={bw} height={bh} fill="transparent" stroke={c} strokeWidth={2} strokeDasharray="6,3" rx={3} />
              }
              if (activeStroke.type === 'line')
                return <line x1={activeStroke.x1} y1={activeStroke.y1} x2={activeStroke.x2} y2={activeStroke.y2} stroke={c} strokeWidth={2} strokeDasharray="6,3" strokeLinecap="round" />
            })()}

            {/* Edges */}
            {edges.map(edge => {
              const n1 = nodeById(edge.from), n2 = nodeById(edge.to)
              if (!n1 || !n2) return null
              const isSel = selected?.type === 'edge' && selected.id === edge.id
              const d     = edgePath(n1, n2)
              const mx    = (n1.x+(n1.w||W)/2 + n2.x+(n2.w||W)/2) / 2
              const my    = (n1.y+(n1.h||H)/2 + n2.y+(n2.h||H)/2) / 2
              return (
                <g key={edge.id}
                  onClick={e => { e.stopPropagation(); if (!readOnly) setSelected({ type: 'edge', id: edge.id }) }}
                  style={{ cursor: 'pointer' }}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                  <path d={d} fill="none"
                    stroke={isSel ? '#2563eb' : '#94a3b8'}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    markerEnd={`url(#${isSel ? 'dg-arrow-sel' : 'dg-arrow'})`} />
                  {edge.label && (
                    <text x={mx} y={my-6} textAnchor="middle" fontSize="11" fill="#6b7280"
                      fontFamily="sans-serif" style={{ userSelect: 'none' }}>
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Live connect preview */}
            {mode === 'connect' && connectSrc && (() => {
              const src = nodeById(connectSrc)
              if (!src) return null
              const sx = src.x + (src.w||W)/2, sy = src.y + (src.h||H)/2
              const tx = (mousePos.x - pan.x) / zoom, ty = (mousePos.y - pan.y) / zoom
              return <line x1={sx} y1={sy} x2={tx} y2={ty}
                stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,4" markerEnd="url(#dg-arrow)" />
            })()}

            {/* Nodes */}
            {nodes.map(node => {
              const nw    = node.w||W, nh = node.h||H
              const isSel = selected?.type === 'node' && selected.id === node.id
              const isConn = connectSrc === node.id
              const t     = NODE_TYPES.find(n => n.id === node.type) || NODE_TYPES[0]
              return (
                <g key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{ cursor: readOnly ? 'default' : (mode === 'connect' ? 'pointer' : (dragging?.nodeId === node.id ? 'grabbing' : 'grab')) }}
                  onMouseDown={e => onNodeMouseDown(e, node.id)}
                  onClick={e => onNodeClick(e, node.id)}
                  onDoubleClick={e => onNodeDblClick(e, node.id)}
                >
                  <svg width={nw} height={nh} overflow="visible">
                    <NodeShape type={node.type} w={nw} h={nh}
                      color={t.color} bg={t.bg} selected={isSel} connecting={isConn} />
                  </svg>
                  {editingNode === node.id ? (
                    <foreignObject x={4} y={nh/2-14} width={nw-8} height={28}>
                      <input
                        className="w-full h-full text-center text-xs font-semibold bg-white/90 border border-blue-400 rounded px-1 outline-none"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingNode(null) }}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    </foreignObject>
                  ) : (
                    <text x={nw/2} y={nh/2} textAnchor="middle" dominantBaseline="middle"
                      fontSize="11" fontWeight="600" fill={t.color}
                      style={{ userSelect: 'none', pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                      {node.label.length > 16 ? node.label.slice(0,14)+'…' : node.label}
                    </text>
                  )}
                  {isSel && (
                    <>
                      <rect x={-3} y={-3} width={nw+6} height={nh+6} fill="none"
                        stroke="#2563eb" strokeWidth={1.5} strokeDasharray="5,3" rx={4} opacity={0.6} />
                      {[[0,0],[nw/2,0],[nw,0],[nw,nh/2],[nw,nh],[nw/2,nh],[0,nh],[0,nh/2]].map(([hx,hy],i) => (
                        <rect key={i} x={hx-3} y={hy-3} width={6} height={6}
                          fill="white" stroke="#2563eb" strokeWidth={1.5} rx={1} />
                      ))}
                    </>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex-shrink-0 overflow-hidden">
        <span className="flex-shrink-0">{nodes.length}N</span>
        <span>·</span>
        <span className="flex-shrink-0">{edges.length}E</span>
        <span>·</span>
        <span className="flex-shrink-0">{drawings.length}D</span>
        {selectedNode && (
          <>
            <span className="text-blue-600 font-medium truncate hidden sm:inline">
              · "{selectedNode.label}" — dbl-click rename · Del delete
            </span>
            <span className="text-blue-600 font-medium truncate sm:hidden ml-1">
              · {selectedNode.label.slice(0,12)}{selectedNode.label.length > 12 ? '…' : ''}
            </span>
          </>
        )}
        {mode === 'connect' && (
          <span className="text-amber-600 font-medium flex-shrink-0">
            · {connectSrc ? 'tap target' : 'tap source'}
          </span>
        )}
        {!readOnly && (
          <span className="ml-auto text-gray-300 flex-shrink-0 hidden md:inline">
            scroll=zoom · mid-drag=pan · pinch on touch
          </span>
        )}
      </div>
    </div>
  )
}