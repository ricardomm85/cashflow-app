import { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Cobros > Ventas
  {
    type: 'cobros',
    group: 'Ventas',
    subgroup: 'Ingresos tipo 1',
    active: true,
  },
  {
    type: 'cobros',
    group: 'Ventas',
    subgroup: 'Ingresos Tipo 2',
    active: true,
  },
  {
    type: 'cobros',
    group: 'Ventas',
    subgroup: 'Ingresos Tipo 3',
    active: true,
  },
  {
    type: 'cobros',
    group: 'Ventas',
    subgroup: 'ingresos 4',
    active: true,
  },

  // Cobros > Cobros atípicos
  {
    type: 'cobros',
    group: 'Cobros atípicos',
    subgroup: 'Otros cobros',
    active: true,
  },

  // Pagos > Producción
  {
    type: 'pagos',
    group: 'Producción',
    subgroup: 'Comisión canal venta',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Producción',
    subgroup: 'Coste de Producto Vendido (CoGs)',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Producción',
    subgroup: 'Transporte de las ventas',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Producción',
    subgroup: 'Packaging y regalos',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Producción',
    subgroup: 'Otros gastos de producción',
    active: true,
  },

  // Pagos > Marketing
  {
    type: 'pagos',
    group: 'Marketing',
    subgroup: 'Google Ads',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Marketing',
    subgroup: 'Meta Ads',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Marketing',
    subgroup: 'Linkedin Ads',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Marketing',
    subgroup: 'Comisiones de Influencers',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Marketing',
    subgroup: 'Herramientas MKT',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Marketing',
    subgroup: 'Materiales blogueros',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Marketing',
    subgroup: 'Coste de Unidades enviadas a Influencers',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Marketing',
    subgroup: 'Ferias',
    active: true,
  },

  // Pagos > Personal
  {
    type: 'pagos',
    group: 'Personal',
    subgroup: 'Salarios personal',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Personal',
    subgroup: 'Salarios freelance',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Personal',
    subgroup: 'Cuotas Autónomos',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Personal',
    subgroup: 'Seguridad Social',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Personal',
    subgroup: 'IRPF',
    active: true,
  },

  // Pagos > Generales
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Alquiler oficinas',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Suministros',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Servicios Asesoría y Gestoría',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Abogados',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Servidores y Servicios Web',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Viajes',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Comisiones y servicios bancarios',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Seguros',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Marca',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Mermas',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Tributos',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Ordenadores',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Mobiliario',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Licencias de software',
    active: true,
  },
  {
    type: 'pagos',
    group: 'Generales',
    subgroup: 'Otros gastos',
    active: true,
  },

  // Otros > Impuestos y deuda > IVA
  {
    type: 'otros',
    group: 'Impuestos y deuda',
    subgroup: 'IVA (declaraciones)',
    active: true,
  },

  // Otros > Préstamos / Deuda
  {
    type: 'otros',
    group: 'Préstamos / Deuda',
    subgroup: 'Préstamos - Ingreso Préstamo',
    active: true,
  },
  {
    type: 'otros',
    group: 'Préstamos / Deuda',
    subgroup: 'Préstamos - Pago intereses',
    active: true,
  },
  {
    type: 'otros',
    group: 'Préstamos / Deuda',
    subgroup: 'Préstamos - Devolución de principal',
    active: true,
  },

  // Otros > Inversión Externa
  {
    type: 'otros',
    group: 'Inversión Externa',
    subgroup: 'Ampliación de Capital',
    active: true,
  },
  {
    type: 'otros',
    group: 'Inversión Externa',
    subgroup: 'Subvenciones y ayudas',
    active: true,
  },
  {
    type: 'otros',
    group: 'Inversión Externa',
    subgroup: 'Aportaciones de socios no escrituradas',
    active: true,
  },
  {
    type: 'otros',
    group: 'Inversión Externa',
    subgroup: 'Repago a socios',
    active: true,
  },
  {
    type: 'otros',
    group: 'Inversión Externa',
    subgroup: 'Donación',
    active: true,
  },
];
