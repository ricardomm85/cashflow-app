import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleToken } from '@/lib/google/auth';
import { updateSheetData } from '@/lib/google/sheets';

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

    const { spreadsheetId, range, values } = await request.json();

    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const googleToken = await getGoogleToken();
    await updateSheetData(googleToken, spreadsheetId, range, values);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Write sheet error:', error);
    return NextResponse.json(
      { error: 'Failed to write sheet' },
      { status: 500 }
    );
  }
}
