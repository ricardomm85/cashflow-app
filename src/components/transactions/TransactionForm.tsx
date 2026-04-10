'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, CategoryType } from '@/lib/types';
import { useCategories } from '@/hooks/useCategories';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'monthKey' | 'year' | 'month' | 'amountEur'>) => void;
  transaction?: Transaction;
}

export function TransactionForm({
  isOpen,
  onClose,
  onSave,
  transaction,
}: TransactionFormProps) {
  const { getGroups, getSubgroups } = useCategories();
  const [formData, setFormData] = useState({
    banco: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    importe: '0',
    divisa: 'EUR',
    tipo: 'cobros' as CategoryType,
    grupo: '',
    subgrupo: '',
    exchangeRate: '1',
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        banco: transaction.bank,
        fecha: transaction.date,
        descripcion: transaction.description,
        importe: transaction.amount.toString(),
        divisa: transaction.currency,
        tipo: transaction.type,
        grupo: transaction.group,
        subgrupo: transaction.subgroup,
        exchangeRate: transaction.exchangeRate?.toString() || '1',
      });
    }
  }, [transaction]);

  const handleTipoChange = (value: string) => {
    setFormData({
      ...formData,
      tipo: value as CategoryType,
      grupo: '',
      subgrupo: '',
    });
  };

  const handleGrupoChange = (value: string) => {
    setFormData({
      ...formData,
      grupo: value,
      subgrupo: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.banco || !formData.descripcion || !formData.grupo || !formData.subgrupo) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    const newTransaction: Omit<Transaction, 'id' | 'monthKey' | 'year' | 'month' | 'amountEur'> = {
      bank: formData.banco,
      date: formData.fecha,
      description: formData.descripcion,
      amount: parseFloat(formData.importe) || 0,
      currency: formData.divisa,
      type: formData.tipo,
      group: formData.grupo,
      subgroup: formData.subgrupo,
      exchangeRate: parseFloat(formData.exchangeRate) || 1,
    };

    onSave(newTransaction);
    setFormData({
      banco: '',
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      importe: '0',
      divisa: 'EUR',
      tipo: 'cobros',
      grupo: '',
      subgrupo: '',
      exchangeRate: '1',
    });
    onClose();
  };

  const grupos = getGroups(formData.tipo);
  const subgrupos = getSubgroups(formData.tipo, formData.grupo);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="banco">Banco *</Label>
            <Input
              id="banco"
              placeholder="Ej: Banco Santander"
              value={formData.banco}
              onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha *</Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              placeholder="Ej: Venta de productos"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="importe">
              Importe * (positivo = cobro, negativo = pago)
            </Label>
            <Input
              id="importe"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.importe}
              onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="divisa">Divisa</Label>
              <Select value={formData.divisa} onValueChange={(value) =>
                setFormData({ ...formData, divisa: value })
              }>
                <SelectTrigger id="divisa">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exchangeRate">Cambio</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.0001"
                placeholder="1.00"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={formData.tipo} onValueChange={handleTipoChange}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cobros">Cobros</SelectItem>
                <SelectItem value="pagos">Pagos</SelectItem>
                <SelectItem value="otros">Otros cobros/pagos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grupo">Grupo *</Label>
            <Select value={formData.grupo} onValueChange={handleGrupoChange}>
              <SelectTrigger id="grupo" disabled={grupos.length === 0}>
                <SelectValue placeholder="Selecciona un grupo" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo} value={grupo}>
                    {grupo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subgrupo">Subgrupo *</Label>
            <Select value={formData.subgrupo} onValueChange={(value) =>
              setFormData({ ...formData, subgrupo: value })
            }>
              <SelectTrigger id="subgrupo" disabled={subgrupos.length === 0}>
                <SelectValue placeholder="Selecciona un subgrupo" />
              </SelectTrigger>
              <SelectContent>
                {subgrupos.map((subgrupo) => (
                  <SelectItem key={subgrupo} value={subgrupo}>
                    {subgrupo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {transaction ? 'Actualizar' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
