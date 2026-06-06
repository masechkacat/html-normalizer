import { describe, it, expect } from 'vitest';
import { isWordListItem, convertParagraphToListItem } from './list-reconstructor';
import type { Element, Text } from 'hast';

describe('isWordListItem', () => {
  it('should return true for a valid Word list paragraph', () => {
    const validNode: Element = {
      type: 'element',
      tagName: 'p',
      properties: { className: ['MsoListParagraph'] },
      children: []
    };
    expect(isWordListItem(validNode)).toBe(true);
  });

  it('should return true for complex Word list classes (e.g., CxSpFirst)', () => {
    const validNode: Element = {
      type: 'element',
      tagName: 'p',
      // В Word часто бывают классы MsoListParagraphCxSpFirst, MsoListParagraphCxSpMiddle
      properties: { className: ['MsoListParagraphCxSpFirst', 'another-class'] }, 
      children: []
    };
    expect(isWordListItem(validNode)).toBe(true);
  });

  it('should return false for regular paragraphs', () => {
    const invalidNode: Element = {
      type: 'element',
      tagName: 'p',
      properties: { className: ['Normal'] },
      children: []
    };
    expect(isWordListItem(invalidNode)).toBe(false);
  });

  it('should return false for non-element nodes (like Text)', () => {
    const textNode: Text = {
      type: 'text',
      value: 'Just some text'
    };
    expect(isWordListItem(textNode)).toBe(false);
  });
});

describe('convertParagraphToListItem', () => {
  it('should change tag from p to li and extract correct unordered bullet', () => {
    const node: Element = {
      type: 'element',
      tagName: 'p',
      properties: { className: ['MsoListParagraph'] },
      children: [{ type: 'text', value: '· Some bullet text' }]
    };
    
    const info = convertParagraphToListItem(node);
    
    expect(node.tagName).toBe('li');
    expect(info.listType).toBe('ul');
    expect(info.level).toBe(1);
    expect((node.children[0] as Text).value).toBe('Some bullet text'); // Точка-маркер удалилась
    expect(node.properties?.className).toBeUndefined(); // Класс удалился
  });

  it('should extract correct ordered number and level', () => {
    const node: Element = {
      type: 'element',
      tagName: 'p',
      properties: { className: ['MsoListParagraph', 'bold'], style: 'mso-list:l0 level3 lfo1' },
      children: [
        { 
          type: 'element', 
          tagName: 'span', 
          properties: {}, 
          children: [{ type: 'text', value: '1. ' }] // Маркер спрятан в спане (Word так делает часто)
        },
        { type: 'text', value: 'First ordered item' }
      ]
    };
    
    const info = convertParagraphToListItem(node);
    
    expect(node.tagName).toBe('li');
    expect(info.listType).toBe('ol');
    expect(info.level).toBe(3); // Уровень спарсился из style
    
  });
});

import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeListReconstructor from './list-reconstructor';

describe('rehypeListReconstructor Plugin', () => {
  it('should construct a flat unordered list from consecutive Word paragraphs', () => {
    // Входные данные имитируют уже прошедший через Regex препроцессор HTML
    const dirtyHtml = `
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">· First item</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">· Second item</p>
      <p>Normal text</p>
      <p class="MsoListParagraph" style="mso-list:l1 level1 lfo2">1. One</p>
      <p class="MsoListParagraph" style="mso-list:l1 level1 lfo2">2. Two</p>
    `;

    const expectedHtml = `
      <ul><li>First item</li><li>Second item</li></ul>
      <p>Normal text</p>
      <ol><li>One</li><li>Two</li></ol>
    `;

    const processor = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeListReconstructor)
      .use(rehypeStringify);

    const result = String(processor.processSync(dirtyHtml));
    
    // Удаляем переносы строк для упрощения сверки в тесте
    expect(result.replace(/\n| {2,}/g, '')).toBe(expectedHtml.replace(/\n| {2,}/g, ''));
  });

  it('should correctly nest lists based on Word levels', () => {
    const dirtyHtml = `
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">* Parent</p>
      <p class="MsoListParagraph" style="mso-list:l0 level2 lfo1">* Child</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">* Sibling</p>
    `;

    const processor = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeListReconstructor)
      .use(rehypeStringify);

    const result = String(processor.processSync(dirtyHtml));
    
    // В HTML5 вложенный <ul> должен лежать ВНУТРИ <li> родителя!
    const expectedHtml = `<ul><li>Parent<ul><li>Child</li></ul></li><li>Sibling</li></ul>`;
    expect(result.replace(/\n| {2,}/g, '')).toBe(expectedHtml);
  });
});