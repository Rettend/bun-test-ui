import { AnsiUp } from 'ansi_up'

const ansiUp = new AnsiUp()
ansiUp.use_classes = true

/**
 * Converts ANSI escape codes to HTML with styled spans
 */
export function ansiToHtml(text: string): string {
  return ansiUp.ansi_to_html(text)
}

/**
 * Strips ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*m/g, '')
}
