'use server';

import { normalizeDataEntry, NormalizeDataEntryInput } from '@/ai/flows/normalize-data-entries';

export async function handleNormalizeEntry(data: NormalizeDataEntryInput) {
  try {
    const result = await normalizeDataEntry(data);
    return result;
  } catch (error) {
    console.error('Error normalizing data:', error);
    // In a real app, you might want to return a more structured error
    return { error: 'Failed to normalize data.' };
  }
}
