import { ContainerFactory } from "@common/ContainerFactory";
import { byte, KiB } from "@common/constants/InformationUnits";
import { SharpLR35902 } from "@gameboy/cpu/Cpu";
import { Cartridge } from "@gameboy/cartridge/Cartridge";

/**
 * GameBoy SoC representation (plus the Work RAM and Video RAM for convenience)
 * 
 * Specifications: https://gbdev.io/pandocs/Specifications.html
 */
export class System {
  static bitsPerWord = 8;

  cartridge = new Cartridge(new Uint8Array(0)); // FIXME: Handle as "Empty Cartridge"

  cpu;

  ppu;

  apu;

  /** Video RAM */
  vram = System.#createMemory(16 * KiB);

  /** Work RAM */
  wram = System.#createMemory(32 * KiB);

  /** Echo RAM */
  eram = System.#createMemory(0x1E00 * byte); // TODO: Confirm, memory mapped from 0xE000 to 0xFDFF

  /** High RAM */
  hram = System.#createMemory(0x007F * byte); // TODO: Confirm, memory mapped from 0xFF80 to 0xFFFE

  /** Object attribute memory (Sprite attribute table) */
  oam = System.#createMemory(0x00A0 * byte); // TODO: Confirm, memory mapped from 0xFE00 to 0xFE9F

  /** I/O registers */
  ior = System.#createMemory(0x0080 * byte); // TODO: Confirm, memory mapped from 0xFF00 to 0xFF7F

  /** Forbidden memory (Nintendo says use of this area is prohibited) */
  fmem = System.#createMemory(0x0060 * byte); // TODO: Confirm, memory mapped from 0xFEA0 to 0xFEFF

  /** Interrupt Enable register (IE) */
  ier = System.#createMemory(0x0001 * byte);
  
  constructor() {
    this.cpu = new SharpLR35902(this.#readMemory, this.#writeMemory);
  }

  #readMemory(address) {
    const boundedAddress = address & 0xFFFF;

    if (boundedAddress < 0x4000)
      return this.cartridge.read(address);
    
    if (boundedAddress < 0x8000)
      return this.cartridge.read(address);
    
    if (boundedAddress < 0xA000)
      return this.cartridge.read(address);
    
    if (boundedAddress < 0xC000)
      return this.cartridge.read(address);

    if (boundedAddress < 0xD000)
      return this.cartridge.read(address);

    if (boundedAddress < 0xE000)
      return this.cartridge.read(address);

    if (boundedAddress < 0xFE00)
      return this.cartridge.read(boundedAddress - (0xE000 - 0xC000)); // Mirror from 0xC000 to 0xDDFF

    if (boundedAddress < 0xFEA0)
      return this.oam[boundedAddress - 0xFE00];

    if (boundedAddress < 0xFF00)
      return this.fmem[boundedAddress - 0xFEA0]; // Nintendo says use of this area is prohibited

    if (boundedAddress < 0xFF80)
      return this.ior[boundedAddress - 0xFF00];

    if (boundedAddress < 0xFFFF)
      return this.hram[boundedAddress - 0xFF80];

    if (boundedAddress === 0xFFFF)
      return this.ier[0];
  }

  #writeMemory(address, byte) {
    const boundedAddress = address & 0xFFFF;

    if (boundedAddress < 0x4000)
      this.cartridge.write(address, byte);
    
    else if (boundedAddress < 0x8000)
      this.cartridge.write(address, byte);
    
    else if (boundedAddress < 0xA000)
      this.cartridge.write(address, byte);
    
    else if (boundedAddress < 0xC000)
      this.cartridge.write(address, byte);

    else if (boundedAddress < 0xD000)
      this.cartridge.write(address, byte);

    else if (boundedAddress < 0xE000)
      this.cartridge.write(address, byte);

    else if (boundedAddress < 0xFE00)
      this.cartridge.write(boundedAddress - (0xE000 - 0xC000), byte); // Mirror from 0xC000 to 0xDDF = byteF

    else if (boundedAddress < 0xFEA0)
      this.oam[boundedAddress - 0xFE00] = byte;

    else if (boundedAddress < 0xFF00)
      this.fmem[boundedAddress - 0xFEA0]; // Nintendo says use of this area is prohibite = byted

    else if (boundedAddress < 0xFF80)
      this.ior[boundedAddress - 0xFF00] = byte;

    else if (boundedAddress < 0xFFFF)
      this.hram[boundedAddress - 0xFF80] = byte;

    else if (boundedAddress === 0xFFFF)
      this.ier[0] = byte;
  }

  static #bitsPerWord = 8;

  static #createMemory(capacity) {
    return ContainerFactory.create({ capacity: capacity, bitsPerSlot: System.#bitsPerWord });
  }
}
