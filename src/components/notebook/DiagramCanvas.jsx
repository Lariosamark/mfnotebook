import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, ZoomIn, ZoomOut, Maximize2, Link2,
  MousePointer, ChevronDown, RotateCcw
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────
   NODE TYPES — solid readable colors (not white!)
────────────────────────────────────────────────────────── */
const NODE_TYPES = [
  { id: 'rect',          label: 'Process',   color: '#1d4ed8', bg: '#dbeafe', textColor: '#1e3a8a', shape: 'rect' },
  { id: 'rounded',       label: 'Action',    color: '#15803d', bg: '#dcfce7', textColor: '#14532d', shape: 'rounded' },
  { id: 'diamond',       label: 'Decision',  color: '#b45309', bg: '#fef3c7', textColor: '#92400e', shape: 'diamond' },
  { id: 'circle',        label: 'Terminal',  color: '#7c3aed', bg: '#ede9fe', textColor: '#4c1d95', shape: 'circle' },
  { id: 'parallelogram', label: 'I/O',       color: '#0e7490', bg: '#cffafe', textColor: '#164e63', shape: 'parallelogram' },
  { id: 'server',        label: 'Server',    color: '#334155', bg: '#e2e8f0', textColor: '#0f172a', shape: 'server' },
  { id: 'database',      label: 'Database',  color: '#be185d', bg: '#fce7f3', textColor: '#9d174d', shape: 'database' },
  { id: 'cloud',         label: 'Cloud',     color: '#4338ca', bg: '#e0e7ff', textColor: '#312e81', shape: 'cloud' },
  { id: 'switch',        label: 'Switch',    color: '#0369a1', bg: '#e0f2fe', textColor: '#0c4a6e', shape: 'switch' },
]

const W = 130, H = 54

let UID = 1
const uid = () => `n${Date.now()}_${UID++}`

/* ──────────────────────────────────────────────────────────
   NODE SHAPES
────────────────────────────────────────────────────────── */
function NodeShape({ type, w, h, selected, connecting }) {
  const t = NODE_TYPES.find(n => n.id === type) || NODE_TYPES[0]
  const stroke = selected ? '#2563eb' : connecting ? '#f59e0b' : t.color
  const strokeW = selected || connecting ? 2.5 : 1.8
  const bg = t.bg

  if (t.shape === 'diamond') {
    const cx = w/2, cy = h/2
    return <polygon points={`${cx},4 ${w-4},${cy} ${cx},${h-4} 4,${cy}`} fill={bg} stroke={stroke} strokeWidth={strokeW} />
  }
  if (t.shape === 'circle') {
    const r = Math.min(w, h)/2 - 3
    return <circle cx={w/2} cy={h/2} r={r} fill={bg} stroke={stroke} strokeWidth={strokeW} />
  }
  if (t.shape === 'parallelogram') {
    const s = 12
    return <polygon points={`${s},2 ${w-2},2 ${w-s},${h-2} 2,${h-2}`} fill={bg} stroke={stroke} strokeWidth={strokeW} />
  }
  if (t.shape === 'database') {
    const ry = 8
    return (
      <g>
        <rect x={2} y={ry} width={w-4} height={h-ry*2} fill={bg} stroke={stroke} strokeWidth={strokeW} rx={2} />
        <ellipse cx={w/2} cy={ry} rx={(w-4)/2} ry={ry} fill={bg} stroke={stroke} strokeWidth={strokeW} />
        <ellipse cx={w/2} cy={h-ry} rx={(w-4)/2} ry={ry} fill={bg} stroke={stroke} strokeWidth={strokeW} />
      </g>
    )
  }
  if (t.shape === 'server') {
    const rows = 3, rh = (h-8)/rows
    return (
      <g>
        <rect x={2} y={2} width={w-4} height={h-4} fill={bg} stroke={stroke} strokeWidth={strokeW} rx={4} />
        {Array.from({length: rows}).map((_, i) => (
          <g key={i}>
            <rect x={6} y={6+i*rh} width={w-12} height={rh-4} fill="transparent" stroke={stroke} strokeWidth={0.8} rx={2} opacity={0.5} />
            <circle cx={w-14} cy={6+i*rh+(rh-4)/2} r={3} fill={stroke} opacity={0.8} />
          </g>
        ))}
      </g>
    )
  }
  if (t.shape === 'cloud') {
    const cx = w/2, cy = h/2
    return (
      <g>
        <ellipse cx={cx-18} cy={cy+8} rx={18} ry={14} fill={bg} stroke={stroke} strokeWidth={strokeW} />
        <ellipse cx={cx+18} cy={cy+8} rx={18} ry={14} fill={bg} stroke={stroke} strokeWidth={strokeW} />
        <ellipse cx={cx}    cy={cy-2} rx={22} ry={18} fill={bg} stroke={stroke} strokeWidth={strokeW} />
        <rect x={2} y={cy+6} width={w-4} height={h/2-8} fill={bg} stroke="none" />
        <line x1={2} y1={cy+14} x2={w-2} y2={cy+14} stroke={stroke} strokeWidth={strokeW} />
      </g>
    )
  }
  if (t.shape === 'switch') {
    return (
      <g>
        <rect x={2} y={h/2-10} width={w-4} height={20} fill={bg} stroke={stroke} strokeWidth={strokeW} rx={10} />
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
  return <rect x={2} y={2} width={w-4} height={h-4} rx={rx} fill={bg} stroke={stroke} strokeWidth={strokeW} />
}

/* ──────────────────────────────────────────────────────────
   EDGE — exits from nearest border point of each node
────────────────────────────────────────────────────────── */
function getEdgePort(src, dst) {
  // Returns [x, y] on the border of src facing dst
  const sw = src.w || W, sh = src.h || H
  const dw = dst.w || W, dh = dst.h || H

  const sx = src.x + sw/2, sy = src.y + sh/2
  const dx = dst.x + dw/2, dy = dst.y + dh/2

  const angle = Math.atan2(dy - sy, dx - sx)

  // Clamp to box boundary
  const hw = sw/2 - 2, hh = sh/2 - 2
  const tx = Math.cos(angle), ty = Math.sin(angle)

  let t = Infinity
  if (tx !== 0) t = Math.min(t, hw / Math.abs(tx))
  if (ty !== 0) t = Math.min(t, hh / Math.abs(ty))

  return [sx + tx * t, sy + ty * t]
}

function edgePath(n1, n2) {
  if (!n1 || !n2) return ''
  const [x1, y1] = getEdgePort(n1, n2)
  const [x2, y2] = getEdgePort(n2, n1)

  const dx = x2 - x1, dy = y2 - y1
  const dist = Math.sqrt(dx*dx + dy*dy)
  const curve = Math.min(dist * 0.45, 80)

  // Control points perpendicular to the line for a gentle S-curve
  const mx = (x1+x2)/2, my = (y1+y2)/2
  const nx = -dy/dist, ny = dx/dist // normal

  const cx1 = x1 + dx*0.35 + nx*curve*0.1
  const cy1 = y1 + dy*0.35 + ny*curve*0.1
  const cx2 = x2 - dx*0.35 + nx*curve*0.1
  const cy2 = y2 - dy*0.35 + ny*curve*0.1

  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}

/* ──────────────────────────────────────────────────────────
   MAIN CANVAS
────────────────────────────────────────────────────────── */
export default function DiagramCanvas({ data, onChange, readOnly }) {
  const [nodes, setNodes]           = useState(data?.nodes || [])
  const [edges, setEdges]           = useState(data?.edges || [])
  const [selected, setSelected]     = useState(null)
  const [mode, setMode]             = useState('select')
  const [connectSrc, setConnectSrc] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [editLabel, setEditLabel]   = useState('')
  const [zoom, setZoom]             = useState(1)
  const [pan, setPan]               = useState({ x: 20, y: 20 })
  const [dragging, setDragging]     = useState(null)
  const [panning, setPanning]       = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 })

  const svgRef   = useRef(null)
  const didDrag  = useRef(false)

  // Defer onChange so it never fires inside React's passive-effects flush.
  // Calling TipTap's updateAttributes during a useEffect still sits inside
  // React's commit phase when called synchronously — setTimeout(0) pushes
  // it past that boundary.
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange })

  useEffect(() => {
    const cb = onChangeRef.current
    if (!cb) return
    const id = setTimeout(() => cb({ nodes, edges }), 0)
    return () => clearTimeout(id)
  }, [nodes, edges])

  useEffect(() => {
    if (data) { setNodes(data.nodes || []); setEdges(data.edges || []) }
  }, [data?.nodes?.length, data?.edges?.length])

  const svgPoint = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top  - pan.y) / zoom,
    }
  }, [pan, zoom])

  /* KEYBOARD */
  useEffect(() => {
    const onKey = (e) => {
      if (readOnly) return
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        if (selected.type === 'node') {
          setNodes(ns => ns.filter(n => n.id !== selected.id))
          setEdges(es => es.filter(e => e.from !== selected.id && e.to !== selected.id))
        } else {
          setEdges(es => es.filter(e => e.id !== selected.id))
        }
        setSelected(null)
      }
      if (e.key === 'Escape') {
        setMode('select'); setConnectSrc(null); setSelected(null); setShowAddMenu(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, readOnly])

  /* ADD NODE */
  const addNode = (type) => {
    if (readOnly) return
    const t = NODE_TYPES.find(n => n.id === type) || NODE_TYPES[0]
    const id = uid()
    const x = (80 + nodes.length * 30) % 560
    const y = (80 + nodes.length * 20) % 280
    setNodes(ns => [...ns, { id, x, y, w: W, h: H, label: t.label, type }])
    setSelected({ type: 'node', id })
    setShowAddMenu(false)
  }

  /* DRAG */
  const onNodeMouseDown = (e, nodeId) => {
    if (readOnly || mode === 'connect') return
    e.stopPropagation()
    const pt = svgPoint(e)
    const node = nodes.find(n => n.id === nodeId)
    didDrag.current = false
    setDragging({ nodeId, ox: pt.x - node.x, oy: pt.y - node.y })
  }

  const onSvgMouseMove = (e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    if (dragging) {
      didDrag.current = true
      const pt = svgPoint(e)
      setNodes(ns => ns.map(n => n.id === dragging.nodeId
        ? { ...n, x: pt.x - dragging.ox, y: pt.y - dragging.oy } : n))
    }
    if (panning) {
      setPan({ x: panning.px + (e.clientX - panning.sx), y: panning.py + (e.clientY - panning.sy) })
    }
  }

  const onSvgMouseUp = () => { setDragging(null); setPanning(null) }

  const onSvgMouseDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault()
      setPanning({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y })
    }
  }

  /* CLICK NODE */
  const onNodeClick = (e, nodeId) => {
    e.stopPropagation()
    if (didDrag.current) return
    if (readOnly) return
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

  const onEdgeClick = (e, edgeId) => {
    e.stopPropagation()
    if (readOnly) return
    setSelected({ type: 'edge', id: edgeId })
  }

  const onBgClick = () => {
    if (mode === 'connect' && connectSrc) { setConnectSrc(null); setMode('select') }
    setSelected(null)
  }

  // Attach wheel listener as non-passive directly on the SVG element so
  // e.preventDefault() works (React 17+ registers synthetic wheel as passive).
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      setZoom(z => Math.min(3, Math.max(0.2, z * (e.deltaY > 0 ? 0.9 : 1.1))))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const fitView = () => {
    if (!nodes.length) { setPan({ x: 20, y: 20 }); setZoom(1); return }
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y)
    const minX = Math.min(...xs) - 20, minY = Math.min(...ys) - 20
    const maxX = Math.max(...xs.map((x,i) => x+(nodes[i].w||W))) + 20
    const maxY = Math.max(...ys.map((y,i) => y+(nodes[i].h||H))) + 20
    const sw = svgRef.current?.clientWidth || 800
    const sh = svgRef.current?.clientHeight || 450
    const s  = Math.min(1.2, sw/(maxX-minX), sh/(maxY-minY))
    setZoom(s)
    setPan({ x: -minX*s+(sw-(maxX-minX)*s)/2, y: -minY*s+(sh-(maxY-minY)*s)/2 })
  }

  const nodeById    = (id) => nodes.find(n => n.id === id)
  const selectedNode = selected?.type === 'node' ? nodeById(selected.id) : null

  return (
    <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm" style={{ height: 480 }}>

      {/* TOOLBAR */}
      {!readOnly && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0 flex-wrap">

          {/* Add Node */}
          <div className="relative">
            <button onClick={() => setShowAddMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Add Node <ChevronDown className="w-3 h-3" />
            </button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowAddMenu(false)} />
                <div className="absolute top-full left-0 mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-44">
                  <div className="p-1.5 grid grid-cols-1 gap-0.5">
                    {NODE_TYPES.map(t => (
                      <button key={t.id} onClick={() => addNode(t.id)}
                        className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg font-medium text-left">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: t.bg, border: `2px solid ${t.color}` }} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* Mode */}
          <button onClick={() => { setMode('select'); setConnectSrc(null) }}
            title="Select / Move"
            className={`p-1.5 rounded-lg text-xs transition-all ${mode === 'select' ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:bg-gray-200'}`}>
            <MousePointer className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setMode('connect'); setConnectSrc(null); setSelected(null) }}
            title="Connect nodes"
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'connect' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-gray-500 hover:bg-gray-200'
            }`}>
            <Link2 className="w-3.5 h-3.5" />
            {mode === 'connect'
              ? connectSrc ? <span>Click target…</span> : <span>Click source…</span>
              : <span>Connect</span>
            }
          </button>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          {selected && (
            <button
              onClick={() => {
                if (selected.type === 'node') {
                  setNodes(ns => ns.filter(n => n.id !== selected.id))
                  setEdges(es => es.filter(e => e.from !== selected.id && e.to !== selected.id))
                } else {
                  setEdges(es => es.filter(e => e.id !== selected.id))
                }
                setSelected(null)
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200">
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.type}
            </button>
          )}

          <div className="flex-1" />

          <button onClick={() => setZoom(z => Math.min(3, z*1.2))} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"><ZoomIn className="w-3.5 h-3.5" /></button>
          <span className="text-xs text-gray-400 w-10 text-center font-mono">{Math.round(zoom*100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.2, z*0.8))} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={fitView} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg" title="Fit view"><Maximize2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setNodes([]); setEdges([]); setSelected(null) }}
            className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg" title="Clear">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CANVAS */}
      <div className="flex-1 relative overflow-hidden" style={{ cursor: mode === 'connect' ? 'crosshair' : 'default' }}>
        <svg ref={svgRef}
          className="w-full h-full select-none"
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
          onMouseLeave={onSvgMouseUp}
          onMouseDown={onSvgMouseDown}
          onClick={onBgClick}
          style={{ background: 'radial-gradient(circle at 1px 1px, #d1d5db 1px, transparent 0)', backgroundSize: '22px 22px' }}>

          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
            <marker id="arrow-sel" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
            </marker>
            <marker id="arrow-connecting" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

            {/* EDGES */}
            {edges.map(edge => {
              const n1 = nodeById(edge.from), n2 = nodeById(edge.to)
              if (!n1 || !n2) return null
              const isSel = selected?.type === 'edge' && selected.id === edge.id
              const d = edgePath(n1, n2)
              const mx = (n1.x+(n1.w||W)/2 + n2.x+(n2.w||W)/2)/2
              const my = (n1.y+(n1.h||H)/2 + n2.y+(n2.h||H)/2)/2
              return (
                <g key={edge.id} onClick={e => onEdgeClick(e, edge.id)} style={{ cursor: 'pointer' }}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                  <path d={d} fill="none"
                    stroke={isSel ? '#2563eb' : '#64748b'}
                    strokeWidth={isSel ? 2.5 : 2}
                    markerEnd={`url(#${isSel ? 'arrow-sel' : 'arrow'})`} />
                  {edge.label && (
                    <text x={mx} y={my-6} textAnchor="middle"
                      fontSize="11" fill="#475569" fontFamily="sans-serif"
                      style={{ userSelect: 'none' }}>
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* CONNECTING PREVIEW LINE */}
            {mode === 'connect' && connectSrc && (() => {
              const src = nodeById(connectSrc)
              if (!src) return null
              const sx = src.x + (src.w||W)/2, sy = src.y + (src.h||H)/2
              const tx = (mousePos.x - pan.x) / zoom
              const ty = (mousePos.y - pan.y) / zoom
              return (
                <line x1={sx} y1={sy} x2={tx} y2={ty}
                  stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,4"
                  markerEnd="url(#arrow-connecting)" />
              )
            })()}

            {/* NODES */}
            {nodes.map(node => {
              const nw = node.w||W, nh = node.h||H
              const isSel  = selected?.type === 'node' && selected.id === node.id
              const isConn = connectSrc === node.id
              const t = NODE_TYPES.find(n => n.id === node.type) || NODE_TYPES[0]

              return (
                <g key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{ cursor: mode === 'connect' ? 'pointer' : (dragging?.nodeId === node.id ? 'grabbing' : 'grab') }}
                  onMouseDown={e => onNodeMouseDown(e, node.id)}
                  onClick={e => onNodeClick(e, node.id)}
                  onDoubleClick={e => onNodeDblClick(e, node.id)}>

                  <svg width={nw} height={nh} overflow="visible">
                    <NodeShape type={node.type} w={nw} h={nh} selected={isSel} connecting={isConn} />
                  </svg>

                  {/* Label */}
                  {editingNode === node.id ? (
                    <foreignObject x={4} y={nh/2-14} width={nw-8} height={28}>
                      <input
                        className="w-full h-full text-center text-xs font-semibold bg-white/90 border border-brand-400 rounded px-1 outline-none"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingNode(null) }}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    </foreignObject>
                  ) : (
                    <text
                      x={nw/2} y={nh/2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="11" fontWeight="700"
                      fill={t.textColor}
                      style={{ userSelect: 'none', pointerEvents: 'none', fontFamily: 'sans-serif' }}>
                      {node.label.length > 16 ? node.label.slice(0,14)+'…' : node.label}
                    </text>
                  )}

                  {/* Selection handles */}
                  {isSel && (
                    <>
                      <rect x={-3} y={-3} width={nw+6} height={nh+6} fill="none"
                        stroke="#2563eb" strokeWidth={1.5} strokeDasharray="5,3" rx={4} opacity={0.7} />
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

        {/* Empty state */}
        {nodes.length === 0 && !readOnly && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="3" y="8" width="7" height="5" rx="1" strokeWidth="1.5" />
                <rect x="14" y="8" width="7" height="5" rx="1" strokeWidth="1.5" />
                <path d="M7 10.5h10" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">Click "Add Node" to start your diagram</p>
            <p className="text-gray-300 text-xs">Use Connect mode to draw edges between nodes · Double-click to rename</p>
          </div>
        )}
      </div>

      {/* STATUS BAR */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 flex-shrink-0">
        <span>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{edges.length} connection{edges.length !== 1 ? 's' : ''}</span>
        {selectedNode && (
          <>
            <span>·</span>
            <span className="text-brand-600 font-medium">"{selectedNode.label}" selected</span>
            <span className="text-gray-300">— double-click to rename, Del to delete</span>
          </>
        )}
        {mode === 'connect' && (
          <>
            <span>·</span>
            <span className="text-amber-600 font-medium">
              {connectSrc ? 'Now click the target node' : 'Click the source node'}
            </span>
          </>
        )}
        {!readOnly && (
          <span className="ml-auto text-gray-300">Scroll to zoom · Middle-drag to pan · Double-click to rename</span>
        )}
      </div>
    </div>
  )
}
