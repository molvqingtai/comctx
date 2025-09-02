import safeInstanceOf from '@/utils/safeInstanceOf'

// Helper function to extract transferable objects
const extractTransfer = <T>(target: T): Transferable[] => {
  const visited = new WeakSet()

  const extract = (value: unknown): Transferable[] => {
    if (!value || typeof value !== 'object') {
      return []
    }

    // Avoid infinite recursion
    if (visited.has(value)) {
      return []
    }

    visited.add(value)

    // Check for basic transferable objects
    if (
      safeInstanceOf(value, globalThis.ArrayBuffer) ||
      safeInstanceOf(value, globalThis.MessagePort) ||
      safeInstanceOf(value, globalThis.ImageBitmap) ||
      safeInstanceOf(value, globalThis.OffscreenCanvas) ||
      safeInstanceOf(value, globalThis.AudioData) ||
      safeInstanceOf(value, globalThis.VideoFrame) ||
      safeInstanceOf(value, globalThis.RTCDataChannel) ||
      safeInstanceOf(value, globalThis.MediaSourceHandle) ||
      safeInstanceOf(value, globalThis.MIDIAccess) ||
      safeInstanceOf(value, globalThis.MediaStreamTrack) ||
      safeInstanceOf(value, globalThis.ReadableStream) ||
      safeInstanceOf(value, globalThis.WritableStream) ||
      safeInstanceOf(value, globalThis.TransformStream)
    ) {
      return [value]
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.flatMap(extract)
    }

    // Handle objects - recursively extract transferables from properties
    return Object.values(value).flatMap(extract)
  }

  return extract(target)
}

export default extractTransfer
