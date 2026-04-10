import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleToken } from '@/lib/google/auth';
import { getSheetData } from '@/lib/google/sheets';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const range = searchParams.get('range');

    if (!spreadsheetId || !range) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const googleToken = await getGoogleToken();
    const data = await getSheetData(googleToken, spreadsheetId, range);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Read sheet error:', error);
    return NextResponse.json(
      { error: 'Failed to read sheet' },
      { status: 500 }
    );
  }
}
