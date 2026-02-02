import { Browser } from 'happy-dom'
import { resolve } from 'node:path'
import { findByTestId } from '@testing-library/dom'

const browser = new Browser({
  settings: {
    enableJavaScriptEvaluation: true,
    suppressInsecureJavaScriptEnvironmentWarning: true,
    fetch: {
      virtualServers: [
        {
          url: 'https://localhost:8080',
          directory: resolve(__dirname, '../../examples/iframe/dist')
        }
      ]
    }
  }
})

const newPage = async () => {
  const page = browser.newPage()
  await page.goto('https://localhost:8080')
  const main = page.mainFrame.document as unknown as HTMLElement
  const iframe = (await findByTestId<HTMLIFrameElement>(main, 'iframe'))!.contentDocument as unknown as HTMLElement

  return { page, main, iframe }
}

export default newPage
