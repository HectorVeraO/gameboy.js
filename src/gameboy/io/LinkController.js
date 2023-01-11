import { hexStr } from "@common/Number";
import { RegisterSB } from "./registers/RegisterSB";
import { RegisterSC } from "./registers/RegisterSC";

/**
 * Serial Data Transfer (Link Cable) memory mapped register
 * https://gbdev.io/pandocs/Serial_Data_Transfer_(Link_Cable).html#serial-data-transfer-link-cable
 */
export class LinkController {
  /** @param {{ read: (address: uint16) => uint8, write: (address: uint16, byte: uint8) => void }} memoryPins */
  constructor({ read, write }) {
    this.#readMemory = read;
    this.#writeMemory = write;
  }

  /**
   * @param {uint16} address 
   * @returns uint8 | null
   */
  guardRead = (address) => {
    if (address === RegisterSB.ADDRESS)
      return this.#SB.valueOf();
    if (address === RegisterSC.ADDRESS)
      return this.#SC.valueOf();
    return null;
  }

  /**
   * @param {uint16} address 
   * @param {uint8} byte 
   * @returns boolean
   */
  guardWrite = (address, byte) => {
    let writePerformed = true;
    if (address === RegisterSB.ADDRESS)
      this.#SB = byte;
    else if (address === RegisterSC.ADDRESS)
      this.#SC = byte;
    else
      writePerformed = false;
    
    if (writePerformed) {
      console.log(`${hexStr(address, '$', 4)} = ${hexStr(byte, '$', 2)} ; ${String.fromCharCode(byte)}`);
    }
    return writePerformed;
  }

  #readMemory;
  #writeMemory;

  #register = {
    SB:new RegisterSB(),
    SC:new RegisterSC(),
  }

  get #SB() {
    return this.#register.SB;
  }

  get #SC() {
    return this.#register.SC;
  }

  set #SB(byte) {
    this.#register.SB.set(byte);
  }

  set #SC(byte) {
    this.#register.SC.set(byte);
  }
}
