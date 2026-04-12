import { useState, useCallback } from 'react';
import { Transaction } from '@/lib/types';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async (spreadsheetId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ spreadsheetId, range: 'transactions!A:I' });
      const response = await fetch(`/api/sheets/read?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();

      // Parse transactions from sheet format
      // Expected format: [fecha, banco, descripción, importe, divisa, tipo, grupo, subgrupo, exchangeRate]
      const parsedTransactions: Transaction[] = (data.data || [])
        .slice(1) // Skip header
        .map((row: any[], index: number) => {
          const amount = parseFloat(row[3]) || 0;
          const exchangeRate = parseFloat(row[8]) || 1;
          const amountEur = amount / exchangeRate;

          return {
            id: `${index}`,
            date: row[0] || new Date().toISOString().split('T')[0],
            bank: row[1] || '',
            description: row[2] || '',
            amount,
            currency: row[4] || 'EUR',
            type: (row[5] || 'cobros').toLowerCase() as any,
            group: row[6] || '',
            subgroup: row[7] || '',
            exchangeRate,
            amountEur,
            monthKey: row[0]?.substring(0, 7) || new Date().toISOString().substring(0, 7),
          };
        })
        .filter((t: Transaction) => t.bank || t.description);

      setTransactions(parsedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = useCallback(async (spreadsheetId: string, transaction: Omit<Transaction, 'id'>) => {
    try {
      const row = [
        transaction.date,
        transaction.bank,
        transaction.description,
        transaction.amount.toString(),
        transaction.currency,
        transaction.type,
        transaction.group,
        transaction.subgroup,
        transaction.exchangeRate?.toString() || '1',
      ];

      const response = await fetch('/api/sheets/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName: 'transactions',
          values: [row],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add transaction');
      }

      // Add to local state
      const newTransaction: Transaction = {
        ...transaction,
        id: `${transactions.length}`,
      };
      setTransactions([newTransaction, ...transactions]);
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }, [transactions]);

  const deleteTransactions = useCallback(async (spreadsheetId: string, indices: number[]) => {
    try {
      // For now, we'll just remove from local state
      // In production, you'd need to implement actual deletion in sheets
      const remainingTransactions = transactions.filter(
        (_, index) => !indices.includes(index)
      );
      setTransactions(remainingTransactions);
    } catch (error) {
      console.error('Error deleting transactions:', error);
      throw error;
    }
  }, [transactions]);

  return {
    transactions,
    loading,
    fetchTransactions,
    addTransaction,
    deleteTransactions,
  };
}
