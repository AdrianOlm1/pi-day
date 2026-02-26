/**
 * AI service to split a goal into smaller, easier objectives.
 * Uses OpenAI to suggest 3–7 concrete steps that make the goal more achievable.
 */

import { openai } from '../lib/openai';

export async function splitGoalIntoObjectives(goalTitle: string): Promise<string[]> {
  const systemPrompt = `You are a helpful coach. Given a personal goal, suggest 3 to 7 smaller, concrete steps or sub-objectives that make the goal easier to achieve. Each step should be specific and actionable. Return only a JSON array of strings, no other text. Example: ["Step 1", "Step 2", "Step 3"]`;

  const userPrompt = `Split this goal into smaller, easier steps: "${goalTitle}"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '[]';
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;

    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 10);
  } catch (e) {
    console.warn('[aiGoals] splitGoalIntoObjectives failed:', e);
    return [];
  }
}

/**
 * Suggest a plan (sub-objectives) for a big goal with an optional end date.
 * E.g. "Run a marathon by end of year" → ["Run 10 miles per week", "Increase long run by 1 mile every 2 weeks", ...].
 */
export async function suggestPlanForGoal(
  goalTitle: string,
  targetDescription?: string | null,
  targetEndDate?: string | null,
): Promise<string[]> {
  const endContext = targetEndDate
    ? ` The user wants to achieve this by ${targetEndDate}.`
    : '';
  const bigGoal = targetDescription?.trim() || goalTitle;
  const systemPrompt = `You are a helpful coach. Given a big goal (e.g. run a marathon, get a job, learn a language), suggest 4 to 8 concrete weekly or monthly sub-goals or milestones that make it achievable. Each item should be specific and time-bound where possible (e.g. "Run 10 miles per week", "Apply to 10 jobs this month"). Return only a JSON array of strings, no other text.`;

  const userPrompt = `Big goal: "${bigGoal}"${endContext} Suggest a step-by-step plan as a JSON array of strings.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 600,
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '[]';
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;

    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 10);
  } catch (e) {
    console.warn('[aiGoals] suggestPlanForGoal failed:', e);
    return [];
  }
}
