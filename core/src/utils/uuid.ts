const uuid = () =>
  [...Array(4)]
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join('-')

export default uuid
