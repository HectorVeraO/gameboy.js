const DynamicArray = function ({ capacity }) {
  return Array.from({ length: capacity });
};

const createContainer = ({ capacity = 0, bitsPerSlot = 8, initialValue = 0 }) => {
  const options = { length: capacity };
  const containerFromType = (type = Array) => new type(options).fill(initialValue);
  if (bitsPerSlot <= 8 ) return containerFromType(Uint8Array);
  if (bitsPerSlot <= 16) return containerFromType(Uint16Array);
  if (bitsPerSlot <= 32) return containerFromType(Uint32Array);
  return containerFromType(DynamicArray);
}

export const ContainerFactory = {
  create: createContainer, 
}
