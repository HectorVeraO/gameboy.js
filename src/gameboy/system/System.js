import { ContainerFactory } from "@common/ContainerFactory";
import { byte, KiB } from "@common/InformationUnitConstants";

/**
 * GameBoy SoC representation (plus the Work RAM and Video RAM for convenience)
 * 
 * Specifications: https://gbdev.io/pandocs/Specifications.html
 */
export class System {
  static bitsPerWord = 8;

  cartridge = null;

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
  }

  static #createMemory(capacity) {
    return ContainerFactory.create({ capacity: capacity, bitsPerSlot: System.#bitsPerWord });
  }
}