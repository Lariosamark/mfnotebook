import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCheck, Mic, Sparkles, Square, X, StopCircle } from 'lucide-react'

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

/* Mobile browsers (iOS/Android) don't support continuous mode reliably */
const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

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

  const recognitionRef      = useRef(null)
  const finalAccumRef       = useRef('')
  const interimAccumRef     = useRef('')  // latest interim — flushed on Done
  const stoppedManuallyRef  = useRef(false)
  const isRecordingRef      = useRef(false)
  const mediaRecorderRef    = useRef(null)
  const audioChunksRef      = useRef([])
  const timerRef            = useRef(null)
  const durationRef         = useRef(0)
  const restartTimerRef     = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) setError('Speech Recognition not supported. Please use Chrome or Edge.')
  }, [])

  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])

  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearTimeout(restartTimerRef.current)
    try { recognitionRef.current?.abort() } catch {}
    try {
      if (mediaRecorderRef.current?.state !== 'inactive')
        mediaRecorderRef.current?.stop()
    } catch {}
  }, [])

  const formatDuration = (secs) => {
    if (!secs) return ''
    const m = Math.floor(secs / 60), s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

const buildRecognition = useCallback((langCode) => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null

  const r = new SR()

  r.lang = langCode

  // FIXED
  r.continuous = true
  r.interimResults = true
  r.maxAlternatives = 1

  r.onresult = (e) => {
    console.log("Speech result received:", e) // debug

let interim = ''
let newFinal = ''

for (let i = e.resultIndex; i < e.results.length; i++) {

  const result = e.results[i]
  const text = result[0].transcript

  if (result.isFinal) {
    newFinal += text + ' '
  } else {
    interim += text
  }

}

if (newFinal) {

  finalAccumRef.current += newFinal
  setFinalText(finalAccumRef.current)

}

interimAccumRef.current = interim
setLiveText(interim)
  }

    r.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Allow microphone in your browser settings.')
        stoppedManuallyRef.current = true
        setIsRecording(false)
      } else if (e.error === 'network') {
        // Mobile Safari network error — schedule restart
        if (!stoppedManuallyRef.current && isRecordingRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (!stoppedManuallyRef.current && isRecordingRef.current) {
              try { recognitionRef.current?.start() } catch {}
            }
          }, 400)
        }
      } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError(`Recognition error: "${e.error}". Tap Start again to retry.`)
      }
    }

  r.onend = () => {

  // flush interim to final before restart
  const pending = interimAccumRef.current.trim()

  if (pending) {
    finalAccumRef.current += pending + ' '
    setFinalText(finalAccumRef.current)
    interimAccumRef.current = ''
  }

  setLiveText('')

  if (!stoppedManuallyRef.current && isRecordingRef.current) {

    const delay = isMobile() ? 1200 : 0

    restartTimerRef.current = setTimeout(() => {

      if (!stoppedManuallyRef.current && isRecordingRef.current) {

        try {
          recognitionRef.current?.start()
        } catch (err) {
          console.log('Restart failed:', err)
        }

      }

    }, delay)

  }

}
    return r
  }, [])

  const startRecording = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Not supported. Use Chrome or Edge.'); return }

    setError('')
    setLiveText('')
    setFinalText('')
    setCleanedText('')
    setAudioBlob(null)
    finalAccumRef.current   = ''
    interimAccumRef.current = ''
    stoppedManuallyRef.current = false
    durationRef.current = 0
    setAudioDuration(0)
    audioChunksRef.current = []

    // Audio capture
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mr.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(200)
      mediaRecorderRef.current = mr
    } catch { /* audio capture is optional */ }

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

  /* "Done Recording" — flushes interim text immediately, stops cleanly */
  const handleDoneRecording = () => {
    // Flush any pending interim into final right now — no waiting
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

    try {
      if (mediaRecorderRef.current?.state !== 'inactive')
        mediaRecorderRef.current?.stop()
    } catch {}

    setIsRecording(false)
  }

  /* Hard stop — discards unconfirmed interim text */
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

  const cleanWithAI = async () => {
    const raw = finalText.trim()
    if (!raw) return
    setCleaning(true)
    setError('')
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
    } finally {
      setCleaning(false)
    }
  }

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
            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all flex-shrink-0 ${
              isRecording ? 'bg-red-500' : 'bg-violet-600'
            }`}
            style={isRecording ? { animation: 'pulse 1.5s infinite' } : {}}
          >
            <Mic className="w-4 h-4 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Voice Recording</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {isRecording
                ? `🔴 Recording… ${formatDuration(audioDuration)}`
                : hasContent
                  ? `${wordCount} words captured`
                  : 'Real-time transcription + AI cleanup'}
            </p>
          </div>

          <button
            onClick={hasContent && !isRecording ? handleSaveToNotebook : handleClose}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-sm ${
              hasContent && !isRecording
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {hasContent && !isRecording
              ? <><CheckCheck className="w-3.5 h-3.5" /> Save</>
              : <><X className="w-3.5 h-3.5" /> Close</>}
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">

          {/* Language selector */}
          {!isRecording && !hasContent && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Language / Wika
              </label>
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

          {/* Audio preview */}
          {audioBlob && !isRecording && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <p className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                🎧 Audio Preview
                <span className="font-normal text-violet-500">· will be saved in notebook</span>
              </p>
              <audio controls className="w-full" src={URL.createObjectURL(audioBlob)} />
            </div>
          )}

          {/* Transcript */}
          {(isRecording || hasContent) && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-600">Transcript</p>
                {wordCount > 0 && (
                  <span className="text-[10px] text-gray-400">{wordCount} words</span>
                )}
              </div>
              <div
                className="min-h-[100px] max-h-[220px] overflow-y-auto p-3 rounded-xl border text-sm leading-relaxed transition-colors"
                style={{
                  background: '#fafafa',
                  borderColor: isRecording ? '#fca5a5' : '#e5e7eb'
                }}
              >
                {displayFinal && <span className="text-gray-800">{displayFinal}</span>}
                {liveText && (
                  <span style={{ color: '#7c3aed', fontStyle: 'italic' }}>
                    {displayFinal ? ' ' : ''}{liveText}
                  </span>
                )}
                {isRecording && !displayFinal && !liveText && (
                  <span className="text-gray-400 italic flex items-center gap-2">
                    <span
                      className="w-2 h-2 bg-red-400 rounded-full inline-block"
                      style={{ animation: 'pulse 1s infinite' }}
                    />
                    Waiting for speech…
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

          {/* ── Action buttons ── */}
          <div className="space-y-2 pt-1">
            {isRecording ? (
              /* RECORDING STATE: big "Done Recording" + smaller "Cancel" */
              <div className="flex gap-2">
                <button
                  onClick={handleDoneRecording}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  <StopCircle className="w-5 h-5" />
                  Done Recording
                </button>
                <button
                  onClick={stopRecording}
                  title="Stop without saving interim text"
                  className="flex items-center gap-2 px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-semibold rounded-xl transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            ) : (
              /* IDLE STATE */
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  <Mic className="w-4 h-4" />
                  {hasContent ? 'Record More' : 'Start Recording'}
                </button>

                {hasContent && !cleanedText && (
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

                {hasContent && (
                  <button
                    onClick={handleSaveToNotebook}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm ml-auto"
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
            {isMobile()
              ? <p>🎙 Tap <strong>Done Recording</strong> when finished — transcript appears instantly</p>
              : <p>🎙 Works best in Chrome or Edge · Allow microphone when prompted</p>
            }
            <p>💾 Saves both audio recording + transcript into your note</p>
          </div>
        </div>
      </div>
    </div>
  )
}
