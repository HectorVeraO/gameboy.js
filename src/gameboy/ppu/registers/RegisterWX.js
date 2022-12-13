import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, WX or Vertical scroll register, resides in the I/O region, its address is 0xFF4B
 */
export class RegisterWX extends Uint8 {
  static ADDRESS = 0xFF4B;

  constructor() {
    super();

    for (const key in RegisterWX.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterWX.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  static #BIT_FIELD = {
    WX: { position: 0, size: 8, isReadable: true, isWritable: true, valueAfterReset: 0 },
  };
}

