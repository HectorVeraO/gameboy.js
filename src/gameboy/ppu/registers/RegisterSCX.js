import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, SCX or Horizontal scroll register, resides in the I/O region, its address is 0xFF43
 */
export class RegisterSCX extends Uint8 {

  constructor() {
    super();

    for (const key in RegisterSCX.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterSCX.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  static #BIT_FIELD = {
    SCX: { position: 0, size: 8, isReadable: true, isWritable: true, valueAfterReset: 0 },
  };
}

