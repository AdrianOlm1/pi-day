/**
 * aiCategorize.ts
 *
 * Uses OpenAI to categorize imported transactions that don't have a matching
 * category. Batches up to 20 transactions per API call to minimize cost.
 */

import type { FinanceCategory } from '../types';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const BATCH_SIZE = 10; // smaller batches = shorter responses = fewer token issues

export interface TxnToCategorizе {
  index:       number;
  description: string;
  amount:      number;
  rawCategory: string;
}

export interface CategorizationResult {
  index:      number;
  categoryId: string | null; // null = couldn't match
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function categorizeBatch(
  transactions: TxnToCategorizе[],
  categories:   FinanceCategory[],
): Promise<CategorizationResult[]> {
  if (transactions.length === 0) return [];
  if (categories.length === 0)   return transactions.map(t => ({ index: t.index, categoryId: null }));

  // Build a compact category list for the prompt
  const catList = categories
    .filter(c => c.type === 'expense' || c.type === 'income')
    .map(c => `${c.id}|${c.name}`)
    .join('\n');

  // Build transaction list
  const txnList = transactions
    .map(t => `${t.index}|${t.description}|${t.rawCategory}|$${t.amount.toFixed(2)}`)
    .join('\n');

  const prompt = `You are a personal finance categorizer.
Given a list of bank transactions and a list of categories, assign the best matching category ID to each transaction.

CATEGORIES (id|name):
${catList}

TRANSACTIONS (index|description|bank_category|amount):
${txnList}

Return ONLY a JSON array like:
[{"index":0,"categoryId":"uuid-here"},{"index":1,"categoryId":"uuid-here"}]

Rules:
- Pick the single best matching category for each transaction
- If truly no category fits, use null for categoryId
- Return every transaction index, no skipping
- Return ONLY the JSON array, no explanation`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a JSON-only responder. Output only valid JSON arrays.' },
          { role: 'user',   content: prompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '[]';

    // Strip markdown code fences if present
    const jsonText = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    let results: CategorizationResult[] = [];
    try {
      results = JSON.parse(jsonText);
    } catch (parseErr) {
      console.warn('[aiCategorize] JSON parse failed:', jsonText.slice(0, 200));
      return transactions.map(t => ({ index: t.index, categoryId: null }));
    }

    // Validate each result has a real category ID from our list
    const validIds = new Set(categories.map(c => c.id));
    return results.map(r => ({
      index:      r.index,
      categoryId: r.categoryId && validIds.has(r.categoryId) ? r.categoryId : null,
    }));
  } catch (e: any) {
    console.warn('[aiCategorize] Error:', e.message);
    return transactions.map(t => ({ index: t.index, categoryId: null }));
  }
}

// ─── Chunk helper ─────────────────────────────────────────────────────────────

export async function categorizeAll(
  transactions: TxnToCategorizе[],
  categories:   FinanceCategory[],
  onProgress?:  (done: number, total: number) => void,
): Promise<CategorizationResult[]> {
  const results: CategorizationResult[] = [];

  if (categories.length === 0) {
    console.warn('[aiCategorize] No categories available — skipping AI categorization');
    return transactions.map(t => ({ index: t.index, categoryId: null }));
  }

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    const batchResults = await categorizeBatch(batch, categories);
    results.push(...batchResults);
    onProgress?.(Math.min(i + BATCH_SIZE, transactions.length), transactions.length);
  }

  return results;
}
