import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, STAT or PPU status register, resides in the I/O region, its address is 0xFF41
 */
export class RegisterSTAT extends Uint8 {

  constructor() {
    super();

    for (const key in RegisterSTAT.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterSTAT.#BIT_FIELD[key];
      this.setBit(position, size, valueAfterReset);
    }
  }

  get lcdMode() {
    const { position, size } = RegisterSTAT.#BIT_FIELD.LCD_MODE;
    return this.bitRange(position, size);
  }

  get lycStat() {
    const { position } = RegisterSTAT.#BIT_FIELD.LYC_STAT;
    return this.bit(position);
  }

  get intrM0() {
    const { position } = RegisterSTAT.#BIT_FIELD.INTR_M0;
    return this.bit(position);
  }

  get intrM1() {
    const { position } = RegisterSTAT.#BIT_FIELD.INTR_M1;
    return this.bit(position);
  }

  get intrM2() {
    const { position } = RegisterSTAT.#BIT_FIELD.INTR_M2;
    return this.bit(position);
  }

  get intrLyc() {
    const { position } = RegisterSTAT.#BIT_FIELD.INTR_LYC;
    return this.bit(position);
  }

  get u1() {
    return RegisterSTAT.#BIT_FIELD.U1.valueAfterReset;
  }

  set lcdMode(bit) {
    const { position, size } = RegisterSTAT.#BIT_FIELD.LCD_MODE;
    this.setBitRange(position, size, bit);
  }

  set lycStat(bit) {
    const { position } = RegisterSTAT.#BIT_FIELD.LYC_STAT;
    this.setBit(position, bit);
  }

  set intrM0(bit) {
    const { position } = RegisterSTAT.#BIT_FIELD.INTR_M0;
    this.setBit(position, bit);
  }

  set intrM1(bit) {
    const { position } = RegisterSTAT.#BIT_FIELD.INTR_M1;
    this.setBit(position, bit);
  }

  set intrM2(bit) {
    const { position } = RegisterSTAT.#BIT_FIELD.INTR_M2;
    this.setBit(position, bit);
  }

  set intrLyc(bit) {
    const { position } = RegisterSTAT.#BIT_FIELD.INTR_LYC;
    this.setBit(position, bit);
  }

  set u1(bit) {
    const { position, valueAfterReset } = RegisterSTAT.#BIT_FIELD.U1.valueAfterReset;
    bit = valueAfterReset;
    this.setBit(position, bit);
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

