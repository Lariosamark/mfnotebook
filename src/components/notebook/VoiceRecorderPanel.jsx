import { useEffect, useRef, useState } from 'react'
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

const isMobile = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

export default function VoiceRecorderPanel({ onInsert, onClose }) {
  const [isRecording, setIsRecording] = useState(false)
  const [liveText, setLiveText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [cleanedText, setCleanedText] = useState('')
  const [cleaning, setCleaning] = useState(false)
  const [lang, setLang] = useState('en-US')
  const [audioBlob, setAudioBlob] = useState(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  // Refs
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const finalTextRef = useRef('')
  
  // FIX: Prevent restart loops and double text
  const isManuallyStopping = useRef(false)

  // --- Core Logic ---

  const startRecording = async () => {
    // Reset State
    setError('')
    setFinalText('')
    setCleanedText('')
    setLiveText('')
    setAudioBlob(null)
    finalTextRef.current = ''
    audioChunksRef.current = []
    isManuallyStopping.current = false
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech Recognition not supported in this browser.')
      return
    }

    // 1. INITIALIZING SPEECH RECOGNITION FIRST
    // On mobile, the first API to ask for the mic usually wins.
    // We want Transcription to win.
    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text + ' '
        } else {
          interim += text
        }
      }

      if (final) {
        finalTextRef.current += final
        setFinalText(finalTextRef.current)
      }
      setLiveText(interim)
    }

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setError('Microphone permission denied.')
        stopRecording() // Stop everything if permission denied
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('SR Error:', e.error)
      }
    }

    // Auto-restart logic for continuous listening
    recognition.onend = () => {
      if (!isManuallyStopping.current && recognitionRef.current) {
        try { recognitionRef.current.start() } catch (e) {}
      }
    }

    // 2. START RECOGNITION
    try {
      recognitionRef.current = recognition
      await recognition.start()
      
      // If we reach here, SpeechRec has the mic.
      // NOW we can update UI state.
      setIsRecording(true)
      timerRef.current = setInterval(() => setDuration(t => t + 1), 1000)

    } catch (err) {
      setError('Could not start voice recognition.')
      return
    }

    // 3. ATTEMPT MEDIA RECORDER (AUDIO FILE)
    // We do this AFTER recognition starts.
    // On Desktop: Both will work.
    // On Mobile: This might fail (return silence) because SpeechRec has the mic, 
    // but at least the Transcript is safe.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      
      recorder.start(100)
      mediaRecorderRef.current = recorder
    } catch (err) {
      console.warn("MediaRecorder could not start (Mobile limitation or conflict):", err)
      // We do NOT alert the user. The transcript is still working, which is the priority.
    }
  }

  const stopRecording = () => {
    // FIX: Block restarts immediately
    isManuallyStopping.current = true
    
    clearInterval(timerRef.current)

    // Stop Audio Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Stop Speech Recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    // FIX: Do not grab liveText manually. 
    // The 'isFinal' result usually arrives milliseconds after stop.
    // Clearing live text prevents visual glitches.
    setLiveText('')
    setIsRecording(false)
  }

  const handleSave = async () => {
    const text = cleanedText || finalTextRef.current
    if (!text && !audioBlob) {
        onClose()
        return
    }

    let audioBase64 = ''
    if (audioBlob) {
      audioBase64 = await new Promise(res => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result)
        reader.readAsDataURL(audioBlob)
      })
    }

    onInsert({
      type: 'voicerecording',
      attrs: {
        'data-audio': audioBase64,
        'data-transcript': text,
        'data-timestamp': new Date().toLocaleString(),
        'data-duration': `${Math.floor(duration / 60)}m ${duration % 60}s`,
      },
    })
    onClose()
  }

  const cleanWithAI = async () => {
    if (!finalTextRef.current) return
    setCleaning(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `Clean this transcript. Fix punctuation. Remove filler words. Keep original language.`,
          messages: [{ role: 'user', content: finalTextRef.current }],
        }),
      })
      const data = await res.json()
      setCleanedText(data.content?.[0]?.text || finalTextRef.current)
    } catch (e) {
      setError('AI cleanup failed')
    } finally {
      setCleaning(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      recognitionRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const words = finalTextRef.current.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-violet-50 to-white">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-violet-600'}`}>
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Voice Note</h3>
              <p className="text-xs text-gray-500">
                {isRecording ? `🔴 ${duration}s Recording...` : `${words} words`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          
          {/* Selector (Only when idle) */}
          {!isRecording && !finalText && (
             <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500">Language</label>
              <select 
                value={lang} 
                onChange={e => setLang(e.target.value)}
                className="w-full p-3 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-violet-300 outline-none"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              
              {isMobile() && (
                 <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                   ⚠️ <strong>Mobile Note:</strong> Prioritizing transcription. Audio file recording may be limited by your browser.
                 </div>
              )}
            </div>
          )}

          {/* Transcript Box */}
          {(isRecording || finalText) && (
            <div className="min-h-[120px] p-3 bg-gray-50 rounded-xl border text-sm text-gray-800 relative">
              {cleanedText || finalText}
              {isRecording && !cleanedText && (
                <span className="text-violet-500 opacity-70 ml-1">{liveText}</span>
              )}
              {!finalText && !liveText && isRecording && (
                <span className="text-gray-400">Listening...</span>
              )}
            </div>
          )}

          {/* Audio Player */}
          {audioBlob && !isRecording && (
            <div className="p-3 bg-slate-100 rounded-xl">
              <p className="text-xs font-semibold text-slate-600 mb-1">🎧 Audio File</p>
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-8" />
            </div>
          )}

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50">
          {isRecording ? (
            <button 
              onClick={stopRecording}
              className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 text-white rounded-xl font-bold"
            >
              <StopCircle className="w-5 h-5" /> Stop & Finish
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                onClick={startRecording}
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-violet-600 text-white rounded-xl font-bold"
              >
                <Mic className="w-4 h-4" /> {finalText ? 'Record Again' : 'Start'}
              </button>

              {finalText && (
                <>
                  {!cleanedText && (
                    <button 
                      onClick={cleanWithAI}
                      disabled={cleaning}
                      className="p-3 bg-amber-100 text-amber-700 rounded-xl font-medium disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 p-3 bg-green-600 text-white rounded-xl font-bold"
                  >
                    <CheckCheck className="w-4 h-4" /> Save
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