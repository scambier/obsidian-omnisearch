// Parts of this code come from https://github.com/valentine195/obsidian-admonition/blob/e4aa52fe04bb68a5483421ef98414c2617d666b7/src/suggest/suggest.ts

import {
  Editor,
  EditorSuggest,
  TFile,
  type EditorPosition,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
} from 'obsidian'

export class OmnisearchSuggest extends EditorSuggest<string> {
  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile,
  ): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line)
    // not inside the bracket
    if (/\[@.+\]/.test(line.slice(0, cursor.ch))) return null
    if (!/\[@.*/.test(line)) return null

    const match = line.match(/\[@([^\]]*)\]?/) // [@(foo bar)] baz
    if (!match) return null

    const [_, query] = match
    if (!query) {
      return null
    }
    const matchData = {
      end: cursor,
      start: {
        ch: (match.index ?? 0) + 4,
        line: cursor.line,
      },
      query,
    }
    return matchData
  }

  getSuggestions(context: EditorSuggestContext): string[] | Promise<string[]> {
    return ['foo', 'bar']
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.createSpan({ text: value })
  }

  selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
    throw new Error('Method not implemented.')
  }
}
