import { cookies } from 'next/headers';

export async function getGoogleToken(): Promise<string> {
  const cookieStore = await cookies();
  const googleToken = cookieStore.get('google_access_token')?.value;

  if (!googleToken) {
    throw new Error(
      'No Google access token available. Please log out and log in again.'
    );
  }

  // TODO: Implement token refresh using google_refresh_token cookie
  // when the access token expires

  return googleToken;
}
