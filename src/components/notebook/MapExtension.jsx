import { useCallback, useEffect, useRef, useState } from 'react'
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { MapPin, Navigation, Search, Satellite } from 'lucide-react'

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

export default MapExtension
