'use client';

import React, { useEffect, useState } from 'react';
import { Transaction } from '@/lib/types';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Inbox } from 'lucide-react';

export default function TransactionsPage() {
  const { transactions, loading, fetchTransactions, addTransaction } = useTransactions();
  const { fetchCategories } = useCategories();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/user/settings', {
          method: 'GET',
        });

        if (response.ok) {
          const settings = await response.json();
          if (settings.spreadsheet_id) {
            setSpreadsheetId(settings.spreadsheet_id);
            await Promise.all([
              fetchTransactions(settings.spreadsheet_id),
              fetchCategories(settings.spreadsheet_id),
            ]);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadSettings();
  }, [fetchTransactions, fetchCategories]);

  const filteredTransactions = transactions.filter((transaction) => {
    const monthMatch = transaction.monthKey === selectedMonth;
    const searchMatch = transaction.description
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      transaction.bank.toLowerCase().includes(searchQuery.toLowerCase());
    return monthMatch && searchMatch;
  });

  const handleSaveTransaction = async (newTransaction: Omit<Transaction, 'id' | 'monthKey' | 'year' | 'month' | 'amountEur'>) => {
    if (!spreadsheetId) {
      alert('Spreadsheet ID not configured');
      return;
    }

    try {
      await addTransaction(spreadsheetId, newTransaction);
      setSelectedTransaction(undefined);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error al guardar la transacción');
    }
  };

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedTransaction(undefined);
  };

  // Generate months for selector (last 12 months)
  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().substring(0, 7);
    const label = new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
    }).format(date);
    months.push({ value: monthKey, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  if (!spreadsheetId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Inbox className="w-16 h-16 text-slate-300" />
        <h2 className="text-2xl font-bold text-slate-700">Configuración pendiente</h2>
        <p className="text-slate-500 text-center max-w-md">
          Por favor configura tu spreadsheet en los ajustes para comenzar a registrar movimientos.
        </p>
        <a href="/settings">
          <Button>Ir a Ajustes</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Movimientos Bancarios</h1>
          <p className="text-slate-500 mt-1">
            Gestiona tus transacciones y movimientos bancarios
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4" />
          Nuevo movimiento
        </Button>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por descripción o banco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="sm:w-48">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border gap-4">
          <Inbox className="w-12 h-12 text-slate-300" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-700">No hay movimientos</h3>
            <p className="text-slate-500 text-sm mt-1">
              {transactions.length === 0
                ? 'Crea tu primer movimiento para comenzar'
                : `No hay movimientos en ${months.find((m) => m.value === selectedMonth)?.label}`}
            </p>
          </div>
          {transactions.length === 0 && (
            <Button onClick={() => setIsFormOpen(true)} variant="outline" className="mt-2">
              Agregar primer movimiento
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <TransactionTable
            transactions={filteredTransactions}
            onRowClick={handleRowClick}
          />
        </div>
      )}

      <TransactionForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSave={handleSaveTransaction}
        transaction={selectedTransaction}
      />
    </div>
  );
}
