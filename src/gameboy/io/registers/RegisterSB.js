import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, SB or Serial Transfer register, resides in the I/O region, its address is 0xFF01
 */
export class RegisterSB extends Uint8 {
  static ADDRESS = 0xFF01;

  constructor() {
    super();

    for (const key in RegisterSB.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterSB.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  static #BIT_FIELD = {
    SB: { position: 0, size: 8, isReadable: true, isWritable:true, valueAfterReset: 0 },
  };
}

