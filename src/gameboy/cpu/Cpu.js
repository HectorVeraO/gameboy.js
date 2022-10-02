import { assertType } from "@common/Control";
import { hexStr } from "@common/Number";
import { Instruction } from "./Instruction";
import { Register8 } from "./registers/Register8";
import { RegisterF } from "./registers/RegisterF";

/**
 * Actual name is SharpLR35902
 * https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 */
export class Cpu {
  constructor() {

  }

  step() {
    const opcode = this.opcode();
    const instruction = this.decode(opcode);
    assertType(instruction, Instruction, `No instruction defined for opcode ${hexStr(opcode)}`);

    this.#cyclesLeft = instruction.cycles;
    while (this.#cyclesLeft >= 0) {
      this.clock();
    }
  }

  clock() {
    if (this.#cyclesLeft > 0) {
      this.#cyclesLeft--;
      return;
    }
    
    const opcode = this.opcode();
    const instruction = this.decode(opcode);
    instruction.execute();
  }

  read(address) {

  }

  write(address, value) {

  }

  /**
   * Fetches the value pointed by PC (does not advance the program counter)
   * @returns {number} opcode or operand
   */
  idle() {
    return this.read(this.#PC);
  }

  /**
   * Fetches the value pointed by PC
   * @returns {number} opcode or operand
   */
  opcode() {
    return this.read(this.#PC++);
  }

  operand() {
    return this.read(this.#PC++);
  }

  /**
   * 
   * @param {number} opcode 
   * @returns {Instruction}
   */
  decode(opcode) {
    return this.#instructionByOpcode[opcode];
  }

  //#region State (not from spec)

  #cycleCount;

  #cyclesLeft;


  //#endregion

  #instructionByOpcode = {};

  //#region 8-bit registers

  #A = new Register8();
  #B = new Register8();
  #C = new Register8();
  #D = new Register8();
  #E = new Register8();
  #H = new Register8();
  #L = new Register8();
  #F = new RegisterF();

  //#endregion

  //#region 16-bit registers

  /** Stack pointer */
  #SP;

  /** Program counter */
  #PC;
  //#endregion

  //#region Composed registers

  /** Accumulator and flags, high byte = A and low byte = F */
  get #AF() {
    return (this.#A << 8) | this.#F;
  }

  /** BD, high byte = B and low byte = C */
  get #BC() {
    return (this.#B << 8) | this.#C;
  }

  /** DE, high byte = D and low byte = E */
  get #DE() {
    return (this.#D << 8) | this.#E;
  }

  get #HL() {
    return (this.#H << 8) | this.#L;
  }

  set #AF(word) {
    this.#A = word & 0xFF00;
    this.#F = word & 0x00FF;
  }

  set #BC(word) {
    this.#B = word & 0xFF00;
    this.#C = word & 0x00FF;
  }

  set #DE(word) {
    this.#D = word & 0xFF00;
    this.#E = word & 0x00FF;
  }

  set #HL(word) {
    this.#H = word & 0xFF00;
    this.#L = word & 0x00FF;
  }

  //#endregion

  //#region Instruction set

  //#region 8-bit Load/Store/Move instructions

  #getLSM8bitInstructions() {
    const implementationOf = this.#getLSM8bitImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x02, cycles: 8 , mnemonic: 'LD (BC), A' , byteLength: 1, fn: implementationOf[0x02] }),
      new Instruction({ opcode: 0x06, cycles: 8 , mnemonic: 'LD B, d8'   , byteLength: 2, fn: implementationOf[0x06] }),
      new Instruction({ opcode: 0x0A, cycles: 8 , mnemonic: 'LD A, (BC)' , byteLength: 1, fn: implementationOf[0x0A] }),
      new Instruction({ opcode: 0x0E, cycles: 8 , mnemonic: 'LD C, d8'   , byteLength: 2, fn: implementationOf[0x0E] }),
      new Instruction({ opcode: 0x16, cycles: 8 , mnemonic: 'LD D, d8'   , byteLength: 2, fn: implementationOf[0x16] }),
      new Instruction({ opcode: 0x1A, cycles: 8 , mnemonic: 'LD A, (DE)' , byteLength: 1, fn: implementationOf[0x1A] }),
      new Instruction({ opcode: 0x1E, cycles: 8 , mnemonic: 'LD E, d8'   , byteLength: 2, fn: implementationOf[0x1E] }),
      new Instruction({ opcode: 0x22, cycles: 8 , mnemonic: 'LD (HL+), A', byteLength: 1, fn: implementationOf[0x22] }),
      new Instruction({ opcode: 0x26, cycles: 8 , mnemonic: 'LD H, d8'   , byteLength: 2, fn: implementationOf[0x26] }),
      new Instruction({ opcode: 0x2A, cycles: 8 , mnemonic: 'LD A, (HL+)', byteLength: 1, fn: implementationOf[0x2A] }),
      new Instruction({ opcode: 0x2E, cycles: 8 , mnemonic: 'LD L, d8'   , byteLength: 2, fn: implementationOf[0x2E] }),
      new Instruction({ opcode: 0x32, cycles: 8 , mnemonic: 'LD (HL-), A', byteLength: 1, fn: implementationOf[0x32] }),
      new Instruction({ opcode: 0x36, cycles: 12, mnemonic: 'LD (HL), d8', byteLength: 2, fn: implementationOf[0x36] }),
      new Instruction({ opcode: 0x3A, cycles: 8 , mnemonic: 'LD A, (HL-)', byteLength: 1, fn: implementationOf[0x3A] }),
      new Instruction({ opcode: 0x3E, cycles: 8 , mnemonic: 'LD A, d8'   , byteLength: 2, fn: implementationOf[0x3E] }),
      new Instruction({ opcode: 0x40, cycles: 4 , mnemonic: 'LD B, B'    , byteLength: 1, fn: implementationOf[0x40] }),
      new Instruction({ opcode: 0x41, cycles: 4 , mnemonic: 'LD B, C'    , byteLength: 1, fn: implementationOf[0x41] }),
      new Instruction({ opcode: 0x42, cycles: 4 , mnemonic: 'LD B, D'    , byteLength: 1, fn: implementationOf[0x42] }),
      new Instruction({ opcode: 0x43, cycles: 4 , mnemonic: 'LD B, E'    , byteLength: 1, fn: implementationOf[0x43] }),
      new Instruction({ opcode: 0x44, cycles: 4 , mnemonic: 'LD B, H'    , byteLength: 1, fn: implementationOf[0x44] }),
      new Instruction({ opcode: 0x45, cycles: 4 , mnemonic: 'LD B, L'    , byteLength: 1, fn: implementationOf[0x45] }),
      new Instruction({ opcode: 0x46, cycles: 8 , mnemonic: 'LD B, (HL)' , byteLength: 1, fn: implementationOf[0x40] }),
      new Instruction({ opcode: 0x47, cycles: 4 , mnemonic: 'LD B, A'    , byteLength: 1, fn: implementationOf[0x47] }),
      new Instruction({ opcode: 0x48, cycles: 4 , mnemonic: 'LD C, B'    , byteLength: 1, fn: implementationOf[0x48] }),
      new Instruction({ opcode: 0x49, cycles: 4 , mnemonic: 'LD C, C'    , byteLength: 1, fn: implementationOf[0x49] }),
      new Instruction({ opcode: 0x4A, cycles: 4 , mnemonic: 'LD C, D'    , byteLength: 1, fn: implementationOf[0x4A] }),
      new Instruction({ opcode: 0x4B, cycles: 4 , mnemonic: 'LD C, E'    , byteLength: 1, fn: implementationOf[0x4B] }),
      new Instruction({ opcode: 0x4C, cycles: 4 , mnemonic: 'LD C, H'    , byteLength: 1, fn: implementationOf[0x4C] }),
      new Instruction({ opcode: 0x4D, cycles: 4 , mnemonic: 'LD C, L'    , byteLength: 1, fn: implementationOf[0x4D] }),
      new Instruction({ opcode: 0x4E, cycles: 8 , mnemonic: 'LD C, (HL)' , byteLength: 1, fn: implementationOf[0x4E] }),
      new Instruction({ opcode: 0x4F, cycles: 4 , mnemonic: 'LD C, A'    , byteLength: 1, fn: implementationOf[0x4F] }),
      new Instruction({ opcode: 0x50, cycles: 4 , mnemonic: 'LD D, B'    , byteLength: 1, fn: implementationOf[0x50] }),
      new Instruction({ opcode: 0x51, cycles: 4 , mnemonic: 'LD D, C'    , byteLength: 1, fn: implementationOf[0x51] }),
      new Instruction({ opcode: 0x52, cycles: 4 , mnemonic: 'LD D, D'    , byteLength: 1, fn: implementationOf[0x52] }),
      new Instruction({ opcode: 0x53, cycles: 4 , mnemonic: 'LD D, E'    , byteLength: 1, fn: implementationOf[0x53] }),
      new Instruction({ opcode: 0x54, cycles: 4 , mnemonic: 'LD D, H'    , byteLength: 1, fn: implementationOf[0x54] }),
      new Instruction({ opcode: 0x55, cycles: 4 , mnemonic: 'LD D, L'    , byteLength: 1, fn: implementationOf[0x55] }),
      new Instruction({ opcode: 0x56, cycles: 8 , mnemonic: 'LD D, (HL)' , byteLength: 1, fn: implementationOf[0x56] }),
      new Instruction({ opcode: 0x57, cycles: 4 , mnemonic: 'LD D, A'    , byteLength: 1, fn: implementationOf[0x57] }),
      new Instruction({ opcode: 0x58, cycles: 4 , mnemonic: 'LD E, B'    , byteLength: 1, fn: implementationOf[0x58] }),
      new Instruction({ opcode: 0x59, cycles: 4 , mnemonic: 'LD E, C'    , byteLength: 1, fn: implementationOf[0x59] }),
      new Instruction({ opcode: 0x5A, cycles: 4 , mnemonic: 'LD E, D'    , byteLength: 1, fn: implementationOf[0x5A] }),
      new Instruction({ opcode: 0x5B, cycles: 4 , mnemonic: 'LD E, E'    , byteLength: 1, fn: implementationOf[0x5B] }),
      new Instruction({ opcode: 0x5C, cycles: 4 , mnemonic: 'LD E, H'    , byteLength: 1, fn: implementationOf[0x5C] }),
      new Instruction({ opcode: 0x5D, cycles: 4 , mnemonic: 'LD E, L'    , byteLength: 1, fn: implementationOf[0x5D] }),
      new Instruction({ opcode: 0x5E, cycles: 8 , mnemonic: 'LD E, (HL)' , byteLength: 1, fn: implementationOf[0x5E] }),
      new Instruction({ opcode: 0x5F, cycles: 4 , mnemonic: 'LD E, A'    , byteLength: 1, fn: implementationOf[0x5F] }),
      new Instruction({ opcode: 0x60, cycles: 4 , mnemonic: 'LD H, B'    , byteLength: 1, fn: implementationOf[0x60] }),
      new Instruction({ opcode: 0x61, cycles: 4 , mnemonic: 'LD H, C'    , byteLength: 1, fn: implementationOf[0x61] }),
      new Instruction({ opcode: 0x62, cycles: 4 , mnemonic: 'LD H, D'    , byteLength: 1, fn: implementationOf[0x62] }),
      new Instruction({ opcode: 0x63, cycles: 4 , mnemonic: 'LD H, E'    , byteLength: 1, fn: implementationOf[0x63] }),
      new Instruction({ opcode: 0x64, cycles: 4 , mnemonic: 'LD H, H'    , byteLength: 1, fn: implementationOf[0x64] }),
      new Instruction({ opcode: 0x65, cycles: 4 , mnemonic: 'LD H, L'    , byteLength: 1, fn: implementationOf[0x65] }),
      new Instruction({ opcode: 0x66, cycles: 8 , mnemonic: 'LD H, (HL)' , byteLength: 1, fn: implementationOf[0x66] }),
      new Instruction({ opcode: 0x67, cycles: 4 , mnemonic: 'LD H, A'    , byteLength: 1, fn: implementationOf[0x67] }),
      new Instruction({ opcode: 0x68, cycles: 4 , mnemonic: 'LD L, B'    , byteLength: 1, fn: implementationOf[0x68] }),
      new Instruction({ opcode: 0x69, cycles: 4 , mnemonic: 'LD L, C'    , byteLength: 1, fn: implementationOf[0x69] }),
      new Instruction({ opcode: 0x6A, cycles: 4 , mnemonic: 'LD L, D'    , byteLength: 1, fn: implementationOf[0x6A] }),
      new Instruction({ opcode: 0x6B, cycles: 4 , mnemonic: 'LD L, E'    , byteLength: 1, fn: implementationOf[0x6B] }),
      new Instruction({ opcode: 0x6C, cycles: 4 , mnemonic: 'LD L, H'    , byteLength: 1, fn: implementationOf[0x6C] }),
      new Instruction({ opcode: 0x6D, cycles: 4 , mnemonic: 'LD L, L'    , byteLength: 1, fn: implementationOf[0x6D] }),
      new Instruction({ opcode: 0x6E, cycles: 4 , mnemonic: 'LD L, (HL)' , byteLength: 1, fn: implementationOf[0x6E] }),
      new Instruction({ opcode: 0x6F, cycles: 4 , mnemonic: 'LD L, A'    , byteLength: 1, fn: implementationOf[0x6F] }),
      new Instruction({ opcode: 0xE0, cycles: 12, mnemonic: 'LDH (a8), A', byteLength: 2, fn: implementationOf[0xE0] }),
      new Instruction({ opcode: 0xE2, cycles: 8 , mnemonic: 'LD (C), A'  , byteLength: 2, fn: implementationOf[0xE2] }),
      new Instruction({ opcode: 0xEA, cycles: 16, mnemonic: 'LD (a16), A', byteLength: 3, fn: implementationOf[0xEA] }),
      new Instruction({ opcode: 0xF0, cycles: 12, mnemonic: 'LDH A, (a8)', byteLength: 2, fn: implementationOf[0xF0] }),
      new Instruction({ opcode: 0xF2, cycles: 8 , mnemonic: 'LD A, (C)'  , byteLength: 2, fn: implementationOf[0xF2] }),
    ];

    return instructions;
  }

  //#endregion


  //#region Opcode implementation

  #getLSM8bitImplementationByOpcode() {
    const algs = {};
    algs.loadMemory = (address, value) => this.write(address, value);
    algs.loadHram = (lowByte, value) => this.write(0xFF00 | lowByte, value);
    algs.loadA = (value) => this.#A = value;
    algs.loadB = (value) => this.#B = value;
    algs.loadC = (value) => this.#C = value;
    algs.loadD = (value) => this.#D = value;
    algs.loadH = (value) => this.#H = value;
    algs.loadE = (value) => this.#E = value;
    algs.loadL = (value) => this.#L = value;
    algs.loadF = (value) => this.#F = value;

    algs.readHram = (lowByte) => this.read(0xFF00 | lowByte);
    
    algs.readBC = () => this.read(this.#BC);
    algs.readDE = () => this.read(this.#DE);
    algs.readHL = () => this.read(this.#HL);

    algs.loadBC = (value) => this.write(this.#BC, value);
    algs.loadDE = (value) => this.write(this.#DE, value);
    algs.loadHL = (value) => this.write(this.#HL, value);

    algs.decrementBC = () => this.#BC--;
    algs.decrementDE = () => this.#DE--;
    algs.decrementHL = () => this.#HL--;

    algs.incrementBC = () => this.#BC++;
    algs.incrementDE = () => this.#DE++;
    algs.incrementHL = () => this.#HL++;
    return {
      0x00: () => {

      },
    }
  }

  //#endregion
}

export const SharpLR35902 = Cpu;
