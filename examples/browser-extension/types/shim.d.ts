declare global {
  const cloneInto: (
    message: any,
    window: (Window & typeof globalThis) | null,
    options?: {
      cloneFunctions?: boolean
    }
  ) => any
}

export {}
