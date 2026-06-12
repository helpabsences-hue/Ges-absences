'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from 'sonner'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, Record<string, string>> = {
  fr: {
    title: 'Assistant IA',
    subtitle: 'Analysez vos données de présence avec l\'intelligence artificielle',
    tabChat: 'Chatbot', tabReport: 'Rapport Mensuel', tabPatterns: 'Patterns', tabPrediction: 'Prédiction Risques',
    chatPlaceholder: 'Posez une question sur vos données... ex: Qui a le plus d\'absences ?',
    send: 'Envoyer', generating: 'Génération…',
    reportTitle: 'Générer un rapport mensuel',
    dateFrom: 'Date de début', dateTo: 'Date de fin',
    generate: 'Générer le rapport', copy: 'Copier', copied: 'Copié !',
    patternsTitle: 'Détecter les patterns d\'absences',
    analyzePatterns: 'Analyser les patterns',
    predictionTitle: 'Prédire les étudiants à risque',
    analyzePrediction: 'Analyser les risques',
    welcome: 'Bonjour ! Je suis votre assistant IA Attendify. Je peux vous aider à analyser les absences, identifier les étudiants à risque, ou rédiger des emails aux parents. Que souhaitez-vous savoir ?',
    atRisk: 'étudiants à risque détectés',
    worstDay: 'Jour le plus problématique',
  },
  en: {
    title: 'AI Assistant',
    subtitle: 'Analyze your attendance data with artificial intelligence',
    tabChat: 'Chatbot', tabReport: 'Monthly Report', tabPatterns: 'Patterns', tabPrediction: 'Risk Prediction',
    chatPlaceholder: 'Ask a question about your data... e.g. Who has the most absences?',
    send: 'Send', generating: 'Generating…',
    reportTitle: 'Generate monthly report',
    dateFrom: 'Start date', dateTo: 'End date',
    generate: 'Generate report', copy: 'Copy', copied: 'Copied!',
    patternsTitle: 'Detect absence patterns',
    analyzePatterns: 'Analyze patterns',
    predictionTitle: 'Predict at-risk students',
    analyzePrediction: 'Analyze risks',
    welcome: 'Hello! I\'m your Attendify AI assistant. I can help you analyze absences, identify at-risk students, or draft parent emails. What would you like to know?',
    atRisk: 'at-risk students detected',
    worstDay: 'Most problematic day',
  },
  ar: {
    title: 'المساعد الذكي',
    subtitle: 'حلل بيانات الحضور باستخدام الذكاء الاصطناعي',
    tabChat: 'المحادثة', tabReport: 'التقرير الشهري', tabPatterns: 'الأنماط', tabPrediction: 'التنبؤ بالمخاطر',
    chatPlaceholder: 'اطرح سؤالاً... مثال: من لديه أكثر الغيابات؟',
    send: 'إرسال', generating: 'جارٍ الإنشاء…',
    reportTitle: 'إنشاء تقرير شهري',
    dateFrom: 'تاريخ البداية', dateTo: 'تاريخ النهاية',
    generate: 'إنشاء التقرير', copy: 'نسخ', copied: 'تم النسخ!',
    patternsTitle: 'اكتشاف أنماط الغياب',
    analyzePatterns: 'تحليل الأنماط',
    predictionTitle: 'التنبؤ بالطلاب في خطر',
    analyzePrediction: 'تحليل المخاطر',
    welcome: 'مرحباً! أنا مساعدك الذكي في Attendify. يمكنني مساعدتك في تحليل الغيابات وتحديد الطلاب المعرضين للخطر أو كتابة رسائل لأولياء الأمور.',
    atRisk: 'طالب في خطر',
    worstDay: 'اليوم الأكثر إشكالية',
  },
}

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIPage() {
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const t     = UI[lang]
  const isRtl = lang === 'ar'

  const [loading,   setLoading]   = useState(false)

  // Chat
  const [messages,  setMessages]  = useState<Message[]>([
    { role: 'assistant', content: t.welcome }
  ])
  const [input,     setInput]     = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Report

  // Patterns

  // Prediction

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const callAI = async (type: string, payload: object) => {
    const res  = await fetch('/api/ai', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, payload }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'AI error')
    }
    return res.json()
  }

  // ── Chat ──────────────────────────────────────────────────
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


  return (
    <div className={`max-w-4xl mx-auto space-y-4 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
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
      </div>



      {/* ── Chatbot ── */}
      {(
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col" style={{ minHeight: '480px', height: 'calc(100vh - 260px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? (isRtl ? 'flex-row' : 'flex-row-reverse') : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm
                  ${msg.role === 'assistant'
                    ? 'bg-gradient-to-br from-blue-500 to-violet-600'
                    : 'bg-slate-700'
                  }`}>
                  {msg.role === 'assistant' ? '🤖' : '👤'}
                </div>
                {/* Bubble */}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'assistant'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-blue-600 text-white'
                  } ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm">🤖</div>
                <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={t.chatPlaceholder}
                className={`flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRtl ? 'text-right' : ''}`}
              />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-sm font-semibold">
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
  )
}