/**
 * csvImport.ts
 *
 * Parses bank CSV exports into a normalized transaction format.
 * Supports: Chase, American Express, Bank of America, Citi, Capital One,
 *           Wells Fargo, and a generic fallback.
 */

import Papa from 'papaparse';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawTransaction {
  date:        string;   // yyyy-MM-dd
  description: string;   // merchant / payee name
  amount:      number;   // positive = expense, negative = income/credit
  type:        'expense' | 'income' | 'transfer';
  source:      string;   // bank name detected
  rawCategory: string;   // original category from CSV if present
}

export interface ImportResult {
  transactions: RawTransaction[];
  bank:         string;
  count:        number;
  skipped:      number;
  errors:       string[];
}

// ─── Bank detection ───────────────────────────────────────────────────────────

type BankFormat = {
  name:        string;
  headers:     string[];   // required headers to detect this format
  dateCol:     string;
  descCol:     string;
  amountCol:   string;
  creditCol?:  string;     // some banks split debit/credit into two columns
  debitCol?:   string;
  categoryCol?: string;
  typeCol?:    string;     // column that says DEBIT/CREDIT (Chase checking "Details")
  amountSign:  'negate' | 'keep';  // negate = flip sign so expense is positive
};

const BANK_FORMATS: BankFormat[] = [
  // Chase Credit Card
  // Header: Transaction Date,Post Date,Description,Category,Type,Amount,Memo
  {
    name: 'Chase Credit',
    headers: ['Transaction Date', 'Post Date', 'Description', 'Category', 'Type', 'Amount', 'Memo'],
    dateCol: 'Transaction Date',
    descCol: 'Description',
    amountCol: 'Amount',
    categoryCol: 'Category',
    amountSign: 'negate', // Chase credit: negative = expense, positive = payment/credit
  },
  // Chase Checking
  // Header: Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
  // "Details" column = DEBIT or CREDIT
  {
    name: 'Chase Checking',
    headers: ['Details', 'Posting Date', 'Description', 'Amount', 'Type', 'Balance', 'Check or Slip #'],
    dateCol: 'Posting Date',
    descCol: 'Description',
    amountCol: 'Amount',
    typeCol:   'Details',  // "DEBIT" or "CREDIT" — use to classify type
    amountSign: 'keep',    // Chase checking: negative = debit/expense, positive = deposit/income
  },
  // American Express
  {
    name: 'American Express',
    headers: ['Date', 'Description', 'Amount'],
    dateCol: 'Date',
    descCol: 'Description',
    amountCol: 'Amount',
    amountSign: 'negate', // Amex: positive = expense
  },
  // Bank of America
  {
    name: 'Bank of America',
    headers: ['Date', 'Description', 'Amount', 'Running Bal.'],
    dateCol: 'Date',
    descCol: 'Description',
    amountCol: 'Amount',
    amountSign: 'keep', // BofA: negative = expense already
  },
  // Citi
  {
    name: 'Citi',
    headers: ['Status', 'Date', 'Description', 'Debit', 'Credit'],
    dateCol: 'Date',
    descCol: 'Description',
    debitCol: 'Debit',
    creditCol: 'Credit',
    amountCol: 'Debit',
    amountSign: 'keep',
  },
  // Capital One
  {
    name: 'Capital One',
    headers: ['Transaction Date', 'Posted Date', 'Card No.', 'Description', 'Category', 'Debit', 'Credit'],
    dateCol: 'Transaction Date',
    descCol: 'Description',
    debitCol: 'Debit',
    creditCol: 'Credit',
    amountCol: 'Debit',
    categoryCol: 'Category',
    amountSign: 'keep',
  },
  // Wells Fargo
  {
    name: 'Wells Fargo',
    headers: ['Date', 'Amount', 'asterisk', 'empty', 'Description'],
    dateCol: 'Date',
    descCol: 'Description',
    amountCol: 'Amount',
    amountSign: 'keep',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  // Try MM/DD/YYYY
  const mmddyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, m, d, y] = mmddyyyy;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // Try YYYY-MM-DD
  const yyyymmdd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) return raw;
  // Try MM-DD-YYYY
  const mmddyyyy2 = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mmddyyyy2) {
    const [, m, d, y] = mmddyyyy2;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  return null;
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return null;
  const cleaned = raw.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function detectBank(headers: string[]): BankFormat | null {
  const headerSet = new Set(headers.map(h => h.trim()));
  console.log('[csvImport] Detected headers:', [...headerSet]);

  let bestFmt:     BankFormat | null = null;
  let bestMatches  = 0;

  for (const fmt of BANK_FORMATS) {
    if (fmt.headers.length === 0) continue;
    const matches = fmt.headers.filter(h => headerSet.has(h)).length;
    // Must match at least the key columns (date, desc, amount) — use 3 as minimum
    const threshold = Math.min(3, fmt.headers.length);
    if (matches >= threshold && matches > bestMatches) {
      bestFmt     = fmt;
      bestMatches = matches;
    }
  }

  if (bestFmt) {
    console.log(`[csvImport] Detected bank: ${bestFmt.name} (${bestMatches} header matches)`);
  } else {
    console.log('[csvImport] No bank matched — using generic fallback');
  }

  return bestFmt;
}

function classifyType(
  signedAmount: number,
  desc: string,
  typeHint?: string   // e.g. "DEBIT" / "CREDIT" from Chase checking Details column
): 'expense' | 'income' | 'transfer' {
  const d = desc.toLowerCase();
  if (
    d.includes('transfer') ||
    d.includes('zelle') ||
    d.includes('venmo') ||
    d.includes('paypal transfer') ||
    d.includes('online transfer')
  ) {
    return 'transfer';
  }
  // Use explicit type hint if available (Chase checking Details column)
  if (typeHint) {
    const t = typeHint.trim().toUpperCase();
    if (t === 'DEBIT' || t === 'ACH_DEBIT' || t === 'DEBIT_CARD')  return 'expense';
    if (t === 'CREDIT' || t === 'ACH_CREDIT' || t === 'DEPOSIT')    return 'income';
  }
  // Fall back to sign: negative = expense, positive = income
  return signedAmount < 0 ? 'expense' : 'income';
}

// ─── Generic fallback parser ──────────────────────────────────────────────────

function parseGeneric(rows: Record<string, string>[]): RawTransaction[] {
  const results: RawTransaction[] = [];
  if (rows.length === 0) return results;

  const sample = rows[0];
  const keys   = Object.keys(sample);

  // Try to find date, description, amount columns by name heuristic
  const dateKey   = keys.find(k => /date/i.test(k));
  const descKey   = keys.find(k => /desc|name|merchant|memo/i.test(k));
  const amtKey    = keys.find(k => /^amount$/i.test(k)) ?? keys.find(k => /amount|amt|debit|charge/i.test(k));

  console.log('[csvImport] Generic fallback columns:', { dateKey, descKey, amtKey });
  if (!dateKey || !descKey || !amtKey) {
    console.warn('[csvImport] Generic fallback could not find required columns in:', keys);
    return results;
  }

  for (const row of rows) {
    const date = normalizeDate(row[dateKey] ?? '');
    const amount = parseAmount(row[amtKey]);
    if (!date || amount === null) continue;

    const expenseAmt = Math.abs(amount);
    const type = classifyType(expenseAmt, row[descKey] ?? '');

    results.push({
      date,
      description: (row[descKey] ?? '').trim(),
      amount:      expenseAmt,
      type,
      source:      'Unknown Bank',
      rawCategory: '',
    });
  }
  return results;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseCSV(csvText: string): ImportResult {
  const errors:   string[] = [];
  let   skipped = 0;

  // Strip BOM if present
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();

  const parsed = Papa.parse<Record<string, string>>(cleaned, {
    header:        true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    parsed.errors.slice(0, 3).forEach(e => errors.push(`Row ${e.row}: ${e.message}`));
  }

  const rows    = parsed.data as Record<string, string>[];
  const headers = parsed.meta.fields ?? [];

  const fmt = detectBank(headers);

  if (!fmt) {
    // Fallback generic parse
    const txns = parseGeneric(rows);
    return {
      transactions: txns,
      bank:         'Generic',
      count:        txns.length,
      skipped,
      errors,
    };
  }

  const transactions: RawTransaction[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const rawDate = row[fmt.dateCol] ?? '';
    const date    = normalizeDate(rawDate);
    if (!date) { skipped++; continue; }

    const description = (row[fmt.descCol] ?? '').trim();
    if (!description) { skipped++; continue; }

    let amount:      number | null = null;
    let rawForType:  number        = 0; // pre-negation value used for type classification

    if (fmt.debitCol && fmt.creditCol) {
      // Split debit/credit columns (Citi, Capital One)
      const debit  = parseAmount(row[fmt.debitCol]);
      const credit = parseAmount(row[fmt.creditCol]);
      if (debit !== null && debit !== 0) {
        amount     = Math.abs(debit);  // expense
        rawForType = amount;           // positive → expense via sign
      } else if (credit !== null && credit !== 0) {
        amount     = -Math.abs(credit); // income stored as negative
        rawForType = amount;            // negative → income via sign
      } else {
        skipped++; continue;
      }
    } else {
      const raw = parseAmount(row[fmt.amountCol]);
      if (raw === null) { skipped++; continue; }
      // Classify using the RAW (pre-negation) amount so the bank's own sign
      // convention is used to determine intent.
      // e.g. Chase Credit: -16.29 = expense → classifyType(-16.29) → 'expense' ✓
      //      Chase Checking: -5.00 = debit/expense → classifyType(-5.00) → 'expense' ✓
      rawForType = raw;
      amount = fmt.amountSign === 'negate' ? -raw : raw;
    }

    if (amount === null) { skipped++; continue; }

    // Use Details/type column hint if available (Chase checking)
    const typeHint = fmt.typeCol ? (row[fmt.typeCol] ?? '') : undefined;
    const type     = classifyType(rawForType, description, typeHint);
    const rawCategory = fmt.categoryCol ? (row[fmt.categoryCol] ?? '').trim() : '';

    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type,
      source: fmt.name,
      rawCategory,
    });
  }

  return {
    transactions,
    bank:    fmt.name,
    count:   transactions.length,
    skipped,
    errors,
  };
}
