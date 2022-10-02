/**
 * 32 KiB ROM only
 * See: https://gbdev.io/pandocs/nombc.html
 */
export class NoMbc {
  constructor() {
    this.#rom = new Uint8Array(32 * 2 ** 10);
    this.#ram = new Uint8Array(8 * 2 ** 10);
  }

  read(address) {
    if (address >= 0x0000 && address <= 0x7FFF) {
      return this.#rom[address];
    }

    if (address >= 0xA000 && address <= 0xBFFF) {
      return this.#ram[address];
    }

    return NoMbc.#undefinedRead;
  }

  write(address, value) {
    if (address >= 0xA000 && address <= 0xBFFF) {
      this.#ram[address] = value;
    }
  }

  static #undefinedRead = 0xFF;

  #rom;
  #ram;
}
