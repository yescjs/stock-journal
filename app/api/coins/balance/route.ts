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
    .from('user_coins')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ balance: 0 })
  }

  return NextResponse.json({ balance: data.balance })
}
