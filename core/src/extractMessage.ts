import isInstanceOf from '@/utils/isInstanceOf'

// Helper function to extract clean message and transferable objects
const extractMessage = <T>(originalMessage: T): { message: T; transfer: Transferable[] } => {
  const visited = new WeakSet()

  const traverse = (value: unknown): { cleanedValue: unknown; transferables: Transferable[] } => {
    if (!value || typeof value !== 'object') {
      return { cleanedValue: value, transferables: [] }
    }

    // Avoid infinite recursion
    if (visited.has(value)) {
      return { cleanedValue: value, transferables: [] }
    }
    visited.add(value)

    // Check for basic transferable objects
    if (
      isInstanceOf(value, globalThis.ArrayBuffer) ||
      isInstanceOf(value, globalThis.MessagePort) ||
      isInstanceOf(value, globalThis.ImageBitmap) ||
      isInstanceOf(value, globalThis.OffscreenCanvas) ||
      isInstanceOf(value, globalThis.AudioData) ||
      isInstanceOf(value, globalThis.VideoFrame) ||
      isInstanceOf(value, globalThis.RTCDataChannel) ||
      isInstanceOf(value, globalThis.MediaSourceHandle) ||
      isInstanceOf(value, globalThis.MIDIAccess) ||
      isInstanceOf(value, globalThis.MediaStreamTrack) ||
      isInstanceOf(value, globalThis.ReadableStream) ||
      isInstanceOf(value, globalThis.WritableStream) ||
      isInstanceOf(value, globalThis.TransformStream)
    ) {
      return { cleanedValue: value, transferables: [value as Transferable] }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value
        .map((item) => traverse(item))
        .reduce<{
          cleanedValue: unknown[]
          transferables: Transferable[]
        }>(
          (acc, cur) => ({
            cleanedValue: [...acc.cleanedValue, cur.cleanedValue],
            transferables: [...acc.transferables, ...cur.transferables]
          }),
          { cleanedValue: [], transferables: [] }
        )
    }

    // Handle objects - recursively clean properties
    return Object.entries(value)
      .map(([key, value]) => ({
        key,
        value: traverse(value)
      }))
      .reduce<{
        cleanedValue: Record<string, unknown>
        transferables: Transferable[]
      }>(
        (acc, { key, value }) => ({
          cleanedValue: { ...acc.cleanedValue, [key]: value.cleanedValue },
          transferables: [...acc.transferables, ...value.transferables]
        }),
        { cleanedValue: {}, transferables: [] }
      )
  }

  const { cleanedValue, transferables } = traverse(originalMessage)
  return { message: cleanedValue as T, transfer: transferables }
}

export default extractMessage
