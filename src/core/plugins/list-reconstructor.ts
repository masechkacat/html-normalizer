import type { Plugin, Transformer } from 'unified';
import type { Element, Node, Text, Root, ElementContent } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Проверяет, является ли HAST-узел элементом вордовского списка.
 * @param node Узел HAST дерева
 * @returns true, если это <p> с классом MsoListParagraph
 */
export function isWordListItem(node: Node): node is Element {
  // 1. Узел должен быть элементом (Element)
  if (node.type !== 'element') {
    return false;
  }
  
  const el = node as Element;

  // 2. Тег должен быть параграфом <p>
  if (el.tagName !== 'p') {
    return false;
  }

  // 3. У него должны быть свойства и массив классов (className)
  if (!el.properties || !Array.isArray(el.properties.className)) {
    return false;
  }

  // 4. Среди классов должен быть "MsoListParagraph" (или "MsoListParagraphCxSpFirst" и тд)
  return el.properties.className.some(
    (className) => typeof className === 'string' && className.includes('MsoListParagraph')
  );
}

export interface ListInfo {
  level: number;
  listType: 'ul' | 'ol';
}

/**
 * Превращает <p> в <li> и пытается определить уровень вложенности и тип списка.
 * Мутирует переданный узел!
 */
export function convertParagraphToListItem(node: Element): ListInfo {
  // 1. Меняем тег с p на li
  node.tagName = 'li';
  
  // По умолчанию считаем, что это маркированный список 1-го уровня
  let listType: 'ul' | 'ol' = 'ul';
  let level = 1;

  // 2. Ищем уровень вложенности в инлайновых стилях Word
  // Пример: style="mso-list:l0 level2 lfo1" -> level = 2
  if (node.properties && typeof node.properties.style === 'string') {
    const styleMatch = node.properties.style.match(/level(\d+)/i);
    if (styleMatch && styleMatch[1]) {
      level = parseInt(styleMatch[1], 10);
    }
  }

  // 3. Анализируем текст внутри (чтобы понять ol или ul, и заодно "оторвать" маркер)
  // Мы ищем первый текстовый узел внутри пункта списка.
  if (node.children.length > 0) {
    // Иногда маркер лежит прямо в текстовом узле, иногда завернут в спан
    // Чтобы не усложнять парсинг, мы ищем глубоко первый попавшийся текст
    const firstTextNode = findFirstTextNode(node);
    
    if (firstTextNode && typeof firstTextNode.value === 'string') {
      const text = firstTextNode.value;
      
      // Ищем паттерн номера (например "1. ", "A. ", "I. ")
      const orderedMatch = text.match(/^([a-zA-Z0-9]+[\.\)])\s+/);
      
      if (orderedMatch) {
        listType = 'ol';
        // Отрезаем маркер списка (например "1. ") от текста, чтобы он не дублировался
        firstTextNode.value = text.substring(orderedMatch[0].length);
      } else {
        // Если это не нумерация, скорее всего это ul (маркеры-буллиты типа "· ", "* ")
        // Удаляем один любой не-буквенный символ в начале (например · или -)
        const unorderedMatch = text.match(/^([^a-zA-Z0-9])\s+/);
        if (unorderedMatch) {
          firstTextNode.value = text.substring(unorderedMatch[0].length);
        }
      }
    }
  }

  // 4. Зачищаем вордовские классы, они больше не нужны
  if (node.properties?.className) {
    node.properties.className = (node.properties.className as string[]).filter(
      c => typeof c !== 'string' || !c.includes('MsoListParagraph')
    );
    if (node.properties.className.length === 0) {
      delete node.properties.className;
    }
  }

  // 5. Зачищаем вордовский стиль mso-list, он больше не нужен
  if (node.properties?.style && typeof node.properties.style === 'string') {
    const cleanStyle = node.properties.style.replace(/mso-list:[^;]+;?/gi, '').trim();
    if (cleanStyle) {
      node.properties.style = cleanStyle;
    } else {
      delete node.properties.style;
    }
  }

  return { level, listType };
}

/**
 * Вспомогательная функция (Поиск в глубину DFS)
 * Ищет первый непустой текстовый узел
 */
function findFirstTextNode(element: Element): Text | null {
  for (const child of element.children) {
    if (child.type === 'text' && typeof child.value === 'string' && child.value.trim().length > 0) {
      return child;
    }
    if (child.type === 'element') {
      const result = findFirstTextNode(child);
      if (result) return result;
    }
  }
  return null;
}
/**
 * Плагин для Rehype.
 * Находит списки из Word (p.MsoListParagraph), превращает их в <li> и
 * оборачивает в правильные <ul> или <ol> с учетом уровней вложенности.
 */
const rehypeListReconstructor: Plugin<void[], Root, Root> = () => {
  const transformer: Transformer<Root, Root> = (tree: Root) => {
    // Обходим все узлы дерева
    visit(tree, (node: Node) => {
      // Нас интересуют только узлы-родители (у которых есть массив children)
      if (!('children' in node) || !Array.isArray(node.children)) return;
      
      const newChildren: ElementContent[] = [];
      const stack: { level: number; listType: 'ul' | 'ol'; wrapper: Element }[] = [];

      for (const child of node.children) {
        // Защита от разрыва списка: игнорируем пустые текстовые узлы (переносы строк \n)
        if (child.type === 'text' && child.value.trim() === '') {
          if (stack.length > 0) {
            // Если мы уже строим список, кидаем перенос строки внутрь него (чтобы код был красивым)
            stack[stack.length - 1].wrapper.children.push(child);
          } else {
            newChildren.push(child);
          }
          continue;
        }

        if (isWordListItem(child)) {
          const { level, listType } = convertParagraphToListItem(child);
          
          // 1. Очищаем стек от списков, которые лежат "глубже" текущего уровня (выходим из вложенности).
          // А также сбрасываем, если на том же уровне сменился тип списка (был ul, стал ol).
          while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (top.level > level || (top.level === level && top.listType !== listType)) {
              stack.pop();
            } else {
              break;
            }
          }

          const top = stack.length > 0 ? stack[stack.length - 1] : null;

          if (!top || top.level < level) {
            // 2. Нужно ОТКРЫТЬ новый список (<ul> или <ol>)
            const newListWrapper: Element = { 
              type: 'element', 
              tagName: listType, 
              properties: {}, 
              children: [child] 
            };
            
            if (top) {
              // Если перед нами уже был список уровнем выше, мы вкладываем новый список 
              // в самый последний <li> этого родительского списка (правильный HTML5)
              const parentList = top.wrapper;
              // Ищем последний элемент в массиве children, который НЕ является переносом строки
              let lastLi = null;
              for (let i = parentList.children.length - 1; i >= 0; i--) {
                const child = parentList.children[i];
                if (child.type === 'element' && child.tagName === 'li') {
                  lastLi = child;
                  break;
                }
              }

              if (lastLi) {
                lastLi.children.push(newListWrapper);
              } else {
                parentList.children.push(newListWrapper); // фоллбэк
              }
            } else {
              // Если родителя нет, это корневой список! Кладем в общую кучу.
              newChildren.push(newListWrapper);
            }
            
            // Запоминаем открытый список в стек
            stack.push({ level, listType, wrapper: newListWrapper });
          } else if (top.level === level && top.listType === listType) {
            // 3. Продолжаем ТЕКУЩИЙ список (просто кидаем <li> внутрь)
            top.wrapper.children.push(child);
          }
        } else {
          // Если это НЕ элемент списка (например, обычный абзац или картинка)
          // Разрушаем стек! Следующий найденный список начнется с чистого листа.
          stack.length = 0;
          newChildren.push(child);
        }
      }
      
      // Заменяем старых детей родителя на новых (с собранными списками)
      (node).children = newChildren;
    });
  };
  
  return transformer;
};

export default rehypeListReconstructor;
