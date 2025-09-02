import isInstanceOf from '@/utils/isInstanceOf'

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
