import type { PreProcessorRule } from './types.preprocessor';

export class PreProcessor {
  private rules: Map<string, PreProcessorRule> = new Map();

  constructor(defaultRules: PreProcessorRule[] = []) {
    defaultRules.forEach(rule => this.registerRule(rule));
  }

  public registerRule(rule: PreProcessorRule): this {
    this.rules.set(rule.id, rule);
    return this;
  }

  public removeRule(id: string): this {
    this.rules.delete(id);
    return this;
  }

  public process(html: string): string {
    let result = html;
    
    for (const rule of this.rules.values()) {
      // TypeScript автоматически определяет тип replacement в зависимости от условия
      if (typeof rule.replacement === 'string') {
        // Здесь TS видит replacement как строку
        result = result.replace(rule.pattern, rule.replacement);
      } else {
        // Здесь TS видит replacement как функцию (ReplacerFunction)
        result = result.replace(rule.pattern, rule.replacement);
      }
    }
    
    return result;
  }
}
