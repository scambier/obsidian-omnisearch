import type { TFile } from 'obsidian'
import WebWorker from 'web-worker:./pdf-worker.ts'
import { makeMD5 } from '../tools/utils'
import { database } from '../database'

const workerTimeout = 120_000

class PDFWorker {
  private static pool: PDFWorker[] = []
  static getWorker(): PDFWorker {
    const free = PDFWorker.pool.find(w => !w.running)
    if (free) {
      return free
    }
    const worker = new PDFWorker(new WebWorker({ name: 'PDF Text Extractor' }))
    PDFWorker.pool.push(worker)
    return worker
  }

  private running = false

  private constructor(private worker: Worker) {}

  public async run(msg: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.running = true

      const timeout = setTimeout(() => {
        this.worker.terminate()
        console.warn('Omnisearch - Worker timeout')
        reject('timeout')
        this.running = false
      }, workerTimeout)

      this.worker.postMessage(msg)
      this.worker.onmessage = evt => {
        clearTimeout(timeout)
        resolve(evt)
        this.running = false
      }
    })
  }
}

class PDFManager {
  public async getPdfText(file: TFile): Promise<string> {
    // 1) Check if we can find by path & size
    const docByPath = await database.pdf.get({
      path: file.path,
      size: file.stat.size,
    })

    if (docByPath) {
      return docByPath.text
    }

    // 2) Check by hash
    const data = new Uint8Array(await app.vault.readBinary(file))
    const hash = makeMD5(data)
    const docByHash = await database.pdf.get(hash)
    if (docByHash) {
      return docByHash.text
    }

    // 3) The PDF is not cached, extract it
    const worker = PDFWorker.getWorker() // new PDFWorker({ name: 'PDF Text Extractor' })
    return new Promise(async (resolve, reject) => {
      try {
        const res = await worker.run({ data, name: file.basename })
        const text = (res.data.text as string)
          // Replace \n with spaces
          .replace(/\n/g, ' ')
          // Trim multiple spaces
          .replace(/ +/g, ' ')
          .trim()

        // Add it to the cache
        database.pdf
          .add({ hash, text, path: file.path })
          .then(() => {
            resolve(text)
          })
      } catch (e) {
        // In case of error (unreadable PDF or timeout) just add
        // an empty string to the cache
        database.pdf
          .add({ hash, text: '', path: file.path })
          .then(() => {
            resolve('')
          })
      }
    })
  }

  /**
   * Removes the outdated cache entries
   */
  public async cleanCache(): Promise<void> {
    database.pdf.each(async item => {
      if (!(await app.vault.adapter.exists(item.path))) {
        console.log(item.path + ' does not exist')
      }
    })
  }
}

export const pdfManager = new PDFManager()
