import { Register8 } from "./Register8";

export class RegisterF extends Register8 {
  constructor(value) {
    super(value);
  }

  /** Zero flag */
  get Z() {
    return this.bit(7);
  }

  /** Subtraction flag (BCD) */
  get N() {
    return this.bit(6);
  }

  /** Half carry flag (BCD) */
  get H() {
    return this.bit(5);
  }

  /** Carry flag */
  get C() {
    return this.bit(4);
  }

  /** Carry flag, alias of C */
  get Cy() {
    return this.C;
  }
}
