import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createAuthedClient } from '@/app/lib/supabaseServerAuth'

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = request.headers.get('Authorization')!.replace('Bearer ', '')
  const supabase = createAuthedClient(token)

  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ transactions: data ?? [] })
}
