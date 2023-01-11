import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, SC or Serial Transfer Control register, resides in the I/O region, its address is 0xFF02
 */
export class RegisterSC extends Uint8 {
  static ADDRESS = 0xFF02;

  constructor() {
    super();

    for (const key in RegisterSC.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterSC.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  static #BIT_FIELD = {
    SC: { position: 0, size: 8, isReadable: true, isWritable:true, valueAfterReset: 0 },
  };
}

