import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, LY or Vertical scroll register, resides in the I/O region, its address is 0xFF44
 */
export class RegisterLY extends Uint8 {
  static ADDRESS = 0xFF44;

  constructor() {
    super();

    for (const key in RegisterLY.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterLY.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  static #BIT_FIELD = {
    LY: { position: 0, size: 8, isReadable: true, isWritable:false, valueAfterReset: 0 },
  };
}

