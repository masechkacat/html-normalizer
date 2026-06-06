import type { PreProcessorRule } from './preprocessor.types';

export const DEFAULT_RULES: PreProcessorRule[] = [
  // ==========================================
  // 1. Office Namespaces & Attributes
  // ==========================================
  {
    id: 'excel-attributes',
    pattern: /\s+(?:x:str|x:num|x:fmla|v:ext)(?:="[^"]*")?/g,
    replacement: '',
    description: 'Удаляет специфичные атрибуты Excel (x:str, x:num, x:fmla, v:ext)'
  },
  {
    id: 'outlook-vml-tags',
    pattern: /<\/?(?:v|w):[^>]*>/g, // o:p обрабатывается отдельно
    replacement: '',
    description: 'Удаляет открывающие и закрывающие теги VML (v:..., w:...)'
  },
  {
    id: 'unwrap-o-p',
    pattern: /<o:p>([\s\S]*?)<\/o:p>|<o:p\s*\/>/g,
    replacement: '$1',
    description: 'Разворачивает <o:p>, оставляя текст внутри (обычно это пробелы или ничего)'
  },

  // ==========================================
  // 2. Умная обработка комментариев (Smart Comments)
  // ==========================================
  {
    id: 'remove-mso-comments',
    pattern: /<!--\[if gte mso \d+\]>[\s\S]*?<!\[endif\]-->/g,
    replacement: '',
    description: 'Полностью удаляет VML интерфейсы и мета-комментарии Word'
  },
  {
    id: 'unwrap-support-lists',
    pattern: /<!\[if !supportLists\]>([\s\S]*?)<!\[endif\]>/g,
    replacement: '$1', // просто возвращаем содержимое (обычно маркер 1. или точка)
    description: 'Спасает маркеры списков Word (<![if !supportLists]>)'
  },
  {
    id: 'remove-html-comments',
    pattern: /<!--(?!\[if)[^>]*-->/g,
    replacement: '',
    description: 'Удаляет все обычные HTML комментарии (<!-- ... -->)'
  },

  // ==========================================
  // 3. Безопасность и служебные теги (Meta/Logic)
  // ==========================================
  {
    id: 'remove-scripts-and-meta',
    pattern: /<(script|meta|xml|link)(?:\s+[^>]*?)?(?:\/>|>[\s\S]*?<\/\1>|>)/gi,
    replacement: '',
    description: 'Удаляет <script>, <meta>, <xml>, <link> (защита от XSS и мусора)'
  },

  // ==========================================
  // 4. Платформо-специфичный мусор
  // ==========================================
  {
    id: 'remove-gdocs-id',
    pattern: /\s+id="docs-internal-guid-[^"]*"/g,
    replacement: '',
    description: 'Удаляет уникальные трекинг-ID от Google Docs'
  },
  {
    id: 'clean-proprietary-classes',
    pattern: /\s+class="([^"]+)"/gi,
    replacement: (_match, classNames) => {
      // Это наша "Умная" функция для чистки классов внутри атрибута class="...".
      const cleaned = classNames.split(/\s+/).map((c: string) => {
        // Нормализуем классы Outlook Web (x_Mso...) обратно в стандартные вордовские (Mso...)
        // чтобы на этапе AST мы могли распознать списки!
        if (c.startsWith('x_Mso')) {
          return c.substring(2); 
        }
        return c;
      }).filter((c: string) => {
        return !(
          c.startsWith('x_') || // Мусор из Outlook Web (всё остальное)
          c.startsWith('gmail_') || // Мусор из Gmail
          c.startsWith('Apple-') // Мусор Safari (Apple-converted-space)
        );
      }).join(' ');
      
      // Если классы еще остались, возвращаем атрибут class. Иначе удаляем его совсем.
      return cleaned.trim() ? ` class="${cleaned}"` : '';
    },
    description: 'Удаляет специфичные классы Gmail (gmail_), Outlook (x_) и Safari (Apple-)'
  },

  // ==========================================
  // 5. Вредоносные медиа (Media)
  // ==========================================
  {
    id: 'block-base64-images',
    pattern: /\s+src="data:image\/[^"]*"/gi,
    replacement: ' src=""',
    description: 'Блокирует вставку картинок в формате Base64'
  },
  {
    id: 'block-webkit-fake-url',
    pattern: /\s+src="webkit-fake-url:[^"]*"/gi,
    replacement: ' src=""',
    description: 'Блокирует битые системные картинки Safari'
  }
];
