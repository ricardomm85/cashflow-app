'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  const handleGoogleSignIn = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const origin = window.location.origin;
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes:
            'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <div className="mb-4">
          <div className="text-5xl font-bold text-emerald-600">₡</div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Cashflow</h1>
        <CardDescription className="text-base mt-2">
          Control de caja para tu empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          size="lg"
          className="w-full bg-slate-900 hover:bg-slate-800 text-white"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Cargando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
              >
                <text
                  x="50%"
                  y="50%"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="bold"
                  fill="white"
                >
                  G
                </text>
              </svg>
              Iniciar sesión con Google
            </span>
          )}
        </Button>
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>Open source · Tus datos en tu Google Drive</p>
        </div>
      </CardContent>
    </Card>
  );
}
