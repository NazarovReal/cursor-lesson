#!/usr/bin/env node

'use strict';

/**
 * Простая CLI-утилита для конвертации подмножества Markdown в HTML.
 * Поддержка:
 * - Заголовки: #, ##, ### в начале строки
 * - Ненумерованные списки: -, *, + в начале строки
 * - Нумерованные списки: 1. 2. и т.п. в начале строки
 * - Жирный текст: **text**
 * - Курсив: *text* или _text_
 *
 * Используются только встроенные модули Node.js.
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Преобразование инлайнового Markdown (жирный/курсив) в HTML.
 * Порядок: сначала экранирование HTML, затем жирный, затем курсив.
 *
 * @param {string} text
 * @returns {string}
 */
function transformInline(text) {
  if (!text) return '';

  let result = escapeHtml(text);

  // Жирный: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Курсив: *text* или _text_
  // Исключаем **, чтобы не трогать уже разобранный жирный.
  result = result.replace(/\*(?!\*)([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

  return result;
}

/**
 * Преобразование блочного Markdown в HTML.
 * Обрабатывает заголовки, списки и абзацы за один проход по строкам.
 *
 * @param {string} input
 * @returns {string}
 */
function markdownToHtml(input) {
  const lines = input.replace(/\r\n/g, '\n').split('\n');

  const html = [];
  let inUl = false;
  let inOl = false;
  let inParagraph = false;

  const closeListsIfNeeded = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  const closeParagraphIfNeeded = () => {
    if (inParagraph) {
      html.push('</p>');
      inParagraph = false;
    }
  };

  for (let rawLine of lines) {
    const line = rawLine.trimEnd();

    // Пустая строка — закрываем абзац и списки
    if (!line.trim()) {
      closeParagraphIfNeeded();
      closeListsIfNeeded();
      continue;
    }

    // Заголовки: #, ##, ###
    let match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      const level = match[1].length;
      const content = transformInline(match[2].trim());
      closeParagraphIfNeeded();
      closeListsIfNeeded();
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // Нумерованный список: "1. item"
    match = line.match(/^(\d+)\.\s+(.*)$/);
    if (match) {
      const content = transformInline(match[2].trim());
      closeParagraphIfNeeded();
      if (!inOl) {
        closeListsIfNeeded();
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${content}</li>`);
      continue;
    }

    // Маркированный список: "- item", "* item", "+ item"
    match = line.match(/^[-*+]\s+(.*)$/);
    if (match) {
      const content = transformInline(match[1].trim());
      closeParagraphIfNeeded();
      if (!inUl) {
        closeListsIfNeeded();
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${content}</li>`);
      continue;
    }

    // Обычный абзац
    const content = transformInline(line.trim());
    closeListsIfNeeded();
    if (!inParagraph) {
      html.push('<p>');
      inParagraph = true;
    } else {
      html.push('<br>');
    }
    html.push(content);
  }

  // Закрываем открытые теги в конце
  closeParagraphIfNeeded();
  closeListsIfNeeded();

  return html.join('');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Использование: node converter.js "Markdown текст"');
    process.exit(1);
  }

  // Поддерживаем случай, когда пользователь передал Markdown с пробелами
  // без корректных кавычек — объединяем все аргументы обратно в строку.
  const markdownInput = args.join(' ');

  const htmlOutput = markdownToHtml(markdownInput);
  process.stdout.write(htmlOutput);
}

if (require.main === module) {
  main();
}

