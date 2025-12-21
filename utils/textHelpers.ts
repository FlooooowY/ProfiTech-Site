/**
 * Утилиты для работы с текстом и HTML
 */

/**
 * Удаляет HTML теги из строки и возвращает чистый текст
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  // Удаляем все HTML теги
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Декодируем HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  
  // Удаляем множественные пробелы
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Извлекает первый абзац из HTML описания
 */
export function getFirstParagraph(html: string): string {
  if (!html) return '';
  
  // Ищем содержимое первого <p> тега
  const match = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (match && match[1]) {
    return stripHtml(match[1]);
  }
  
  // Если нет <p>, просто очищаем HTML
  return stripHtml(html);
}

/**
 * Обрезает текст до указанной длины и добавляет многоточие
 */
export function truncateText(text: string, maxLength: number = 150): string {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Безопасно отображает HTML контент
 * Используется только для проверенного контента из базы
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Базовая очистка опасных тегов
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Удаляем inline события
}

/**
 * Извлекает краткое описание для карточки товара
 */
export function getShortDescription(html: string, maxLength: number = 150): string {
  const firstParagraph = getFirstParagraph(html);
  return truncateText(firstParagraph, maxLength);
}

