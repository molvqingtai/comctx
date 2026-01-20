const safeInstanceOf = (value: any, constructor: new (...args: any[]) => any) => {
  return !!constructor?.prototype && value instanceof constructor
}

export default safeInstanceOf
