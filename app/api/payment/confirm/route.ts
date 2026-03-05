import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createAuthedClient } from '@/app/lib/supabaseServerAuth'

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthUser(request)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { paymentId, orderId } = await request.json()
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

  // 2. 포트원 API로 결제 검증
  const apiSecret = process.env.PORTONE_API_SECRET
  if (!apiSecret) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const portoneResponse = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `PortOne ${apiSecret}`,
    },
  })

  if (!portoneResponse.ok) {
    const responseText = await portoneResponse.text()
    let portoneError: Record<string, unknown> = {}
    try {
      portoneError = JSON.parse(responseText)
    } catch {
      // non-JSON response
    }

    console.error('[Payment Confirm] PortOne API error:', {
      status: portoneResponse.status,
      body: responseText.slice(0, 500),
      paymentId,
    })

    await supabase
      .from('payment_orders')
      .update({ status: 'failed' })
      .eq('order_id', orderId)

    const message = (portoneError.message as string) || `PortOne API error (${portoneResponse.status})`
    return NextResponse.json({ error: message, portoneStatus: portoneResponse.status }, { status: 400 })
  }

  const portoneData = await portoneResponse.json()

  // 3. 결제 상태 및 금액 검증
  if (portoneData.status !== 'PAID') {
    await supabase
      .from('payment_orders')
      .update({ status: 'failed' })
      .eq('order_id', orderId)
    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  }

  if (portoneData.amount.total !== order.amount) {
    await supabase
      .from('payment_orders')
      .update({ status: 'failed' })
      .eq('order_id', orderId)
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
  }

  // 4. 결제 완료 + 코인 충전 (RPC 호출)
  const { error: rpcError } = await supabase.rpc('add_coins', {
    p_user_id: user.id,
    p_amount: order.coins,
    p_type: 'purchase',
    p_ref_type: 'portone_payment',
    p_ref_id: orderId,
  })

  if (rpcError) {
    return NextResponse.json({ error: 'Coin charge failed' }, { status: 500 })
  }

  await supabase
    .from('payment_orders')
    .update({ status: 'completed', toss_payment_key: paymentId })
    .eq('order_id', orderId)

  return NextResponse.json({ success: true, coins: order.coins })
}
