import rustPlugin from '../../pkg/obsidian_search_bg.wasm'
import * as plugin from '../../pkg'

const decodedPlugin = decodeBase64(rustPlugin as any)

onmessage = async evt => {
  const buffer = Uint8Array.from(decodedPlugin, c => c.charCodeAt(0))
  await plugin.default(Promise.resolve(buffer))
  try {
    const text = plugin.extract_pdf_text(evt.data.data as Uint8Array)
    self.postMessage({ text })
  } catch (e) {
    console.warn('Omnisearch - Could not extract text from ' + evt.data.name)
    self.postMessage({ text: '' })
  }
}

function decodeBase64(data: string) {
  return atob(data)
  // return Buffer.from(data, 'base64').toString()
}
