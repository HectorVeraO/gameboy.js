import { MiB } from "./constants/InformationUnits";

export class Logger {
  constructor(bufferByteLength = 1 * MiB, encoding = 'utf8') {
    this.#buffer = [];
    this.#bufferByteCapacity = bufferByteLength;
    this.#encoding = encoding;
  }

  log(message) {
    this.#buffer.push(message);
    // this.#flushIfFull();
  }

  flush() {
    const content = this.#page;
    this.#buffer = [];
    return content;
  }

  get #usedSize() {
    return Buffer.byteLength(this.#buffer, this.#encoding)
  }

  get #page() {
    return this.#buffer.reduce(
      (page, line) => {
        page += `${line}\n`;
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
}
