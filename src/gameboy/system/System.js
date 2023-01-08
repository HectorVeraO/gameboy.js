import { ContainerFactory } from "@common/ContainerFactory";
import { byte, KiB } from "@common/constants/InformationUnits";
import { Cpu } from "@gameboy/cpu/Cpu";
import { Cartridge } from "@gameboy/cartridge/Cartridge";
import { Ppu } from "@gameboy/ppu/Ppu";
import { Joypad } from "@gameboy/io/Joypad";
import { LinkController } from "@gameboy/io/LinkController";
import { TimeController } from "@gameboy/io/TimeController";
import { Apu } from "@gameboy/apu/Apu";
import { hexStr } from "@common/Number";

/**
 * GameBoy SoC representation (plus the Work RAM and Video RAM for convenience)
 * 
 * Specifications: https://gbdev.io/pandocs/Specifications.html
 */
export class System {
  static bitsPerWord = 8;

  /** @type {Cartridge} */
  cartridge = { read: () => 0xFF, write: (address, byte) => {} }; // FIXME: Handle as "Empty Cartridge"

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

  /** Interrupt Enable register (IE), mapped to 0xFFFF */
  ier = System.#createMemory(0x0001 * byte);

  /** Interrupt flag (IF), allows to  request an interrupt, mapped to 0xFF0F */
  ifr = System.#createMemory(0x0001 * byte);
  
  constructor() {
    const memoryPins = { read: this.#readMemory, write: this.#writeMemory };

    this.#cpu = new Cpu(memoryPins);
    this.#ppu = new Ppu(memoryPins);
    this.#joypad = new Joypad(memoryPins);
    this.#linkController = new LinkController(memoryPins);
    this.#timeController = new TimeController(memoryPins);
    this.#apu = new Apu(memoryPins);

    const toMemoryGuard = (device) => ({
      name: device.constructor.name,
      guardRead: device.guardRead.bind(device),
      guardWrite: device.guardWrite.bind(device)
    });

    this.#memoryGuards = [ this.#cpu, this.#ppu, this.#joypad, this.#linkController, this.#timeController, this.#apu ].map(toMemoryGuard);
  }

  power() {
    this.reset();
  }

  reset() {
    this.#cpu.reset();
    this.#ppu.reset();
  }

  clock() {
    const tStates = this.#cpu.step();
    const maybeFramebuffer = this.#ppu.performDots(tStates);
    const mStates = tStates / 4;
    return maybeFramebuffer;
    // TODO: Wait time
  }

  loadCartridge(bytes) {
    if (!bytes) {
      console.warn('Cartridge data missing');
      return;
    }
    this.cartridge = new Cartridge(bytes);
    this.reset();
  }

  unloadCartridge() {
    this.cartridge = new Cartridge(new Uint8Array(0)) // FIXME: Handle as "Empty Cartridge"
    // TODO: Reset?
  }

  #readMemory = (address) => {
    const boundedAddress = address & 0xFFFF;
    
    // TODO: Unroll this loop and target specific regions to optimize IO reads
    for (const device of this.#memoryGuards) {
      const deviceByte = device.guardRead(boundedAddress);
      if (deviceByte) {
        console.log(`${device.name} handled read on ${hexStr(boundedAddress, '$', 2)} got ${hexStr(byte, '$', 2)}`);
        return deviceByte;
      }
    }

    if (boundedAddress < 0x4000)
      return this.cartridge.read(boundedAddress);
    
    if (boundedAddress < 0x8000)
      return this.cartridge.read(boundedAddress);
    
    if (boundedAddress < 0xA000)
      return this.cartridge.read(boundedAddress);
    
    if (boundedAddress < 0xC000)
      return this.cartridge.read(boundedAddress);

    if (boundedAddress < 0xD000)
      return this.cartridge.read(boundedAddress);

    if (boundedAddress < 0xE000)
      return this.cartridge.read(boundedAddress);

    if (boundedAddress < 0xFE00)
      return this.cartridge.read(boundedAddress - (0xE000 - 0xC000)); // Mirror from 0xC000 to 0xDDFF

    if (boundedAddress < 0xFEA0)
      return this.oam[boundedAddress - 0xFE00];

    if (boundedAddress < 0xFF00)
      return this.fmem[boundedAddress - 0xFEA0]; // Nintendo says use of this area is prohibited

    if (boundedAddress === 0xFF0F)
      return this.ifr[0];

    if (boundedAddress < 0xFF80)
      return this.ior[boundedAddress - 0xFF00];

    if (boundedAddress < 0xFFFF)
      return this.hram[boundedAddress - 0xFF80];

    if (boundedAddress === 0xFFFF)
      return this.ier[0];
  }

  #writeMemory = (address, byte) => {
    const boundedAddress = address & 0xFFFF;

    // TODO: Unroll this loop and target specific regions to optimize IO writes
    for (const device of this.#memoryGuards) {
      if (device.guardWrite(address, byte)) {
        console.log(`${device.name} handled write of ${hexStr(byte, '$', 2)} on ${hexStr(boundedAddress, '$', 2)}`);
        return;
      }
    }

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
      this.fmem[boundedAddress - 0xFEA0]; // Nintendo says use of this area is prohibited = byted

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

  /** @type {Cpu} */
  #cpu;

  /** @type {Ppu} */
  #ppu;

  /** @type {Apu} */
  #apu;

  /** @type {Joypad} */
  #joypad;
  
  /** @type {LinkController} */
  #linkController;

  /** @type {TimeController} */
  #timeController;

  /** @type {{ name: string, guardRead: (address: uint16) => uint8 | null, guardWrite: (address: uint16, byte: uint8) => boolean }[]} */
  #memoryGuards;
}
