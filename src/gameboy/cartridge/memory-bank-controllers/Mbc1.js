import { ContainerFactory } from "@common/ContainerFactory";
import { MiB } from "@common/constants/InformationUnits";
import { RAM_BANK_CAPACITY, RAM_SIZES } from "@gameboy/constants/RamSizes";
import { ROM_BANK_CAPACITY, ROM_SIZES } from "@gameboy/constants/RomSizes";
import { Memory } from "@common/MemoryFactory";

// TODO: Move this shit
const getMinimumBitWidth = (number) => Math.floor(Math.log2(number)) + 1;
const MASK_BY_BIT_WIDTH = [ 0x00, 0x01, 0x03, 0x07, 0x0F, 0x1F];

/**
 * Max 2MB ROM and/or 32 KiB RAM
 * See: https://gbdev.io/pandocs/MBC1.html
 */
export class Mbc1 {
  constructor(header) {
    this.#romBankCount = ROM_SIZES[header.romSize];
    this.#rom = new Memory(ROM_BANK_CAPACITY * this.#romBankCount, this.#romBankCount);

    // ROM banking register can address at most 32 ROM banks
    // Some games extend this register by wiring the RAM banking register
    const romBankCountBitWidth = getMinimumBitWidth(this.#romBankCount - 1);
    this.#romBankSelectionMask = MASK_BY_BIT_WIDTH[romBankCountBitWidth];
    this.#extendedRomMode = this.#romBankCount > 32;

    this.#ramBankCount = this.#extendedRomMode ? 1 : RAM_SIZES[header.ramSize];
    this.#ram = new Memory(RAM_BANK_CAPACITY * this.#ramBankCount, this.#ramBankCount);
  }

  read(address) {
    const { mappedAddress, container } = this.#resolveMemoryRegion(address);
    return container[mappedAddress];
  }

  write(address, value) {
    const { mappedAddress, container } = this.#resolveMemoryRegion(address);
    container[mappedAddress] = value;
  }

  static #undefinedRegion = {
    mappedAddress: 0,
    container: ContainerFactory.create({ capacity: 1, bitsPerSlot: 8, initialValue: 0xff })
  };

  static #romBankingRegisterMask = 0x1F;

  /** 5-bit wide */
  #romBankingRegister;

  /** The mask in the GameBoy is only as wide as it's needed to address all of the ROM banks */
  #romBankSelectionMask;

  /** 2-bit wide, some games wire this to the ROM banking register: (ramBankingRegister << 5) | romBankingRegister */
  #ramBankingRegister;

  /** 7-bit wide, extended ROM register, this didn't exist in the GameBoy but might simplify some logic */
  #extendedRomRegister;

  /** Writing 0x~A ('~' meaning any hex char) into 0x0000...0x1FFF enables RAM access */
  #registerRamEnable;

  /** 5-bit wide, used to map a ROM bank to the 0x4000...0x7FFF region */
  #registerRomBankNumber;

  /** 2-bit wide, used to map a RAM bank to the 0xA000...0xBFFF region or as bits 5 and 6 for ROM bank selection */
  #registerRamBankNumber;

  

  /** 
    * 
    */
   
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

  #memoryRegions;
  #extendedRomMode;

  #rom;
  #romBankCount;

  #ram;
  #ramBankCount;

  // TODO: Factor out this shit
  // TODO: Apply effects of #registerBankingModeSelect
  #resolveMemoryAccess(address, value = null) {
    const isWrite = value !== null && value !== undefined;

    if (address >= 0x0000 && address <= 0x1FFF) {
      if (isWrite) {
        this.#registerRamEnable = 0x0A === (value & 0x0F);
      }

      return {};
    }

    if (address >= 0x2000 && address <= 0x3FFF) {
      if (isWrite) {
        this.#registerRomBankNumber = (value & 0x1F) || 0x01;
        // TODO: Computation of registerRamBankNumber might be missing here
        // TODO: Computation of the effective rom bank number might be missing here
      }

      return {};
    }

    if (address >= 0x4000 && address <= 0x5FFF) {
      if (isWrite) {
        this.#registerRamBankNumber = value & 0x03;
      }

      return {};
    }

    if (address >= 0x6000 && address <= 0x7FFF) {
      if (isWrite) {
        this.#registerBankingModeSelect = value & 0x01;
      }

      return {};
    }
  }

  #resolveMemoryRegion(address) {
    let requestedRegion = Mbc1.#undefinedRegion;

    for (const region of this.#memoryRegions) {
      if (region.lowerBound <= address && address <= region.upperBound) {
        requestedRegion = {
          mappedAddress: address - region.lowerBound,
          container: region.resolveContainer(),
        }
      }
    }

    return requestedRegion;
  }

  #handleWriteRamEnable(value) {
    const lsNibble = value & 0x0F;
    const shouldEnableRam = 0x0A === lsNibble;
    // TODO: What changes when RAM is enabled/disabled
  }

  #handleWriteRomBankNumber(value) {
    this.#romBankingRegister = value & 0x1F;

    if (this.#romBankingRegister === 0x00) {
      this.#romBankingRegister = 0x01;
    }
  }
}
