import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, WY or Vertical scroll register, resides in the I/O region, its address is 0xFF4A
 */
export class RegisterWY extends Uint8 {
  static ADDRESS = 0xFF4A;

  constructor() {
    super();

    for (const key in RegisterWY.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterWY.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  static #BIT_FIELD = {
    WY: { position: 0, size: 8, isReadable: true, isWritable: true, valueAfterReset: 0 },
  };
}

