'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertCircle } from 'lucide-react';
import { UserSettings } from '@/lib/types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [deleteConfirmationDouble, setDeleteConfirmationDouble] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/user/settings');
        const data = await response.json();
        if (data?.email) {
          setUserEmail(data.email);
        }
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmationDouble) return;

    try {
      const response = await fetch('/api/user/settings', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      router.push('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Cargando configuración...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Ajustes</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Error cargando la configuración</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = new Date(settings.start_date);
  const currentMonth = startDate.getMonth();
  const currentYear = startDate.getFullYear();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Ajustes</h1>
        <p className="text-slate-600 mt-1">Configura tu empresa y preferencias</p>
      </div>

      {/* Empresa Card */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle>Empresa</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="company-name" className="text-sm font-medium">
              Nombre de empresa
            </Label>
            <Input
              id="company-name"
              value={settings.company_name}
              onChange={(e) =>
                setSettings({ ...settings, company_name: e.target.value })
              }
              className="mt-1"
              placeholder="Mi Empresa S.L."
            />
          </div>
        </CardContent>
      </Card>

      {/* Fechas Card */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle>Fechas</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-month" className="text-sm font-medium">
                Mes de inicio
              </Label>
              <select
                id="start-month"
                value={currentMonth}
                onChange={(e) => {
                  const newDate = new Date(currentYear, parseInt(e.target.value), 1);
                  setSettings({
                    ...settings,
                    start_date: newDate.toISOString(),
                  });
                }}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {MONTHS.map((month, idx) => (
                  <option key={idx} value={idx}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="start-year" className="text-sm font-medium">
                Año de inicio
              </Label>
              <Input
                id="start-year"
                type="number"
                value={currentYear}
                onChange={(e) => {
                  const newDate = new Date(parseInt(e.target.value), currentMonth, 1);
                  setSettings({
                    ...settings,
                    start_date: newDate.toISOString(),
                  });
                }}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IVA Card */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle>IVA</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vat-sales" className="text-sm font-medium">
                IVA en ventas
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="vat-sales"
                  type="number"
                  value={settings.vat_sales}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      vat_sales: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1"
                />
                <span className="text-slate-600">%</span>
              </div>
            </div>
            <div>
              <Label htmlFor="vat-expenses" className="text-sm font-medium">
                IVA en gastos
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="vat-expenses"
                  type="number"
                  value={settings.vat_expenses}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      vat_expenses: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1"
                />
                <span className="text-slate-600">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modo Previsión Card */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle>Modo Previsión</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {settings.forecast_mode === 'SIMPLE' ? 'SIMPLE' : 'AVANZADO'}
              </Label>
              <p className="text-xs text-slate-600 mt-1">
                Próximamente: cambiar a AVANZADO
              </p>
            </div>
            <Switch disabled checked={settings.forecast_mode === 'ADVANCED'} />
          </div>
        </CardContent>
      </Card>

      {/* Cuenta Card */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle>Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <div className="mt-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-slate-700">
              {userEmail || settings.user_id}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Google Drive</Label>
            <div className="mt-1">
              <a
                href={`https://docs.google.com/spreadsheets/d/${settings.spreadsheet_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline text-sm break-all"
              >
                Ver hoja de cálculo
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suscripción Card */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle>Suscripción</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Plan Gratuito</p>
              <p className="text-sm text-slate-600 mt-1">12€/año</p>
            </div>
            <Button variant="outline" disabled>
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Peligro Card */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="border-b border-red-200 bg-red-100">
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Peligro
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-red-900">
              Eliminar cuenta es una acción irreversible. Se borrarán todos tus datos.
            </p>

            {!deleteConfirmation ? (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirmation(true)}
                className="w-full"
              >
                Eliminar cuenta
              </Button>
            ) : (
              <>
                <p className="text-sm font-medium text-red-900">
                  ¿Estás seguro? Esta acción no puede deshacerse.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteConfirmation(false);
                      setDeleteConfirmationDouble(false);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteConfirmationDouble(true)}
                    className="flex-1"
                  >
                    Confirmar eliminación
                  </Button>
                </div>

                {deleteConfirmationDouble && (
                  <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium text-red-900">
                      Confirmación final: escribe "eliminar" para proceder
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      className="w-full"
                    >
                      Eliminar cuenta permanentemente
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 flex-1"
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
