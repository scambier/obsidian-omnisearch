import type { TFile } from 'obsidian'
import PQueue from 'p-queue-compat'
import PDFWorker from 'web-worker:./pdf-worker.ts'
import { pdfCacheFilePath } from './globals'
import { deflate, inflate } from 'pako'
import { md5 } from './utils'

class PDFManager {
  private cache: Map<string, { content: string }> = new Map()
  private serializeQueue = new PQueue({ concurrency: 1 })

  public async loadPDFCache(): Promise<void> {
    if (await app.vault.adapter.exists(pdfCacheFilePath)) {
      try {
        const data = await app.vault.adapter.readBinary(pdfCacheFilePath)
        const json = new TextDecoder('utf8').decode(inflate(data))
        this.cache = new Map(JSON.parse(json))
      } catch (e) {
        console.error(e)
        this.cache = new Map()
      }
    }
  }

  public async getPdfText(file: TFile): Promise<string> {
    const data = new Uint8Array(await app.vault.readBinary(file))
    const hash = md5(data)
    if (this.cache.has(hash)) {
      return this.cache.get(hash)!.content
    }

    const worker = new PDFWorker({ name: 'PDF Text Extractor' })
    return new Promise(async (resolve, reject) => {
      // @ts-ignore
      worker.postMessage({ data })
      worker.onmessage = (evt: any) => {
        const txt = evt.data.text
        this.updatePDFCache(hash, txt)
        resolve(txt)
      }
    })
  }

  private async updatePDFCache(hash: string, content: string): Promise<void> {
    this.serializeQueue.add(() => {
      this.cache.set(hash, { content })
      const data = deflate(JSON.stringify(Array.from(this.cache), null, 1))
      app.vault.adapter.writeBinary(pdfCacheFilePath, data as any)
    })
  }
}

export const pdfManager = new PDFManager()
