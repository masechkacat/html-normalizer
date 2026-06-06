import { unified, type Plugin } from 'unified';
import type { Root } from 'hast';
import rehypeStringify from 'rehype-stringify';
import rehypeListReconstructor from './plugins/list-reconstructor';
import { PreProcessor } from './preprocessor/preprocessor';
import { DEFAULT_RULES } from './preprocessor/preprocessor.rules';

// Строго описываем опции, которые должен принимать любой наш парсер
export interface ParserOptions {
  fragment?: boolean;
}

// Строго описываем тип нашего парсера: он принимает ParserOptions, берет string и отдает Root (AST дерево)
export type HtmlParserPlugin = Plugin<[ParserOptions?], string, Root>;

export interface ProcessorOptions {
  /**
   * Парсер, который будет использоваться для превращения HTML строки в AST (HAST).
   */
  parser: HtmlParserPlugin;
  /**
   * Опциональный инстанс PreProcessor. 
   * Если не передан, будет создан стандартный с DEFAULT_RULES.
   */
  preprocessor?: PreProcessor;
}

export class HtmlNormalizer {
  private parser: HtmlParserPlugin;
  private preprocessor: PreProcessor;

  constructor(options: ProcessorOptions) {
    this.parser = options.parser;
    this.preprocessor = options.preprocessor ?? new PreProcessor(DEFAULT_RULES);
  }

  /**
   * Возвращает инстанс препроцессора для тогo, чтобы пользователь мог гибко
   * включать или отключать конкретные regex-правила перед очисткой.
   */
  public getPreProcessor(): PreProcessor {
    return this.preprocessor;
  }

  /**
   * Главный метод очистки HTML: прогоняет строку через Regex, затем через AST.
   */
  public process(html: string): string {
    // 1. Этап 1: Очищаем строку ДО парсинга (Regex)
    const preprocessedHtml = this.preprocessor.process(html);

    // 2. Этапы 2-5: Строим AST и прогоняем через плагины Unified
    const unifiedProcessor = unified()
      .use(this.parser, { fragment: true }) 
      // Применяем наш первый умный AST-плагин!
      .use(rehypeListReconstructor)
      .use(rehypeStringify); 

    const file = unifiedProcessor.processSync(preprocessedHtml);
    return String(file);
  }
}
