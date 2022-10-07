import { RegisterInterrupt } from "./RegisterInterrupt";

/** IE or Interrupt enable flag https://gbdev.io/pandocs/Interrupts.html#ff0f--if-interrupt-flag */
export class RegisterIF extends RegisterInterrupt {

  constructor(byte) {
    super(byte);
  }
}
