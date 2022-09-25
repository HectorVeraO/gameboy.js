import { ContainerFactory } from '@common/ContainerFactory';
import { KiB } from '@common/InformationUnitConstants';

/**
 * 32 KiB ROM only
 * See: https://gbdev.io/pandocs/nombc.html
 */
export class NoMbc {
  constructor() {
    this.#rom = ContainerFactory.create({ capacity: 32 * KiB, bitsPerSlot: 8 });
    this.#ram = ContainerFactory.create({ capacity: 8 * KiB, bitsPerSlot: 8 }); // TODO: Optional

    this.#memoryRegions = [
      { lowerBound: 0x0000, upperBound: 0x7FFF, container: this.#rom },
      { lowerBound: 0xA000, upperBound: 0xBFFF, container: this.#ram },
    ];
  }

  read(address) {
    const { container, mappedAddress } = this.#resolveMemoryRegion(address);
    return container[mappedAddress];
  }

  write(address, value) {
    const { container, mappedAddress } = this.#resolveMemoryRegion(address);
    container[mappedAddress] = value;
  }

  static #undefinedRegion = {
    mappedAddress: 0,
    container: ContainerFactory.create({ capacity: 1, bitsPerSlot: 8, initialValue: 0xff })
  };

  #rom;
  #ram;
  #memoryRegions;

  #resolveMemoryRegion(address) {
    let requestedRegion = NoMbc.#undefinedRegion;

    for (const region of this.#memoryRegions) {
      if (region.lowerBound <= address && address <= region.upperBound) {
        requestedRegion = {
          mappedAddress: address - region.lowerBound,
          container: region.container,
        };
      }
    }
    
    return requestedRegion;
  }
}
