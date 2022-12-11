export class Instruction {

  get opcode() {
    return this.#opcode;
  }

  get mnemonic() {
    return this.#mnemonic;
  }

  get cycles() {
    return this.#cycles;
  }

  get byteLength() {
    return this.#byteLength;
  }

  get execute() {
    return this.#fn() || 0;
  }

  /** @param {{ opcode: uint8, mnemonic: string, cycles: uint8, byteLength: uint8, fn: () => uint8 }} definition */
  constructor({ opcode, mnemonic, cycles, byteLength, fn }) {
    this.#opcode = opcode;
    this.#mnemonic = mnemonic;
    this.#cycles = cycles;
    this.#byteLength = byteLength;
    this.#fn = fn;
  }

  /** @type {uint8} */
  #opcode;

  /** @type {string}  */
  #mnemonic;

  /** @type {uint8} */
  #cycles;

  /** @type {uint8} */
  #byteLength;

  /** @type {() => uint8} */
  #fn;
}
