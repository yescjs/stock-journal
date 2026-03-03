// Server-side auth helper for API routes
// Extracts JWT from Authorization header and verifies user identity
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { User } from '@supabase/supabase-js'

export async function getAuthUser(request: NextRequest): Promise<{ user: User | null; error: string | null }> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return { user: null, error: 'Missing authorization token' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' }
  }

  return { user, error: null }
}

export function createAuthedClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}
