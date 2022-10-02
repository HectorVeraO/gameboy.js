import { byte } from "@common/constants/InformationUnits";
import { getMinimumBitWidth, MASK_BY_BIT_WIDTH } from "@common/Number";
import { RAM_BANK_CAPACITY, RAM_SIZES } from "@gameboy/constants/RamSizes";
import { ROM_BANK_CAPACITY, ROM_SIZES } from "@gameboy/constants/RomSizes";
// eslint-disable-next-line no-unused-vars
import { Header } from "../Header";

/**
 * Max 2MB ROM and/or 32 KiB RAM
 * See: https://gbdev.io/pandocs/MBC1.html
 * 
 * TODO: Implement "MBC1M" 1 MiB Multi-Game Compilation Carts (https://gbdev.io/pandocs/MBC1.html#mbc1m-1-mib-multi-game-compilation-carts)
 */
export class Mbc1 {

  /**
   * @param {Header} header 
   * @param {Uint8Array} bytes 
   */
  constructor(header, bytes) {
    this.#romBankCount = ROM_SIZES[header.romSize];
    // this.#rom = new Uint8Array(ROM_BANK_CAPACITY / byte * this.#romBankCount);
    this.#rom = new Uint8Array(bytes); // TODO: Not sure about this
    console.log(`Requested ROM size ${ROM_BANK_CAPACITY / byte * this.#romBankCount} bytes`);
    console.log(`GamePak size ${bytes.length} bytes`);

    // ROM banking register can address at most 32 ROM banks
    // Some games extend this register by wiring the RAM banking register
    const romBankCountBitWidth = getMinimumBitWidth(this.#romBankCount - 1);
    this.#romBankSelectionMask = MASK_BY_BIT_WIDTH[romBankCountBitWidth];
    this.#extendedRomMode = this.#romBankCount > 32;

    this.#ramBankCount = this.#extendedRomMode ? 1 : RAM_SIZES[header.ramSize];
    this.#ram = new Uint8Array(RAM_BANK_CAPACITY / byte * this.#ramBankCount);

    const ramBankCountBitWidth = getMinimumBitWidth(this.#ramBankCount - 1);
    this.#ramBankSelectionMask = MASK_BY_BIT_WIDTH[ramBankCountBitWidth];
  }

  read(address) {
    let mappedAddress;
    let container;

    if (address >= 0x0000 && address <= 0x3FFF) {
      if (this.#registerBankingModeSelect === 0) {
        mappedAddress = address & 0x3FFF;
        container = this.#rom;
      } else {
        mappedAddress = address & 0x3FFF; // From address
        mappedAddress |= (this.#registerRomBankNumber <= 0x01 ? 1 : 0) << 14; // Zero to one translation
        mappedAddress |= (this.#registerRamBankNumber & (this.#romBankSelectionMask >>> 5)) << 19; // Take needed bits from extended ROM banking register (AKA stolen RAM banking register)
        container = this.#rom;
      }
    }

    if (address >= 0x4000 && address <= 0x7FFF) {
      const extendedRomBankingRegister = (this.#registerRamBankNumber << 5) | this.#registerRomBankNumber;
      mappedAddress = address & 0x3FFF;
      mappedAddress |= (extendedRomBankingRegister & this.#romBankSelectionMask) << 14;
      container = this.#rom;
    }

    if (address >= 0xA000 && address <= 0xBFFF && this.#registerRamEnable) {
      if (this.#registerBankingModeSelect === 0) {
        mappedAddress = address & 0x0FFF;
        container = this.#ram;
      } else {
        mappedAddress = address & 0x0FFF;
        mappedAddress |= (this.#registerRamBankNumber & this.#ramBankSelectionMask) << 13;
        container = this.#ram;
      }

    }

    if (!mappedAddress || !container) {
      mappedAddress = 0;
      container = Mbc1.#undefinedRegion; // Undefined reads return open bus values (often 0xFF, pulled high)
    }

    return container[mappedAddress];
  }

  write(address, value) {
    if (address >= 0x0000 && address <= 0x1FFF) {
      this.#registerRamEnable = 0x0A === (value & 0x0F);
      return;
    }
    
    if (address >= 0x2000 && address <= 0x3FFF) {
      this.#registerRomBankNumber = (value & Mbc1.#romBankingRegisterMask) || 0x01;
      return;
    }
    
    if (address >= 0x4000 && address <= 0x5FFF) {
      this.#registerRamBankNumber = value & 0x03;
      return;
    }
    
    if (address >= 0x6000 && address <= 0x7FFF) {
      this.#registerBankingModeSelect = value & 0x01;
      return;
    }

    if (address >= 0xA000 && address <= 0xBFFF && this.#registerRamEnable) {
      const mappedAddress = (this.#registerRamBankNumber << 13) | (address & 0x0FFF);
      this.#ram[mappedAddress] = value;
    }
  }

  static #undefinedRegion = new Uint8Array(1);

  static #romBankingRegisterMask = 0x1F;

  /** The mask in the GameBoy is only as wide as it's needed to address all of the ROM banks */
  #romBankSelectionMask;

  /** The mask in the GameBoy is only as wide as it's needed to address all of the RAM banks */
  #ramBankSelectionMask;

  /** Writing 0x~A ('~' meaning any hex char) into 0x0000...0x1FFF enables RAM access */
  #registerRamEnable;

  /** 5-bit wide, used to map a ROM bank to the 0x4000...0x7FFF region */
  #registerRomBankNumber;

  /** 2-bit wide, used to map a RAM bank to the 0xA000...0xBFFF region or as bits 5 and 6 for ROM bank selection */
  #registerRamBankNumber;
   
  /**
   * 1-bit wide, used to switch between Simple Banking Mode and RAM banking mode with advanced ROM banking.
   * The MBC1 has an AND gate between both bank registers and the second most significant bit of the requested address.
   * This is intended to "lock" 0x0000...0x3FFF to ROM bank 0, and 0xA000...0xBFFF to RAM bank 0, since in both
   * address ranges said bit is 0, the AND gate causes both registers to be treated as 0.
   * 
   * Setting this register to 1, turns of the aforementioned AND gate and thus enabling RAM banking and
   * advanced ROM banking.
   * 
   * It's said to enable RAM banking because a side effect of the AND gate is that it locks the only
   * region available to map RAM banks to its bank 0.
   */
  #registerBankingModeSelect;

  /** Some games use the RAM banking register as an extension of the ROM banking register */
  #extendedRomMode;

  /** Array containing ROM data */
  #rom;
  #romBankCount;

  /** Array containing RAM data */
  #ram;
  #ramBankCount;
}
