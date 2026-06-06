import { describe, it, expect } from 'vitest';
import { HtmlNormalizer } from './processor';
import rehypeParse from 'rehype-parse';

describe('processor', () => {
  it('should run both Regex PreProcessor and AST stringifier', () => {
    // Грязный кусок с VML из Outlook
    const dirtyHtml = '<div class="x_MsoNormal"><v:shape>Hidden VML</v:shape><p>Hello <b>World</b></p></div>';
    
    // Ожидаем, что 
    // 1. Regex удалит <v:shape> и нормализует x_MsoNormal -> MsoNormal
    // 2. AST распарсит и соберет это обратно в валидный HTML
    const normalizer = new HtmlNormalizer({
      parser: rehypeParse,
    });

    const result = normalizer.process(dirtyHtml);

    expect(result).toBe('<div class="MsoNormal">Hidden VML<p>Hello <b>World</b></p></div>');
  });
});