import { MASK_BY_BIT_WIDTH } from "./Number";

export class Uint8 {
  constructor(value = 0x00) {
    this.set(value);
  }

  set(value) {
    this.#value = value & 0xFF;
  }

  bit(position) {
    return (this >> position) & 0x01;
  }

  // TODO: Simplify this implementation for the workshop
  setBit(position, value = 1) {
    const bit = value ? 1 : 0;
    this.#value ^= (-bit ^ this.#value) & (1 << position);
  }

  clearBit(position) {
    this.#value &= ~(1 << position);
  }
  
  /**
   * Unchecked bit range
   * @param {uint3} position 
   * @param {uint3} size 
   * @returns uint8
   */
  bitRange(position, size) {
    let slice = this << (8 - position - size);
    slice &= 0xFF;
    slice >>>= (8 - size);
    slice &= 0xFF;
    return slice;
  }

  /**
   * Unchecked bit range update
   * @param {uint3} position 
   * @param {uint3} size 
   * @param {uint8} value 
   */
  setBitRange(position, size, value) {
    const rangeMask = MASK_BY_BIT_WIDTH[size];
    const boundedValue = value & rangeMask;
    this.#value = (this & ~(rangeMask << position)) | (boundedValue << position);
  }

  valueOf() {
    return this.#value;
  }

  toString() {
    return `0x${Number(this.#value).toString(16)}`;
  }

  #value;
}
