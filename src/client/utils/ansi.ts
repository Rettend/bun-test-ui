import { AnsiUp } from 'ansi_up'

const ansiUp = new AnsiUp()
ansiUp.use_classes = true

export function ansiToHtml(text: string): string {
  return ansiUp.ansi_to_html(text)
}

export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*m/g, '')
}
