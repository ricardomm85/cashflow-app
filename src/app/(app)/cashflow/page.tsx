'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { calculateCashflow } from '@/lib/cashflow-engine';
import { Transaction, BankBalance, Category, CashflowData } from '@/lib/types';

interface CashflowState {
  data: CashflowData | null;
  months: string[];
  isLoading: boolean;
  error: string | null;
}

function CashflowCell({ value, isBold }: { value: number; isBold: boolean }) {
  const isNegative = value < 0;
  const color = isNegative ? 'text-red-600' : 'text-emerald-600';

  return (
    <div className={`text-right font-mono ${isBold ? 'font-bold' : ''} ${color}`}>
      {value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
    </div>
  );
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
}

export default function CashflowPage() {
  const [state, setState] = useState<CashflowState>({
    data: null,
    months: [],
    isLoading: true,
    error: null,
  });

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadCashflow = async () => {
      try {
        const settingsResponse = await fetch('/api/user/settings');
        if (!settingsResponse.ok) {
          throw new Error('Failed to load settings');
        }

        const settings = await settingsResponse.json();

        const { spreadsheetId, startDate } = settings;

        // Fetch transactions
        const txResponse = await fetch(
          `/api/sheets/read?spreadsheetId=${spreadsheetId}&range=transactions!A:H`
        );
        const txData = await txResponse.json();
        const transactions: Transaction[] = (txData.data || [])
          .slice(1)
          .map((row: any[], idx: number) => ({
            id: `tx-${idx}`,
            bank: row[0] || '',
            date: row[1] || new Date().toISOString(),
            description: row[2] || '',
            amount: parseFloat(row[3]) || 0,
            currency: row[4] || 'EUR',
            type: row[5] || 'cobros',
            group: row[6] || '',
            subgroup: row[7] || '',
          }));

        // Fetch categories
        const catResponse = await fetch(
          `/api/sheets/read?spreadsheetId=${spreadsheetId}&range=categories!A:D`
        );
        const catData = await catResponse.json();
        const categories: Category[] = (catData.data || [])
          .slice(1)
          .map((row: any[]) => ({
            type: row[0] || 'cobros',
            group: row[1] || '',
            subgroup: row[2] || '',
            active: row[3] !== 'false',
          }));

        // Fetch bank balances
        const bbResponse = await fetch(
          `/api/sheets/read?spreadsheetId=${spreadsheetId}&range=bank_balances!A:C`
        );
        const bbData = await bbResponse.json();
        const bankBalances: BankBalance[] = [];
        const rows = (bbData.data || []).slice(1);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row[0]) {
            const balances: Record<string, number> = {};
            for (let j = 1; j < row.length; j++) {
              balances[`balance-${j}`] = parseFloat(row[j]) || 0;
            }
            bankBalances.push({
              entity: row[0],
              type: 'bank',
              balances,
            });
          }
        }

        // Generate month keys
        const date = new Date(startDate);
        const monthKeys: string[] = [];
        for (let i = 0; i < 18; i++) {
          const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          monthKeys.push(`${year}-${month}`);
        }

        const cashflowData = calculateCashflow(
          transactions,
          categories,
          bankBalances,
          startDate
        );

        setState({
          data: cashflowData,
          months: monthKeys,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error loading cashflow:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Error cargando los datos',
        }));
      }
    };

    loadCashflow();
  }, []);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Cargando cashflow...</div>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Cashflow</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{state.error || 'Error cargando datos'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data, months } = state;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cashflow</h1>
        <p className="text-slate-600 mt-1">Proyección de flujo de caja</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="text-lg">Flujo de caja proyectado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="sticky left-0 bg-slate-50 w-56 text-left">
                    Concepto
                  </TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-right min-w-32">
                      {formatMonth(month)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Cobros section */}
                <TableRow className="bg-blue-50">
                  <TableCell className="sticky left-0 bg-blue-50 font-bold text-blue-900">
                    COBROS
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.collections[0]?.months[month] || 0}
                        isBold={true}
                      />
                    </TableCell>
                  ))}
                </TableRow>
                {data.collections.map((row, idx) => (
                  <TableRow key={`cobros-${idx}`}>
                    <TableCell className="sticky left-0 bg-white pl-8 text-slate-700">
                      {row.label}
                    </TableCell>
                    {months.map((month) => (
                      <TableCell key={month} className="text-right">
                        <CashflowCell value={row.months[month]} isBold={false} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Pagos section */}
                <TableRow className="bg-red-50">
                  <TableCell className="sticky left-0 bg-red-50 font-bold text-red-900">
                    PAGOS
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.payments[0]?.months[month] || 0}
                        isBold={true}
                      />
                    </TableCell>
                  ))}
                </TableRow>
                {data.payments.map((row, idx) => (
                  <TableRow key={`pagos-${idx}`}>
                    <TableCell className="sticky left-0 bg-white pl-8 text-slate-700">
                      {row.label}
                    </TableCell>
                    {months.map((month) => (
                      <TableCell key={month} className="text-right">
                        <CashflowCell value={row.months[month]} isBold={false} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Otros section */}
                <TableRow className="bg-purple-50">
                  <TableCell className="sticky left-0 bg-purple-50 font-bold text-purple-900">
                    OTROS
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.otherItems[0]?.months[month] || 0}
                        isBold={true}
                      />
                    </TableCell>
                  ))}
                </TableRow>
                {data.otherItems.map((row, idx) => (
                  <TableRow key={`otros-${idx}`}>
                    <TableCell className="sticky left-0 bg-white pl-8 text-slate-700">
                      {row.label}
                    </TableCell>
                    {months.map((month) => (
                      <TableCell key={month} className="text-right">
                        <CashflowCell value={row.months[month]} isBold={false} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Summary rows */}
                <TableRow className="border-t-2 bg-slate-100">
                  <TableCell className="sticky left-0 bg-slate-100 font-bold">
                    FLUJO DE CAJA
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.cashflow[0]?.months[month] || 0}
                        isBold={true}
                      />
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="sticky left-0 bg-white">
                    Saldo inicio mes
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.openingBalance.months[month]}
                        isBold={false}
                      />
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow className="bg-blue-50">
                  <TableCell className="sticky left-0 bg-blue-50 font-bold text-blue-900">
                    Saldo fin de mes
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.closingBalance.months[month]}
                        isBold={true}
                      />
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="sticky left-0 bg-white">
                    Saldo real bancos
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.realBankBalance.months[month]}
                        isBold={false}
                      />
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="sticky left-0 bg-white">Diferencia</TableCell>
                  {months.map((month) => {
                    const diff = Math.abs(data.difference.months[month]);
                    return (
                      <TableCell key={month} className="text-right">
                        {diff > 0.5 && (
                          <Badge variant="destructive" className="mr-2">
                            NO CUADRA
                          </Badge>
                        )}
                        <CashflowCell value={data.difference.months[month]} isBold={false} />
                      </TableCell>
                    );
                  })}
                </TableRow>

                <TableRow>
                  <TableCell className="sticky left-0 bg-white">
                    Crédito disponible
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.creditAvailable.months[month]}
                        isBold={false}
                      />
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow className="bg-green-50 border-t-2">
                  <TableCell className="sticky left-0 bg-green-50 font-bold text-green-900">
                    Liquidez total
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.totalLiquidity.months[month]}
                        isBold={true}
                      />
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="sticky left-0 bg-white">Burn rate</TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell value={data.burnRate.months[month]} isBold={false} />
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="sticky left-0 bg-white">
                    Burn rate prom. 3m
                  </TableCell>
                  {months.map((month) => (
                    <TableCell key={month} className="text-right">
                      <CashflowCell
                        value={data.burnRateAvg3m.months[month]}
                        isBold={false}
                      />
                    </TableCell>
                  ))}
                </TableRow>

                <TableRow>
                  <TableCell className="sticky left-0 bg-white font-bold">Runway</TableCell>
                  {months.map((month) => {
                    const runwayValue = data.runway.months[month];
                    let badgeColor = 'bg-green-100 text-green-800';
                    if (runwayValue < 3) {
                      badgeColor = 'bg-red-100 text-red-800';
                    } else if (runwayValue < 6) {
                      badgeColor = 'bg-yellow-100 text-yellow-800';
                    }

                    return (
                      <TableCell key={month} className="text-right">
                        {runwayValue === Infinity ? (
                          <Badge className={badgeColor}>∞</Badge>
                        ) : runwayValue === 0 ? (
                          <Badge className="bg-red-100 text-red-800">0</Badge>
                        ) : (
                          <Badge className={badgeColor}>
                            {runwayValue.toFixed(1)}m
                          </Badge>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
