'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { calculateCashflow } from '@/lib/cashflow-engine';
import { Transaction, BankBalance, Category } from '@/lib/types';

interface MetricsInput {
  [key: string]: number;
}

interface DashboardState {
  settings: any;
  transactions: Transaction[];
  categories: Category[];
  bankBalances: BankBalance[];
  metrics: {
    b2b: MetricsInput;
    b2c: MetricsInput;
  };
  isLoading: boolean;
  error: string | null;
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-4 bg-slate-200 rounded w-32"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-slate-200 rounded w-24 mb-2"></div>
        <div className="h-3 bg-slate-100 rounded w-32"></div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    settings: null,
    transactions: [],
    categories: [],
    bankBalances: [],
    metrics: {
      b2b: {
        trafico: 0,
        contactos: 0,
        reuniones: 0,
        clientes: 0,
        ticketMedio: 0,
      },
      b2c: {
        visitas: 0,
        conversiones: 0,
        ticketMedio: 0,
      },
    },
    isLoading: true,
    error: null,
  });

  const [metricsInput, setMetricsInput] = useState<{
    b2b: MetricsInput;
    b2c: MetricsInput;
  }>({
    b2b: {},
    b2c: {},
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const settingsResponse = await fetch('/api/user/settings');
        if (!settingsResponse.ok) {
          throw new Error('Failed to load settings');
        }

        const settings = await settingsResponse.json();

        // Si no hay settings o no hay spreadsheet, redirigir al onboarding
        if (!settings || !settings.spreadsheet_id) {
          window.location.href = '/onboarding';
          return;
        }

        const spreadsheetId = settings.spreadsheet_id;
        const startDate = settings.start_date;

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

        // Fetch metrics
        const metricsResponse = await fetch(
          `/api/sheets/read?spreadsheetId=${spreadsheetId}&range=metrics!A:D`
        );
        const metricsData = await metricsResponse.json();
        const metricsRows = (metricsData.data || []).slice(1);
        const b2bMetrics: MetricsInput = {};
        const b2cMetrics: MetricsInput = {};

        metricsRows.forEach((row: any[]) => {
          if (row[0]) {
            const key = row[0].toLowerCase().replace(/\s+/g, '_');
            const value = parseFloat(row[1]) || 0;

            if (row[2] === 'B2B') {
              b2bMetrics[key] = value;
            } else if (row[2] === 'B2C') {
              b2cMetrics[key] = value;
            }
          }
        });

        const finalMetricsB2B = b2bMetrics.trafico ? b2bMetrics : state.metrics.b2b;
        const finalMetricsB2C = b2cMetrics.visitas ? b2cMetrics : state.metrics.b2c;

        setState((prev) => ({
          ...prev,
          settings,
          transactions,
          categories,
          bankBalances,
          metrics: {
            b2b: finalMetricsB2B,
            b2c: finalMetricsB2C,
          },
          isLoading: false,
        }));

        setMetricsInput({
          b2b: finalMetricsB2B,
          b2c: finalMetricsB2C,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Error cargando los datos',
        }));
      }
    };

    loadData();
  }, []);

  if (state.isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">Bienvenido a Cashflow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <SkeletonCard key={i} />
            ))}
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{state.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const cashflow = calculateCashflow(
    state.transactions,
    state.categories,
    state.bankBalances,
    state.settings?.start_date || new Date().toISOString()
  );

  const monthTransactions = state.transactions.filter((tx) =>
    tx.date.startsWith(currentMonth)
  );

  const cobrosMonth = monthTransactions
    .filter((tx) => tx.type === 'cobros')
    .reduce((sum, tx) => sum + (tx.amountEur || tx.amount), 0);

  const pagosMonth = Math.abs(
    monthTransactions
      .filter((tx) => tx.type === 'pagos')
      .reduce((sum, tx) => sum + (tx.amountEur || tx.amount), 0)
  );

  const closingBalance = Object.values(cashflow.closingBalance.months)[0] || 0;
  const runway = Object.values(cashflow.runway.months)[0] || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Bienvenido a Cashflow
          {state.settings?.company_name && ` • ${state.settings.company_name}`}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Cobros del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              € {cobrosMonth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">{currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pagos del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              € {pagosMonth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">{currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Saldo de caja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                closingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              € {closingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Fin de mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Runway
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              {runway === Infinity ? (
                <Badge className="bg-green-100 text-green-800">Break-even</Badge>
              ) : runway < 3 ? (
                <Badge className="bg-red-100 text-red-800">
                  {runway.toFixed(1)} meses
                </Badge>
              ) : runway < 6 ? (
                <Badge className="bg-yellow-100 text-yellow-800">
                  {runway.toFixed(1)} meses
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800">
                  {runway.toFixed(1)} meses
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Meses de cash</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="text-lg">Flujo de caja</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-48 bg-slate-100 rounded-lg flex items-end justify-around px-4 gap-2">
            {Object.entries(cashflow.cashflow[0]?.months || {})
              .slice(0, 6)
              .map(([month, value], idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-2 flex-1"
                >
                  <div
                    className={`w-full rounded-t ${
                      value >= 0 ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                    style={{
                      height: `${Math.min(Math.abs(value) / 1000 * 100, 100)}px`,
                    }}
                  ></div>
                  <span className="text-xs text-slate-600">
                    {month.slice(5)}
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Section */}
      <Tabs defaultValue="b2b" className="w-full">
        <TabsList>
          <TabsTrigger value="b2b">Métricas B2B</TabsTrigger>
          <TabsTrigger value="b2c">Métricas B2C</TabsTrigger>
        </TabsList>

        <TabsContent value="b2b">
          <Card>
            <CardHeader className="border-b bg-slate-50">
              <CardTitle>Métricas B2B</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tráfico</Label>
                  <Input
                    type="number"
                    value={metricsInput.b2b.trafico || 0}
                    onChange={(e) =>
                      setMetricsInput((prev) => ({
                        ...prev,
                        b2b: { ...prev.b2b, trafico: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Contactos</Label>
                  <Input
                    type="number"
                    value={metricsInput.b2b.contactos || 0}
                    onChange={(e) =>
                      setMetricsInput((prev) => ({
                        ...prev,
                        b2b: { ...prev.b2b, contactos: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Reuniones</Label>
                  <Input
                    type="number"
                    value={metricsInput.b2b.reuniones || 0}
                    onChange={(e) =>
                      setMetricsInput((prev) => ({
                        ...prev,
                        b2b: { ...prev.b2b, reuniones: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Clientes</Label>
                  <Input
                    type="number"
                    value={metricsInput.b2b.clientes || 0}
                    onChange={(e) =>
                      setMetricsInput((prev) => ({
                        ...prev,
                        b2b: { ...prev.b2b, clientes: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Ticket Medio</Label>
                  <Input
                    type="number"
                    value={metricsInput.b2b.ticketMedio || 0}
                    onChange={(e) =>
                      setMetricsInput((prev) => ({
                        ...prev,
                        b2b: { ...prev.b2b, ticketMedio: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="b2c">
          <Card>
            <CardHeader className="border-b bg-slate-50">
              <CardTitle>Métricas B2C</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Visitas</Label>
                  <Input
                    type="number"
                    value={metricsInput.b2c.visitas || 0}
                    onChange={(e) =>
                      setMetricsInput((prev) => ({
                        ...prev,
                        b2c: { ...prev.b2c, visitas: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Conversiones</Label>
                  <Input
                    type="number"
                    value={metricsInput.b2c.conversiones || 0}
                    onChange={(e) =>
                      setMetricsInput((prev) => ({
                        ...prev,
                        b2c: { ...prev.b2c, conversiones: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Ticket Medio</Label>
                  <Input
                    type="number"
                    value={metricsInput.b2c.ticketMedio || 0}
                    onChange={(e) =>
                      setMetricsInput((prev) => ({
                        ...prev,
                        b2c: { ...prev.b2c, ticketMedio: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* P&L Summary */}
      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle>P&L Simplificado</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Total Ingresos</span>
            <span className="font-semibold text-emerald-600">
              € {cobrosMonth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Gastos</span>
            <span className="font-semibold text-red-600">
              € {pagosMonth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="text-slate-900 font-semibold">EBITDA</span>
            <span
              className={`font-bold text-lg ${
                cobrosMonth - pagosMonth >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              € {(cobrosMonth - pagosMonth).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Margen EBITDA</span>
            <span className="font-semibold">
              {cobrosMonth > 0
                ? (((cobrosMonth - pagosMonth) / cobrosMonth) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
