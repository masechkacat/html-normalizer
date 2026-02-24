import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

export interface ProcessorOptions {
  // Options will be added here later
}

export function createProcessor(options: ProcessorOptions = {}) {
  return unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeStringify);
}
