'use client';

import React, { useState, useMemo } from 'react';
import { Transaction } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpDown } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onRowClick?: (transaction: Transaction) => void;
  onSelectionChange?: (selectedIndices: number[]) => void;
}

type SortField = 'date' | 'amount' | 'description';
type SortDirection = 'asc' | 'desc';

export function TransactionTable({
  transactions,
  onRowClick,
  onSelectionChange,
}: TransactionTableProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      let aVal: any, bVal: any;

      if (sortField === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else if (sortField === 'amount') {
        aVal = a.amount;
        bVal = b.amount;
      } else {
        aVal = a.description.toLowerCase();
        bVal = b.description.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [transactions, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIndices(new Set(sortedTransactions.map((_, i) => i)));
    } else {
      setSelectedIndices(new Set());
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedIndices);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedIndices(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const formatAmount = (amount: number, currency: string) => {
    const formatted = Math.abs(amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${currency}`;
  };

  const getAmountColor = (amount: number) => {
    if (amount > 0) return 'text-green-600 font-semibold';
    if (amount < 0) return 'text-red-600 font-semibold';
    return '';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIndices.size === sortedTransactions.length && sortedTransactions.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => handleSort('date')}
            >
              <div className="flex items-center gap-2">
                Fecha
                {sortField === 'date' && <ArrowUpDown className="w-4 h-4" />}
              </div>
            </TableHead>
            <TableHead>Banco</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => handleSort('description')}
            >
              <div className="flex items-center gap-2">
                Descripción
                {sortField === 'description' && <ArrowUpDown className="w-4 h-4" />}
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => handleSort('amount')}
            >
              <div className="flex items-center justify-end gap-2">
                Importe
                {sortField === 'amount' && <ArrowUpDown className="w-4 h-4" />}
              </div>
            </TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Subgrupo</TableHead>
            <TableHead className="text-right">Importe €</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction, index) => (
            <TableRow
              key={transaction.id}
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => onRowClick?.(transaction)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIndices.has(index)}
                  onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                />
              </TableCell>
              <TableCell className="font-medium text-sm">
                {new Date(transaction.date).toLocaleDateString('es-ES')}
              </TableCell>
              <TableCell className="text-sm">{transaction.bank}</TableCell>
              <TableCell className="text-sm">{transaction.description}</TableCell>
              <TableCell className={`text-right text-sm ${getAmountColor(transaction.amount)}`}>
                {transaction.amount < 0 ? '-' : ''}
                {formatAmount(transaction.amount, transaction.currency)}
              </TableCell>
              <TableCell className="text-sm">
                <span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs">
                  {transaction.type === 'cobros' && 'Cobros'}
                  {transaction.type === 'pagos' && 'Pagos'}
                  {transaction.type === 'otros' && 'Otros'}
                </span>
              </TableCell>
              <TableCell className="text-sm">{transaction.group}</TableCell>
              <TableCell className="text-sm">{transaction.subgroup}</TableCell>
              <TableCell className={`text-right text-sm ${getAmountColor(transaction.amountEur || transaction.amount)}`}>
                {(transaction.amountEur || transaction.amount) < 0 ? '-' : ''}
                {formatAmount(transaction.amountEur || transaction.amount, 'EUR')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {sortedTransactions.length === 0 && (
        <div className="flex items-center justify-center h-32 bg-slate-50 text-slate-500">
          No hay transacciones
        </div>
      )}
    </div>
  );
}
