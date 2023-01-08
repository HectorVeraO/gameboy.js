export const MASK_BY_BIT_WIDTH = [ 0x00, 0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F];

export const getMinimumBitWidth = (number) => Math.floor(Math.log2(number)) + 1;

export const hexStr = (number, prefix = '0x', length = 8) => `${prefix}${Number(number).toString(16).padStart(length, '0').toUpperCase()}`;
