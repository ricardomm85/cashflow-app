'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { X, Plus } from 'lucide-react';
import { CurrencyRate } from '@/lib/types';

function formatMonth(idx: number, startDate: Date): string {
  const d = new Date(startDate.getFullYear(), startDate.getMonth() + idx, 1);
  return d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
}

export default function CurrenciesPage() {
  const [useMultipleCurrencies, setUseMultipleCurrencies] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([
    {
      currency: 'EUR',
      rates: {},
    },
  ]);
  const [months, setMonths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [newCurrency, setNewCurrency] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const settingsResponse = await fetch('/api/user/settings');
        const settingsData = await settingsResponse.json();
        setSettings(settingsData);

        const start = new Date(settingsData.start_date);
        setStartDate(start);

        // Generate months
        const monthKeys: string[] = [];
        for (let i = 0; i < 18; i++) {
          const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          monthKeys.push(`${year}-${month}`);
        }
        setMonths(monthKeys);

        const { spreadsheet_id } = settingsData;
        const response = await fetch(
          `/api/sheets/read?spreadsheetId=${spreadsheet_id}&range=currencies!A:S`
        );
        const sheetData = await response.json();

        const rows = sheetData.data || [];
        const loadedCurrencies: CurrencyRate[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[0]) continue;

          const rates: Record<string, number> = {};
          for (let j = 1; j < monthKeys.length + 1; j++) {
            rates[monthKeys[j - 1]] = parseFloat(row[j]) || (row[0] === 'EUR' ? 1 : 0);
          }

          loadedCurrencies.push({
            currency: row[0],
            rates,
          });
        }

        if (loadedCurrencies.length > 0) {
          setUseMultipleCurrencies(loadedCurrencies.length > 1);
          setCurrencies(loadedCurrencies);
        }
      } catch (error) {
        console.error('Error loading currencies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const updateRate = (currencyIdx: number, month: string, value: number) => {
    setCurrencies((prev) =>
      prev.map((curr, idx) =>
        idx === currencyIdx
          ? { ...curr, rates: { ...curr.rates, [month]: value } }
          : curr
      )
    );
  };

  const addCurrency = () => {
    if (!newCurrency.trim()) return;

    const rates = months.reduce((acc, m) => ({ ...acc, [m]: 1 }), {});
    setCurrencies((prev) => [...prev, { currency: newCurrency.toUpperCase(), rates }]);
    setNewCurrency('');
  };

  const removeCurrency = (idx: number) => {
    if (currencies[idx].currency === 'EUR') return;
    setCurrencies((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveChanges = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const rows: string[][] = currencies.map((curr) => {
        const row: string[] = [curr.currency];
        for (const month of months) {
          row.push(String(curr.rates[month] || 0));
        }
        return row;
      });

      const response = await fetch('/api/sheets/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: settings.spreadsheet_id,
          range: 'currencies!A2',
          values: rows,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save currencies');
      }
    } catch (error) {
      console.error('Error saving currencies:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Cargando divisas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Divisas</h1>
          <p className="text-slate-600 mt-1">Gestiona tipos de cambio</p>
        </div>
        <Button
          onClick={saveChanges}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      {/* Toggle for multiple currencies */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Usar múltiples divisas</CardTitle>
            <Switch
              checked={useMultipleCurrencies}
              onCheckedChange={setUseMultipleCurrencies}
            />
          </div>
        </CardHeader>
      </Card>

      {!useMultipleCurrencies ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-blue-900">
              Solo usas EUR, no necesitas configurar nada. Tus transacciones se calculan
              automáticamente en euros.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-lg">Tipos de Cambio</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Divisa</TableHead>
                      {months.map((month) => (
                        <TableHead key={month} className="text-right min-w-28">
                          {formatMonth(months.indexOf(month), startDate)}
                        </TableHead>
                      ))}
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies.map((currency, idx) => (
                      <TableRow key={currency.currency} className={idx === 0 ? 'bg-slate-50' : ''}>
                        <TableCell className={idx === 0 ? 'font-bold text-slate-900' : ''}>
                          {currency.currency}
                        </TableCell>
                        {months.map((month) => (
                          <TableCell key={month} className="text-right">
                            <Input
                              type="number"
                              step="0.0001"
                              value={currency.rates[month] || 0}
                              onChange={(e) =>
                                updateRate(idx, month, parseFloat(e.target.value) || 0)
                              }
                              disabled={currency.currency === 'EUR'}
                              className="border-0 bg-white text-right p-1 max-w-24 disabled:bg-slate-100 disabled:text-slate-600"
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          {currency.currency !== 'EUR' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCurrency(idx)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Add new currency */}
          <Card>
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-lg">Añadir Divisa</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Código de divisa (USD, GBP, JPY...)"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  className="max-w-xs"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCurrency();
                    }
                  }}
                />
                <Button
                  onClick={addCurrency}
                  disabled={!newCurrency.trim()}
                  variant="outline"
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Añadir
                </Button>
              </div>
              <p className="text-sm text-slate-600">
                Introduce el código ISO de tres letras de la divisa (ej: USD, GBP, JPY)
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
