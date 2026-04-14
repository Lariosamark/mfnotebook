import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCheck, Mic, Sparkles, Square, X, StopCircle, Loader2 } from 'lucide-react'

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

const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent)

function getBestMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

export default function VoiceRecorderPanel({ onInsert, onClose }) {
  const [isRecording, setIsRecording]     = useState(false)
  const [liveText, setLiveText]           = useState('')
  const [finalText, setFinalText]         = useState('')
  const [cleaning, setCleaning]           = useState(false)
  const [cleanedText, setCleanedText]     = useState('')
  const [error, setError]                 = useState('')
  const [lang, setLang]                   = useState('en-US')
  const [audioBlob, setAudioBlob]         = useState(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [mobileTab, setMobileTab]         = useState('record')
  // NEW: state for post-recording AI transcription
  const [transcribing, setTranscribing]   = useState(false)

  const recognitionRef     = useRef(null)
  const finalAccumRef      = useRef('')
  const interimAccumRef    = useRef('')
  const stoppedManuallyRef = useRef(false)
  const isRecordingRef     = useRef(false)
  const mediaRecorderRef   = useRef(null)
  const audioChunksRef     = useRef([])
  const audioStreamRef     = useRef(null)
  const timerRef           = useRef(null)
  const durationRef        = useRef(0)
  const restartTimerRef    = useRef(null)
  const langRef            = useRef(lang)
  const spawnRef           = useRef(null)
  // NEW: ref so mr.onstop callback can call it without stale closure
  const transcribeAudioRef = useRef(null)

  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) setError('Speech Recognition not supported in this browser — audio will still be recorded and transcribed after you stop.')
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.abort() } catch {}
    try {
      if (mediaRecorderRef.current?.state !== 'inactive')
        mediaRecorderRef.current?.stop()
    } catch {}
    audioStreamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const formatDuration = (secs) => {
    if (!secs) return ''
    const m = Math.floor(secs / 60), s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  // ── NEW: Post-recording audio transcription via Claude API ──────────────────
  // On mobile the Web Speech API is unreliable; this sends the captured audio
  // blob to Claude and uses the result as the transcript.
  const transcribeAudioWithAI = useCallback(async (blob) => {
    if (!blob || blob.size === 0) return
    setTranscribing(true)
    setError('')

    try {
      // Convert blob → base64 (strip the data-URI header)
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      const mimeType  = blob.type || 'audio/webm'
      const langLabel = LANGS.find(l => l.code === langRef.current)?.label?.replace(/^\S+\s*/, '') ?? 'English'

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: `You are an accurate audio transcription assistant. The speaker's language is: ${langLabel}.\n\nRules:\n- Transcribe exactly what is spoken.\n- Keep the output in ${langLabel}. Do NOT translate.\n- Fix obvious speech artifacts from bad mic or compression.\n- Return ONLY the transcript text. No preamble, no explanations, no labels.`,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: 'Please transcribe this audio recording.',
              },
            ],
          }],
        }),
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error.message)

      const transcribed = data.content?.map(c => c.text || '').join('').trim()

      if (transcribed) {
        // Replace (or supplement) whatever live STT captured
        finalAccumRef.current = transcribed
        setFinalText(transcribed)
        setCleanedText('')  // allow subsequent AI-cleanup on the fresh transcript
      } else if (!finalAccumRef.current.trim()) {
        setError('Could not transcribe audio. Try again in a quieter environment.')
      }
    } catch (err) {
      console.error('Audio transcription error:', err)
      // Only show an error if live STT also gave nothing
      if (!finalAccumRef.current.trim()) {
        setError('Audio transcription unavailable. Check your connection and try again.')
      }
    } finally {
      setTranscribing(false)
    }
  }, []) // langRef is a ref so it's always current; no deps needed

  // Keep the ref in sync so mr.onstop (a closure) can call the latest version
  useEffect(() => { transcribeAudioRef.current = transcribeAudioWithAI }, [transcribeAudioWithAI])

  // ── Speech Recognition ───────────────────────────────────────────────────────
  const buildRecognition = useCallback((langCode) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null

    const mobile = isMobile()
    const r = new SR()
    r.lang            = langCode
    r.continuous      = !mobile
    r.interimResults  = !isIOS()
    r.maxAlternatives = 1

    r.onresult = (e) => {
      let interim = '', newFinal = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) newFinal += t + ' '
        else interim += t
      }
      if (newFinal) {
        finalAccumRef.current += newFinal
        setFinalText(finalAccumRef.current)
        interimAccumRef.current = ''
      }
      interimAccumRef.current = interim
      setLiveText(interim)
    }

    r.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Allow microphone in your browser settings.')
        stoppedManuallyRef.current = true
        setIsRecording(false)
      } else if (e.error === 'audio-capture') {
        setError('Microphone busy or unavailable. Close other apps using the mic and try again.')
        stoppedManuallyRef.current = true
        setIsRecording(false)
      } else if (e.error === 'network') {
        if (!stoppedManuallyRef.current && isRecordingRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (!stoppedManuallyRef.current && isRecordingRef.current) spawnRef.current?.()
          }, 800)
        }
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        // Non-fatal — audio transcription will still run after stopping
        console.warn('SpeechRecognition error:', e.error)
      }
    }

    r.onend = () => {
      setLiveText('')
      interimAccumRef.current = ''
      if (!stoppedManuallyRef.current && isRecordingRef.current) {
        const delay = isMobile() ? 600 : 80
        restartTimerRef.current = setTimeout(() => {
          if (!stoppedManuallyRef.current && isRecordingRef.current) spawnRef.current?.()
        }, delay)
      } else {
        setIsRecording(false)
      }
    }

    return r
  }, [])

  const spawn = useCallback(() => {
    const r = buildRecognition(langRef.current)
    if (!r) return
    recognitionRef.current = r
    try {
      r.start()
    } catch {
      restartTimerRef.current = setTimeout(() => {
        if (!stoppedManuallyRef.current && isRecordingRef.current) {
          const r2 = buildRecognition(langRef.current)
          if (r2) {
            recognitionRef.current = r2
            try { r2.start() } catch {}
          }
        }
      }, 400)
    }
  }, [buildRecognition])

  useEffect(() => { spawnRef.current = spawn }, [spawn])

  // ── startRecording ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    setError('')
    setLiveText('')
    setFinalText('')
    setCleanedText('')
    setAudioBlob(null)
    setTranscribing(false)
    finalAccumRef.current      = ''
    interimAccumRef.current    = ''
    stoppedManuallyRef.current = false
    durationRef.current        = 0
    setAudioDuration(0)
    audioChunksRef.current     = []

    // ── MediaRecorder (audio capture) ────────────────────────────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream

      const mimeType = getBestMimeType()
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})

      mr.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        const usedMime = mr.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: usedMime })

        if (blob.size > 0) {
          setAudioBlob(blob)

          // ── KEY FIX: Always transcribe via AI on mobile, or as fallback on
          //    desktop when live STT captured nothing.
          const liveSoFar = finalAccumRef.current.trim()
          if (isMobile() || !liveSoFar) {
            transcribeAudioRef.current?.(blob)
          }
        }

        stream.getTracks().forEach(t => t.stop())
        audioStreamRef.current = null
      }

      mr.start(200)
      mediaRecorderRef.current = mr
    } catch (err) {
      console.warn('MediaRecorder init failed:', err)
      // Speech recognition will still work if getUserMedia fails
    }

    if (isMobile()) await new Promise(r => setTimeout(r, 300))

    // Try live STT (best-effort — might not work on iOS)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) spawn()

    setIsRecording(true)
    timerRef.current = setInterval(() => {
      durationRef.current += 1
      setAudioDuration(durationRef.current)
    }, 1000)
  }

  // ── handleDoneRecording ────────────────────────────────────────────────────
  const handleDoneRecording = () => {
    const pending = interimAccumRef.current.trim()
    if (pending) {
      finalAccumRef.current += pending + ' '
      setFinalText(finalAccumRef.current)
      interimAccumRef.current = ''
    }
    setLiveText('')
    stoppedManuallyRef.current = true
    clearInterval(timerRef.current)
    clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.stop() } catch {}
    setTimeout(() => { try { recognitionRef.current?.abort() } catch {} }, 350)

    // Stop MediaRecorder — onstop will build the blob + trigger AI transcription
    try {
      if (mediaRecorderRef.current?.state !== 'inactive')
        mediaRecorderRef.current?.stop()
    } catch {}

    setIsRecording(false)

    // Always jump to transcript tab on mobile so the user sees the result
    if (isMobile()) setMobileTab('transcript')
  }

  // ── stopRecording (cancel) ─────────────────────────────────────────────────
  const stopRecording = () => {
    stoppedManuallyRef.current = true
    clearInterval(timerRef.current)
    clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.abort() } catch {}
    try {
      if (mediaRecorderRef.current?.state !== 'inactive')
        mediaRecorderRef.current?.stop()
    } catch {}
    setIsRecording(false)
    setLiveText('')
    interimAccumRef.current = ''
  }

  // ── AI Cleanup ─────────────────────────────────────────────────────────────
  const cleanWithAI = async () => {
    const raw = finalText.trim()
    if (!raw) return
    setCleaning(true); setError('')
    const langLabel = LANGS.find(l => l.code === lang)?.label?.replace(/^\S+\s*/, '') ?? 'the same language as the input'
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a voice transcript cleaner. The speaker's language is: ${langLabel}.\n\nRules:\n- KEEP the text in ${langLabel}. Do NOT translate it.\n- Fix punctuation and capitalization.\n- Remove filler sounds.\n- Fix obvious speech-to-text errors.\n- Form proper sentences and paragraphs.\n- Preserve ALL original meaning.\n\nReturn ONLY the cleaned text. No explanation, no preamble.`,
          messages: [{ role: 'user', content: raw }]
        })
      })
      const data = await res.json()
      const text = data.content?.map(c => c.text || '').join('').trim()
      setCleanedText(text || raw)
    } catch {
      setCleanedText(finalText)
      setError('AI cleanup unavailable. You can still save the transcript as-is.')
    } finally {
      setCleaning(false)
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
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

    onInsert({
      type: 'voicerecording',
      attrs: {
        'data-audio':      audioBase64,
        'data-transcript': transcript,
        'data-timestamp':  new Date().toLocaleString(),
        'data-duration':   formatDuration(audioDuration),
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
  const wordCount    = finalText.trim() ? finalText.trim().split(/\s+/).length : 0
  const mobile       = isMobile()
  // Show save button only when transcript is ready (not still transcribing)
  const readyToSave  = hasContent && !isRecording && !transcribing

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all flex-shrink-0 ${isRecording ? 'bg-red-500' : 'bg-violet-600'}`}
            style={isRecording ? { animation: 'pulse 1.5s infinite' } : {}}
          >
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Voice Recording</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {isRecording
                ? `🔴 Recording… ${formatDuration(audioDuration)}`
                : transcribing
                  ? '⏳ Transcribing audio…'
                  : hasContent
                    ? `${wordCount} words captured`
                    : 'Real-time transcription + AI cleanup'}
            </p>
          </div>
          <button
            onClick={readyToSave ? handleSaveToNotebook : handleClose}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-sm ${
              readyToSave
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {readyToSave
              ? <><CheckCheck className="w-3.5 h-3.5" /> Save</>
              : <><X className="w-3.5 h-3.5" /> Close</>}
          </button>
        </div>

        {/* ── Mobile Tab Bar ── */}
        {mobile && (
          <div className="flex border-b border-gray-100 flex-shrink-0 bg-gray-50">
            <button
              onClick={() => setMobileTab('record')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                mobileTab === 'record'
                  ? 'text-violet-700 border-b-2 border-violet-600 bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              🎙 Record
            </button>
            <button
              onClick={() => setMobileTab('transcript')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
                mobileTab === 'transcript'
                  ? 'text-violet-700 border-b-2 border-violet-600 bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              📝 Transcript
              {transcribing && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4">
                  <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
                </span>
              )}
              {!transcribing && hasContent && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] font-bold">
                  {wordCount > 99 ? '99+' : wordCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── Body ── */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">

          {/* RECORD TAB (or desktop) */}
          {(!mobile || mobileTab === 'record') && (
            <>
              {/* Language selector */}
              {!isRecording && !hasContent && !transcribing && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Language / Wika</label>
                  <select
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 bg-gray-50 cursor-pointer"
                  >
                    {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              )}

              {/* Live wave indicator */}
              {isRecording && (
                <div className="flex items-center gap-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-end gap-0.5 flex-shrink-0 h-5">
                    {[3,5,7,5,3,6,4].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-400 rounded-full"
                        style={{
                          height: `${h * 3}px`,
                          animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 70}ms`
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-red-600 font-semibold flex-1">
                    {formatDuration(audioDuration)} · Listening — speak now
                  </span>
                </div>
              )}

              {/* NEW: Transcribing indicator */}
              {transcribing && (
                <div className="flex items-center gap-3 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-xl">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                  <span className="text-xs text-violet-700 font-semibold">
                    Transcribing your recording with AI…
                  </span>
                </div>
              )}

              {/* Audio preview */}
              {audioBlob && !isRecording && (
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
                  <p className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                    🎧 Audio Preview
                    <span className="font-normal text-violet-500">· will be saved in notebook</span>
                  </p>
                  <audio
                    controls
                    className="w-full"
                    src={URL.createObjectURL(audioBlob)}
                    style={{ borderRadius: 8 }}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  ⚠️ {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                {isRecording ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDoneRecording}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <StopCircle className="w-5 h-5" />
                      Done Recording
                    </button>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-semibold rounded-xl transition-colors"
                    >
                      <Square className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={startRecording}
                      disabled={transcribing}
                      className="flex items-center gap-2 px-5 py-3 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                    >
                      <Mic className="w-4 h-4" />
                      {hasContent ? 'Record More' : 'Start Recording'}
                    </button>

                    {hasContent && !cleanedText && !transcribing && (
                      <button
                        onClick={cleanWithAI}
                        disabled={cleaning}
                        className="flex items-center gap-2 px-3 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                      >
                        {cleaning
                          ? <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-600 rounded-full animate-spin" />
                          : <Sparkles className="w-4 h-4" />}
                        {cleaning ? 'Cleaning…' : '✨ AI Cleanup'}
                      </button>
                    )}

                    {readyToSave && (
                      <button
                        onClick={handleSaveToNotebook}
                        className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm ml-auto"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Save to Notebook
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="text-[11px] text-gray-400 text-center space-y-0.5 pb-1">
                {mobile
                  ? <p>🎙 Tap <strong>Done Recording</strong> — AI will transcribe your audio automatically</p>
                  : <p>🎙 Works best in Chrome or Edge · Allow microphone when prompted</p>
                }
                <p>💾 Saves both audio recording + transcript into your note</p>
              </div>
            </>
          )}

          {/* TRANSCRIPT TAB (mobile) or always (desktop) */}
          {(!mobile || mobileTab === 'transcript') && (
            <>
              {/* Transcribing indicator in transcript tab */}
              {transcribing && (
                <div className="flex items-center gap-3 px-3 py-3 bg-violet-50 border border-violet-200 rounded-xl">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-xs text-violet-700 font-semibold">Transcribing with AI…</p>
                    <p className="text-[11px] text-violet-400 mt-0.5">This takes a few seconds. Your audio is ready.</p>
                  </div>
                </div>
              )}

              {/* AI cleaned badge */}
              {cleanedText && !cleaning && !transcribing && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                  AI cleaned — filler words removed, punctuation fixed
                </div>
              )}

              {/* Audio preview in transcript tab (mobile) */}
              {mobile && audioBlob && !isRecording && (
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
                  <p className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                    🎧 Audio Preview
                  </p>
                  <audio
                    controls
                    className="w-full"
                    src={URL.createObjectURL(audioBlob)}
                    style={{ borderRadius: 8 }}
                  />
                </div>
              )}

              {/* Transcript box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-600">Transcript</p>
                  {wordCount > 0 && <span className="text-[10px] text-gray-400">{wordCount} words</span>}
                </div>
                <div
                  className="min-h-[140px] max-h-[280px] overflow-y-auto p-3 rounded-xl border text-sm leading-relaxed transition-colors"
                  style={{ background: '#fafafa', borderColor: isRecording ? '#fca5a5' : '#e5e7eb' }}
                >
                  {displayFinal && <span className="text-gray-800">{displayFinal}</span>}
                  {liveText && (
                    <span style={{ color: '#7c3aed', fontStyle: 'italic' }}>
                      {displayFinal ? ' ' : ''}{liveText}
                    </span>
                  )}
                  {!displayFinal && !liveText && !transcribing && (
                    <span className="text-gray-400 italic">
                      {isRecording
                        ? '🔴 Waiting for speech…'
                        : 'No transcript yet. Start recording first.'}
                    </span>
                  )}
                  {!displayFinal && !liveText && transcribing && (
                    <span className="text-violet-400 italic">⏳ Transcribing…</span>
                  )}
                </div>
              </div>

              {/* Mobile: AI cleanup + save in transcript tab */}
              {mobile && hasContent && !isRecording && !transcribing && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {!cleanedText && (
                    <button
                      onClick={cleanWithAI}
                      disabled={cleaning}
                      className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {cleaning
                        ? <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-600 rounded-full animate-spin" />
                        : <Sparkles className="w-4 h-4" />}
                      {cleaning ? 'Cleaning…' : '✨ AI Cleanup'}
                    </button>
                  )}
                  <button
                    onClick={handleSaveToNotebook}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm ml-auto"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Save to Notebook
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}