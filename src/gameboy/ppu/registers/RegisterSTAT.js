import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, STAT or PPU status register, resides in the I/O region, its address is 0xFF41
 */
export class RegisterSTAT extends Uint8 {

  constructor() {
    super();

    for (const key in RegisterSTAT.#BIT_FIELD) {
      const { position, valueAfterReset } = RegisterSTAT.#BIT_FIELD[key];
      this.setBit(position, valueAfterReset);
    }
  }

  get lcdMode() {
    const { position, size } = RegisterSTAT.#BIT_FIELD.LCD_MODE;
    return this.bitRange(position, size);
  }

  set lcdMode(value) {
    const { position, size } = RegisterSTAT.#BIT_FIELD.LCD_MODE;
    this.setBitRange(position, size, value);
  }

  static #BIT_FIELD = {
    LCD_MODE: { position: 0, size: 2, isReadable: true, isWritable: false, valueAfterReset: 0 },
    LYC_STAT: { position: 2, size: 1, isReadable: true, isWritable: false, valueAfterReset: 0 },
     INTR_M0: { position: 3, size: 1, isReadable: true, isWritable: true, valueAfterReset: 0 },
     INTR_M1: { position: 4, size: 1, isReadable: true, isWritable: true, valueAfterReset: 0 },
     INTR_M2: { position: 5, size: 1, isReadable: true, isWritable: true, valueAfterReset: 0 },
    INTR_LYC: { position: 6, size: 1, isReadable: true, isWritable: true, valueAfterReset: 0 },
          U1: { position: 7, size: 1, isReadable: true, isWritable: false, valueAfterReset: 1 },
  };
}
