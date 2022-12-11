import { MBC_BY_CARTRIDGE_TYPE } from "./constants/MemoryBankControllers";
import { Header } from "./Header";

/**
 * Abstraction to represent the GameBoy's "Game Pak"
 */
export class Cartridge {
  /**
   * @param {Uint8Array} gamepakBytes 
   */
  constructor(gamepakBytes) {
    this.#gamepakBytes = new Uint8Array(gamepakBytes);
    this.#header = new Header(this.#gamepakBytes);
    this.#mbc = new MBC_BY_CARTRIDGE_TYPE[this.#header.cartridgeType](this.#header, this.#gamepakBytes);
  }

  read(address) {
    return this.#mbc.read(address);
  }

  write(address, value) {
    this.#mbc.write(address, value);
  }

  get title() {
    return this.#header.title;
  }

  toString() {
    return this.title;
  }

  #gamepakBytes;
  #header;
  #mbc;
}

