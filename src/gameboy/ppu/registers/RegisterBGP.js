import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, BGP or background palette (Non-CGB mode only),
 * resides in the I/O region, its address is 0xFF47
 */
export class RegisterBGP extends Uint8 {

  constructor() {
    super();

    for (const key in RegisterBGP.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterBGP.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  get color0() {
    const { position, size } = RegisterBGP.#BIT_FIELD[0];
    return this.bitRange(position, size);
  }

  get color1() {
    const { position, size } = RegisterBGP.#BIT_FIELD[1];
    return this.bitRange(position, size);
  }

  get color2() {
    const { position, size } = RegisterBGP.#BIT_FIELD[2];
    return this.bitRange(position, size);
  }

  get color3() {
    const { position, size } = RegisterBGP.#BIT_FIELD[3];
    return this.bitRange(position, size);
  }

  /**
   * Set color for index 0
   * @param {uint3} color
   */
  set color0(color) {
    const { position, size } = RegisterBGP.#BIT_FIELD[0];
    this.setBitRange(position, size, color);
  }

  /**
   * Set color for index 1
   * @param {uint3} color
   */
   set color1(color) {
    const { position, size } = RegisterBGP.#BIT_FIELD[1];
    this.setBitRange(position, size, color);
  }

  /**
   * Set color for index 2
   * @param {uint3} color
   */
   set color2(color) {
    const { position, size } = RegisterBGP.#BIT_FIELD[2];
    this.setBitRange(position, size, color);
  }

  /**
   * Set color for index 3
   * @param {uint3} color
   */
   set color3(color) {
    const { position, size } = RegisterBGP.#BIT_FIELD[3];
    this.setBitRange(position, size, color);
  }

  colorOf(index) {
    const { position, size } = RegisterBGP.#BIT_FIELD[index % 4];
    return this.bitRange(position, size);
  }

  static #BIT_FIELD = {
    0: { position: 0, size: 2, isReadable: true, isWritable: true, valueAfterReset: 0 },
    1: { position: 2, size: 2, isReadable: true, isWritable: true, valueAfterReset: 0 },
    2: { position: 4, size: 2, isReadable: true, isWritable: true, valueAfterReset: 0 },
    3: { position: 6, size: 2, isReadable: true, isWritable: true, valueAfterReset: 0 },
  };
}

