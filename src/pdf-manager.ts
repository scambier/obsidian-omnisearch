import type { TFile } from 'obsidian'
import PDFWorker from 'web-worker:./pdf-worker.ts'
import { makeMD5 } from './utils'
import { database } from './database'
import { settings } from './settings'

const workerTimeout = 120_000

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
    const worker = new PDFWorker({ name: 'PDF Text Extractor' })
    return new Promise(async (resolve, reject) => {
      // @ts-ignore
      file.stat.size

      // In case of a timeout, we just return an empty line.
      // If we don't, it will try to reindex at each restart.
      const timeout = setTimeout(() => {
        worker.terminate()
        console.warn('Omnisearch - Worker timeout to extract text from ' + file.basename)
        resolve('')
      }, workerTimeout)

      worker.postMessage({ data, name: file.basename })
      worker.onmessage = (evt: any) => {
        const text = (evt.data.text as string)
          // Replace \n with spaces
          .replace(/\n/g, ' ')
          // Trim multiple spaces
          .replace(/ +/g, ' ')
          .trim()
        database.pdf
          .add({ hash, text, path: file.path, size: file.stat.size })
          .then(() => {
            clearTimeout(timeout)
            resolve(text)
          })
        worker.terminate()
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
