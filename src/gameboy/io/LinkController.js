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
