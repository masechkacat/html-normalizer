import { PreProcessor } from './core/preprocessor/core.preprocessor';
import { HtmlNormalizer, type HtmlParserPlugin } from './core/processor';
import { fromDom } from 'hast-util-from-dom';

// Реальный легкий парсер для Браузера
const browserParserPlugin: HtmlParserPlugin = function () {
  Object.assign(this, {
    parser: (doc: string) => {
      // 1. Используем встроенный бесплатный браузерный DOMParser (весит 0 байт!)
      const DOM = new DOMParser().parseFromString(doc, 'text/html');
      // 2. Превращаем DOM в AST-дерево (используя легкую hast-util-from-dom)
      return fromDom(DOM.body);
    }
  });
};

// Создаем "дефолтный" глобальный инстанс для Браузера
export const defaultBrowserNormalizer = new HtmlNormalizer({
  parser: browserParserPlugin
});

/**
 * Нормализует HTML-строку. Точка входа для БРАУЗЕРА (React, Vue, CKEditor и т.д.)
 * Не содержит тяжелого parse5!
 */
export function normalizeHtml(dirtyHtml: string): string {
  return defaultBrowserNormalizer.process(dirtyHtml);
}

export { HtmlNormalizer, PreProcessor };