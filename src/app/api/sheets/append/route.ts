import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleToken } from '@/lib/google/auth';
import { appendRows } from '@/lib/google/sheets';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { spreadsheetId, sheetName, rows } = await request.json();

    if (!spreadsheetId || !sheetName || !rows) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const googleToken = await getGoogleToken();
    await appendRows(googleToken, spreadsheetId, sheetName, rows);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Append sheet error:', error);
    return NextResponse.json(
      { error: 'Failed to append rows' },
      { status: 500 }
    );
  }
}
