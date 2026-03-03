import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createAuthedClient } from '@/app/lib/supabaseServerAuth'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { paymentKey, orderId, amount } = await request.json()
  const token = request.headers.get('Authorization')!.replace('Bearer ', '')
  const supabase = createAuthedClient(token)

  // 1. 서버에서 주문 검증
  const { data: order, error: orderError } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // 2. 금액 검증 (클라이언트 위변조 방지)
  if (order.amount !== amount) {
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
  }

  // 3. Toss API 결제 승인
  const secretKey = process.env.TOSS_SECRET_KEY!
  const encodedKey = Buffer.from(`${secretKey}:`).toString('base64')

  const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodedKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })

  if (!tossResponse.ok) {
    const tossError = await tossResponse.json()
    await supabase
      .from('payment_orders')
      .update({ status: 'failed' })
      .eq('order_id', orderId)
    return NextResponse.json({ error: tossError.message }, { status: 400 })
  }

  const tossData = await tossResponse.json()

  // 4. 결제 완료 + 코인 충전 (RPC 호출)
  const { error: rpcError } = await supabase.rpc('add_coins', {
    p_user_id: user.id,
    p_amount: order.coins,
    p_type: 'purchase',
    p_ref_type: 'toss_payment',
    p_ref_id: orderId,
  })

  if (rpcError) {
    return NextResponse.json({ error: 'Coin charge failed' }, { status: 500 })
  }

  await supabase
    .from('payment_orders')
    .update({ status: 'completed', toss_payment_key: tossData.paymentKey })
    .eq('order_id', orderId)

  return NextResponse.json({ success: true, coins: order.coins })
}
