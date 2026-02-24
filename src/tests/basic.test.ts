import { describe, it, expect } from 'vitest';
import { cleanHtml } from '../index';

describe('Basic Pipeline Test', () => {
  it('should pass through simple HTML without mutation', async () => {
    const input = '<div>Hello World</div>';
    const output = await cleanHtml(input);
    expect(output).toBe('<div>Hello World</div>');
  });

  it('should not wrap fragments in <html><body> tags', async () => {
    const input = '<p>Just a paragraph</p>';
    const output = await cleanHtml(input);
    expect(output).not.toContain('<html>');
    expect(output).not.toContain('<body>');
    expect(output).toBe('<p>Just a paragraph</p>');
  });

  it('should handle nested structures correctly', async () => {
    const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const output = await cleanHtml(input);
    expect(output).toBe('<ul><li>Item 1</li><li>Item 2</li></ul>');
  });
});
