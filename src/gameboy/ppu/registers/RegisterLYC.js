import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, LYC or Vertical scroll register, resides in the I/O region, its address is 0xFF45
 */
export class RegisterLYC extends Uint8 {

  constructor() {
    super();

    for (const key in RegisterLYC.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterLYC.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  static #BIT_FIELD = {
    LYC: { position: 0, size: 8, isReadable: true, isWritable: true, valueAfterReset: 0 },
  };
}

