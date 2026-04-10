import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/login`);

  // Clear Google token cookies
  response.cookies.delete('google_access_token');
  response.cookies.delete('google_refresh_token');

  return response;
}
