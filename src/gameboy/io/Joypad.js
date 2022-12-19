/**
 * Joypad input
 * https://gbdev.io/pandocs/Joypad_Input.html
 */
export class Joypad {
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
    return null;
  }

  /**
   * @param {uint16} address 
   * @param {uint8} byte 
   * @returns boolean
   */
  guardWrite = (address, byte) => {
    return false;
  }

  #readMemory;
  #writeMemory;
}
