'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from 'sonner'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, Record<string, string>> = {
  fr: {
    title: 'Assistant IA', subtitle: "Posez vos questions ou analysez les risques de décrochage",
    tabChat: 'Chatbot', tabRisk: 'Analyse des Risques',
    placeholder: "Posez une question... ex: Qui a le plus d'absences ?",
    send: 'Envoyer',
    welcome: "Bonjour ! Je suis votre assistant IA Attendify. Je peux analyser les absences, identifier les étudiants à risque, ou rédiger des emails aux parents.",
    analyzeBtn: 'Analyser les risques',
    analyzing: 'Analyse en cours…',
    riskSubtitle: 'Modèle Random Forest entraîné sur vos données réelles',
    total: 'Total étudiants', highRisk: 'Risque élevé', mediumRisk: 'Risque moyen',
    watchTitle: 'Étudiants à surveiller',
    mlBadge: '🤖 Random Forest Model', groqBadge: '🔄 Groq Fallback',
    absences: 'absences',
    emptyRisk: "Cliquez sur 'Analyser les risques' pour démarrer l'analyse.",
  },
  en: {
    title: 'AI Assistant', subtitle: 'Ask questions or analyze dropout risk',
    tabChat: 'Chatbot', tabRisk: 'Risk Analysis',
    placeholder: 'Ask a question... e.g. Who has the most absences?',
    send: 'Send',
    welcome: "Hello! I'm your Attendify AI assistant. I can analyze absences, identify at-risk students, or draft parent emails.",
    analyzeBtn: 'Analyze risks',
    analyzing: 'Analyzing…',
    riskSubtitle: 'Random Forest model trained on your real data',
    total: 'Total students', highRisk: 'High risk', mediumRisk: 'Medium risk',
    watchTitle: 'Students to watch',
    mlBadge: '🤖 Random Forest Model', groqBadge: '🔄 Groq Fallback',
    absences: 'absences',
    emptyRisk: "Click 'Analyze risks' to start the analysis.",
  },
  ar: {
    title: 'المساعد الذكي', subtitle: 'اطرح أسئلة أو حلل مخاطر التسرب',
    tabChat: 'المحادثة', tabRisk: 'تحليل المخاطر',
    placeholder: 'اطرح سؤالاً...',
    send: 'إرسال',
    welcome: 'مرحباً! أنا مساعدك الذكي في Attendify.',
    analyzeBtn: 'تحليل المخاطر',
    analyzing: 'جارٍ التحليل…',
    riskSubtitle: 'نموذج Random Forest مدرب على بياناتك',
    total: 'إجمالي الطلاب', highRisk: 'خطر مرتفع', mediumRisk: 'خطر متوسط',
    watchTitle: 'طلاب يحتاجون متابعة',
    mlBadge: '🤖 Random Forest Model', groqBadge: '🔄 Groq Fallback',
    absences: 'غياب',
    emptyRisk: "اضغط على 'تحليل المخاطر' للبدء.",
  },
}

interface Message { role: 'user' | 'assistant'; content: string }

// ── Skeleton components ────────────────────────────────────────
function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`} />
  )
}

function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[80, 60, 90, 50].map((w, i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
          <Skeleton className={`h-12 rounded-2xl`} style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  )
}

function RiskSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-4 space-y-2">
            <Skeleton className="h-7 w-12 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>
      {/* Badge */}
      <Skeleton className="h-6 w-40" />
      {/* Explanation */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      {/* Students */}
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center justify-between bg-slate-800/30 rounded-xl px-4 py-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-12 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default function AIPage() {
  const { language } = useSettingsStore()
  const lang   = (language || 'fr') as Lang
  const t      = UI[lang]
  const isRtl  = lang === 'ar'

  const [activeTab,  setActiveTab]  = useState<'chat' | 'risk'>('chat')
  const [chatReady,  setChatReady]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [prediction, setPrediction] = useState<any>(null)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Simulate chat loading on mount
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages([{ role: 'assistant', content: UI[lang].welcome }])
      setChatReady(true)
    }, 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const callAI = async (type: string, payload: object) => {
    const res = await fetch('/api/ai', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, payload }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }))
      throw new Error(err.error ?? 'AI error')
    }
    return res.json()
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const data = await callAI('chat', { messages: newMessages, lang })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runPrediction = async () => {
    setPredicting(true)
    setPrediction(null)
    try {
      const data = await callAI('prediction', { lang })
      setPrediction(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPredicting(false)
    }
  }

  const tabBase = "flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
  const tabActive = "bg-slate-800 text-white shadow-sm"
  const tabInactive = "text-slate-500 hover:text-slate-300"

  return (
    <div className={`max-w-4xl mx-auto space-y-4 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Header ── */}
      <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">{t.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* ── Tabs (shadcn-style) ── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">

        {/* Tab bar */}
        <div className="flex gap-1 p-1.5 border-b border-slate-800 bg-slate-900">
          <button onClick={() => setActiveTab('chat')}
            className={`${tabBase} ${activeTab === 'chat' ? tabActive : tabInactive} flex items-center justify-center gap-2`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            {t.tabChat}
          </button>
        </div>

        {/* ── Tab Content ── */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-b-2xl">

          {/* ── CHAT TAB ── */}
          {activeTab === 'chat' && (  
            <div className="flex flex-col" style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 scrollbar-none pr-1">
                {!chatReady ? <ChatSkeleton /> : (
                  <>
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === 'user' ? (isRtl ? 'flex-row' : 'flex-row-reverse') : ''}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold
                          ${msg.role === 'assistant'
                            ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                          }`}>
                          {msg.role === 'assistant' ? 'AI' : '👤'}
                        </div>
                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                          ${msg.role === 'assistant'
                            ? 'bg-slate-800 text-slate-100 rounded-tl-sm'
                            : 'bg-blue-600 text-white rounded-tr-sm'
                          }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">AI</div>
                        <div className="bg-slate-500 text-gray-50 px-4 py-3 rounded-2xl rounded-tl-sm">
                          <div className="flex gap-1 items-center h-4">
                            {[0,1,2].map(i => (
                              <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="pt-3 mt-3 border-t border-slate-800">
                <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={t.placeholder}
                    className={`flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isRtl ? 'text-right' : ''}`}
                  />
                  <button onClick={sendMessage} disabled={loading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-sm font-semibold shrink-0">
                    {loading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                      </svg>
                    )}
                    <span className="hidden sm:inline">{t.send}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}