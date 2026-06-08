import { test, describe, expect } from 'vitest'
import { checkMessage, MESSAGE_TYPE, MESSAGE_SENDER_TYPE } from 'comctx'
import type { Message } from 'comctx'

describe('checkMessage', () => {
  const validMessage: Message = {
    type: MESSAGE_TYPE.APPLY,
    id: 'test-id',
    path: ['method'],
    sender: { type: MESSAGE_SENDER_TYPE.INJECTOR },
    meta: {},
    namespace: '__comctx__',
    timeStamp: Date.now()
  }

  test('should return true for valid message', () => {
    expect(checkMessage(validMessage)).toBe(true)
  })

  test('should return false for invalid messages', () => {
    expect(checkMessage(undefined)).toBe(false)
    expect(checkMessage({})).toBe(false)
    expect(checkMessage({ ...validMessage, type: 'invalid' as any })).toBe(false)
    expect(checkMessage({ ...validMessage, id: '' })).toBe(false)
    expect(checkMessage({ ...validMessage, sender: 'injector' as any })).toBe(false)
    expect(checkMessage({ ...validMessage, sender: { type: MESSAGE_SENDER_TYPE.INJECTOR, name: 1 } as any })).toBe(
      false
    )
  })
})
