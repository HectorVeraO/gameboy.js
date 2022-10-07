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

  setBit(position, value = 1) {
    const bit = value ? 1 : 0;
    this.#value ^= (-bit ^ this.#value) & (1 << position);
  }

  clearBit(position) {
    this.#value &= ~(1 << position);
  }

  valueOf() {
    return this.#value;
  }

  toString() {
    return `0x${Number(this.#value).toString(16)}`;
  }

  #value;
}
