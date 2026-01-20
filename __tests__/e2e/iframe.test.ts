import { test, describe, expect } from 'vitest'
import { getByTestId, findByTestId, waitFor } from '@testing-library/dom'
import newPage from 'fixtures/iframe'

describe('iframe test', async () => {
  test('should get initial value in iframe', async () => {
    const { main, iframe } = await newPage()

    await waitFor(
      async () => {
        const mainValueRef = getByTestId(main, 'value')
        expect(mainValueRef.textContent).toBe('0')
        const iframeValueRef = getByTestId(iframe, 'value')
        expect(iframeValueRef.textContent).toBe('0')
      },
      {
        container: main
      }
    )
  })

  test('should increment value in iframe after click', async () => {
    const { main, iframe } = await newPage()

    const incrementRef = await findByTestId(main, 'increment')
    incrementRef.click()

    await waitFor(
      async () => {
        const mainValueRef = getByTestId(main, 'value')
        expect(mainValueRef.textContent).toBe('1')
        const iframeValueRef = getByTestId(iframe, 'value')
        expect(iframeValueRef.textContent).toBe('1')
      },
      {
        container: main
      }
    )
  })

  test('should decrement value in iframe after click', async () => {
    const { main, iframe } = await newPage()

    const decrementRef = await findByTestId(main, 'decrement')
    decrementRef.click()

    await waitFor(
      async () => {
        const mainValueRef = getByTestId(main, 'value')
        expect(mainValueRef.textContent).toBe('-1')
        const iframeValueRef = getByTestId(iframe, 'value')
        expect(iframeValueRef.textContent).toBe('-1')
      },
      {
        container: main
      }
    )
  })
})
