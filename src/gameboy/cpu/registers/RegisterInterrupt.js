import { Uint8 } from "@common/Uint8";

/** Interrupt definitions for register IE and IF */
export class RegisterInterrupt extends Uint8 {

  constructor(byte) {
    super(byte);
  }

  get VBlank() {
    return this.bit(0);
  }

  get LCD_STAT() {
    return this.bit(1);
  }

  get Timer() {
    return this.bit(2);
  }

  get Serial() {
    return this.bit(3);
  }

  get Joypad() {
    return this.bit(4);
  }
}
