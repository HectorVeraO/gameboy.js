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
    return this.#fn;
  }

  constructor({ opcode, mnemonic, cycles, byteLength, fn }) {
    this.#opcode = opcode;
    this.#mnemonic = mnemonic;
    this.#cycles = cycles;
    this.#byteLength = byteLength;
    this.#fn = fn;
  }

  #opcode;
  #mnemonic;
  #cycles;
  #byteLength;
  #fn;
}
