import { createProcessor, type ProcessorOptions } from './core/processor';

/**
 * Normalizes and cleans HTML content.
 * @param html The raw HTML string to clean (potentially unsafe).
 * @param options Configuration options for the cleaning process.
 * @returns A promise that resolves to the cleaned HTML string.
 */
export async function cleanHtml(html: string, options?: ProcessorOptions): Promise<string> {
  const processor = createProcessor(options);
  const file = await processor.process(html);
  return String(file);
}

export type { ProcessorOptions };
