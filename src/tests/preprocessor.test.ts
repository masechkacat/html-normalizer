import { describe, it, expect, beforeEach } from 'vitest';
import { PreProcessor } from '../core/preprocessor/core.preprocessor';
import { DEFAULT_RULES } from '../core/preprocessor/rules.preprocessor';

describe('PreProcessor', () => {
  let processor: PreProcessor;

  // Перед каждым тестом создаем чистый инстанс без правил
  beforeEach(() => {
    processor = new PreProcessor();
  });

  it('should register and apply a custom rule with a string replacement', () => {
    processor.registerRule({
      id: 'replace-apple',
      pattern: /apple/g,
      replacement: 'orange'
    });
    
    expect(processor.process('I like apple pie.')).toBe('I like orange pie.');
  });

  it('should register and apply a custom rule with a function replacement', () => {
    processor.registerRule({
      id: 'multiply-count',
      pattern: /count:\s*(\d+)/g,
      replacement: (_match, num) => `total: ${Number(num) * 2}`
    });
    
    expect(processor.process('My count: 10')).toBe('My total: 20');
  });

  it('should successfully remove a registered rule', () => {
    processor.registerRule({
      id: 'remove-me',
      pattern: /bad/g,
      replacement: 'good'
    });
    
    // Проверяем, что правило работает
    expect(processor.process('This is bad')).toBe('This is good');
    
    // Удаляем и проверяем, что строка больше не меняется
    processor.removeRule('remove-me');
    expect(processor.process('This is bad')).toBe('This is bad');
  });

  describe('DEFAULT_RULES', () => {
    let defaultProcessor: PreProcessor;

    beforeEach(() => {
      // Инициализируем с нашими дефолтными правилами
      defaultProcessor = new PreProcessor(DEFAULT_RULES);
    });

    it('should clean Excel attributes (x:str, x:num, x:fmla)', () => {
      const dirtyHtml = '<td x:str="123" class="cell">Hello</td> <td x:num>456</td>';
      const expectedHtml = '<td class="cell">Hello</td> <td>456</td>';
      
      expect(defaultProcessor.process(dirtyHtml)).toBe(expectedHtml);
    });

    it('should remove Outlook VML tags but keep the content inside them', () => {
      const dirtyHtml = '<div><v:shape>Vector Image</v:shape><o:p></o:p></div>';
      const expectedHtml = '<div>Vector Image</div>'; // теги исчезнут, контент <v:shape> останется
      
      expect(defaultProcessor.process(dirtyHtml)).toBe(expectedHtml);
    });

    it('should unwrap Word list markers (supportLists)', () => {
      const dirtyHtml = '<p><![if !supportLists]>1. <![endif]>Text</p>';
      const expectedHtml = '<p>1. Text</p>';
      
      expect(defaultProcessor.process(dirtyHtml)).toBe(expectedHtml);
    });

    it('should remove dangerous tags (script, meta)', () => {
      const dirtyHtml = '<div><script>alert("xss")</script><meta charset="utf-8">Hello</div>';
      const expectedHtml = '<div>Hello</div>';
      
      expect(defaultProcessor.process(dirtyHtml)).toBe(expectedHtml);
    });

    it('should clean proprietary classes and remove empty class attributes', () => {
      const dirtyHtml = '<div class="x_MsoNormal gmail_quote valid-class Apple-converted-space">Text</div><span class="x_trash"></span>';
      const expectedHtml = '<div class="MsoNormal valid-class">Text</div><span></span>'; // x_MsoNormal нормализуется в MsoNormal
      
      expect(defaultProcessor.process(dirtyHtml)).toBe(expectedHtml);
    });

    it('should clean GDocs ID and block inline images', () => {
      const dirtyHtml = '<b id="docs-internal-guid-1234">Text</b><img src="data:image/png;base64,iVBORw0KGgo...">';
      const expectedHtml = '<b>Text</b><img src="">';
      
      expect(defaultProcessor.process(dirtyHtml)).toBe(expectedHtml);
    });

    it('should handle a mega-mashup of dirty HTML across all rules', () => {
      const dirtyHtml = `
        <!--[if gte mso 9]><xml><meta>Junk</meta></xml><![endif]-->
        <p class="x_MsoListParagraph" id="docs-internal-guid-abc">
          <![if !supportLists]>* <![endif]>List item
          <span class="Apple-converted-space">&nbsp;</span>
          <img src="webkit-fake-url://123">
        </p>
      `;
      // Что мы ожидаем на выходе (x_MsoListParagraph стал просто MsoListParagraph!):
      const expectedHtml = `
        
        <p class="MsoListParagraph">
          * List item
          <span>&nbsp;</span>
          <img src="">
        </p>
      `;
      
      expect(defaultProcessor.process(dirtyHtml)).toBe(expectedHtml);
    });
  });
});
