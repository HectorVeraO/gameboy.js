import { System } from "./system/System";

/**
 * Abstraction representing the exposed functionality to the end user
 */
export class Gameboy {

  constructor() {
    this.#system = new System();
  }

  /** Cartridge's name */
  game() {
    return this.#system.cartridge.title;
  }

  /** Load cartridge */
  load(bytes) {
    this.#system.loadCartridge(bytes);
  }

  /** Remove cartridge */
  unload() {
    this.#system.unloadCartridge();
  }

  /** Turn on console */
  power() {
    this.#system.reset();
    return this.run();
  }

  /** Play cartridge TODO: confirm */
  async *run() {
    const targetFramerate = 59.7;
    const frameDuration = 1 / targetFramerate;
    let previousTimestamp = performance.now();
    while (true) {
      const currentTimestamp = performance.now();
      const millisecondsElapsed = currentTimestamp - previousTimestamp;
      // if (millisecondsElapsed < frameDuration) {
      //   return;
      // }

      
      previousTimestamp = currentTimestamp;
      
      const maybeFramebuffer = this.#system.clock();
      if (maybeFramebuffer)
        yield maybeFramebuffer;
    }
  }

  /** @type {System} */
  #system;
}
