// src/app/api/sessions/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Start a new class session
export async function POST(request: Request) {
  const { planning_id, session_date } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the planning belongs to this teacher
  const { data: planning } = await supabase
    .from('teacher_planning')
    .select('id')
    .eq('id', planning_id)
    .eq('teacher_id', user.id)
    .single()

  if (!planning) {
    return NextResponse.json({ error: 'Planning not found or not yours' }, { status: 403 })
  }

  // Check if session already exists for this date
  const { data: existing } = await supabase
    .from('class_sessions')
    .select('id')
    .eq('planning_id', planning_id)
    .eq('session_date', session_date)
    .single()

  if (existing) {
    return NextResponse.json({ session: existing })
  }

  const { data: session, error } = await supabase
    .from('class_sessions')
    .insert({ planning_id, session_date })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session })
}
