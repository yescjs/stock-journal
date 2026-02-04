import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

/**
 * GET: 사용자의 경제 보고서 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '30');
    const unreadOnly = searchParams.get('unread') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('daily_economic_reports')
      .select('*')
      .eq('user_id', userId);

    // 특정 날짜 조회
    if (date) {
      query = query.eq('report_date', date);
    }

    // 읽지 않은 보고서만
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    // 정렬 및 제한
    const { data, error } = await query
      .order('report_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reports: data || [],
    });
  } catch (error) {
    console.error('Error in GET /api/economic-reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: 보고서 업데이트 (읽음 상태 등)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { id, userId, isRead } = await request.json();

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'Report ID and User ID are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const updateData: { is_read?: boolean } = {};
    if (typeof isRead === 'boolean') {
      updateData.is_read = isRead;
    }

    const { data, error } = await supabaseAdmin
      .from('daily_economic_reports')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating report:', error);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report: data,
    });
  } catch (error) {
    console.error('Error in PATCH /api/economic-reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 보고서 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json(
        { error: 'Report ID and User ID are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from('daily_economic_reports')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting report:', error);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/economic-reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
