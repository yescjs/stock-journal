import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createAuthedClient } from '@/app/lib/supabaseServerAuth'
import { randomUUID } from 'crypto'
import { COIN_PACKAGES } from '@/app/types/coins'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { packageIndex = 0 } = await request.json()
  const pkg = COIN_PACKAGES[packageIndex]
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
  }

  const token = request.headers.get('Authorization')!.replace('Bearer ', '')
  const supabase = createAuthedClient(token)
  const orderId = `coin-${randomUUID()}`

  const { error } = await supabase
    .from('payment_orders')
    .insert({
      user_id: user.id,
      order_id: orderId,
      amount: pkg.price,
      coins: pkg.coins,
      status: 'pending',
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  return NextResponse.json({
    orderId,
    amount: pkg.price,
    coins: pkg.coins,
    orderName: `${pkg.coins}코인 충전`,
  })
}
