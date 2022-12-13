import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, SCY or Vertical scroll register, resides in the I/O region, its address is 0xFF42
 */
export class RegisterSCY extends Uint8 {
  static ADDRESS = 0xFF42;

  constructor() {
    super();

    for (const key in RegisterSCY.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterSCY.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  static #BIT_FIELD = {
    SCY: { position: 0, size: 8, isReadable: true, isWritable: true, valueAfterReset: 0 },
  };
}

