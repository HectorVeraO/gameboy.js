import { byte } from "./constants/InformationUnits";

export class Memory {
  constructor(bitCapacity, bankCount = 0) {
    this.#byteCapacity = bitCapacity / byte;
    this.#buffer = new ArrayBuffer(this.#byteCapacity);

    this.#bankCount = bankCount || 1;
    this.#bankByteCapacity = this.#byteCapacity / bankCount;
    this.#banks = Array
      .from({ length: bankCount })
      .map((_, bankIndex) => {
        const viewOffset = bankIndex * this.#bankByteCapacity;
        const viewLength = this.#bankByteCapacity;
        return new DataView(this.#buffer, viewOffset, viewLength);
      });
  }

  read(address) {
    return this.#getActiveBank().getUint8(address);
  }

  write(address, value) {
    this.#getActiveBank().setUint8(address, value);
  }

  switchBank(bankIndex) {
    this.#activeBankIndex = bankIndex % this.#bankCount;
  }

  #buffer;
  #byteCapacity;

  #banks;
  #activeBankIndex;
  #bankCount;
  #bankByteCapacity;

  #getActiveBank() {
    return this.#banks[this.#activeBankIndex];
  }
}
