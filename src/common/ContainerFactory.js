const createContainer = ({ capacity = 0, bitsPerSlot = 8 }) => {
  const opts = { length: capacity };
  if (bitsPerSlot <= 8 ) return new Uint8Array(opts);
  if (bitsPerSlot <= 16) return new Uint16Array(opts);
  if (bitsPerSlot <= 32) return new Uint32Array(opts);
  return Array.from(opts);
}

export const ContainerFactory = {
  create: createContainer, 
}
