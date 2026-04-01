import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Image as ImageIcon, Link as LinkIcon, Undo, Redo,
  Code, Quote, Minus, Type, Share2, MapPin, Navigation, Search,
  Mic, Square, Sparkles, X, CheckCheck, Satellite, Edit3
} from 'lucide-react'
import DiagramCanvas from './DiagramCanvas'

const COLORS = ['#111827','#15803d','#1d4ed8','#dc2626','#d97706','#7c3aed','#0891b2','#db2777']

/* ──────────────────────────────────────────────────────────
   DIAGRAM NODE — locked when saved, Change button to unlock
────────────────────────────────────────────────────────── */
const DiagramNodeView = ({ node, updateAttributes, selected, extension }) => {
  const editorReadOnly = extension.options.readOnly ?? false

  const data = (() => {
    try { return JSON.parse(node.attrs['data-diagram'] || '{"nodes":[],"edges":[]}') }
    catch { return { nodes: [], edges: [] } }
  })()

  const isSaved = node.attrs['data-saved'] === 'true'
  const [editing, setEditing] = useState(!isSaved)

  const handleChange = useCallback((newData) => {
    updateAttributes({ 'data-diagram': JSON.stringify(newData) })
  }, [updateAttributes])

  const handleSave = () => {
    updateAttributes({ 'data-saved': 'true' })
    setEditing(false)
  }

  const isLocked = (isSaved && !editing) || editorReadOnly

  return (
    <NodeViewWrapper className="diagram-node-wrapper my-4">
      <div className={`rounded-xl transition-all ${selected ? 'ring-2 ring-brand-400' : ''}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-200 rounded-t-xl border-b-0 flex-wrap">
          <Share2 className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-brand-700">Diagram / Topology</span>
          {isLocked
            ? <span className="text-xs text-brand-400 ml-1">{editorReadOnly ? '· View only — admin controls editing' : '· Click Change to edit'}</span>
            : <span className="text-xs text-brand-400 ml-1">· drag to move nodes · double-click to rename</span>
          }
          <div className="ml-auto flex items-center gap-1.5">
            {!editorReadOnly && isSaved && !editing && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 px-2 py-0.5 rounded-lg bg-brand-100 hover:bg-brand-200 border border-brand-300 font-semibold transition-colors">
                <Edit3 className="w-3 h-3" /> Change
              </button>
            )}
            {!editorReadOnly && editing && (
              <button onClick={handleSave}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 font-semibold transition-colors">
                ✓ Done
              </button>
            )}
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <DiagramCanvas data={data} onChange={isLocked ? undefined : handleChange} readOnly={isLocked} />
          {isLocked && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'default' }}
              title={editorReadOnly ? 'View only' : 'Click Change to edit'} />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

const DiagramExtension = TiptapNode.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addOptions() { return { readOnly: false } },
  addAttributes() {
    return {
      'data-diagram': { default: '{"nodes":[],"edges":[]}' },
      'data-saved':   { default: 'false' },
    }
  },
  parseHTML()  { return [{ tag: 'div[data-type="diagram"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'diagram' })]
  },
  addNodeView() { return ReactNodeViewRenderer(DiagramNodeView) },
})

/* ──────────────────────────────────────────────────────────
   MAP NODE — locked when saved, Change button to unlock
────────────────────────────────────────────────────────── */
const TILE_CONFIGS = {
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 },
  hybrid:    { url: null, maxZoom: 19 },
  street:    { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19 },
}
const LABELS_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'

function ensureLeafletCSS() {
  if (document.getElementById('leaflet-css')) return
  const link = document.createElement('link')
  link.id = 'leaflet-css'; link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
}

let leafletPromise = null
function loadLeaflet() {
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise((resolve) => {
    if (window.L) { resolve(window.L); return }
    ensureLeafletCSS()
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.onload = () => resolve(window.L)
    document.head.appendChild(s)
  })
  return leafletPromise
}

const MapNodeView = ({ node, updateAttributes, selected, extension }) => {
  const editorReadOnly = extension.options.readOnly ?? false

  const lat   = node.attrs['data-lat']   || ''
  const lng   = node.attrs['data-lng']   || ''
  const label = node.attrs['data-label'] || ''
  const saved = node.attrs['data-saved'] === 'true'

  const [mode, setMode]                 = useState((lat && saved) ? 'saved' : 'picking')
  const [searchVal, setSearchVal]       = useState('')
  const [searching, setSearching]       = useState(false)
  const [suggestions, setSuggestions]   = useState([])
  const [error, setError]               = useState('')
  const [pendingLat, setPendingLat]     = useState(lat)
  const [pendingLng, setPendingLng]     = useState(lng)
  const [pendingLabel, setPendingLabel] = useState(label)
  const [reverseLoading, setRevLoading] = useState(false)
  const [activeLayer, setActiveLayer]   = useState('satellite')

  const mapRef     = useRef(null)
  const leafletMap = useRef(null)
  const markerRef  = useRef(null)
  const tileRef    = useRef(null)
  const labelsRef  = useRef(null)
  const mapId      = useRef(`mfmap-${Math.random().toString(36).slice(2)}`)
  const modeRef    = useRef(mode)
  useEffect(() => { modeRef.current = mode }, [mode])

  const makeIcon = (L, color = '#10b981') => L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
    iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -28],
  })

  const applyLayer = useCallback(async (key) => {
    const L = await loadLeaflet()
    const map = leafletMap.current
    if (!map) return
    if (tileRef.current)   { map.removeLayer(tileRef.current);  tileRef.current  = null }
    if (labelsRef.current) { map.removeLayer(labelsRef.current); labelsRef.current = null }
    if (key === 'hybrid') {
      tileRef.current   = L.tileLayer(TILE_CONFIGS.satellite.url, { maxZoom: 19 }).addTo(map)
      labelsRef.current = L.tileLayer(LABELS_URL, { maxZoom: 19, opacity: 0.85 }).addTo(map)
    } else {
      tileRef.current = L.tileLayer(TILE_CONFIGS[key].url, { maxZoom: 19 }).addTo(map)
    }
  }, [])

  const switchLayer = (key) => { setActiveLayer(key); applyLayer(key) }

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || leafletMap.current) return
      ensureLeafletCSS()
      const initLat = lat ? +lat : 14.5995
      const initLng = lng ? +lng : 120.9842
      const zoom    = lat ? 18 : 5

      const map = L.map(mapRef.current, {
        center: [initLat, initLng], zoom,
        zoomControl: true, attributionControl: false,
        dragging: true, scrollWheelZoom: true,
      })

      tileRef.current = L.tileLayer(TILE_CONFIGS.satellite.url, { maxZoom: 19 }).addTo(map)

      if (lat && lng) {
        markerRef.current = L.marker([+lat, +lng], { icon: makeIcon(L) }).addTo(map)
        if (label) markerRef.current.bindPopup(label.split(',')[0]).openPopup()
      }

      map.on('click', async (e) => {
        if (modeRef.current === 'saved' || editorReadOnly) return
        const { lat: clat, lng: clng } = e.latlng
        const icon = makeIcon(L, '#f59e0b')
        if (markerRef.current) { markerRef.current.setLatLng([clat, clng]); markerRef.current.setIcon(icon) }
        else markerRef.current = L.marker([clat, clng], { icon }).addTo(map)
        setRevLoading(true)
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${clat}&lon=${clng}&format=json`, { headers: { 'Accept-Language': 'en' } })
          const data = await res.json()
          const name = data.display_name || `${clat.toFixed(5)}, ${clng.toFixed(5)}`
          markerRef.current.bindPopup(name.split(',')[0]).openPopup()
          setPendingLat(String(clat)); setPendingLng(String(clng)); setPendingLabel(name)
        } catch {
          const name = `${clat.toFixed(5)}, ${clng.toFixed(5)}`
          setPendingLat(String(clat)); setPendingLng(String(clng)); setPendingLabel(name)
        } finally { setRevLoading(false) }
      })

      leafletMap.current = map
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => () => {
    if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; markerRef.current = null }
  }, [])

  useEffect(() => {
    const map = leafletMap.current; if (!map) return
    const locked = mode === 'saved' || editorReadOnly
    if (locked) {
      map.dragging.disable(); map.scrollWheelZoom.disable()
      map.doubleClickZoom.disable(); map.touchZoom.disable()
    } else {
      map.dragging.enable(); map.scrollWheelZoom.enable()
      map.doubleClickZoom.enable(); map.touchZoom.enable()
    }
  }, [mode, editorReadOnly])

  const doSearch = async (q) => {
    if (!q.trim()) return
    setSearching(true); setError(''); setSuggestions([])
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6`, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      if (!data.length) setError('No results found.')
      setSuggestions(data)
    } catch { setError('Search failed.') }
    finally   { setSearching(false) }
  }

  const pickSuggestion = async (place) => {
    setSuggestions([])
    const plat = +place.lat, plng = +place.lon
    setPendingLat(place.lat); setPendingLng(place.lon); setPendingLabel(place.display_name)
    await loadLeaflet().then((L) => {
      if (!leafletMap.current) return
      leafletMap.current.setView([plat, plng], 18, { animate: true })
      const icon = makeIcon(L, '#f59e0b')
      if (markerRef.current) { markerRef.current.setLatLng([plat, plng]); markerRef.current.setIcon(icon) }
      else markerRef.current = L.marker([plat, plng], { icon }).addTo(leafletMap.current)
      markerRef.current.bindPopup(place.display_name.split(',')[0]).openPopup()
    })
  }

  const saveLocation = () => {
    if (!pendingLat || !pendingLng) return
    loadLeaflet().then((L) => { if (markerRef.current) markerRef.current.setIcon(makeIcon(L, '#10b981')) })
    updateAttributes({ 'data-lat': pendingLat, 'data-lng': pendingLng, 'data-label': pendingLabel, 'data-saved': 'true' })
    setSuggestions([]); setSearchVal(''); setMode('saved')
  }

  const cancelChange = () => {
    setPendingLat(lat); setPendingLng(lng); setPendingLabel(label)
    setSuggestions([]); setSearchVal(''); setError('')
    if (lat && lng && leafletMap.current) {
      loadLeaflet().then((L) => {
        leafletMap.current.setView([+lat, +lng], 18, { animate: true })
        if (markerRef.current) {
          markerRef.current.setLatLng([+lat, +lng]); markerRef.current.setIcon(makeIcon(L, '#10b981'))
          if (label) markerRef.current.bindPopup(label.split(',')[0]).openPopup()
        }
      })
    }
    setMode('saved')
  }

  const isSavedMode = mode === 'saved'
  const isChanging  = mode === 'changing'
  const isEditing   = mode === 'picking' || isChanging
  const hasPending  = !!(pendingLat && pendingLng)
  const displayLabel = (isSavedMode ? label : pendingLabel) || label
  const isLocked    = isSavedMode || editorReadOnly

  return (
    <NodeViewWrapper className="map-node-wrapper my-4" contentEditable={false}>
      <div className={`rounded-xl border overflow-hidden transition-all bg-white ${selected ? 'ring-2 ring-brand-400 border-brand-300' : 'border-gray-200 shadow-sm'}`}>

        {/* HEADER */}
        <div className={`flex items-center gap-2 px-3 py-2 border-b flex-wrap ${isSavedMode ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSavedMode ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span className={`text-xs font-semibold flex-1 truncate min-w-0 ${isSavedMode ? 'text-emerald-700' : 'text-amber-700'}`}>
            {displayLabel ? displayLabel.split(',').slice(0,3).join(', ') : isEditing ? 'Drop a pin or search…' : 'No location set'}
          </span>
          {reverseLoading && <span className="w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-600 rounded-full animate-spin flex-shrink-0" />}

          {/* Layer switcher */}
          <div className="flex items-center gap-0.5 bg-white/80 border border-gray-200 rounded-lg p-0.5 flex-shrink-0">
            {['satellite','hybrid','street'].map(k => (
              <button key={k} onClick={() => switchLayer(k)}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors capitalize ${activeLayer === k ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                {k}
              </button>
            ))}
          </div>

          {editorReadOnly && (
            <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              👁 View Only
            </span>
          )}

          {!editorReadOnly && isSavedMode && (
            <>
              <button onClick={() => setMode('changing')}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 font-semibold border border-emerald-300 transition-colors flex-shrink-0">
                ✏️ Change
              </button>
              <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 font-medium border border-emerald-200 transition-colors flex-shrink-0">
                <Navigation className="w-3 h-3" /> Open
              </a>
            </>
          )}
          {!editorReadOnly && isEditing && isChanging && (
            <button onClick={cancelChange}
              className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium border border-gray-200 transition-colors flex-shrink-0">
              ✕ Cancel
            </button>
          )}
        </div>

        {/* EDITING PANEL */}
        {!editorReadOnly && isEditing && (
          <div className="p-3 bg-white border-b border-gray-100 space-y-2">
            <div className="flex gap-2">
              <input className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400 bg-gray-50"
                placeholder="Search for a place or address…"
                value={searchVal} onChange={e => setSearchVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(searchVal)} autoFocus />
              <button onClick={() => doSearch(searchVal)} disabled={searching}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0">
                {searching ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> : <Search className="w-3.5 h-3.5" />}
                Search
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {suggestions.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 text-gray-700 border-b border-gray-100 last:border-0 transition-colors">
                    <span className="font-semibold text-gray-800">{s.display_name.split(',')[0]}</span>
                    <span className="text-gray-400 ml-1 block truncate">{s.display_name.split(',').slice(1,4).join(', ')}</span>
                  </button>
                ))}
              </div>
            )}
            {hasPending && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span className="text-xs text-amber-800 flex-1 truncate font-medium min-w-0">
                  {pendingLabel ? pendingLabel.split(',').slice(0,3).join(', ') : `${(+pendingLat).toFixed(5)}, ${(+pendingLng).toFixed(5)}`}
                </span>
                <button onClick={saveLocation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm whitespace-nowrap flex-shrink-0">
                  ✓ Save Location
                </button>
              </div>
            )}
            {!hasPending && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Satellite className="w-3 h-3 flex-shrink-0" />
                Click anywhere on the satellite map to drop a pin, or search above
              </p>
            )}
          </div>
        )}

        {/* SAVED BADGE */}
        {isSavedMode && !editorReadOnly && (
          <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-700 flex items-center gap-1.5 font-medium flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
            Location saved · Satellite view · Click <strong>Change</strong> to update
          </div>
        )}

        {/* MAP */}
        <div style={{ position: 'relative' }}>
          <div ref={mapRef} id={mapId.current} style={{ height: 300, width: '100%' }} />
          {isLocked && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 800, cursor: 'default', background: 'transparent' }}
              title={editorReadOnly ? 'View only — admin controls editing' : "Location saved. Click 'Change' to edit."} />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

const MapExtension = TiptapNode.create({
  name: 'mapblock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addOptions() { return { readOnly: false } },
  addAttributes() {
    return {
      'data-lat':   { default: '' },
      'data-lng':   { default: '' },
      'data-label': { default: '' },
      'data-saved': { default: 'false' },
    }
  },
  parseHTML()  { return [{ tag: 'div[data-type="mapblock"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mapblock' })]
  },
  addNodeView() { return ReactNodeViewRenderer(MapNodeView) },
})

/* ──────────────────────────────────────────────────────────
   VOICE RECORDING NODE — renders audio player + transcript
   inside the editor as a proper React NodeView
────────────────────────────────────────────────────────── */
const VoiceRecordingNodeView = ({ node, selected }) => {
  const audioSrc   = node.attrs['data-audio']      || ''
  const transcript = node.attrs['data-transcript'] || ''
  const timestamp  = node.attrs['data-timestamp']  || ''
  const duration   = node.attrs['data-duration']   || ''

  return (
    <NodeViewWrapper className="voice-recording-node my-3" contentEditable={false}>
      <div className={`rounded-xl border-2 overflow-hidden transition-all ${selected ? 'border-violet-400' : 'border-violet-100'}`}
        style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)' }}>
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-violet-100">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span style={{ fontSize: 13 }}>🎙</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-violet-700">Voice Recording</p>
            <p className="text-[11px] text-violet-400">
              {timestamp}{duration ? ` · ${duration}` : ''}
            </p>
          </div>
        </div>

        {/* Audio player */}
        {audioSrc && (
          <div className="px-4 pt-3 pb-1">
            <audio
              controls
              src={audioSrc}
              style={{ width: '100%', borderRadius: 8, height: 36, display: 'block' }}
            />
          </div>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="px-4 pt-2 pb-4">
            {audioSrc && <div className="border-t border-violet-100 mb-2.5" />}
            <p className="text-[11px] font-semibold text-violet-400 mb-1 uppercase tracking-wide">Transcript</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

const VoiceRecordingExtension = TiptapNode.create({
  name: 'voicerecording',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      'data-audio':      { default: '' },
      'data-transcript': { default: '' },
      'data-timestamp':  { default: '' },
      'data-duration':   { default: '' },
    }
  },
  parseHTML()  { return [{ tag: 'div[data-type="voicerecording"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'voicerecording' })]
  },
  addNodeView() { return ReactNodeViewRenderer(VoiceRecordingNodeView) },
})

/* ──────────────────────────────────────────────────────────
   VOICE RECORDER PANEL
   Saves BOTH audio recording (base64) AND transcript into note
   Done button is always visible — does NOT wait for recording to turn black
────────────────────────────────────────────────────────── */
function VoiceRecorderPanel({ onInsert, onClose }) {
  const [isRecording, setIsRecording]     = useState(false)
  const [liveText, setLiveText]           = useState('')
  const [finalText, setFinalText]         = useState('')
  const [cleaning, setCleaning]           = useState(false)
  const [cleanedText, setCleanedText]     = useState('')
  const [error, setError]                 = useState('')
  const [lang, setLang]                   = useState('en-US')
  const [supported, setSupported]         = useState(null)
  const [audioBlob, setAudioBlob]         = useState(null)
  const [audioDuration, setAudioDuration] = useState(0)

  const recognitionRef     = useRef(null)
  const finalAccumRef      = useRef('')
  const stoppedManuallyRef = useRef(false)
  const isRecordingRef     = useRef(false)
  const mediaRecorderRef   = useRef(null)
  const audioChunksRef     = useRef([])
  const timerRef           = useRef(null)
  const durationRef        = useRef(0)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(!!SR)
    if (!SR) setError('Speech Recognition is not supported. Please open in Chrome or Edge.')
  }, [])

  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])

  useEffect(() => () => {
    clearInterval(timerRef.current)
    try { recognitionRef.current?.abort() } catch {}
    try { if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop() } catch {}
  }, [])

  const formatDuration = (secs) => {
    if (!secs) return ''
    const m = Math.floor(secs / 60), s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const buildRecognition = (langCode) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null
    const r = new SR()
    r.lang = langCode; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1

    r.onresult = (e) => {
      let interim = '', newFinal = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) newFinal += t + ' '
        else interim += t
      }
      if (newFinal) { finalAccumRef.current += newFinal; setFinalText(finalAccumRef.current) }
      setLiveText(interim)
    }

    r.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Allow microphone in your browser settings.')
        stoppedManuallyRef.current = true; setIsRecording(false)
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError(`Recording error: "${e.error}". Try refreshing.`)
      }
    }

    r.onend = () => {
      setLiveText('')
      if (!stoppedManuallyRef.current && isRecordingRef.current) {
        try { r.start() } catch {}
      } else { setIsRecording(false) }
    }

    return r
  }

  const startRecording = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Not supported. Use Chrome or Edge.'); return }
    setError(''); setLiveText(''); setFinalText(''); setCleanedText(''); setAudioBlob(null)
    finalAccumRef.current = ''
    stoppedManuallyRef.current = false
    durationRef.current = 0; setAudioDuration(0)
    audioChunksRef.current = []

    // Start audio capture
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(200)
      mediaRecorderRef.current = mr
    } catch { /* audio capture optional */ }

    // Start speech recognition
    const recognition = buildRecognition(lang)
    if (!recognition) return
    try {
      recognition.start()
      recognitionRef.current = recognition
      setIsRecording(true)
      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setAudioDuration(durationRef.current)
      }, 1000)
    } catch (err) {
      setError(`Could not start: ${err.message}. Try refreshing.`)
    }
  }

  const stopRecording = () => {
    stoppedManuallyRef.current = true
    clearInterval(timerRef.current)
    try { recognitionRef.current?.abort() } catch {}
    try { if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop() } catch {}
    setIsRecording(false); setLiveText('')
  }

  const cleanWithAI = async () => {
    const raw = finalText.trim()
    if (!raw) return
    setCleaning(true); setError('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a voice transcript cleaner. Clean the raw speech-to-text by:
- Fixing punctuation and capitalization
- Removing filler words (um, uh, like, you know, so, actually)
- Fixing obvious speech recognition errors
- Forming proper sentences and paragraphs
- Keeping ALL original meaning intact
Return ONLY the cleaned text. No explanations or preamble.`,
          messages: [{ role: 'user', content: raw }]
        })
      })
      const data = await res.json()
      const text = data.content?.map(c => c.text || '').join('').trim()
      setCleanedText(text || raw)
    } catch {
      setCleanedText(finalText)
      setError('AI cleanup unavailable. You can still save the transcript as-is.')
    } finally { setCleaning(false) }
  }

  // Save both audio + transcript into the note as a proper TipTap voice node
  const handleSaveToNotebook = async () => {
    const transcript = (cleanedText || finalText).trim()
    if (!transcript && !audioBlob) { onClose(); return }

    let audioBase64 = ''
    if (audioBlob) {
      audioBase64 = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(audioBlob)
      })
    }

    const durationStr = formatDuration(audioDuration)
    const timestamp   = new Date().toLocaleString()

    // Insert as a proper TipTap node so the audio player renders correctly
    onInsert({
      type: 'voicerecording',
      attrs: {
        'data-audio':      audioBase64,
        'data-transcript': transcript,
        'data-timestamp':  timestamp,
        'data-duration':   durationStr,
      }
    })
    onClose()
  }

  const handleClose = () => {
    if (isRecording) stopRecording()
    onClose()
  }

  const displayFinal = cleanedText || finalText
  const hasContent   = finalText.trim().length > 0

  const LANGS = [
    { code: 'en-US',  label: '🇺🇸 English (US)' },
    { code: 'en-GB',  label: '🇬🇧 English (UK)' },
    { code: 'fil-PH', label: '🇵🇭 Filipino' },
    { code: 'ceb-PH', label: '🇵🇭 Cebuano' },
    { code: 'es-ES',  label: '🇪🇸 Spanish' },
    { code: 'zh-CN',  label: '🇨🇳 Chinese' },
    { code: 'ja-JP',  label: '🇯🇵 Japanese' },
    { code: 'ko-KR',  label: '🇰🇷 Korean' },
    { code: 'fr-FR',  label: '🇫🇷 French' },
    { code: 'de-DE',  label: '🇩🇪 German' },
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all flex-shrink-0 ${isRecording ? 'bg-red-500' : 'bg-violet-600'}`}
            style={isRecording ? { animation: 'pulse 1.5s infinite' } : {}}>
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Voice Recording</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {isRecording
                ? `🔴 Recording… ${formatDuration(audioDuration)}`
                : hasContent ? 'Review & save to notebook' : 'Real-time transcription + AI cleanup'}
            </p>
          </div>
          {/* Done / Close — always visible, immediately clickable */}
          <button onClick={hasContent && !isRecording ? handleSaveToNotebook : handleClose}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-sm ${
              hasContent && !isRecording
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
            {hasContent && !isRecording
              ? <><CheckCheck className="w-3.5 h-3.5" /> Done</>
              : <><X className="w-3.5 h-3.5" /> Close</>}
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">

          {/* Language selector */}
          {!isRecording && !hasContent && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Language / Wika</label>
              <select value={lang} onChange={e => setLang(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 bg-gray-50 cursor-pointer">
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          )}

          {/* Audio preview */}
          {audioBlob && !isRecording && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <p className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                🎧 Audio Preview <span className="font-normal text-violet-500">· will be saved in notebook</span>
              </p>
              <audio controls className="w-full" src={URL.createObjectURL(audioBlob)} />
            </div>
          )}

          {/* Transcript box */}
          {(isRecording || hasContent) && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Transcript</p>
              <div className="min-h-[90px] max-h-[180px] overflow-y-auto p-3 rounded-xl border text-sm leading-relaxed"
                style={{ background: '#fafafa', borderColor: '#e5e7eb' }}>
                {displayFinal && <span className="text-gray-800">{displayFinal}</span>}
                {liveText && <span style={{ color: '#7c3aed', fontStyle: 'italic' }}> {liveText}</span>}
                {isRecording && !displayFinal && !liveText && (
                  <span className="text-gray-400 italic flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full inline-block" style={{ animation: 'pulse 1s infinite' }} />
                    Listening… speak now
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* AI cleaned badge */}
          {cleanedText && !cleaning && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              AI cleaned — filler words removed, punctuation fixed
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {!isRecording ? (
              <button onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                <Mic className="w-4 h-4" />
                {hasContent ? 'Record More' : 'Start Recording'}
              </button>
            ) : (
              <button onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                <Square className="w-3.5 h-3.5 fill-white" />
                Stop Recording
              </button>
            )}

            {hasContent && !isRecording && !cleanedText && (
              <button onClick={cleanWithAI} disabled={cleaning}
                className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {cleaning
                  ? <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-600 rounded-full animate-spin" />
                  : <Sparkles className="w-4 h-4" />}
                {cleaning ? 'Cleaning…' : '✨ AI Cleanup'}
              </button>
            )}

            {hasContent && !isRecording && (
              <button onClick={handleSaveToNotebook}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm ml-auto">
                <CheckCheck className="w-4 h-4" />
                Save to Notebook
              </button>
            )}
          </div>

          {/* Tips */}
          <div className="text-[11px] text-gray-400 text-center space-y-0.5 pb-1">
            <p>🎙 Works best in Chrome or Edge · Allow microphone when prompted</p>
            <p>💾 Saves both audio recording + transcript into your note</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   MAIN EDITOR
────────────────────────────────────────────────────────── */
export default function NoteEditor({ content, onChange, readOnly = false }) {
  const [showVoice, setShowVoice] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      TextStyle,
      Color,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start typing your note…' }),
      DiagramExtension.configure({ readOnly }),
      MapExtension.configure({ readOnly }),
      VoiceRecordingExtension,
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    // Defer to avoid flushSync warning in React 18 — TipTap's setContent
    // dispatches a ProseMirror transaction which can trigger React state
    // updates while React is already rendering.
    const id = setTimeout(() => {
      if (!editor.isDestroyed && content !== editor.getHTML()) {
        editor.commands.setContent(content || '', false)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVoiceInsert = (nodeOrText) => {
    if (!editor) return
    // If it's a node descriptor object (voicerecording), insert directly
    if (typeof nodeOrText === 'object') {
      editor.chain().focus().insertContent(nodeOrText).run()
    } else {
      editor.chain().focus().insertContent(nodeOrText + ' ').run()
    }
  }

  if (!editor) return null

  return (
    <div className="flex flex-col h-full app-editor-area min-h-0">
      {!readOnly && <EditorToolbar editor={editor} onVoice={() => setShowVoice(true)} />}
      <div className="flex-1 overflow-y-auto min-h-0">
        <EditorContent editor={editor} className="prose-editor h-full" />
      </div>
      {showVoice && (
        <VoiceRecorderPanel
          onInsert={handleVoiceInsert}
          onClose={() => setShowVoice(false)}
        />
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   TOOLBAR
────────────────────────────────────────────────────────── */
function EditorToolbar({ editor, onVoice }) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showLinkInput, setShowLinkInput]     = useState(false)
  const [linkUrl, setLinkUrl]                 = useState('')
  const fileInputRef                          = useRef(null)

  const addImage = () => fileInputRef.current?.click()

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => editor.chain().focus().setImage({ src: reader.result }).run()
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const setLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
      setLinkUrl(''); setShowLinkInput(false)
    }
  }

  const insertDiagram = () =>
    editor.chain().focus().insertContent({
      type: 'diagram',
      attrs: { 'data-diagram': '{"nodes":[],"edges":[]}', 'data-saved': 'false' }
    }).run()

  const insertMap = () =>
    editor.chain().focus().insertContent({
      type: 'mapblock',
      attrs: { 'data-lat': '', 'data-lng': '', 'data-label': '', 'data-saved': 'false' }
    }).run()

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm overflow-x-auto">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <Group>
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo className="w-3.5 h-3.5" /></Btn>
      </Group>
      <Sep />

      <Group>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 className="w-3.5 h-3.5" /></Btn>
      </Group>
      <Sep />

      <Group>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive('bold')}      title="Bold"><Bold className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive('italic')}    title="Italic"><Italic className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()}    active={editor.isActive('strike')}    title="Strike"><Strikethrough className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()}      active={editor.isActive('code')}      title="Code"><Code className="w-3.5 h-3.5" /></Btn>
      </Group>
      <Sep />

      <Group>
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Bullet List"><List className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List"><ListOrdered className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}  active={editor.isActive('blockquote')}  title="Quote"><Quote className="w-3.5 h-3.5" /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="w-3.5 h-3.5" /></Btn>
      </Group>
      <Sep />

      <div className="relative">
        <Btn onClick={() => setShowColorPicker(!showColorPicker)} title="Text Color">
          <div className="flex flex-col items-center gap-0.5">
            <Type className="w-3.5 h-3.5" />
            <div className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#111827' }} />
          </div>
        </Btn>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-xl shadow-lifted z-20 flex flex-wrap gap-1.5 w-28">
            {COLORS.map((c) => (
              <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false) }}
                style={{ backgroundColor: c }}
                className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform shadow-sm" />
            ))}
            <button onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false) }}
              className="w-6 h-6 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 text-xs flex items-center justify-center">✕</button>
          </div>
        )}
      </div>
      <Sep />

      <Group>
        <Btn onClick={addImage} title="Insert Image"><ImageIcon className="w-3.5 h-3.5" /></Btn>
        <div className="relative">
          <Btn onClick={() => setShowLinkInput(!showLinkInput)} active={editor.isActive('link')} title="Link"><LinkIcon className="w-3.5 h-3.5" /></Btn>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-xl shadow-lifted z-20 flex gap-2 w-52">
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setLink()}
                className="flex-1 min-w-0 bg-gray-50 border border-gray-200 text-gray-800 text-xs px-2.5 py-1.5 rounded-lg outline-none focus:border-brand-400"
                placeholder="https://…" autoFocus />
              <button onClick={setLink} className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-lg font-semibold flex-shrink-0">Set</button>
            </div>
          )}
        </div>
      </Group>
      <Sep />

      {/* Feature buttons — text hidden on very small screens */}
      <button onClick={insertDiagram} title="Insert Diagram / Topology"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all whitespace-nowrap">
        <Share2 className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="hidden sm:inline">Diagram</span>
      </button>

      <button onClick={insertMap} title="Insert Satellite Map"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all whitespace-nowrap">
        <Satellite className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="hidden sm:inline">Map</span>
      </button>

      <button onClick={onVoice} title="Voice Recording & Transcription"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-all whitespace-nowrap">
        <Mic className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="hidden sm:inline">Voice</span>
      </button>
    </div>
  )
}

const Group = ({ children }) => <div className="flex items-center gap-0.5">{children}</div>
const Sep   = () => <div className="w-px h-4 bg-gray-200 mx-0.5 flex-shrink-0" />

function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`p-1.5 rounded-lg transition-all text-sm flex-shrink-0 ${
        active ? 'bg-brand-100 text-brand-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      } disabled:opacity-30 disabled:cursor-not-allowed`}>
      {children}
    </button>
  )
}
