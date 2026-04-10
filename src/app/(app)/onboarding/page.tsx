'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const months = [
  { label: 'Enero', value: '01' },
  { label: 'Febrero', value: '02' },
  { label: 'Marzo', value: '03' },
  { label: 'Abril', value: '04' },
  { label: 'Mayo', value: '05' },
  { label: 'Junio', value: '06' },
  { label: 'Julio', value: '07' },
  { label: 'Agosto', value: '08' },
  { label: 'Septiembre', value: '09' },
  { label: 'Octubre', value: '10' },
  { label: 'Noviembre', value: '11' },
  { label: 'Diciembre', value: '12' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [month, setMonth] = useState('01');
  const [year, setYear] = useState(String(currentYear));
  const [vatSales, setVatSales] = useState('21');
  const [vatExpenses, setVatExpenses] = useState('21');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleNext = () => {
    if (step === 1 && !companyName.trim()) {
      return;
    }
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      const startDate = `${year}-${month}`;
      const response = await fetch('/api/sheets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          startDate,
          vatSales: parseFloat(vatSales) || 21,
          vatExpenses: parseFloat(vatExpenses) || 21,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create spreadsheet');
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Error al crear la hoja de cálculo. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configurar Cashflow</CardTitle>
          <div className="flex gap-2 justify-center mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  s <= step ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Company Name */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Nombre de la empresa</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej: Mi Empresa S.L."
                  className="text-base"
                />
              </div>
              <p className="text-sm text-slate-500">
                Este nombre aparecerá en todos tus reportes de cashflow.
              </p>
            </div>
          )}

          {/* Step 2: Start Date */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                ¿Cuándo quieres que empiece tu forecast?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Mes</Label>
                  <select
                    id="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Año</Label>
                  <select
                    id="year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Selecciona la fecha de inicio para tu forecast de cashflow.
              </p>
            </div>
          )}

          {/* Step 3: VAT Configuration */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                Configuración de IVA
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vat-sales">IVA en ventas (%)</Label>
                  <Input
                    id="vat-sales"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={vatSales}
                    onChange={(e) => setVatSales(e.target.value)}
                    placeholder="21"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat-expenses">IVA en gastos (%)</Label>
                  <Input
                    id="vat-expenses"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={vatExpenses}
                    onChange={(e) => setVatExpenses(e.target.value)}
                    placeholder="21"
                  />
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Estos valores se utilizarán para calcular tu IVA automáticamente.
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || isLoading}
              className="flex-1"
            >
              Atrás
            </Button>
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={step === 1 && !companyName.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!companyName.trim() || isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Creando...
                  </span>
                ) : (
                  'Crear hoja de cálculo'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
