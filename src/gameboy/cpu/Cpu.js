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


  //#region 16-bit Load/Store/Move instructions

  #getLSM16bitInstructions() {
    const implementationOf = this.#getLSM16bitImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x01, cycles: 12, mnemonic: 'LD BC, d16'    , byteLength: 3, fn: implementationOf[0x01] }),
      new Instruction({ opcode: 0x08, cycles: 20, mnemonic: 'LD (a16), SP'  , byteLength: 3, fn: implementationOf[0x08] }),
      new Instruction({ opcode: 0x11, cycles: 12, mnemonic: 'LD DE, d16'    , byteLength: 3, fn: implementationOf[0x11] }),
      new Instruction({ opcode: 0x21, cycles: 12, mnemonic: 'LD DE, d16'    , byteLength: 3, fn: implementationOf[0x21] }),
      new Instruction({ opcode: 0x31, cycles: 12, mnemonic: 'LD DE, d16'    , byteLength: 3, fn: implementationOf[0x31] }),
      new Instruction({ opcode: 0xC1, cycles: 12, mnemonic: 'POP BC'        , byteLength: 1, fn: implementationOf[0xC1] }),
      new Instruction({ opcode: 0xD1, cycles: 12, mnemonic: 'POP DE'        , byteLength: 1, fn: implementationOf[0xD1] }),
      new Instruction({ opcode: 0xE1, cycles: 12, mnemonic: 'POP HL'        , byteLength: 1, fn: implementationOf[0xE1] }),
      new Instruction({ opcode: 0xF1, cycles: 12, mnemonic: 'POP AF'        , byteLength: 1, fn: implementationOf[0xF1] }),
      new Instruction({ opcode: 0xC5, cycles: 16, mnemonic: 'PUSH BC'       , byteLength: 1, fn: implementationOf[0xC5] }),
      new Instruction({ opcode: 0xD5, cycles: 16, mnemonic: 'PUSH BC'       , byteLength: 1, fn: implementationOf[0xD5] }),
      new Instruction({ opcode: 0xE5, cycles: 16, mnemonic: 'PUSH BC'       , byteLength: 1, fn: implementationOf[0xE5] }),
      new Instruction({ opcode: 0xF5, cycles: 16, mnemonic: 'PUSH BC'       , byteLength: 1, fn: implementationOf[0xF5] }),
      new Instruction({ opcode: 0xF8, cycles: 12, mnemonic: 'LD HL, SP + r8', byteLength: 2, fn: implementationOf[0xF8] }),
      new Instruction({ opcode: 0xF9, cycles: 8 , mnemonic: 'LD SP, HL'     , byteLength: 1, fn: implementationOf[0xF9] }),
    ];

    return instructions;
  }

  //#endregion

  //#region 8-bit Arithmetic instructions

  #getAL8bitInstructions() {
    const implementationOf = this.#getAL8bitImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x04, cycles: 4 , mnemonic: 'INC B'      , byteLength: 1, fn: implementationOf[0x04] }),
      new Instruction({ opcode: 0x14, cycles: 4 , mnemonic: 'INC D'      , byteLength: 1, fn: implementationOf[0x14] }),
      new Instruction({ opcode: 0x24, cycles: 4 , mnemonic: 'INC H'      , byteLength: 1, fn: implementationOf[0x24] }),
      new Instruction({ opcode: 0x34, cycles: 12, mnemonic: 'INC (HL)'   , byteLength: 1, fn: implementationOf[0x34] }),
      new Instruction({ opcode: 0x05, cycles: 4 , mnemonic: 'DEC B'      , byteLength: 1, fn: implementationOf[0x05] }),
      new Instruction({ opcode: 0x15, cycles: 4 , mnemonic: 'DEC D'      , byteLength: 1, fn: implementationOf[0x15] }),
      new Instruction({ opcode: 0x25, cycles: 4 , mnemonic: 'DEC H'      , byteLength: 1, fn: implementationOf[0x25] }),
      new Instruction({ opcode: 0x35, cycles: 12, mnemonic: 'DEC (HL)'   , byteLength: 1, fn: implementationOf[0x35] }),
      new Instruction({ opcode: 0x27, cycles: 4 , mnemonic: 'DAA'        , byteLength: 1, fn: implementationOf[0x27] }),
      new Instruction({ opcode: 0x37, cycles: 4 , mnemonic: 'SCF'        , byteLength: 1, fn: implementationOf[0x37] }),
      new Instruction({ opcode: 0x0C, cycles: 4 , mnemonic: 'INC C'      , byteLength: 1, fn: implementationOf[0x0C] }),
      new Instruction({ opcode: 0x1C, cycles: 4 , mnemonic: 'INC E'      , byteLength: 1, fn: implementationOf[0x1C] }),
      new Instruction({ opcode: 0x2C, cycles: 4 , mnemonic: 'INC L'      , byteLength: 1, fn: implementationOf[0x2C] }),
      new Instruction({ opcode: 0x3C, cycles: 4 , mnemonic: 'INC A'      , byteLength: 1, fn: implementationOf[0x3C] }),
      new Instruction({ opcode: 0x0D, cycles: 4 , mnemonic: 'DEC C'      , byteLength: 1, fn: implementationOf[0x0D] }),
      new Instruction({ opcode: 0x1D, cycles: 4 , mnemonic: 'DEC E'      , byteLength: 1, fn: implementationOf[0x1D] }),
      new Instruction({ opcode: 0x2D, cycles: 4 , mnemonic: 'DEC L'      , byteLength: 1, fn: implementationOf[0x2D] }),
      new Instruction({ opcode: 0x3D, cycles: 4 , mnemonic: 'DEC A'      , byteLength: 1, fn: implementationOf[0x3D] }),
      new Instruction({ opcode: 0x2F, cycles: 4 , mnemonic: 'CPL'        , byteLength: 1, fn: implementationOf[0x2F] }),
      new Instruction({ opcode: 0x3F, cycles: 4 , mnemonic: 'CCF'        , byteLength: 1, fn: implementationOf[0x3F] }),
      new Instruction({ opcode: 0x80, cycles: 4 , mnemonic: 'ADD A, B'   , byteLength: 1, fn: implementationOf[0x80] }),
      new Instruction({ opcode: 0x81, cycles: 4 , mnemonic: 'ADD A, C'   , byteLength: 1, fn: implementationOf[0x81] }),
      new Instruction({ opcode: 0x82, cycles: 4 , mnemonic: 'ADD A, D'   , byteLength: 1, fn: implementationOf[0x82] }),
      new Instruction({ opcode: 0x83, cycles: 4 , mnemonic: 'ADD A, E'   , byteLength: 1, fn: implementationOf[0x83] }),
      new Instruction({ opcode: 0x84, cycles: 4 , mnemonic: 'ADD A, H'   , byteLength: 1, fn: implementationOf[0x84] }),
      new Instruction({ opcode: 0x85, cycles: 4 , mnemonic: 'ADD A, L'   , byteLength: 1, fn: implementationOf[0x85] }),
      new Instruction({ opcode: 0x86, cycles: 8 , mnemonic: 'ADD A, (HL)', byteLength: 1, fn: implementationOf[0x86] }),
      new Instruction({ opcode: 0x87, cycles: 4 , mnemonic: 'ADD A, A'   , byteLength: 1, fn: implementationOf[0x87] }),
      new Instruction({ opcode: 0x88, cycles: 4 , mnemonic: 'ADC A, B'   , byteLength: 1, fn: implementationOf[0x88] }),
      new Instruction({ opcode: 0x89, cycles: 4 , mnemonic: 'ADC A, C'   , byteLength: 1, fn: implementationOf[0x89] }),
      new Instruction({ opcode: 0x8A, cycles: 4 , mnemonic: 'ADC A, D'   , byteLength: 1, fn: implementationOf[0x8A] }),
      new Instruction({ opcode: 0x8B, cycles: 4 , mnemonic: 'ADC A, E'   , byteLength: 1, fn: implementationOf[0x8B] }),
      new Instruction({ opcode: 0x8C, cycles: 4 , mnemonic: 'ADC A, H'   , byteLength: 1, fn: implementationOf[0x8C] }),
      new Instruction({ opcode: 0x8D, cycles: 4 , mnemonic: 'ADC A, L'   , byteLength: 1, fn: implementationOf[0x8D] }),
      new Instruction({ opcode: 0x8E, cycles: 8 , mnemonic: 'ADC A, (HL)', byteLength: 1, fn: implementationOf[0x8E] }),
      new Instruction({ opcode: 0x8F, cycles: 4 , mnemonic: 'ADC A, A'   , byteLength: 1, fn: implementationOf[0x8F] }),
      new Instruction({ opcode: 0x90, cycles: 4 , mnemonic: 'SUB B'      , byteLength: 1, fn: implementationOf[0x90] }),
      new Instruction({ opcode: 0x91, cycles: 4 , mnemonic: 'SUB C'      , byteLength: 1, fn: implementationOf[0x91] }),
      new Instruction({ opcode: 0x92, cycles: 4 , mnemonic: 'SUB D'      , byteLength: 1, fn: implementationOf[0x92] }),
      new Instruction({ opcode: 0x93, cycles: 4 , mnemonic: 'SUB E'      , byteLength: 1, fn: implementationOf[0x93] }),
      new Instruction({ opcode: 0x94, cycles: 4 , mnemonic: 'SUB H'      , byteLength: 1, fn: implementationOf[0x94] }),
      new Instruction({ opcode: 0x95, cycles: 4 , mnemonic: 'SUB L'      , byteLength: 1, fn: implementationOf[0x95] }),
      new Instruction({ opcode: 0x96, cycles: 8 , mnemonic: 'SUB (HL)'   , byteLength: 1, fn: implementationOf[0x96] }),
      new Instruction({ opcode: 0x97, cycles: 4 , mnemonic: 'SUB A'      , byteLength: 1, fn: implementationOf[0x97] }),
      new Instruction({ opcode: 0x98, cycles: 4 , mnemonic: 'SBC A, B'   , byteLength: 1, fn: implementationOf[0x98] }),
      new Instruction({ opcode: 0x99, cycles: 4 , mnemonic: 'SBC A, C'   , byteLength: 1, fn: implementationOf[0x99] }),
      new Instruction({ opcode: 0x9A, cycles: 4 , mnemonic: 'SBC A, D'   , byteLength: 1, fn: implementationOf[0x9A] }),
      new Instruction({ opcode: 0x9B, cycles: 4 , mnemonic: 'SBC A, E'   , byteLength: 1, fn: implementationOf[0x9B] }),
      new Instruction({ opcode: 0x9C, cycles: 4 , mnemonic: 'SBC A, H'   , byteLength: 1, fn: implementationOf[0x9C] }),
      new Instruction({ opcode: 0x9D, cycles: 4 , mnemonic: 'SBC A, L'   , byteLength: 1, fn: implementationOf[0x9D] }),
      new Instruction({ opcode: 0x9E, cycles: 8 , mnemonic: 'SBC A, (HL)', byteLength: 1, fn: implementationOf[0x9E] }),
      new Instruction({ opcode: 0x9F, cycles: 4 , mnemonic: 'SBC A, A'   , byteLength: 1, fn: implementationOf[0x9F] }),
      new Instruction({ opcode: 0xA0, cycles: 4 , mnemonic: 'AND B'      , byteLength: 1, fn: implementationOf[0xA0] }),
      new Instruction({ opcode: 0xA1, cycles: 4 , mnemonic: 'AND C'      , byteLength: 1, fn: implementationOf[0xA1] }),
      new Instruction({ opcode: 0xA2, cycles: 4 , mnemonic: 'AND D'      , byteLength: 1, fn: implementationOf[0xA2] }),
      new Instruction({ opcode: 0xA3, cycles: 4 , mnemonic: 'AND E'      , byteLength: 1, fn: implementationOf[0xA3] }),
      new Instruction({ opcode: 0xA4, cycles: 4 , mnemonic: 'AND H'      , byteLength: 1, fn: implementationOf[0xA4] }),
      new Instruction({ opcode: 0xA5, cycles: 4 , mnemonic: 'AND L'      , byteLength: 1, fn: implementationOf[0xA5] }),
      new Instruction({ opcode: 0xA6, cycles: 8 , mnemonic: 'AND (HL)'   , byteLength: 1, fn: implementationOf[0xA6] }),
      new Instruction({ opcode: 0xA7, cycles: 4 , mnemonic: 'AND A'      , byteLength: 1, fn: implementationOf[0xA7] }),
      new Instruction({ opcode: 0xA8, cycles: 4 , mnemonic: 'XOR B'      , byteLength: 1, fn: implementationOf[0xA8] }),
      new Instruction({ opcode: 0xA9, cycles: 4 , mnemonic: 'XOR C'      , byteLength: 1, fn: implementationOf[0xA9] }),
      new Instruction({ opcode: 0xAA, cycles: 4 , mnemonic: 'XOR D'      , byteLength: 1, fn: implementationOf[0xAA] }),
      new Instruction({ opcode: 0xAB, cycles: 4 , mnemonic: 'XOR E'      , byteLength: 1, fn: implementationOf[0xAB] }),
      new Instruction({ opcode: 0xAC, cycles: 4 , mnemonic: 'XOR H'      , byteLength: 1, fn: implementationOf[0xAC] }),
      new Instruction({ opcode: 0xAD, cycles: 4 , mnemonic: 'XOR L'      , byteLength: 1, fn: implementationOf[0xAD] }),
      new Instruction({ opcode: 0xAE, cycles: 8 , mnemonic: 'XOR (HL)'   , byteLength: 1, fn: implementationOf[0xAE] }),
      new Instruction({ opcode: 0xAF, cycles: 4 , mnemonic: 'XOR A'      , byteLength: 1, fn: implementationOf[0xAF] }),
      new Instruction({ opcode: 0xB0, cycles: 4 , mnemonic: 'OR B'       , byteLength: 1, fn: implementationOf[0xB0] }),
      new Instruction({ opcode: 0xB1, cycles: 4 , mnemonic: 'OR C'       , byteLength: 1, fn: implementationOf[0xB1] }),
      new Instruction({ opcode: 0xB2, cycles: 4 , mnemonic: 'OR D'       , byteLength: 1, fn: implementationOf[0xB2] }),
      new Instruction({ opcode: 0xB3, cycles: 4 , mnemonic: 'OR E'       , byteLength: 1, fn: implementationOf[0xB3] }),
      new Instruction({ opcode: 0xB4, cycles: 4 , mnemonic: 'OR H'       , byteLength: 1, fn: implementationOf[0xB4] }),
      new Instruction({ opcode: 0xB5, cycles: 4 , mnemonic: 'OR L'       , byteLength: 1, fn: implementationOf[0xB5] }),
      new Instruction({ opcode: 0xB6, cycles: 8 , mnemonic: 'OR (HL)'    , byteLength: 1, fn: implementationOf[0xB6] }),
      new Instruction({ opcode: 0xB7, cycles: 4 , mnemonic: 'OR A'       , byteLength: 1, fn: implementationOf[0xB7] }),
      new Instruction({ opcode: 0xB8, cycles: 4 , mnemonic: 'CP B'       , byteLength: 1, fn: implementationOf[0xB8] }),
      new Instruction({ opcode: 0xB9, cycles: 4 , mnemonic: 'CP C'       , byteLength: 1, fn: implementationOf[0xB9] }),
      new Instruction({ opcode: 0xBA, cycles: 4 , mnemonic: 'CP D'       , byteLength: 1, fn: implementationOf[0xBA] }),
      new Instruction({ opcode: 0xBB, cycles: 4 , mnemonic: 'CP E'       , byteLength: 1, fn: implementationOf[0xBB] }),
      new Instruction({ opcode: 0xBC, cycles: 4 , mnemonic: 'CP H'       , byteLength: 1, fn: implementationOf[0xBC] }),
      new Instruction({ opcode: 0xBD, cycles: 4 , mnemonic: 'CP L'       , byteLength: 1, fn: implementationOf[0xBD] }),
      new Instruction({ opcode: 0xBE, cycles: 8 , mnemonic: 'CP (HL)'    , byteLength: 1, fn: implementationOf[0xBE] }),
      new Instruction({ opcode: 0xBF, cycles: 4 , mnemonic: 'CP A'       , byteLength: 1, fn: implementationOf[0xBF] }),
      new Instruction({ opcode: 0xC6, cycles: 8 , mnemonic: 'ADD A, d8'  , byteLength: 2, fn: implementationOf[0xC6] }),
      new Instruction({ opcode: 0xD6, cycles: 8 , mnemonic: 'SUB d8'     , byteLength: 2, fn: implementationOf[0xD6] }),
      new Instruction({ opcode: 0xE6, cycles: 8 , mnemonic: 'AND d8'     , byteLength: 2, fn: implementationOf[0xE6] }),
      new Instruction({ opcode: 0xF6, cycles: 8 , mnemonic: 'OR d8'      , byteLength: 2, fn: implementationOf[0xF6] }),
      new Instruction({ opcode: 0xCE, cycles: 8 , mnemonic: 'ADC A, d8'  , byteLength: 2, fn: implementationOf[0xCE] }),
      new Instruction({ opcode: 0xDE, cycles: 8 , mnemonic: 'SBC A, d8'  , byteLength: 2, fn: implementationOf[0xDE] }),
      new Instruction({ opcode: 0xEE, cycles: 8 , mnemonic: 'XOR d8'     , byteLength: 2, fn: implementationOf[0xEE] }),
      new Instruction({ opcode: 0xFE, cycles: 8 , mnemonic: 'CP d8'      , byteLength: 2, fn: implementationOf[0xFE] }),
    ];

    return instructions;
  }

  //#endregion

  //#region 16-bit Arithmetic instructions

  #get16bitArithmeticInstructions() {
    const implementationOf = this.#getAL16bitImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x03, cycles: 8 , mnemonic: 'INC BC'    , byteLength: 1, fn: implementationOf[0x03] }),
      new Instruction({ opcode: 0x13, cycles: 8 , mnemonic: 'INC DE'    , byteLength: 1, fn: implementationOf[0x13] }),
      new Instruction({ opcode: 0x23, cycles: 8 , mnemonic: 'INC HL'    , byteLength: 1, fn: implementationOf[0x23] }),
      new Instruction({ opcode: 0x33, cycles: 8 , mnemonic: 'INC SP'    , byteLength: 1, fn: implementationOf[0x33] }),
      new Instruction({ opcode: 0x09, cycles: 8 , mnemonic: 'ADD HL, BC', byteLength: 1, fn: implementationOf[0x09] }),
      new Instruction({ opcode: 0x19, cycles: 8 , mnemonic: 'ADD HL, DE', byteLength: 1, fn: implementationOf[0x19] }),
      new Instruction({ opcode: 0x29, cycles: 8 , mnemonic: 'ADD HL, HL', byteLength: 1, fn: implementationOf[0x29] }),
      new Instruction({ opcode: 0x39, cycles: 8 , mnemonic: 'ADD HL, SP', byteLength: 1, fn: implementationOf[0x39] }),
      new Instruction({ opcode: 0x0B, cycles: 8 , mnemonic: 'DEC BC'    , byteLength: 1, fn: implementationOf[0x0B] }),
      new Instruction({ opcode: 0x1B, cycles: 8 , mnemonic: 'DEC DE'    , byteLength: 1, fn: implementationOf[0x1B] }),
      new Instruction({ opcode: 0x2B, cycles: 8 , mnemonic: 'DEC HL'    , byteLength: 1, fn: implementationOf[0x2B] }),
      new Instruction({ opcode: 0x3B, cycles: 8 , mnemonic: 'DEC SP'    , byteLength: 1, fn: implementationOf[0x3B] }),
      new Instruction({ opcode: 0xE8, cycles: 16, mnemonic: 'ADD SP, r8', byteLength: 2, fn: implementationOf[0xE8] }),
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
    };
  }

  #getLSM16bitImplementationByOpcode() {
    return {
      0x00: () => {

      },
    };
  }

  #getAL8bitImplementationByOpcode() {
    return {
      0x00: () => {

      },
    };
  }

  #getAL16bitImplementationByOpcode() {
    return {
      0x00: () => {

      },
    };
  }

  //#endregion
}

export const SharpLR35902 = Cpu;
