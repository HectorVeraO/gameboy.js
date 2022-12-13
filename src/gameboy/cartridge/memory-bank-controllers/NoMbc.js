import { byte } from "@common/constants/InformationUnits";
import { RAM_BANK_CAPACITY, RAM_SIZES } from "@gameboy/constants/RamSizes";
import { ROM_SIZES, ROM_BANK_CAPACITY } from "@gameboy/constants/RomSizes";
import { Header } from "../Header";

/**
 * 32 KiB ROM only
 * See: https://gbdev.io/pandocs/nombc.html
 */
export class NoMbc {
    /**
   * @param {Header} header 
   * @param {Uint8Array} bytes 
   */
  constructor(header, bytes) {
    // TODO: NoMbc and Mbc1, can I extract this away?
    this.#romBankCount = ROM_SIZES[header.romSize].bankCount;
    this.#rom = bytes.slice(0, this.#romBankCount * ROM_BANK_CAPACITY);
    console.log(`Requested ROM size ${ROM_BANK_CAPACITY / byte * this.#romBankCount} bytes`);
    console.log(`GamePak size ${bytes.length} bytes`);

    this.#ramBankCount = RAM_SIZES[header.ramSize].bankCount;
    this.#ram = bytes.slice(this.#rom.length, this.#ramBankCount * RAM_BANK_CAPACITY);
    console.log(`Requested RAM size ${RAM_BANK_CAPACITY / byte * this.#ramBankCount} bytes`);
    console.log(`GamePak size ${bytes.length} bytes`);
  }

  read(address) {
    if (address >= 0x0000 && address <= 0x7FFF) {
      return this.#rom[address];
    }

    if (address >= 0xA000 && address <= 0xBFFF) {
      return this.#ram[address];
    }

    return NoMbc.#undefinedRead;
  }

  write(address, value) {
    if (address >= 0xA000 && address <= 0xBFFF) {
      this.#ram[address] = value;
    }
  }

  static #undefinedRead = 0xFF;

  #rom;
  #ram;

  #romBankCount;
  #ramBankCount;
}
