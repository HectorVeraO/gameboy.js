import { Uint8 } from "@common/Uint8";

/**
 * Memory mapped register, LCDC or PPU control register, resides in the I/O region, its address is 0xFF40
 */
export class RegisterLCDC extends Uint8 {
  static ADDRESS = 0xFF40;

  constructor() {
    super();

    for (const key in RegisterLCDC.#BIT_FIELD) {
      const { position, size, valueAfterReset } = RegisterLCDC.#BIT_FIELD[key];
      this.setBitRange(position, size, valueAfterReset);
    }
  }

  get bgwEnPr() {
    return this.bit(RegisterLCDC.#BIT_FIELD.BGW_EN_PR.position);
  }

  get objEn() {
    return this.bit(RegisterLCDC.#BIT_FIELD.OBJ_EN.position);
  }

  get objSize() {
    return this.bit(RegisterLCDC.#BIT_FIELD.OBJ_SIZE.position);
  }

  get bgMap() {
    return this.bit(RegisterLCDC.#BIT_FIELD.BG_MAP.position);
  }

  get tileSel() {
    return this.bit(RegisterLCDC.#BIT_FIELD.TILE_SEL.position);
  }

  get winEn() {
    return this.bit(RegisterLCDC.#BIT_FIELD.WIN_EN.position);
  }

  get winMap() {
    return this.bit(RegisterLCDC.#BIT_FIELD.WIN_MAP.position);
  }

  get lcdEn() {
    return this.bit(RegisterLCDC.#BIT_FIELD.LCD_EN.position);
  }

  set bgwEnPr(bit) {
    this.setBit(RegisterLCDC.#BIT_FIELD.BGW_EN_PR.position, bit);
  }

  set objEn(bit) {
    this.setBit(RegisterLCDC.#BIT_FIELD.OBJ_EN.position, bit);
  }

  set objSize(bit) {
    this.setBit(RegisterLCDC.#BIT_FIELD.OBJ_SIZE.position, bit);
  }

  set bgMap(bit) {
    this.setBit(RegisterLCDC.#BIT_FIELD.BG_MAP.position, bit);
  }

  set tileSel(bit) {
    this.setBit(RegisterLCDC.#BIT_FIELD.TILE_SEL.position, bit);
  }

  set winEn(bit) {
    this.setBit(RegisterLCDC.#BIT_FIELD.WIN_EN.position, bit);
  }

  set winMap(bit) {
    this.setBit(RegisterLCDC.#BIT_FIELD.WIN_MAP.position, bit);
  }

  set lcdEn(bit) {
    this.setBit(RegisterLCDC.#BIT_FIELD.LCD_EN.position, bit);
  }

  static #BIT_FIELD = {
    BGW_EN_PR: { position: 0, isReadable: true, isWritable: true, valueAfterReset: 0 },
       OBJ_EN: { position: 1, isReadable: true, isWritable: true, valueAfterReset: 0 },
     OBJ_SIZE: { position: 2, isReadable: true, isWritable: true, valueAfterReset: 0 },
       BG_MAP: { position: 3, isReadable: true, isWritable: true, valueAfterReset: 0 },
     TILE_SEL: { position: 4, isReadable: true, isWritable: true, valueAfterReset: 0 },
       WIN_EN: { position: 5, isReadable: true, isWritable: true, valueAfterReset: 0 },
      WIN_MAP: { position: 6, isReadable: true, isWritable: true, valueAfterReset: 0 },
       LCD_EN: { position: 7, isReadable: true, isWritable: true, valueAfterReset: 0 },
  };
}
