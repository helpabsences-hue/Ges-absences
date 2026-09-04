'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from 'sonner'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, Record<string, string>> = {
  fr: {
    title: 'Assistant IA',
    subtitle: "Analysez les absences et identifiez les étudiants à risque",
    placeholder: "Posez une question... ex: Qui a le plus d'absences ?",
    send: 'Envoyer',
    welcome: "Bonjour ! Je suis votre assistant IA Attendefy.\n\nJe peux vous aider à :\n• Identifier les étudiants les plus absents\n• Analyser les absences par matière ou groupe\n• Repérer les étudiants à risque\n• Rédiger des emails aux parents\n\nPosez votre première question !",
    errorLimit: "Limite de requêtes atteinte. Réessayez dans une minute.",
    errorGeneral: "Une erreur s'est produite. Réessayez.",
  },
  en: {
    title: 'AI Assistant',
    subtitle: 'Analyze absences and identify at-risk students',
    placeholder: 'Ask a question... e.g. Who has the most absences?',
    send: 'Send',
    welcome: "Hello! I'm your Attendefy AI assistant.\n\nI can help you:\n• Identify students with the most absences\n• Analyze absences by subject or group\n• Spot at-risk students\n• Draft parent emails\n\nAsk your first question!",
    errorLimit: "Rate limit reached. Try again in a minute.",
    errorGeneral: "An error occurred. Please try again.",
  },
  ar: {
    title: 'المساعد الذكي',
    subtitle: 'حلل الغيابات وحدد الطلاب في خطر',
    placeholder: 'اطرح سؤالاً... مثال: من لديه أكثر الغيابات؟',
    send: 'إرسال',
    welcome: "مرحباً! أنا مساعدك الذكي في Attendefy.\n\nأستطيع مساعدتك في:\n• تحديد الطلاب الأكثر غياباً\n• تحليل الغيابات حسب المادة أو الفصل\n• رصد الطلاب في خطر\n• صياغة رسائل لأولياء الأمور\n\nاطرح سؤالك الأول!",
    errorLimit: "تم الوصول إلى حد الطلبات. حاول مرة أخرى بعد دقيقة.",
    errorGeneral: "حدث خطأ. يرجى المحاولة مرة أخرى.",
  },
}

interface Message { role: 'user' | 'assistant'; content: string }

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">AI</div>
      <div className="bg-slate-800 dark:bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1.5 items-center h-4">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const SUGGESTIONS = {
  fr: ["Qui a le plus d'absences ?", "Quels étudiants sont à risque ?", "Absences par matière ?", "Résumé de la semaine"],
  en: ["Who has the most absences?", "Which students are at risk?", "Absences by subject?", "Weekly summary"],
  ar: ["من لديه أكثر الغيابات؟", "من هم الطلاب في خطر؟", "الغيابات حسب المادة؟", "ملخص الأسبوع"],
}

export default function AIPage() {
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const t     = UI[lang]
  const isRtl = lang === 'ar'

  const [loading,  setLoading]  = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [ready,    setReady]    = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setReady(false)
    setMessages([])
    const timer = setTimeout(() => {
      setMessages([{ role: 'assistant', content: UI[lang].welcome }])
      setReady(true)
    }, 400)
    return () => clearTimeout(timer)
  }, [lang])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'chat', payload: { messages: newMessages, lang } }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.includes('429') || res.status === 429
          ? t.errorLimit
          : t.errorGeneral
        setMessages(prev => [...prev, { role: 'assistant', content: msg }])
        return
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: t.errorGeneral }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const isEmpty = messages.length <= 1 // only welcome message

  return (
    <div className={`max-w-6xl mx-auto px-4 pt-10 pb-6 md:pt-6 flex flex-col gap-4 ${isRtl ? 'text-right' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ height: 'calc(100vh - 80px)' }}>

      {/* ── Header ── */}
      <div className={`flex items-center gap-3 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden min-h-0">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!ready ? (
            /* Loading skeleton */
            <div className="space-y-4 animate-pulse">
              {[70, 50, 85].map((w, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-xl bg-muted shrink-0"/>
                  <div className="h-12 rounded-2xl bg-muted" style={{ width: `${w}%` }}/>
                </div>
              ))}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? (isRtl ? 'flex-row' : 'flex-row-reverse') : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold
                    ${msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-blue-500 to-violet-600 text-white'
                      : 'bg-slate-700 text-slate-300'
                    }`}>
                    {msg.role === 'assistant' ? 'AI' : '👤'}
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'assistant'
                      ? 'bg-muted text-foreground rounded-tl-sm border border-border'
                      : 'bg-blue-600 text-white rounded-tr-sm'
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && <TypingIndicator />}
              <div ref={bottomRef}/>
            </>
          )}
        </div>

        {/* Suggestions — show only when only welcome message */}
        {ready && isEmpty && !loading && (
          <div className={`px-4 pb-3 flex flex-wrap gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            {SUGGESTIONS[lang].map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted
                  text-muted-foreground hover:border-blue-500 hover:text-blue-400 transition">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={t.placeholder}
              className={`flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                ${isRtl ? 'text-right' : ''}`}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                text-white px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-sm font-semibold shrink-0">
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

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground shrink-0">
        Powered by Groq · {lang === 'ar' ? 'النتائج قد تحتوي على أخطاء' : lang === 'en' ? 'Results may contain errors' : 'Les résultats peuvent contenir des erreurs'}
      </p>
    </div>
  )
}