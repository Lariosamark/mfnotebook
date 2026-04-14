import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCheck, Mic, Sparkles, Square, X, StopCircle } from 'lucide-react'

const LANGUAGES = [
  { code: 'en-US', label: '🇺🇸 English (US)' },
  { code: 'en-GB', label: '🇬🇧 English (UK)' },
  { code: 'fil-PH', label: '🇵🇭 Filipino' },
  { code: 'ceb-PH', label: '🇵🇭 Cebuano' },
  { code: 'es-ES', label: '🇪🇸 Spanish' },
  { code: 'zh-CN', label: '🇨🇳 Chinese' },
  { code: 'ja-JP', label: '🇯🇵 Japanese' },
  { code: 'ko-KR', label: '🇰🇷 Korean' },
  { code: 'fr-FR', label: '🇫🇷 French' },
  { code: 'de-DE', label: '🇩🇪 German' },
]

const isMobileDevice = () =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

const isIOSDevice = () =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)

export default function VoiceRecorderPanel({ onInsert, onClose }) {
  const [isRecording, setIsRecording] = useState(false)
  const [liveText, setLiveText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanedText, setCleanedText] = useState('')
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('en-US')
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioDuration, setAudioDuration] = useState(0)

  // Refs
  const recognitionRef = useRef(null)
  const finalTextRef = useRef('')
  const stoppedRef = useRef(false)
  const isRecordingRef = useRef(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const durationRef = useRef(0)
  const restartTimerRef = useRef(null)
  const languageRef = useRef(language)
  const generationRef = useRef(0)

  useEffect(() => { languageRef.current = language }, [language])
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech Recognition not supported. Please use Chrome, Edge, or Safari.')
    }
  }, [])

  useEffect(() => {
    return () => {
      stoppedRef.current = true
      generationRef.current += 1
      clearInterval(timerRef.current)
      clearTimeout(restartTimerRef.current)
      try { recognitionRef.current?.abort() } catch (e) {}
      try { 
        if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop() 
      } catch (e) {}
    }
  }, [])

  const formatDuration = (secs) => {
    if (!secs) return '0s'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const clearTimers = () => {
    clearInterval(timerRef.current)
    clearTimeout(restartTimerRef.current)
  }

  const buildRecognition = useCallback((langCode, gen) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return null

    const isIOS = isIOSDevice()
    const recognition = new SpeechRecognition()
    
    recognition.lang = langCode
    recognition.continuous = !isIOS
    recognition.interimResults = !isIOS
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      // FIX 1: Prevent duplicate/double transcription
      // If we stopped recording, ignore any late-arriving results
      if (gen !== generationRef.current || stoppedRef.current) return

      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        finalTextRef.current += finalTranscript
        setFinalText(finalTextRef.current)
      }
      
      setLiveText(interimTranscript)
    }

    recognition.onerror = (event) => {
      if (gen !== generationRef.current || stoppedRef.current) return

      console.error('Speech Recognition Error:', event.error)
      
      switch (event.error) {
        case 'not-allowed':
          setError('Microphone access denied. Please allow it in browser settings.')
          stopRecordingProcess()
          break
        case 'audio-capture':
          setError('Microphone is busy or unavailable.')
          stopRecordingProcess()
          break
        case 'network':
          clearTimeout(restartTimerRef.current)
          restartTimerRef.current = setTimeout(() => {
            if (!stoppedRef.current && isRecordingRef.current) {
              startRecognitionLoop(gen)
            }
          }, 1000)
          break
        case 'aborted':
        case 'no-speech':
          break
        default:
          setError(`Recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      if (gen !== generationRef.current || stoppedRef.current) return

      setLiveText('')

      if (!stoppedRef.current && isRecordingRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = setTimeout(() => {
          if (!stoppedRef.current && isRecordingRef.current) {
            startRecognitionLoop(gen)
          }
        }, isIOS ? 300 : 100)
      }
    }

    return recognition
  }, [])

  const startRecognitionLoop = (gen) => {
    const recognition = buildRecognition(languageRef.current, gen)
    if (recognition) {
      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch (e) {
        console.warn("Recognition start failed, retrying...", e)
        setTimeout(() => {
          if (!stoppedRef.current && isRecordingRef.current) {
             try { recognition.start() } catch (err) {}
          }
        }, 500)
      }
    }
  }

  const startRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Browser not supported.')
      return
    }

    // Reset State
    setError('')
    setLiveText('')
    setFinalText('')
    setCleanedText('')
    setAudioBlob(null)
    finalTextRef.current = ''
    stoppedRef.current = false
    durationRef.current = 0
    setAudioDuration(0)
    audioChunksRef.current = []
    generationRef.current += 1
    clearTimers()

    // FIX 2: Enable MediaRecorder for Mobile
    // We attempt to record audio on mobile now.
    // Note: This is experimental on iOS as it might conflict with SpeechRecognition.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data)
      }
      
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      recorder.start(200)
      mediaRecorderRef.current = recorder
    } catch (err) {
      console.warn("MediaRecorder failed, continuing without audio file.", err)
      // If this fails on mobile, we continue with transcription only
    }

    // Small delay for mobile permissions/dialogs
    if (isMobileDevice()) await new Promise(r => setTimeout(r, 100))

    // Start Speech Recognition
    startRecognitionLoop(generationRef.current)
    
    setIsRecording(true)
    timerRef.current = setInterval(() => {
      durationRef.current += 1
      setAudioDuration(durationRef.current)
    }, 1000)
  }

  const stopRecordingProcess = useCallback((saveInterim = false) => {
    // FIX 1 (Part 2): Set stopped flag immediately to block double processing
    stoppedRef.current = true
    generationRef.current += 1
    
    if (saveInterim && liveText) {
      finalTextRef.current += liveText + ' '
      setFinalText(finalTextRef.current)
    }

    setLiveText('')
    clearTimers()

    // Stop Recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (e) {}
      recognitionRef.current = null
    }

    // Stop Media Recorder
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop() } catch (e) {}
    }
    mediaRecorderRef.current = null

    setIsRecording(false)
  }, [liveText])

  const handleDone = () => stopRecordingProcess(true)
  const handleCancel = () => {
    finalTextRef.current = ''
    setFinalText('')
    stopRecordingProcess(false)
  }

  const cleanWithAI = async () => {
    const raw = finalTextRef.current.trim()
    if (!raw) return

    setIsCleaning(true)
    setError('')
    
    const langLabel = LANGUAGES.find(l => l.code === language)?.label?.replace(/^\S+\s/, '') || 'the input language'

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `You are a transcript cleaner. The speaker is using: ${langLabel}.
Rules:
- Keep the text in ${langLabel}. Do NOT translate.
- Fix punctuation and capitalization.
- Remove filler words (um, ah, like, yung, ano, etc.).
- Fix speech-to-text errors.
Return ONLY the cleaned text.`,
          messages: [{ role: 'user', content: raw }],
        }),
      })
      const data = await res.json()
      const text = data.content?.map(c => c.text || '').join('').trim()
      setCleanedText(text || raw)
    } catch (err) {
      console.error(err)
      setCleanedText(raw)
      setError('AI cleanup failed. Raw text saved.')
    } finally {
      setIsCleaning(false)
    }
  }

  const handleSave = async () => {
    const transcript = (cleanedText || finalTextRef.current).trim()
    if (!transcript && !audioBlob) {
      onClose()
      return
    }

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
        'data-audio': audioBase64,
        'data-transcript': transcript,
        'data-timestamp': new Date().toLocaleString(),
        'data-duration': formatDuration(audioDuration),
      },
    })
    onClose()
  }

  const handleClose = () => {
    if (isRecording) handleCancel()
    onClose()
  }

  // Render
  const displayText = cleanedText || finalText
  const hasContent = finalText.trim().length > 0
  const wordCount = finalText.trim() ? finalText.trim().split(/\s+/).length : 0

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 rounded-t-2xl flex-shrink-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-violet-600'}`}>
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900">Voice Recorder</h3>
            <p className="text-xs text-gray-500 truncate">
              {isRecording 
                ? `🔴 Recording ${formatDuration(audioDuration)}` 
                : hasContent 
                  ? `${wordCount} words` 
                  : 'Ready to record'}
            </p>
          </div>
          <button 
            onClick={hasContent && !isRecording ? handleSave : handleClose} 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 ${
              hasContent && !isRecording 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                : 'bg-white hover:bg-gray-100 text-gray-500 border'
            }`}
          >
            {hasContent && !isRecording ? <><CheckCheck className="w-3.5 h-3.5" /> Save</> : <><X className="w-3.5 h-3.5" /> Close</>}
          </button>
        </div>

        {/* Body - Responsive Scroll */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          
          {!isRecording && !hasContent && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-violet-400 bg-gray-50"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              
              {isMobileDevice() && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <span>⚠️</span>
                  <span>Note: Recording audio on mobile while transcribing is experimental. If transcription fails, try disabling ad-blockers or use Desktop for best results.</span>
                </div>
              )}
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-end gap-0.5 h-5">
                {[4, 6, 8, 6, 4].map((h, i) => (
                  <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: h, animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
              <span className="text-xs text-red-600 font-semibold">Listening...</span>
            </div>
          )}

          {audioBlob && !isRecording && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <p className="text-xs font-semibold text-violet-700 mb-2">🎧 Audio Recording Attached</p>
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-8" />
            </div>
          )}

          {(isRecording || hasContent) && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-600">Transcript</span>
                <span className="text-[10px] text-gray-400">{wordCount} words</span>
              </div>
              <div className="min-h-[120px] max-h-[200px] overflow-y-auto p-3 rounded-xl border text-sm leading-relaxed bg-gray-50 border-gray-200 focus-within:border-violet-300">
                {displayText && <span className="text-gray-800">{displayText}</span>}
                {liveText && <span className="text-violet-500 italic ml-1">{liveText}</span>}
                {!displayText && !liveText && isRecording && (
                  <span className="text-gray-400 italic">Waiting for speech...</span>
                )}
              </div>
            </div>
          )}

          {error && <div className="text-xs text-red-600 p-2 bg-red-50 rounded-lg border border-red-100">⚠️ {error}</div>}

          {cleanedText && !isCleaning && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <Sparkles className="w-3.5 h-3.5" /> AI Cleaned
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {isRecording ? (
              <div className="flex gap-2">
                <button onClick={handleDone} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm font-semibold">
                  <StopCircle className="w-5 h-5" /> Done
                </button>
                <button onClick={handleCancel} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-semibold">
                  <Square className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={startRecording} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl shadow-sm font-semibold">
                  <Mic className="w-4 h-4" /> {hasContent ? 'Record More' : 'Start Recording'}
                </button>
                
                {hasContent && (
                  <div className="flex gap-2">
                    {!cleanedText && (
                       <button onClick={cleanWithAI} disabled={isCleaning} className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-semibold disabled:opacity-50">
                         {isCleaning ? '...' : <><Sparkles className="w-4 h-4" /> AI Fix</>}
                       </button>
                    )}
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm font-semibold">
                      <CheckCheck className="w-4 h-4" /> Save
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-[11px] text-gray-400 text-center pt-2">
            {isMobileDevice() ? '📱 Audio + Transcript attached to note.' : '🎙️ Audio + Transcript attached to note.'}
          </div>
        </div>
      </div>
    </div>
  )
}