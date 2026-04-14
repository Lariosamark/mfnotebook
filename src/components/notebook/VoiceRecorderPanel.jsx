import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCheck, Mic, Sparkles, Square, X, StopCircle } from 'lucide-react'

// Language Configuration
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

// Helpers for Device Detection
const isMobile = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)

export default function VoiceRecorderPanel({ onInsert, onClose }) {
  // --- State ---
  const [status, setStatus] = useState('idle') // 'idle' | 'recording' | 'done'
  const [liveText, setLiveText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [cleanedText, setCleanedText] = useState('')
  const [isCleaning, setIsCleaning] = useState(false)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('en-US')
  const [audioBlob, setAudioBlob] = useState(null)
  const [duration, setDuration] = useState(0)

  // --- Refs (to persist values across renders without triggering re-renders) ---
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  
  // Timing & Logic Refs
  const timerRef = useRef(null)
  const finalTextRef = useRef('')
  const langRef = useRef(language)
  const isStoppingRef = useRef(false) // FIX: Prevents double transcription
  const generationRef = useRef(0)     // FIX: Prevents stale callbacks

  // Sync language changes to ref
  useEffect(() => { langRef.current = language }, [language])

  // --- Cleanup on Unmount ---
  useEffect(() => {
    return () => {
      stopEverything()
    }
  }, [])

  // --- Core Logic ---

  // 1. Initialize Speech Recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech Recognition not supported in this browser.')
      return null
    }

    const engine = new SpeechRecognition()
    engine.lang = langRef.current
    engine.continuous = !isIOS() // iOS works better with single-shot mode
    engine.interimResults = !isIOS()

    engine.onresult = (event) => {
      // FIX: If we are stopping, ignore these results to prevent duplication
      if (isStoppingRef.current) return

      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript + ' '
        } else {
          interim += transcript
        }
      }

      if (final) {
        finalTextRef.current += final
        setFinalText(finalTextRef.current)
      }
      setLiveText(interim)
    }

    engine.onerror = (e) => {
      if (isStoppingRef.current) return
      console.error('SR Error:', e.error)
      if (e.error === 'not-allowed') {
        setError('Microphone permission denied.')
        stopEverything()
      }
    }

    engine.onend = () => {
      // If we stopped manually, do nothing.
      if (isStoppingRef.current) return
      
      // Otherwise, restart to keep listening (handles timeouts/Android quirks)
      try {
        recognitionRef.current?.start()
      } catch (e) {}
    }

    return engine
  }, [])

  // 2. Start Recording
  const handleStart = async () => {
    setError('')
    setFinalText('')
    setCleanedText('')
    setAudioBlob(null)
    finalTextRef.current = ''
    isStoppingRef.current = false
    generationRef.current++
    audioChunksRef.current = []

    // A. Start Audio Recording (MediaRecorder)
    // We attempt this on mobile, but catch errors if the mic is already in use by SpeechRec
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      
      // Pick the best format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/mp4'
      
      const recorder = new MediaRecorder(stream, { mimeType })
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        // Stop the mic tracks to free up hardware
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
      }
      
      recorder.start(100) // Timeslice to ensure data is captured
      mediaRecorderRef.current = recorder
    } catch (err) {
      console.warn("MediaRecorder failed (Mobile limitation or permissions):", err)
      // We continue without audio file if this fails
    }

    // B. Start Speech Recognition
    const engine = initSpeechRecognition()
    if (engine) {
      recognitionRef.current = engine
      try {
        engine.start()
      } catch (e) {
        setError("Could not start voice recognition.")
      }
    }

    // C. Start Timer
    setStatus('recording')
    timerRef.current = setInterval(() => {
      setDuration(t => t + 1)
    }, 1000)
  }

  // 3. Stop Recording (Helper)
  const stopEverything = useCallback(() => {
    isStoppingRef.current = true // Block future SR events
    clearInterval(timerRef.current)
    
    // Stop Speech Recognition
    try { recognitionRef.current?.stop() } catch (e) {}
    recognitionRef.current = null

    // Stop Media Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch (e) {}
    }
    mediaRecorderRef.current = null
    
    setStatus('done')
    setLiveText('')
  }, [])

  // 4. User Actions
  const handleDone = () => {
    // Capture any remaining interim text immediately
    if (liveText.trim()) {
      finalTextRef.current += liveText + ' '
      setFinalText(finalTextRef.current)
    }
    stopEverything()
  }

  const handleCancel = () => {
    stopEverything()
    onClose()
  }

  const handleSave = async () => {
    const textToSave = cleanedText || finalTextRef.current
    
    // Convert Blob to Base64 if it exists
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
        'data-transcript': textToSave.trim(),
        'data-timestamp': new Date().toLocaleString(),
        'data-duration': `${Math.floor(duration / 60)}m ${duration % 60}s`,
      },
    })
    onClose()
  }

  const handleCleanWithAI = async () => {
    const raw = finalTextRef.current.trim()
    if (!raw) return
    setIsCleaning(true)

    const langLabel = LANGUAGES.find(l => l.code === language)?.label || language

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `Clean the following transcript. Language: ${langLabel}. Fix punctuation, remove filler words, and improve clarity without changing meaning. Return only the cleaned text.`,
          messages: [{ role: 'user', content: raw }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text?.trim() || raw
      setCleanedText(text)
    } catch (e) {
      setError('AI cleaning failed.')
    } finally {
      setIsCleaning(false)
    }
  }

  // --- Render Variables ---
  const displayText = cleanedText || finalText
  const wordCount = displayText.trim().split(/\s+/).filter(Boolean).length
  const hasContent = displayText.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      
      {/* Container: Bottom Sheet on Mobile, Modal on Web */}
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status === 'recording' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-violet-100 text-violet-600'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Voice Note</h2>
              {status === 'recording' && <p className="text-xs text-red-500 font-mono">{duration}s • Listening...</p>}
              {status === 'done' && <p className="text-xs text-gray-500">{wordCount} words</p>}
            </div>
          </div>
          
          <button onClick={hasContent && status !== 'recording' ? handleSave : handleCancel} className="p-2 hover:bg-gray-100 rounded-full">
            {hasContent && status !== 'recording' ? <CheckCheck className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-gray-500" />}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          
          {/* Idle State: Language Selector */}
          {status === 'idle' && !hasContent && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Language</label>
                <select 
                  value={language} 
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full p-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-violet-300 outline-none"
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              
              {isMobile() && (
                <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                  ⚠️ <strong>Mobile Note:</strong> Some mobile browsers limit recording audio and transcribing simultaneously. If audio is missing, try a desktop browser.
                </div>
              )}
            </>
          )}

          {/* Recording State: Visualizer */}
          {status === 'recording' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex items-end space-x-1 h-8">
                {[1,2,3,4,5].map(i => (
                  <div 
                    key={i} 
                    className="w-1 bg-red-400 rounded-full animate-pulse" 
                    style={{ height: `${Math.random() * 100}%`, animationDelay: `${i*0.1}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-400">Speak clearly into your microphone</p>
            </div>
          )}

          {/* Done State: Audio Preview */}
          {audioBlob && status === 'done' && (
            <div className="p-3 bg-slate-100 rounded-xl">
              <p className="text-xs font-semibold text-slate-600 mb-2">🎧 Audio Recording</p>
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-8" />
            </div>
          )}

          {/* Transcript Display */}
          {(status === 'recording' || hasContent) && (
            <div className="relative">
              <div className="min-h-[120px] p-3 bg-gray-50 rounded-xl border text-sm text-gray-800 whitespace-pre-wrap">
                {displayText}
                {/* Show live interim text in purple */}
                {status === 'recording' && liveText && (
                  <span className="text-violet-500 opacity-70 ml-1">{liveText}</span>
                )}
              </div>
              {wordCount > 0 && status === 'done' && (
                <span className="absolute bottom-2 right-2 text-[10px] bg-white px-1 rounded text-gray-400">{wordCount} words</span>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>

        {/* Footer / Actions */}
        <div className="p-4 border-t bg-slate-50 space-y-2">
          {status === 'recording' ? (
            <button onClick={handleDone} className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm transition-all">
              <StopCircle className="w-5 h-5" /> Stop Recording
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={handleStart} className="flex-1 flex items-center justify-center gap-2 p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-sm transition-all">
                <Mic className="w-4 h-4" /> {hasContent ? 'Record Again' : 'Start Recording'}
              </button>

              {hasContent && (
                <>
                  {!cleanedText && (
                    <button onClick={handleCleanWithAI} disabled={isCleaning} className="flex items-center justify-center gap-1 p-3 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl font-medium transition-all disabled:opacity-50">
                      <Sparkles className="w-4 h-4" /> {isCleaning ? 'Cleaning...' : 'AI Fix'}
                    </button>
                  )}
                  <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-sm transition-all">
                    <CheckCheck className="w-4 h-4" /> Save Note
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}