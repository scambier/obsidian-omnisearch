import type { TFile } from 'obsidian'
import PDFJs from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'

PDFJs.GlobalWorkerOptions.workerSrc = pdfjsWorker

// https://stackoverflow.com/a/59929946
export async function getPdfText(file: TFile): Promise<string> {
  const data = await app.vault.readBinary(file)
  const doc = await PDFJs.getDocument(data).promise
  const pageTexts = Array.from({ length: doc.numPages }, async (v, i) => {
    const page = await doc.getPage(i + 1)
    const content = await page.getTextContent()
    return (content.items as any[]).map(token => token.str).join('')
  })
  return (await Promise.all(pageTexts)).join('')
}
