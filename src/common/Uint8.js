export class Uint8 {
  constructor(value = 0x00) {
    this.#value = value & 0xFF;
  }

  set(value) {
    this.#value = value & 0xFF;
  }

  bit(position) {
    return (this >> position) & 0x01;
  }

  valueOf() {
    return this.#value;
  }

  toString() {
    return `0x${Number(this.#value).toString(16)}`;
  }

  #value;
}
