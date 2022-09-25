import { ContainerFactory } from "@common/ContainerFactory";
import { MiB } from "@common/InformationUnitConstants";
import { RAM_BANK_CAPACITY, RAM_SIZES } from "@gameboy/constants/RamSizes";
import { ROM_BANK_CAPACITY, ROM_SIZES } from "@gameboy/constants/RomSizes";

/**
 * Max 2MB ROM and/or 32 KiB RAM
 * See: https://gbdev.io/pandocs/MBC1.html
 */
export class Mbc1 {
  constructor(header) {
    const romBankCount = ROM_SIZES[header.romSize];
    this.#romBanks = Mbc1.#createMemoryBanks(romBankCount, ROM_BANK_CAPACITY);

    const isRamBankingRegisterWiredtoRom = 1 * MiB <= (romBankCount * ROM_BANK_CAPACITY);
    const ramBankCount = isRamBankingRegisterWiredtoRom ? 1 : RAM_SIZES[header.ramSize];
    this.#ramBanks = Mbc1.#createMemoryBanks(ramBankCount, RAM_BANK_CAPACITY);


    this.#memoryRegions = [
      { lowerBound: 0x0000, upperBound: 0x7FFF, resolveContainer: () => this.#resolveRomBank() },
      { lowerBound: 0xA000, upperBound: 0xBFFF, resolveContainer: () => this.#resolveRamBank() },
    ];
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

  #romBanks;
  #ramBanks;
  #memoryRegions;

  static #createMemoryBank(capacity) {
    return ContainerFactory.create({ capacity: capacity, bitsPerSlot: 8 });
  }

  static #createMemoryBanks(bankCount, capacity) {
    return Array.from({ length: bankCount }, () => Mbc1.#createMemoryBank(capacity));
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

  #resolveRomBank() {
    return this.#romBanks[0]; // TODO: Implement
  }

  #resolveRamBank() {
    return this.#ramBanks[0]; // TODO: Implement
  }
}
