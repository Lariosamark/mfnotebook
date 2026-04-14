import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCheck, Mic, Sparkles, Square, X, StopCircle, AudioLines } from 'lucide-react'

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

export default function VoiceRecorderPanel({ onInsert, onClose }) {
  const [isRecording, setIsRecording]           = useState(false)
  const [liveText, setLiveText]                 = useState('')
  const [finalText, setFinalText]               = useState('')
  const [cleaning, setCleaning]                 = useState(false)
  const [cleanedText, setCleanedText]           = useState('')
  const [error, setError]                       = useState('')
  const [lang, setLang]                         = useState('en-US')
  const [audioBlob, setAudioBlob]               = useState(null)
  const [audioDuration, setAudioDuration]       = useState(0)

  // ── Mobile audio clip (recorded AFTER transcript, when mic is free) ──
  const [mobileAudioRecording, setMobileAudioRecording] = useState(false)
  const [mobileAudioBlob, setMobileAudioBlob]           = useState(null)
  const [mobileAudioDuration, setMobileAudioDuration]   = useState(0)
  const mobileAudioMRRef    = useRef(null)
  const mobileAudioChunks   = useRef([])
  const mobileAudioTimer    = useRef(null)
  const mobileAudioDurRef   = useRef(0)

  const recognitionRef    = useRef(null)
  const finalAccumRef     = useRef('')
  const interimAccumRef   = useRef('')
  const stoppedRef        = useRef(false)
  const isRecordingRef    = useRef(false)
  const mediaRecorderRef  = useRef(null)
  const audioChunksRef    = useRef([])
  const timerRef          = useRef(null)
  const durationRef       = useRef(0)
  const restartTimerRef   = useRef(null)
  const langRef           = useRef(lang)
  const spawnRef          = useRef(null)
  const generationRef     = useRef(0)
  const lastFinalChunkRef = useRef('')

  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) setError('Speech Recognition not supported. Please use Chrome or Edge.')
  }, [])

  useEffect(() => () => {
    stoppedRef.current = true
    generationRef.current += 1
    clearInterval(timerRef.current)
    clearTimeout(restartTimerRef.current)
    clearInterval(mobileAudioTimer.current)
    try { recognitionRef.current?.abort() } catch {}
    try {
      if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
    } catch {}
    try {
      if (mobileAudioMRRef.current?.state !== 'inactive') mobileAudioMRRef.current?.stop()
    } catch {}
  }, [])

  const formatDuration = (secs) => {
    if (!secs) return ''
    const m = Math.floor(secs / 60), s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const clearTimers = () => {
    clearInterval(timerRef.current)
    clearTimeout(restartTimerRef.current)
  }

  /*
   * ══════════════════════════════════════════════════════════════
   *  MOBILE MICROPHONE LIMITATION — READ THIS BEFORE CHANGING
   * ══════════════════════════════════════════════════════════════
   *
   *  On mobile, SpeechRecognition and MediaRecorder CANNOT share
   *  the mic simultaneously — one kills the other.
   *
   *  SOLUTION: Two-phase recording on mobile:
   *    Phase 1 — SpeechRecognition only  → captures transcript
   *    Phase 2 — MediaRecorder only      → captures audio clip
   *              (shown after transcript is done, mic is now free)
   *
   *  Desktop: both run in parallel as before.
   * ══════════════════════════════════════════════════════════════
   */

  // ── Phase 2 mobile: start audio-only recording ──
  const startMobileAudio = async () => {
    setError('')
    mobileAudioChunks.current = []
    mobileAudioDurRef.current = 0
    setMobileAudioDuration(0)
    setMobileAudioBlob(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'

      const mr = new MediaRecorder(stream, { mimeType })
      mr.ondataavailable = (e) => {
        if (e.data?.size > 0) mobileAudioChunks.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(mobileAudioChunks.current, { type: mimeType })
        setMobileAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
        clearInterval(mobileAudioTimer.current)
      }
      mr.start(200)
      mobileAudioMRRef.current = mr
      setMobileAudioRecording(true)

      mobileAudioTimer.current = setInterval(() => {
        mobileAudioDurRef.current += 1
        setMobileAudioDuration(mobileAudioDurRef.current)
      }, 1000)
    } catch {
      setError('Could not access microphone for audio recording.')
    }
  }

  const stopMobileAudio = () => {
    clearInterval(mobileAudioTimer.current)
    const mr = mobileAudioMRRef.current
    if (mr?.state !== 'inactive') try { mr.stop() } catch {}
    mobileAudioMRRef.current = null
    setMobileAudioRecording(false)
  }

  const discardMobileAudio = () => {
    stopMobileAudio()
    setMobileAudioBlob(null)
    setMobileAudioDuration(0)
  }

  const buildRecognition = useCallback((langCode, gen) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null

    const ios = isIOS()
    const r = new SR()
    r.lang            = langCode
    r.continuous      = !ios
    r.interimResults  = !ios
    r.maxAlternatives = 1

    r.onresult = (e) => {
      if (gen !== generationRef.current) return

      let interim = '', newFinal = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) newFinal += t + ' '
        else interim += t
      }

      if (newFinal) {
        const trimmedNew = newFinal.trim().toLowerCase()
        if (trimmedNew !== lastFinalChunkRef.current) {
          lastFinalChunkRef.current = trimmedNew
          finalAccumRef.current += newFinal
        }
        setFinalText(finalAccumRef.current)
        interimAccumRef.current = ''
      }
      interimAccumRef.current = interim
      setLiveText(interim)
    }

    r.onerror = (e) => {
      if (gen !== generationRef.current) return

      switch (e.error) {
        case 'not-allowed':
          setError('Microphone access denied. Allow it in your browser settings.')
          stoppedRef.current = true
          clearTimers()
          setIsRecording(false)
          break
        case 'audio-capture':
          setError('Microphone busy or unavailable. Close other apps using the mic.')
          stoppedRef.current = true
          clearTimers()
          setIsRecording(false)
          break
        case 'network':
          if (!stoppedRef.current && isRecordingRef.current) {
            clearTimeout(restartTimerRef.current)
            restartTimerRef.current = setTimeout(() => {
              if (gen === generationRef.current && !stoppedRef.current && isRecordingRef.current) {
                spawnRef.current?.()
              }
            }, 800)
          }
          break
        case 'aborted':
        case 'no-speech':
          break
        default:
          setError(`Recognition error: "${e.error}". Tap Start to retry.`)
      }
    }

    r.onend = () => {
      if (gen !== generationRef.current) return

      setLiveText('')
      interimAccumRef.current = ''

      if (stoppedRef.current) {
        setIsRecording(false)
        return
      }

      const delay = ios ? 300 : 150
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = setTimeout(() => {
        if (gen === generationRef.current && !stoppedRef.current && isRecordingRef.current) {
          spawnRef.current?.()
        }
      }, delay)
    }

    return r
  }, [])

  const spawn = useCallback(() => {
    const gen = generationRef.current
    const r = buildRecognition(langRef.current, gen)
    if (!r) return

    recognitionRef.current = r
    try {
      r.start()
    } catch {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = setTimeout(() => {
        if (gen !== generationRef.current) return
        if (stoppedRef.current || !isRecordingRef.current) return
        const r2 = buildRecognition(langRef.current, gen)
        if (r2) {
          recognitionRef.current = r2
          try { r2.start() } catch {}
        }
      }, 400)
    }
  }, [buildRecognition])

  useEffect(() => { spawnRef.current = spawn }, [spawn])

  const startRecording = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setError('Not supported. Use Chrome or Edge.'); return }

    setError('')
    setLiveText('')
    setFinalText('')
    setCleanedText('')
    setAudioBlob(null)
    setMobileAudioBlob(null)
    setMobileAudioDuration(0)
    finalAccumRef.current     = ''
    interimAccumRef.current   = ''
    lastFinalChunkRef.current = ''
    stoppedRef.current        = false
    durationRef.current       = 0
    setAudioDuration(0)
    audioChunksRef.current    = []
    generationRef.current    += 1
    clearTimers()

    // Desktop: run MediaRecorder in parallel — safe, mic isn't exclusive
    if (!isMobile()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/webm'
        const mr = new MediaRecorder(stream, { mimeType })
        mr.ondataavailable = (e) => {
          if (e.data?.size > 0) audioChunksRef.current.push(e.data)
        }
        mr.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          setAudioBlob(blob)
          stream.getTracks().forEach(t => t.stop())
        }
        mr.start(200)
        mediaRecorderRef.current = mr
      } catch { /* audio is optional */ }
    }

    if (isMobile()) await new Promise(r => setTimeout(r, 150))

    spawn()
    setIsRecording(true)
    timerRef.current = setInterval(() => {
      durationRef.current += 1
      setAudioDuration(durationRef.current)
    }, 1000)
  }

  const endRecording = useCallback((saveInterim = false) => {
    if (saveInterim) {
      const pending = interimAccumRef.current.trim()
      if (pending && pending.toLowerCase() !== lastFinalChunkRef.current) {
        finalAccumRef.current += pending + ' '
        setFinalText(finalAccumRef.current)
      }
    }

    setLiveText('')
    interimAccumRef.current = ''
    stoppedRef.current      = true
    generationRef.current  += 1
    clearTimers()

    const rec = recognitionRef.current
    recognitionRef.current = null
    if (rec) {
      try { rec.stop() } catch {}
      setTimeout(() => { try { rec.abort() } catch {} }, 300)
    }

    const mr = mediaRecorderRef.current
    if (mr?.state !== 'inactive') try { mr.stop() } catch {}
    mediaRecorderRef.current = null

    setIsRecording(false)
  }, [])

  const handleDoneRecording = () => endRecording(true)
  const stopRecording       = () => endRecording(false)

  const cleanWithAI = async () => {
    const raw = finalText.trim()
    if (!raw) return
    setCleaning(true)
    setError('')

    const langLabel =
      LANGS.find(l => l.code === lang)?.label?.replace(/^\S+\s*/, '') ??
      'the same language as the input'

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a voice transcript cleaner. The speaker's language is: ${langLabel}.

Rules:
- KEEP the text in ${langLabel}. Do NOT translate it into English or any other language.
- Fix punctuation and capitalization following ${langLabel} conventions.
- Remove filler sounds natural to ${langLabel} (e.g. "uh", "um", "ay", "eh", "kuan", "ano ba", "yung" when used as fillers).
- Fix obvious speech-to-text errors (wrong homophones, merged or split words).
- Form proper sentences and paragraphs.
- Preserve ALL original meaning.

Return ONLY the cleaned ${langLabel} text. No explanation, no translation, no preamble.`,
          messages: [{ role: 'user', content: raw }],
        }),
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
    const blobToSave = audioBlob || mobileAudioBlob
    if (!transcript && !blobToSave) { onClose(); return }

    let audioBase64 = ''
    if (blobToSave) {
      audioBase64 = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(blobToSave)
      })
    }

    const totalDuration = audioDuration || mobileAudioDuration

    onInsert({
      type: 'voicerecording',
      attrs: {
        'data-audio':      audioBase64,
        'data-transcript': transcript,
        'data-timestamp':  new Date().toLocaleString(),
        'data-duration':   formatDuration(totalDuration),
      },
    })
    onClose()
  }

  const handleClose = () => {
    if (isRecording) stopRecording()
    if (mobileAudioRecording) stopMobileAudio()
    onClose()
  }

  const displayFinal = cleanedText || finalText
  const hasContent   = finalText.trim().length > 0
  const wordCount    = finalText.trim() ? finalText.trim().split(/\s+/).length : 0
  const mobile       = isMobile()
  // Show mobile audio phase when transcript is done and we're on mobile
  const showMobileAudioPhase = mobile && hasContent && !isRecording

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
              isRecording || mobileAudioRecording ? 'bg-red-500' : 'bg-violet-600'
            }`}
            style={isRecording || mobileAudioRecording ? { animation: 'pulse 1.5s infinite' } : {}}
          >
            <Mic className="w-4 h-4 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Voice Recording</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {isRecording
                ? `🔴 Recording… ${formatDuration(audioDuration)}`
                : mobileAudioRecording
                  ? `🔴 Audio clip… ${formatDuration(mobileAudioDuration)}`
                  : hasContent
                    ? `${wordCount} words captured`
                    : 'Real-time transcription + AI cleanup'}
            </p>
          </div>

          <button
            onClick={hasContent && !isRecording && !mobileAudioRecording ? handleSaveToNotebook : handleClose}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 shadow-sm ${
              hasContent && !isRecording && !mobileAudioRecording
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {hasContent && !isRecording && !mobileAudioRecording
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
                {LANGS.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Live wave indicator — transcript recording */}
          {isRecording && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-end gap-0.5 flex-shrink-0 h-5">
                {[3, 5, 7, 5, 3, 6, 4].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-400 rounded-full"
                    style={{
                      height: `${h * 3}px`,
                      animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-red-600 font-semibold flex-1">
                {formatDuration(audioDuration)} · Listening — speak now
              </span>
            </div>
          )}

          {/* Live wave indicator — mobile audio clip recording */}
          {mobileAudioRecording && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-xl">
              <div className="flex items-end gap-0.5 flex-shrink-0 h-5">
                {[3, 5, 7, 5, 3, 6, 4].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-violet-400 rounded-full"
                    style={{
                      height: `${h * 3}px`,
                      animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-violet-600 font-semibold flex-1">
                🎙 {formatDuration(mobileAudioDuration)} · Recording audio clip…
              </span>
              <button
                onClick={stopMobileAudio}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg"
              >
                <Square className="w-3 h-3" /> Stop
              </button>
            </div>
          )}

          {/* Desktop audio preview */}
          {audioBlob && !isRecording && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <p className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                🎧 Audio Recording
                <span className="font-normal text-violet-500">· {formatDuration(audioDuration)}</span>
              </p>
              <audio
                controls
                playsInline
                preload="metadata"
                className="w-full"
                src={URL.createObjectURL(audioBlob)}
              />
            </div>
          )}

          {/* Mobile audio clip preview */}
          {mobileAudioBlob && !mobileAudioRecording && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                  🎧 Audio Clip
                  <span className="font-normal text-violet-500">· {formatDuration(mobileAudioDuration)}</span>
                </p>
                <button
                  onClick={discardMobileAudio}
                  className="text-[10px] text-red-400 hover:text-red-600 font-semibold flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
              <audio
                controls
                playsInline
                preload="metadata"
                className="w-full"
                src={URL.createObjectURL(mobileAudioBlob)}
              />
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
                className="min-h-[100px] max-h-[200px] overflow-y-auto p-3 rounded-xl border text-sm leading-relaxed transition-colors"
                style={{
                  background: '#fafafa',
                  borderColor: isRecording ? '#fca5a5' : '#e5e7eb',
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
                  title="Discard recording"
                  className="flex items-center gap-2 px-4 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-semibold rounded-xl transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {/* Primary: start / record more transcript */}
                {!mobileAudioRecording && (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                  >
                    <Mic className="w-4 h-4" />
                    {hasContent ? 'Record More' : 'Start Recording'}
                  </button>
                )}

                {/* Mobile Phase 2: add audio clip button */}
                {showMobileAudioPhase && !mobileAudioBlob && !mobileAudioRecording && (
                  <button
                    onClick={startMobileAudio}
                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-sm font-semibold rounded-xl transition-colors"
                  >
                    <AudioLines className="w-4 h-4" />
                    Add Audio Clip
                  </button>
                )}

                {/* AI cleanup */}
                {hasContent && !cleanedText && !mobileAudioRecording && (
                  <button
                    onClick={cleanWithAI}
                    disabled={cleaning}
                    className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {cleaning ? (
                      <span className="w-4 h-4 border-2 border-amber-400/40 border-t-amber-600 rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {cleaning ? 'Cleaning…' : '✨ AI Cleanup'}
                  </button>
                )}

                {/* Save */}
                {hasContent && !mobileAudioRecording && (
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
            {isIOS() ? (
              <p>📱 Use <strong>Safari</strong> — Chrome doesn't support voice recognition on iOS</p>
            ) : mobile ? (
              <p>📱 Use <strong>Chrome</strong> for best results on Android</p>
            ) : (
              <p>🎙 Works best in Chrome or Edge · Allow microphone when prompted</p>
            )}
            <p>
              💾 {mobile
                ? 'Transcript captured first, then optionally add an audio clip'
                : 'Saves both audio recording + transcript into your note'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}