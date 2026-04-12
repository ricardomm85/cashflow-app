import { cookies } from 'next/headers';

export async function getGoogleToken(): Promise<string> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('google_access_token')?.value;

  if (accessToken) {
    return accessToken;
  }

  // Access token expirado — intentar refresh
  const refreshToken = cookieStore.get('google_refresh_token')?.value;
  if (!refreshToken) {
    throw new Error(
      'No Google access token available. Please log out and log in again.'
    );
  }

  const newAccessToken = await refreshGoogleToken(refreshToken);

  cookieStore.set('google_access_token', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 3600,
  });

  return newAccessToken;
}

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Google token: ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token in Google refresh response');
  }

  return data.access_token;
}
