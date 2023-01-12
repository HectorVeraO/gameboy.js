import { byte, MiB } from "./constants/InformationUnits";

export class Logger {
  constructor(bufferByteLength = 10 * MiB / byte, encoding = 'utf8') {
    this.#buffer = Array.from({ length: this.#allocatedSize }).fill(Logger.#none);
    this.#bufferByteCapacity = bufferByteLength;
    this.#encoding = encoding;
  }

  log(message) {
    this.#buffer[this.#position++] = message;
    // this.#flushIfFull();
  }

  flush() {
    const content = this.#page;
    this.#position = 0;
    this.#buffer.fill(Logger.#none)
    return content;
  }

  get #usedSize() {
    return Buffer.byteLength(this.#buffer, this.#encoding)
  }

  get #page() {
    return this.#buffer
      .filter((o) => Logger.#none !== o)
      .reduce(
        (page, line) => {
          page += `${typeof line === 'string' ? line : JSON.stringify(line)}\n`;
          return page;
        },
        '',
      );
  }

  #isBufferFull() {
    return this.#usedSize >= this.#bufferByteCapacity;
  }

  #flush() {
    console.debug(this.#page);
    this.#buffer = [];
  }

  #flushIfFull() {
    if (this.#isBufferFull)
      this.#flush();
  }

  #buffer;
  #bufferByteCapacity;
  #encoding;
  #position = 0;
  #allocatedSize = 2 ** 16; // TODO: This should be based on buffer size, somehow

  static #none = Symbol('none');
}
