import {
  Category,
  Transaction,
  BankBalance,
  CashflowData,
  CashflowRow,
} from './types';

function getMonthKey(date: string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function generateMonthKeys(startDate: string, months: number): string[] {
  const keys: string[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    keys.push(`${year}-${month}`);
  }

  return keys;
}

function createCashflowRow(
  label: string,
  level: 0 | 1 | 2,
  isGroup: boolean,
  monthKeys: string[]
): CashflowRow {
  const months: Record<string, number> = {};
  monthKeys.forEach((key) => {
    months[key] = 0;
  });

  return {
    label,
    level,
    isGroup,
    months,
  };
}

function sumTransactionsBySubgroup(
  transactions: Transaction[],
  monthKeys: string[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  transactions.forEach((tx) => {
    const key = `${tx.type}|${tx.group}|${tx.subgroup}`;
    if (!result[key]) {
      result[key] = {};
      monthKeys.forEach((m) => {
        result[key][m] = 0;
      });
    }

    const monthKey = getMonthKey(tx.date);
    if (result[key][monthKey] !== undefined) {
      const amount =
        tx.amountEur ||
        (tx.currency === 'EUR' ? tx.amount : tx.amount * (tx.exchangeRate || 1));
      result[key][monthKey] += amount;
    }
  });

  return result;
}

export function calculateCashflow(
  transactions: Transaction[],
  categories: Category[],
  bankBalances: BankBalance[],
  startDate: string
): CashflowData {
  const monthKeys = generateMonthKeys(startDate, 18);

  const txBySubgroup = sumTransactionsBySubgroup(transactions, monthKeys);

  const groupedByType: Record<string, CashflowRow[]> = {
    cobros: [],
    pagos: [],
    otros: [],
  };

  const groupedByCategory: Record<
    string,
    { group: string; rows: CashflowRow[] }
  > = {};

  const categoryKeys = new Set<string>();
  Object.keys(txBySubgroup).forEach((key) => {
    const [type, group, subgroup] = key.split('|');
    categoryKeys.add(`${type}|${group}`);
  });

  categories.forEach((cat) => {
    const key = `${cat.type}|${cat.group}`;
    categoryKeys.add(key);
  });

  categoryKeys.forEach((catKey) => {
    const [type, group] = catKey.split('|');
    if (!groupedByCategory[catKey]) {
      groupedByCategory[catKey] = {
        group,
        rows: [],
      };
    }

    const subgroupRows = Object.keys(txBySubgroup)
      .filter((txKey) => txKey.startsWith(`${type}|${group}|`))
      .map((txKey) => {
        const [, , subgroup] = txKey.split('|');
        const row = createCashflowRow(subgroup, 2, false, monthKeys);
        monthKeys.forEach((m) => {
          row.months[m] = txBySubgroup[txKey][m];
        });
        return row;
      });

    const groupRow = createCashflowRow(group, 1, true, monthKeys);
    monthKeys.forEach((m) => {
      groupRow.months[m] = subgroupRows.reduce(
        (sum, row) => sum + row.months[m],
        0
      );
    });

    groupedByCategory[catKey].rows = [groupRow, ...subgroupRows];
    groupedByType[type].push(groupRow);
  });

  const collections = groupedByType.cobros;
  const payments = groupedByType.pagos;
  const otherItems = groupedByType.otros;

  const cobrosTotalRow = createCashflowRow('TOTAL COBROS', 0, true, monthKeys);
  monthKeys.forEach((m) => {
    cobrosTotalRow.months[m] = collections.reduce(
      (sum, row) => sum + row.months[m],
      0
    );
  });

  const pagosTotalRow = createCashflowRow('TOTAL PAGOS', 0, true, monthKeys);
  monthKeys.forEach((m) => {
    pagosTotalRow.months[m] = payments.reduce(
      (sum, row) => sum + row.months[m],
      0
    );
  });

  const otrosTotalRow = createCashflowRow('TOTAL OTROS', 0, true, monthKeys);
  monthKeys.forEach((m) => {
    otrosTotalRow.months[m] = otherItems.reduce(
      (sum, row) => sum + row.months[m],
      0
    );
  });

  const cashflowRow = createCashflowRow('CASHFLOW', 0, true, monthKeys);
  monthKeys.forEach((m) => {
    cashflowRow.months[m] =
      cobrosTotalRow.months[m] -
      pagosTotalRow.months[m] +
      otrosTotalRow.months[m];
  });

  const openingBalance = createCashflowRow(
    'Opening Balance',
    0,
    false,
    monthKeys
  );
  const closingBalance = createCashflowRow(
    'Closing Balance',
    0,
    false,
    monthKeys
  );
  const realBankBalance = createCashflowRow(
    'Real Bank Balance',
    0,
    false,
    monthKeys
  );
  const difference = createCashflowRow('Difference', 0, false, monthKeys);
  const creditAvailable = createCashflowRow(
    'Credit Available',
    0,
    false,
    monthKeys
  );
  const totalLiquidity = createCashflowRow(
    'Total Liquidity',
    0,
    false,
    monthKeys
  );

  let currentOpening = 0;
  monthKeys.forEach((m, idx) => {
    if (idx === 0) {
      openingBalance.months[m] = currentOpening;
    } else {
      openingBalance.months[m] = closingBalance.months[monthKeys[idx - 1]];
    }

    closingBalance.months[m] =
      openingBalance.months[m] + cashflowRow.months[m];

    const relevantBalance = bankBalances.find((b) => b.balances[m]);
    realBankBalance.months[m] = relevantBalance?.balances[m] || 0;

    difference.months[m] = realBankBalance.months[m] - closingBalance.months[m];

    const creditLine = bankBalances.find((b) => b.type === 'credit_line');
    creditAvailable.months[m] = creditLine?.limit || 0;

    totalLiquidity.months[m] =
      closingBalance.months[m] + (creditAvailable.months[m] || 0);
  });

  const burnRate = createCashflowRow('Burn Rate', 0, false, monthKeys);
  monthKeys.forEach((m) => {
    burnRate.months[m] = cashflowRow.months[m] < 0 ? cashflowRow.months[m] : 0;
  });

  const burnRateAvg3m = createCashflowRow(
    'Burn Rate Avg (3M)',
    0,
    false,
    monthKeys
  );
  monthKeys.forEach((m, idx) => {
    const startIdx = Math.max(0, idx - 2);
    const endIdx = idx + 1;
    const slice = monthKeys.slice(startIdx, endIdx);
    const avg =
      slice.reduce((sum, k) => sum + burnRate.months[k], 0) / slice.length;
    burnRateAvg3m.months[m] = avg;
  });

  const runway = createCashflowRow('Runway', 0, false, monthKeys);
  monthKeys.forEach((m) => {
    if (burnRateAvg3m.months[m] < 0 && totalLiquidity.months[m] > 0) {
      const months = totalLiquidity.months[m] / Math.abs(burnRateAvg3m.months[m]);
      runway.months[m] = Math.round(months * 10) / 10;
    } else if (burnRateAvg3m.months[m] >= 0) {
      runway.months[m] = Infinity;
    } else {
      runway.months[m] = 0;
    }
  });

  return {
    collections: [...collections, cobrosTotalRow],
    payments: [...payments, pagosTotalRow],
    otherItems: [...otherItems, otrosTotalRow],
    cashflow: [cashflowRow],
    openingBalance,
    closingBalance,
    realBankBalance,
    difference,
    creditAvailable,
    totalLiquidity,
    burnRate,
    burnRateAvg3m,
    runway,
  };
}
