import rehypeParse from 'rehype-parse';
import { HtmlNormalizer } from './core/processor';
import { PreProcessor } from './core/preprocessor/core.preprocessor';

// Создаем "дефолтный" глобальный инстанс для Node.js
export const defaultNodeNormalizer = new HtmlNormalizer({
  parser: rehypeParse
});

/**
 * Нормализует HTML-строку, очищая её от артефактов Word, Excel, Email-клиентов.
 * Быстрая функция-обертка для тех, кому не нужны сложные настройки.
 */
export function normalizeHtml(dirtyHtml: string): string {
  return defaultNodeNormalizer.process(dirtyHtml);
}

// Экспортируем классы, чтобы пользователь мог гибко собирать свои инстансы!
export { HtmlNormalizer, PreProcessor };
