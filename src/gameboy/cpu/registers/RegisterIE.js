import { RegisterInterrupt } from "./RegisterInterrupt";

/** IE or Interrupt enable flag https://gbdev.io/pandocs/Interrupts.html#ffff--ie-interrupt-enable */
export class RegisterIE extends RegisterInterrupt {

  constructor(byte) {
    super(byte);
  }
}
