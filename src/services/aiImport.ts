import { openai } from '../lib/openai';
import { readAsStringAsync } from 'expo-file-system/legacy';
import type { ParsedShift, ImportSourceType } from '../types';

// ─── Prompts ─────────────────────────────────────────────────────────────────

const SCHEDULE_SYSTEM_PROMPT = `You are a work schedule parser. Given an image of a work schedule, extract all shifts.
Return ONLY valid JSON with this exact shape:
{
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "title": "Shift title or role",
      "event_type": "work",
      "notes": null
    }
  ]
}
Use 24-hour time for start_time and end_time. If a shift crosses midnight, use the next day's date for end.
For dates: use the current calendar year (e.g. 2026) unless the schedule clearly indicates a different year.
If the schedule only shows month and day (e.g. "Dec 15"), use the current year for the date.
If you cannot determine a field, make a reasonable guess based on context. Always return valid JSON.`;

const FLYER_SYSTEM_PROMPT = `You are an event extractor. Given an image or PDF of a flyer, poster, invitation, or document containing dates and events, extract all events or date-based entries you can find.
Return ONLY valid JSON with this exact shape:
{
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "title": "Event name or description",
      "event_type": "personal",
      "location": "Location if mentioned or null",
      "notes": "Any extra details, admission info, etc. or null",
      "all_day": false
    }
  ]
}
Rules:
- Use 24-hour time. If only a start time is given and no end time, add 1 hour for the end time. If no time at all, set start_time to "09:00", end_time to "10:00", and all_day to true.
- event_type should be one of: "work", "personal", "school", "shared". Use "personal" when uncertain.
- For dates: use the current calendar year (2026) unless clearly stated otherwise.
- If the image contains multiple events on different dates, list each as a separate entry.
- If the image has no discernible dates, return an empty shifts array.
- Always return valid JSON.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read a file URI as base64. Works for images and PDFs. */
async function fileToBase64(uri: string): Promise<string> {
  return readAsStringAsync(uri, { encoding: 'base64' });
}

/** Guess MIME type from URI extension */
function mimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase().split('?')[0]; // strip query params
  if (lower.endsWith('.png'))  return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif'))  return 'image/gif';
  if (lower.endsWith('.pdf'))  return 'application/pdf';
  return 'image/jpeg';
}

/** Whether the URI points to a PDF */
export function isPdf(uri: string): boolean {
  return uri.toLowerCase().split('?')[0].endsWith('.pdf');
}

// ─── Core parser ─────────────────────────────────────────────────────────────

/**
 * Parse a work schedule image. Always uses vision mode.
 */
export async function parseScheduleImage(imageUri: string): Promise<ParsedShift[]> {
  return parseImageFile(imageUri, 'schedule');
}

/**
 * Parse any image or PDF for events/dates.
 */
export async function parseEventFile(uri: string, sourceType: ImportSourceType): Promise<ParsedShift[]> {
  return parseImageFile(uri, sourceType);
}

/**
 * Internal: send image/PDF to GPT-4o and extract ParsedShift array.
 */
async function parseImageFile(uri: string, sourceType: ImportSourceType): Promise<ParsedShift[]> {
  const base64 = await fileToBase64(uri);
  const mimeType = mimeTypeFromUri(uri);
  const systemPrompt = sourceType === 'schedule' ? SCHEDULE_SYSTEM_PROMPT : FLYER_SYSTEM_PROMPT;

  // GPT-4o vision: image_url with base64 data URI
  // For PDFs, GPT-4o accepts them as image/jpeg after rendering — some PDF URIs
  // are actually images rendered by expo-document-picker. We pass the base64
  // as-is and let the model handle it; if MIME is PDF we send as image/jpeg fallback.
  const effectiveMime = mimeType === 'application/pdf' ? 'image/jpeg' : mimeType;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: systemPrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${effectiveMime};base64,${base64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '';

  // Extract JSON — handle markdown code blocks
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in AI response');

  const parsed = JSON.parse(jsonMatch[0]);
  return (parsed.shifts ?? []) as ParsedShift[];
}
