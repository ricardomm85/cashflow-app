'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { X, Plus } from 'lucide-react';
import { BankBalance } from '@/lib/types';

interface BankData {
  banks: Array<{
    name: string;
    balances: Record<string, number>;
  }>;
  creditLines: Array<{
    name: string;
    limit: number;
    dispuesto: Record<string, number>;
  }>;
}

function formatMonth(idx: number, startDate: Date): string {
  const d = new Date(startDate.getFullYear(), startDate.getMonth() + idx, 1);
  return d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
}

export default function BankBalancesPage() {
  const [data, setData] = useState<BankData>({
    banks: [],
    creditLines: [],
  });
  const [months, setMonths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());

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
          `/api/sheets/read?spreadsheetId=${spreadsheet_id}&range=bank_balances!A:T`
        );
        const sheetData = await response.json();

        const rows = sheetData.data || [];
        const loadedBanks: typeof data.banks = [];
        const loadedCreditLines: typeof data.creditLines = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[0]) continue;

          const balances: Record<string, number> = {};
          const dispuesto: Record<string, number> = {};

          for (let j = 1; j < monthKeys.length + 1; j++) {
            const value = parseFloat(row[j]) || 0;
            if (row[0].toLowerCase().includes('crédito') || row[0].toLowerCase().includes('línea')) {
              dispuesto[monthKeys[j - 1]] = value;
            } else {
              balances[monthKeys[j - 1]] = value;
            }
          }

          if (row[0].toLowerCase().includes('crédito') || row[0].toLowerCase().includes('línea')) {
            loadedCreditLines.push({
              name: row[0],
              limit: parseFloat(row[monthKeys.length + 1]) || 0,
              dispuesto,
            });
          } else {
            loadedBanks.push({
              name: row[0],
              balances,
            });
          }
        }

        setData({
          banks: loadedBanks.length > 0 ? loadedBanks : [{ name: 'Banco principal', balances: monthKeys.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}) }],
          creditLines: loadedCreditLines.length > 0 ? loadedCreditLines : [{ name: 'Línea de crédito', limit: 0, dispuesto: monthKeys.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}) }],
        });
      } catch (error) {
        console.error('Error loading bank balances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const updateBankBalance = (bankIdx: number, month: string, value: number) => {
    setData((prev) => ({
      ...prev,
      banks: prev.banks.map((bank, idx) =>
        idx === bankIdx
          ? { ...bank, balances: { ...bank.balances, [month]: value } }
          : bank
      ),
    }));
  };

  const updateBankName = (bankIdx: number, name: string) => {
    setData((prev) => ({
      ...prev,
      banks: prev.banks.map((bank, idx) =>
        idx === bankIdx ? { ...bank, name } : bank
      ),
    }));
  };

  const addBank = () => {
    const newBalances = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
    setData((prev) => ({
      ...prev,
      banks: [...prev.banks, { name: 'Nuevo banco', balances: newBalances }],
    }));
  };

  const deleteBank = (idx: number) => {
    setData((prev) => ({
      ...prev,
      banks: prev.banks.filter((_, i) => i !== idx),
    }));
  };

  const updateCreditLine = (lineIdx: number, field: 'name' | 'limit' | 'dispuesto', month: string | null, value: number | string) => {
    setData((prev) => ({
      ...prev,
      creditLines: prev.creditLines.map((line, idx) => {
        if (idx !== lineIdx) return line;

        if (field === 'name') {
          return { ...line, name: value as string };
        } else if (field === 'limit') {
          return { ...line, limit: value as number };
        } else if (field === 'dispuesto' && month) {
          return {
            ...line,
            dispuesto: { ...line.dispuesto, [month]: value as number },
          };
        }
        return line;
      }),
    }));
  };

  const addCreditLine = () => {
    const newDispuesto = months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {});
    setData((prev) => ({
      ...prev,
      creditLines: [...prev.creditLines, { name: 'Nueva línea', limit: 0, dispuesto: newDispuesto }],
    }));
  };

  const deleteCreditLine = (idx: number) => {
    setData((prev) => ({
      ...prev,
      creditLines: prev.creditLines.filter((_, i) => i !== idx),
    }));
  };

  const saveChanges = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const rows: string[][] = [];

      // Add banks
      for (const bank of data.banks) {
        const row: string[] = [bank.name];
        for (const month of months) {
          row.push(String(bank.balances[month] || 0));
        }
        rows.push(row);
      }

      // Add credit lines
      for (const line of data.creditLines) {
        const row: string[] = [line.name];
        for (const month of months) {
          row.push(String(line.dispuesto[month] || 0));
        }
        row.push(String(line.limit));
        rows.push(row);
      }

      const response = await fetch('/api/sheets/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: settings.spreadsheet_id,
          range: 'bank_balances!A2',
          values: rows,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save bank balances');
      }
    } catch (error) {
      console.error('Error saving bank balances:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Cargando saldos bancarios...</div>
      </div>
    );
  }

  const totalBanks = months.reduce((acc, month) => {
    const sum = data.banks.reduce((s, bank) => s + (bank.balances[month] || 0), 0);
    return { ...acc, [month]: sum };
  }, {} as Record<string, number>);

  const totalCreditAvailable = months.reduce((acc, month) => {
    const sum = data.creditLines.reduce(
      (s, line) => s + (line.limit - (line.dispuesto[month] || 0)),
      0
    );
    return { ...acc, [month]: sum };
  }, {} as Record<string, number>);

  const totalLiquidity = months.reduce((acc, month) => {
    return {
      ...acc,
      [month]: (totalBanks[month] || 0) + (totalCreditAvailable[month] || 0),
    };
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bancos y Créditos</h1>
          <p className="text-slate-600 mt-1">Gestiona saldos bancarios y líneas de crédito</p>
        </div>
        <Button
          onClick={saveChanges}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      {/* Banks Section */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Cuentas Bancarias</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={addBank}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Añadir banco
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Banco</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-right min-w-28">
                      {formatMonth(months.indexOf(month), startDate)}
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.banks.map((bank, bankIdx) => (
                  <TableRow key={bankIdx}>
                    <TableCell>
                      <Input
                        value={bank.name}
                        onChange={(e) => updateBankName(bankIdx, e.target.value)}
                        className="border-0 bg-white p-1"
                      />
                    </TableCell>
                    {months.map((month) => (
                      <TableCell key={month} className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={bank.balances[month] || 0}
                          onChange={(e) =>
                            updateBankBalance(bankIdx, month, parseFloat(e.target.value) || 0)
                          }
                          className="border-0 bg-white text-right p-1 max-w-24"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteBank(bankIdx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total row */}
                <TableRow className="bg-slate-50 font-bold">
                  <TableCell>Total bancos</TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      {(totalBanks[month] || 0).toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  ))}
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Credit Lines Section */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Líneas de Crédito</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={addCreditLine}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Añadir línea
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Línea de crédito</TableHead>
                  <TableHead className="w-28 text-right">Límite</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-right min-w-28">
                      {formatMonth(months.indexOf(month), startDate)}
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.creditLines.map((line, lineIdx) => (
                  <TableRow key={lineIdx}>
                    <TableCell>
                      <Input
                        value={line.name}
                        onChange={(e) =>
                          updateCreditLine(lineIdx, 'name', null, e.target.value)
                        }
                        className="border-0 bg-white p-1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.limit || 0}
                        onChange={(e) =>
                          updateCreditLine(lineIdx, 'limit', null, parseFloat(e.target.value) || 0)
                        }
                        className="border-0 bg-white text-right p-1"
                      />
                    </TableCell>
                    {months.map((month) => (
                      <TableCell key={month} className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.dispuesto[month] || 0}
                          onChange={(e) =>
                            updateCreditLine(lineIdx, 'dispuesto', month, parseFloat(e.target.value) || 0)
                          }
                          className="border-0 bg-white text-right p-1 max-w-24"
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCreditLine(lineIdx)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Total available credit */}
                <TableRow className="bg-slate-50 font-bold">
                  <TableCell>Crédito disponible</TableCell>
                  <TableCell></TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      {(totalCreditAvailable[month] || 0).toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  ))}
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Total Liquidity */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardHeader className="bg-emerald-100 border-b border-emerald-200">
          <CardTitle className="text-lg text-emerald-900">Liquidez Total</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-emerald-100">
                  <TableHead className="w-48">Total</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-right min-w-28">
                      {formatMonth(months.indexOf(month), startDate)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-bold">
                  <TableCell className="text-emerald-900">Liquidez total</TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right text-emerald-900">
                      {(totalLiquidity[month] || 0).toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
