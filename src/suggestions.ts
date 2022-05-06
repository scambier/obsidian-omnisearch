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
    const last2Chars = editor.getLine(cursor.line).slice(-2, cursor.ch)
    if (last2Chars === '@@') {
      return {
        start: cursor,
        end: cursor,
        query: 'foo',
      }
    }
    return null
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
