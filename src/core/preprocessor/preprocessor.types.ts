export type ReplacerFunction = (match: string, ...groups: string[]) => string;

export interface PreProcessorRule {
  id: string;
  pattern: RegExp;
  replacement: string | ReplacerFunction;
  description?: string;
}
