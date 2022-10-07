import { Uint8 } from "@common/Uint8";

export class RegisterF extends Uint8 {
  
  constructor(value) {
    super(value);
  }

  /** Zero flag */
  get Z() {
    return this.bit(RegisterF.#position.z);
  }

  /** Subtraction flag (BCD) */
  get N() {
    return this.bit(RegisterF.#position.n);
  }

  /** Half carry flag (BCD) */
  get H() {
    return this.bit(RegisterF.#position.h);
  }

  /** Carry flag */
  get C() {
    return this.bit(RegisterF.#position.c);
  }

  /** Carry flag, alias of C */
  get Cy() {
    return this.C;
  }
  
  set Z(value = 1) {
    this.setBit(RegisterF.#position.z, value);
  }

  set N(value = 1) {
    this.setBit(RegisterF.#position.n, value);
  }

  set H(value = 1) {
    this.setBit(RegisterF.#position.h, value);
  }

  set C(value = 1) {
    this.setBit(RegisterF.#position.c, value);
  }

  set Cy(value = 1) {
    this.setBit(RegisterF.#position.c, value);
  }

  static #position = {
    z: 7,
    n: 6,
    h: 5,
    c: 4,
  };
}
