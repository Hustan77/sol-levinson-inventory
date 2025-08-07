// src/app/api/caskets/[id]/arrived/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { arrivalDate } = await req.json()

  // ✅ Extract ID from the URL
  const id = req.nextUrl.pathname.split('/')[4]

  if (!arrivalDate) {
    return NextResponse.json({ error: 'Missing arrivalDate' }, { status: 400 })
  }

  const { error } = await supabase
    .from('caskets')
    .update({ status: 'Arrived', expected_date: arrivalDate })
    .eq('id', id)

  if (error) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
