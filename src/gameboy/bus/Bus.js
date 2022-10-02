// eslint-disable-next-line no-unused-vars
import { System } from "@gameboy/system/System";

export class Bus {
  #system;

  /**
   * @param {System} system 
   */
  constructor(system) {
    this.#system = system;
  }

  read(address) {
    // TODO: Should I wrap the requested address (address % 0xFFFF)?
    if (address <= 0x3FFF) return this.#system.cartridge.read(address);
    if (address <= 0x7FFF) return this.#system.cartridge.read(address);
    if (address <= 0x9FFF) return null; // TODO: Resolve VRAM bank (In CGB mode, switchable bank 0/1)
    if (address <= 0xBFFF) return this.#system.cartridge.read(address);
    if (address <= 0xCFFF) return null; // TODO: Resolve WRAM bank 00
    if (address <= 0xDFFF) return null; // TODO: Resolve WRAM bank NN (In CGB mode, switchable bank 1...7)
    if (address <= 0xFDFF) return null; // TODO: Mirror 0xC000...0xDDFF
    if (address <= 0xFE9F) return this.#system.oam;
    if (address <= 0xFEFF) return this.#system.fmem;
    if (address <= 0xFF7F) return this.#system.ior;
    if (address <= 0xFFFE) return this.#system.hram;
    if (address <= 0xFFFF) return this.#system.ier;
    // TODO: Out out address space, is this possible?
    console.log(`Requested memory is outside of the 16-bit address space`);
    return 0xFF;
  }

  write(address, value) {
    // TODO: Should I wrap the requested address (address % 0xFFFF)?
         if (address <= 0x3FFF) this.#system.cartridge.write(address, value);
    else if (address <= 0x7FFF) this.#system.cartridge.write(address, value);
    else if (address <= 0x9FFF) null; // TODO: Resolve VRAM bank (In CGB, value mode, switchable bank 0/1)
    else if (address <= 0xBFFF) this.#system.cartridge.write(address, value);
    else if (address <= 0xCFFF) null; // TODO: Resolve WRAM bank 00
    else if (address <= 0xDFFF) null; // TODO: Resolve WRAM bank NN (In CGB mode, switchable bank 1...7)
    else if (address <= 0xFDFF) null; // TODO: Mirror 0xC000...0xDDFF
    else if (address <= 0xFE9F) this.#system.oam;
    else if (address <= 0xFEFF) this.#system.fmem;
    else if (address <= 0xFF7F) this.#system.ior;
    else if (address <= 0xFFFE) this.#system.hram;
    else if (address <= 0xFFFF) this.#system.ier;
    // TODO: Out out address space, is this possible?
  }
}
