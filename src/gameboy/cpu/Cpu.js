import { assertType } from "@common/Control";
// eslint-disable-next-line no-unused-vars
import { Logger } from "@common/Logger";
import { decStr, hexStr } from "@common/Number";
import { Uint8 } from "@common/Uint8";
import { Config } from "@root/gameboy.config";
import { Instruction } from "./Instruction";
import { RegisterF } from "./registers/RegisterF";

/**
 * Actual name is SharpLR35902
 * https://gbdev.io/pandocs/CPU_Registers_and_Flags.html
 */
export class Cpu {
  // Boot ROM burned into the CPU chip
  bootRom = new Uint8Array([
    0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
    0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
    0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
    0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
    0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
    0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
    0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
    0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
    0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xF2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
    0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
    0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
    0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
    0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
    0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3c, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x4C,
    0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
    0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50,
  ]);

  /** @param {{ read: (address: uint16) => uint8, write: (address: uint16, byte: uint8) => void }} memoryPins */
  constructor({ read, write, logger }) {
    this.#read = read;
    this.#write = write;
    this.#logger = logger;

    const mapByOpcode = (instructions) => instructions.reduce(
      (dict, instruction) => {
        dict[instruction.opcode] = instruction;
        return dict;
      },
      {},
    );
    
    // TODO: Handle prefix CB opcodes in a differnt map
    this.#instructionByOpcode = {
      ...mapByOpcode(this.#getMCInstructions()),
      ...mapByOpcode(this.#getJCInstructions()),
      ...mapByOpcode(this.#getLSM8bitInstructions()),
      ...mapByOpcode(this.#getLSM16bitInstructions()),
      ...mapByOpcode(this.#getAL8bitInstructions()),
      ...mapByOpcode(this.#getAL16bitInstructions()),
      ...mapByOpcode(this.#getR8bitInstructions()),
    };
    this.#cbInstructionByOpcode = {
      ...mapByOpcode(this.#getPrefixCBInstructions()),
    };
  }

  /** Proctects reads of regions managed by CPU  */
  guardRead(address) {
    // TODO: Return null if address isn't managed by CPU
    // TODO: Return spec compliant value if address is managed by CPU
  }

  guardWrite(address, byte) {
    // TODO: Return false if address isn't manged by CPU
    // TODO: Return true if address is managed by CPU and handle write as specified
  }

  step() {
    const anyInterruptEnabled = this.#IME && (this.#IE & 0x1F);
    const anyInterruptPending = (this.#IF & 0x1F) > 0;
    /** Precomputed lookup table for faster access (we avoid finding the first non zero bit in runtime) */
    /** TODO: Or I could also just test the bits in order... x & 1, x & 2, x & 4, x & 8, ... */
    const VECTOR_BY_INTERRUPT_FLAG_STATE = [
      null, 0x40, 0x48, 0x40,
      0x50, 0x40, 0x48, 0x40,
      0x58, 0x40, 0x48, 0x40,
      0x50, 0x40, 0x48, 0x40,
      0x60, 0x40, 0x48, 0x40,
      0x50, 0x40, 0x48, 0x40,
      0x58, 0x40, 0x48, 0x40,
      0x50, 0x40, 0x48, 0x40
    ];
    if (anyInterruptEnabled && anyInterruptPending) {
      const vector = VECTOR_BY_INTERRUPT_FLAG_STATE[this.#IF];
      if (vector)
        this.#startInterruptServiceRoutine(vector);
    }

    const opcode = this.opcode();
    const instruction = this.decode(opcode);
    assertType(instruction, Instruction, `No instruction defined for opcode ${hexStr(opcode)}`);

    // TODO: Make this configurable
  
    if (Config.DEBUG) {
      const hex4 = (u) => hexStr(u, '', 4);
      const hex2 = (u) => hexStr(u, '', 2);
      const pc = this.#PC - (opcode === 0xCB ? 2 : 1);
      let msg = `${decStr(this.#cycleCount)}`;
      msg += `   ${hex4(pc)}`;
      msg += `   ${hex2(opcode)}`;
      msg += ` ${instruction.mnemonic.padEnd(20, ' ')}`;
      msg += `   AF=${hex4(this.#AF)}`;
      msg += ` BC=${hex4(this.#BC)}`;
      msg += ` DE=${hex4(this.#DE)}`;
      msg += ` HL=${hex4(this.#HL)}`;
      msg += ` SP=${hex4(this.#SP)}`;
      msg += `   Z=${decStr(this.#F.Z, '', 1)}`;
      msg += ` N=${decStr(this.#F.N, '', 1)}`;
      msg += ` H=${decStr(this.#F.H, '', 1)}`;
      msg += ` C=${decStr(this.#F.C, '', 1)}`;
      this.#logger.log(msg);
    }
      

    const extraCycles = instruction.execute();
    const cycleCount = instruction.cycles + extraCycles;
    this.#cycleCount += cycleCount;
    return cycleCount;
  }

  clock() {
    if (this.#cyclesLeft > 0) {
      this.#cyclesLeft--;
      return;
    }
    
    const opcode = this.opcode();
    const instruction = this.decode(opcode);
    this.#cyclesLeft += instruction.execute();
  }

  reset() {
    // TODO: Should start at 0x0000 to let Nintendo do its boot sequence, but it's not implemented yet, handling the memory mapped register 0xFF50 is required
    this.#PC = 0x0100;
    this.#A = 0;
    this.#B = 0;
    this.#C = 0;
    this.#D = 0;
    this.#E = 0;
    this.#H = 0;
    this.#L = 0;
    this.#F = 0;
    this.#SP = 0;
    this.#cycleCount = 0;
  }

  /**
   * Fetches the value pointed by the PC an offset, without modifying the CPU's state
   * @param {number} offset
   * @returns 
   */
  peek(offset = 0) {
    return this.#read(this.PC + offset);
  }

  fetch() {
    return this.#read(this.#PC++);
  }

  /**
   * Fetches the value pointed by PC
   * @returns {number} opcode or operand
   */
  opcode() {
    return this.#read(this.#PC++);
  }

  operand() {
    return this.#read(this.#PC++);
  }

  /**
   * @param {uint16} address
   * @returns uint8
   */
  #read;
  
  /**
   * @param {uint16} address
   * @param {uint8} byte
   * @returns void
   */
  #write;

  /**
   * @param {number} opcode 
   * @returns {Instruction}
   */
  decode(opcode) {
    let targetOpcode = opcode;
    let instructionFrom = this.#instructionByOpcode;
    if (opcode === 0xCB) {
      targetOpcode = this.opcode();
      instructionFrom = this.#cbInstructionByOpcode;
    }
    return instructionFrom[targetOpcode];
  }

  /** @param {uint8} vector */
  #startInterruptServiceRoutine(vector) {
    // Once the interrupt vector has been resolved, the corresponding handler is invoked,
    // this invokation behaves exactly like a regular "CALL" instruction
    // TODO: leverage a CALL instruction implementation
    this.#push(this.#PC);
    this.#PC = vector;
  }

  /** @type {Logger} */
  #logger;

  //#region State (not from spec)

  #cycleCount;
  #cyclesLeft;

  #isHalted;
  #isStopped; // TODO: Implement behavior

  //#endregion

  //#region Spec flags, https://gbdev.io/pandocs/Interrupts.html#interrupts

  /** Interrupt master enable flag (write only) */
  #IME;

  /** Interrupt enable */
  #IE;

  /** Interrupt flag */
  #IF;

  //#endregion

  #instructionByOpcode = {};
  #cbInstructionByOpcode = {};

  //#region 8-bit registers

  #register = {
    A: new Uint8(),
    B: new Uint8(),
    C: new Uint8(),
    D: new Uint8(),
    E: new Uint8(),
    H: new Uint8(),
    L: new Uint8(),
    F: new RegisterF(),
  };

  get #A() {
    return this.#register.A;
  }

  get #B() {
    return this.#register.B;
  }

  get #C() {
    return this.#register.C;
  }

  get #D() {
    return this.#register.D;
  }

  get #E() {
    return this.#register.E;
  }

  get #H() {
    return this.#register.H;
  }

  get #L() {
    return this.#register.L;
  }

  get #F() {
    return this.#register.F;
  }

  set #A(byte) {
    this.#register.A.set(byte);
  }

  set #B(byte) {
    this.#register.B.set(byte);
  }

  set #C(byte) {
    this.#register.C.set(byte);
  }

  set #D(byte) {
    this.#register.D.set(byte);
  }

  set #E(byte) {
    this.#register.E.set(byte);
  }

  set #H(byte) {
    this.#register.H.set(byte);
  }

  set #L(byte) {
    this.#register.L.set(byte);
  }

  set #F(byte) {
    this.#register.F.set(byte);
  }


  #registersStack = [];

  #saveRegisters() {
    this.#registersStack.push({
      A: this.#A,
      B: this.#B,
      C: this.#C,
      D: this.#D,
      E: this.#E,
      H: this.#H,
      L: this.#L,
      F: this.#F,
    });
    if (this.#registersStack.length > 100) {
      this.#registersStack.shift();
    }
  }

  #restoreRegisters() {
    const state = this.#registersStack.pop();
    this.#A = state.A;
    this.#B = state.B;
    this.#C = state.C;
    this.#D = state.D;
    this.#E = state.E;
    this.#H = state.H;
    this.#L = state.L;
    this.#F = state.F;
  }

  //#endregion

  //#region 16-bit registers

  /** Stack pointer */
  #StackPointer = 0;

  get #SP() {
    return this.#StackPointer;
  }

  set #SP(word) {
    this.#StackPointer = word & 0xFFFF;
  }

  /** Program counter */

  #ProgramCounter = 0;

  get #PC() {
    return this.#ProgramCounter;
  }

  set #PC(word) {
    this.#ProgramCounter = word & 0xFFFF;
  }
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
    this.#A = (word & 0xFF00) >>> 8;
    this.#F = word & 0x00FF;
  }

  set #BC(word) {
    this.#B = (word & 0xFF00) >>> 8;
    this.#C = word & 0x00FF;
  }

  set #DE(word) {
    this.#D = (word & 0xFF00) >>> 8;
    this.#E = word & 0x00FF;
  }

  set #HL(word) {
    this.#H = (word & 0xFF00) >>> 8;
    this.#L = word & 0x00FF;
  }

  //#endregion

  //#region Stack operations

  /** @param {uint16} word */
  #push(word) {
    const highByte = (word & 0xFF00) >>> 8; // The GameBoy's CPU behaves as a little endian CPU when dealing
    this.#write(--this.#SP, highByte);       // with multi-byte data, thus we need to push bytes onto the stack
                                            // in a way that allows us to read them back in an increasing
    const lowByte = word & 0x00FF;          // order of significance.
    this.#write(--this.#SP, lowByte);        // (Remember that a stack follows the LIFO principle)
  }

  /** @returns {uint16} */
  #pop() {
    const lowByte = this.#read(this.#SP++);
    const highByte = this.#read(this.#SP++);

    return (highByte << 8) | lowByte;
  }


  //#endregion

  //#region Instruction set

  //#region Misc/Control instructions

  #getMCInstructions() {
    const implementationOf = this.#getMCImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x00, cycles: 4, mnemonic: 'NOP'      , byteLength: 1, fn: implementationOf[0x00] }),
      new Instruction({ opcode: 0x10, cycles: 4, mnemonic: 'STOP 0'   , byteLength: 2, fn: implementationOf[0x10] }),
      new Instruction({ opcode: 0x76, cycles: 4, mnemonic: 'HALT'     , byteLength: 1, fn: implementationOf[0x76] }),
      new Instruction({ opcode: 0xF3, cycles: 4, mnemonic: 'DI'       , byteLength: 1, fn: implementationOf[0xF3] }),
      new Instruction({ opcode: 0xCB, cycles: 4, mnemonic: 'PREFIX CB', byteLength: 1, fn: implementationOf[0xCB] }),
      new Instruction({ opcode: 0xFB, cycles: 4, mnemonic: 'EI'       , byteLength: 1, fn: implementationOf[0xFB] }),
    ];

    return instructions;
  }

  //#endregion

  //#region Jump/Call instructions

  #getJCInstructions() {
    const implementationOf = this.#getJCImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x20, cycles: 8 , mnemonic: 'JR NZ, r8'   , byteLength: 2, fn: implementationOf[0x20] }), //  +4 cycles if branch is taken
      new Instruction({ opcode: 0x30, cycles: 8 , mnemonic: 'JR NC, r8'   , byteLength: 2, fn: implementationOf[0x30] }), //  +4 cycles if branch is taken
      new Instruction({ opcode: 0x18, cycles: 12, mnemonic: 'JR r8'       , byteLength: 2, fn: implementationOf[0x18] }), // Unconditional branching
      new Instruction({ opcode: 0x28, cycles: 8 , mnemonic: 'JR Z, r8'    , byteLength: 2, fn: implementationOf[0x28] }), //  +4 cycles if branch is taken
      new Instruction({ opcode: 0x38, cycles: 8 , mnemonic: 'JR C, r8'    , byteLength: 2, fn: implementationOf[0x38] }), //  +4 cycles if branch is taken
      new Instruction({ opcode: 0xC0, cycles: 8 , mnemonic: 'RET NZ'      , byteLength: 1, fn: implementationOf[0xC0] }), // +12 cycles if branch is taken
      new Instruction({ opcode: 0xD0, cycles: 8 , mnemonic: 'RET NC'      , byteLength: 1, fn: implementationOf[0xD0] }), // +12 cycles if branch is taken
      new Instruction({ opcode: 0xC2, cycles: 12, mnemonic: 'JP NZ, a16'  , byteLength: 3, fn: implementationOf[0xC2] }), //  +4 cycles if branch is taken
      new Instruction({ opcode: 0xD2, cycles: 12, mnemonic: 'JP NC, a16'  , byteLength: 3, fn: implementationOf[0xD2] }), //  +4 cycles if branch is taken
      new Instruction({ opcode: 0xC3, cycles: 16, mnemonic: 'JP a16'      , byteLength: 3, fn: implementationOf[0xC3] }), // Unconditional branching
      new Instruction({ opcode: 0xC4, cycles: 12, mnemonic: 'CALL NZ, a16', byteLength: 3, fn: implementationOf[0xC4] }), // +12 cycles if branch is taken
      new Instruction({ opcode: 0xD4, cycles: 12, mnemonic: 'CALL NC, a16', byteLength: 3, fn: implementationOf[0xD4] }), // +12 cycles if branch is taken
      new Instruction({ opcode: 0xC7, cycles: 16, mnemonic: 'RST 00H'     , byteLength: 1, fn: implementationOf[0xC7] }), // Unconditional branching
      new Instruction({ opcode: 0xD7, cycles: 16, mnemonic: 'RST 10H'     , byteLength: 1, fn: implementationOf[0xD7] }), // Unconditional branching
      new Instruction({ opcode: 0xE7, cycles: 16, mnemonic: 'RST 20H'     , byteLength: 1, fn: implementationOf[0xE7] }), // Unconditional branching
      new Instruction({ opcode: 0xF7, cycles: 16, mnemonic: 'RST 30H'     , byteLength: 1, fn: implementationOf[0xF7] }), // Unconditional branching
      new Instruction({ opcode: 0xC8, cycles: 8 , mnemonic: 'RET Z'       , byteLength: 1, fn: implementationOf[0xC8] }), // +12 cycles if branch is taken
      new Instruction({ opcode: 0xD8, cycles: 8 , mnemonic: 'RET C'       , byteLength: 1, fn: implementationOf[0xD8] }), // +12 cycles if branch is taken
      new Instruction({ opcode: 0xC9, cycles: 16, mnemonic: 'RET'         , byteLength: 1, fn: implementationOf[0xC9] }), // Unconditional branching
      new Instruction({ opcode: 0xD9, cycles: 16, mnemonic: 'RETI'        , byteLength: 1, fn: implementationOf[0xD9] }), // Unconditional branching
      new Instruction({ opcode: 0xE9, cycles: 4 , mnemonic: 'RET (HL)'    , byteLength: 1, fn: implementationOf[0xE9] }), // Unconditional branching
      new Instruction({ opcode: 0xCA, cycles: 12, mnemonic: 'JP Z, a16'   , byteLength: 3, fn: implementationOf[0xCA] }), //  +4 cycles if branch is taken
      new Instruction({ opcode: 0xDA, cycles: 12, mnemonic: 'JP C, a16'   , byteLength: 3, fn: implementationOf[0xDA] }), //  +4 cycles if branch is taken
      new Instruction({ opcode: 0xCC, cycles: 12, mnemonic: 'CALL Z, a16' , byteLength: 3, fn: implementationOf[0xCC] }), // +12 cycles if branch is taken
      new Instruction({ opcode: 0xDC, cycles: 12, mnemonic: 'CALL C, a16' , byteLength: 3, fn: implementationOf[0xDC] }), // +12 cycles if branch is taken
      new Instruction({ opcode: 0xCD, cycles: 24, mnemonic: 'CALL a16'    , byteLength: 3, fn: implementationOf[0xCD] }), // Unconditional branching
      new Instruction({ opcode: 0xCF, cycles: 16, mnemonic: 'RST 08H'     , byteLength: 1, fn: implementationOf[0xCF] }), // Unconditional branching
      new Instruction({ opcode: 0xDF, cycles: 16, mnemonic: 'RST 08H'     , byteLength: 1, fn: implementationOf[0xDF] }), // Unconditional branching
      new Instruction({ opcode: 0xEF, cycles: 16, mnemonic: 'RST 08H'     , byteLength: 1, fn: implementationOf[0xEF] }), // Unconditional branching
      new Instruction({ opcode: 0xFF, cycles: 16, mnemonic: 'RST 08H'     , byteLength: 1, fn: implementationOf[0xFF] }), // Unconditional branching
    ];

    return instructions;
  }

  //#endregion

  //#region 8-bit Load/Store/Move instructions

  #getLSM8bitInstructions() {
    const implementationOf = this.#getLSM8bitImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x02, cycles: 8 , mnemonic: 'LD (BC), A' , byteLength: 1, fn: implementationOf[0x02] }),
      new Instruction({ opcode: 0x06, cycles: 8 , mnemonic: 'LD B, d8'   , byteLength: 2, fn: implementationOf[0x06] }),
      new Instruction({ opcode: 0x0A, cycles: 8 , mnemonic: 'LD A, (BC)' , byteLength: 1, fn: implementationOf[0x0A] }),
      new Instruction({ opcode: 0x0E, cycles: 8 , mnemonic: 'LD C, d8'   , byteLength: 2, fn: implementationOf[0x0E] }),
      new Instruction({ opcode: 0x12, cycles: 8 , mnemonic: 'LD (DE), A' , byteLength: 2, fn: implementationOf[0x12] }),
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
      new Instruction({ opcode: 0x70, cycles: 8 , mnemonic: 'LD (HL), B' , byteLength: 1, fn: implementationOf[0x70] }),
      new Instruction({ opcode: 0x71, cycles: 8 , mnemonic: 'LD (HL), C' , byteLength: 1, fn: implementationOf[0x71] }),
      new Instruction({ opcode: 0x72, cycles: 8 , mnemonic: 'LD (HL), D' , byteLength: 1, fn: implementationOf[0x72] }),
      new Instruction({ opcode: 0x73, cycles: 8 , mnemonic: 'LD (HL), E' , byteLength: 1, fn: implementationOf[0x73] }),
      new Instruction({ opcode: 0x74, cycles: 8 , mnemonic: 'LD (HL), H' , byteLength: 1, fn: implementationOf[0x74] }),
      new Instruction({ opcode: 0x75, cycles: 8 , mnemonic: 'LD (HL), L' , byteLength: 1, fn: implementationOf[0x75] }),
      new Instruction({ opcode: 0x77, cycles: 8 , mnemonic: 'LD (HL), A' , byteLength: 1, fn: implementationOf[0x77] }),
      new Instruction({ opcode: 0x78, cycles: 4 , mnemonic: 'LD A, B'    , byteLength: 1, fn: implementationOf[0x78] }),
      new Instruction({ opcode: 0x79, cycles: 4 , mnemonic: 'LD A, C'    , byteLength: 1, fn: implementationOf[0x79] }),
      new Instruction({ opcode: 0x7A, cycles: 4 , mnemonic: 'LD A, D'    , byteLength: 1, fn: implementationOf[0x7A] }),
      new Instruction({ opcode: 0x7B, cycles: 4 , mnemonic: 'LD A, E'    , byteLength: 1, fn: implementationOf[0x7B] }),
      new Instruction({ opcode: 0x7C, cycles: 4 , mnemonic: 'LD A, H'    , byteLength: 1, fn: implementationOf[0x7C] }),
      new Instruction({ opcode: 0x7D, cycles: 4 , mnemonic: 'LD A, L'    , byteLength: 1, fn: implementationOf[0x7D] }),
      new Instruction({ opcode: 0x7E, cycles: 8 , mnemonic: 'LD A, (HL)' , byteLength: 1, fn: implementationOf[0x7E] }),
      new Instruction({ opcode: 0x7F, cycles: 4 , mnemonic: 'LD A, A'    , byteLength: 1, fn: implementationOf[0x7F] }),
      new Instruction({ opcode: 0xE0, cycles: 12, mnemonic: 'LDH (a8), A', byteLength: 2, fn: implementationOf[0xE0] }),
      new Instruction({ opcode: 0xE2, cycles: 8 , mnemonic: 'LD (C), A'  , byteLength: 2, fn: implementationOf[0xE2] }),
      new Instruction({ opcode: 0xEA, cycles: 16, mnemonic: 'LD (a16), A', byteLength: 3, fn: implementationOf[0xEA] }),
      new Instruction({ opcode: 0xF0, cycles: 12, mnemonic: 'LDH A, (a8)', byteLength: 2, fn: implementationOf[0xF0] }),
      new Instruction({ opcode: 0xF2, cycles: 8 , mnemonic: 'LD A, (C)'  , byteLength: 2, fn: implementationOf[0xF2] }),
      new Instruction({ opcode: 0xFA, cycles: 16, mnemonic: 'LD A, (a16)', byteLength: 3, fn: implementationOf[0xFA] }),
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

  #getAL16bitInstructions() {
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

  //#region Undefined or blank instructions (these are empty in the opcode matrix https://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html)

  #getUBInstructions() {
    const implementationOf = this.#getUBImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0xD3, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xD3] }),
      new Instruction({ opcode: 0xE3, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xE3] }),
      new Instruction({ opcode: 0xE4, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xE4] }),
      new Instruction({ opcode: 0xF4, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xF4] }),
      new Instruction({ opcode: 0xDB, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xDB] }),
      new Instruction({ opcode: 0xEB, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xEB] }),
      new Instruction({ opcode: 0xEC, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xEC] }),
      new Instruction({ opcode: 0xFC, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xFC] }),
      new Instruction({ opcode: 0xDD, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xDD] }),
      new Instruction({ opcode: 0xED, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xED] }),
      new Instruction({ opcode: 0xFD, cycles: 4, mnemonic: 'UB', byteLength: 1, fn: implementationOf[0xFD] }),
    ];

    return instructions;
  }

  //#endregion

  //#region 8-bit rotations

  #getR8bitInstructions() {
    const implementationOf = this.#getR8bitImplementationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x07, cycles: 4, mnemonic: 'RLCA', byteLength: 1, fn: implementationOf[0x07] }),
      new Instruction({ opcode: 0x17, cycles: 4, mnemonic: 'RLA' , byteLength: 1, fn: implementationOf[0x17] }),

      new Instruction({ opcode: 0x0F, cycles: 4, mnemonic: 'RRCA', byteLength: 1, fn: implementationOf[0x0F] }),
      new Instruction({ opcode: 0x1F, cycles: 4, mnemonic: 'RRA' , byteLength: 1, fn: implementationOf[0x1F] }),
    ];

    return instructions;
  }

  //#endregion

  //#region Prefix CB operations for 8-bit rotations, shifts and bit instructions

  #getPrefixCBInstructions() {
    const implementationOf = this.#getPrefixCBOperationByOpcode();
    const instructions = [
      new Instruction({ opcode: 0x00, cycles: 8 , mnemonic: 'RLC B'      , byteLength: 2, fn: implementationOf[0x00] }),
      new Instruction({ opcode: 0x01, cycles: 8 , mnemonic: 'RLC C'      , byteLength: 2, fn: implementationOf[0x01] }),
      new Instruction({ opcode: 0x02, cycles: 8 , mnemonic: 'RLC D'      , byteLength: 2, fn: implementationOf[0x02] }),
      new Instruction({ opcode: 0x03, cycles: 8 , mnemonic: 'RLC E'      , byteLength: 2, fn: implementationOf[0x03] }),
      new Instruction({ opcode: 0x04, cycles: 8 , mnemonic: 'RLC H'      , byteLength: 2, fn: implementationOf[0x04] }),
      new Instruction({ opcode: 0x05, cycles: 8 , mnemonic: 'RLC L'      , byteLength: 2, fn: implementationOf[0x05] }),
      new Instruction({ opcode: 0x06, cycles: 16, mnemonic: 'RLC (HL)'   , byteLength: 2, fn: implementationOf[0x06] }),
      new Instruction({ opcode: 0x07, cycles: 8 , mnemonic: 'RLC A'      , byteLength: 2, fn: implementationOf[0x07] }),
      new Instruction({ opcode: 0x08, cycles: 8 , mnemonic: 'RRC B'      , byteLength: 2, fn: implementationOf[0x08] }),
      new Instruction({ opcode: 0x09, cycles: 8 , mnemonic: 'RRC C'      , byteLength: 2, fn: implementationOf[0x09] }),
      new Instruction({ opcode: 0x0A, cycles: 8 , mnemonic: 'RRC D'      , byteLength: 2, fn: implementationOf[0x0A] }),
      new Instruction({ opcode: 0x0B, cycles: 8 , mnemonic: 'RRC E'      , byteLength: 2, fn: implementationOf[0x0B] }),
      new Instruction({ opcode: 0x0C, cycles: 8 , mnemonic: 'RRC H'      , byteLength: 2, fn: implementationOf[0x0C] }),
      new Instruction({ opcode: 0x0D, cycles: 8 , mnemonic: 'RRC L'      , byteLength: 2, fn: implementationOf[0x0D] }),
      new Instruction({ opcode: 0x0E, cycles: 16, mnemonic: 'RRC (HL)'   , byteLength: 2, fn: implementationOf[0x0E] }),
      new Instruction({ opcode: 0x0F, cycles: 8 , mnemonic: 'RRC A'      , byteLength: 2, fn: implementationOf[0x0F] }),
      new Instruction({ opcode: 0x10, cycles: 8 , mnemonic: 'RL B'       , byteLength: 2, fn: implementationOf[0x10] }),
      new Instruction({ opcode: 0x11, cycles: 8 , mnemonic: 'RL C'       , byteLength: 2, fn: implementationOf[0x11] }),
      new Instruction({ opcode: 0x12, cycles: 8 , mnemonic: 'RL D'       , byteLength: 2, fn: implementationOf[0x12] }),
      new Instruction({ opcode: 0x13, cycles: 8 , mnemonic: 'RL E'       , byteLength: 2, fn: implementationOf[0x13] }),
      new Instruction({ opcode: 0x14, cycles: 8 , mnemonic: 'RL H'       , byteLength: 2, fn: implementationOf[0x14] }),
      new Instruction({ opcode: 0x15, cycles: 8 , mnemonic: 'RL L'       , byteLength: 2, fn: implementationOf[0x15] }),
      new Instruction({ opcode: 0x16, cycles: 16, mnemonic: 'RL (HL)'    , byteLength: 2, fn: implementationOf[0x16] }),
      new Instruction({ opcode: 0x17, cycles: 8 , mnemonic: 'RL A'       , byteLength: 2, fn: implementationOf[0x17] }),
      new Instruction({ opcode: 0x18, cycles: 8 , mnemonic: 'RR B'       , byteLength: 2, fn: implementationOf[0x18] }),
      new Instruction({ opcode: 0x19, cycles: 8 , mnemonic: 'RR C'       , byteLength: 2, fn: implementationOf[0x19] }),
      new Instruction({ opcode: 0x1A, cycles: 8 , mnemonic: 'RR D'       , byteLength: 2, fn: implementationOf[0x1A] }),
      new Instruction({ opcode: 0x1B, cycles: 8 , mnemonic: 'RR E'       , byteLength: 2, fn: implementationOf[0x1B] }),
      new Instruction({ opcode: 0x1C, cycles: 8 , mnemonic: 'RR H'       , byteLength: 2, fn: implementationOf[0x1C] }),
      new Instruction({ opcode: 0x1D, cycles: 8 , mnemonic: 'RR L'       , byteLength: 2, fn: implementationOf[0x1D] }),
      new Instruction({ opcode: 0x1E, cycles: 16, mnemonic: 'RR (HL)'    , byteLength: 2, fn: implementationOf[0x1E] }),
      new Instruction({ opcode: 0x1F, cycles: 8 , mnemonic: 'RR A'       , byteLength: 2, fn: implementationOf[0x1F] }),
      new Instruction({ opcode: 0x20, cycles: 8 , mnemonic: 'SLA B'      , byteLength: 2, fn: implementationOf[0x20] }),
      new Instruction({ opcode: 0x21, cycles: 8 , mnemonic: 'SLA C'      , byteLength: 2, fn: implementationOf[0x21] }),
      new Instruction({ opcode: 0x22, cycles: 8 , mnemonic: 'SLA D'      , byteLength: 2, fn: implementationOf[0x22] }),
      new Instruction({ opcode: 0x23, cycles: 8 , mnemonic: 'SLA E'      , byteLength: 2, fn: implementationOf[0x23] }),
      new Instruction({ opcode: 0x24, cycles: 8 , mnemonic: 'SLA H'      , byteLength: 2, fn: implementationOf[0x24] }),
      new Instruction({ opcode: 0x25, cycles: 8 , mnemonic: 'SLA L'      , byteLength: 2, fn: implementationOf[0x25] }),
      new Instruction({ opcode: 0x26, cycles: 16, mnemonic: 'SLA (HL)'   , byteLength: 2, fn: implementationOf[0x26] }),
      new Instruction({ opcode: 0x27, cycles: 8 , mnemonic: 'SLA A'      , byteLength: 2, fn: implementationOf[0x27] }),
      new Instruction({ opcode: 0x28, cycles: 8 , mnemonic: 'SRA B'      , byteLength: 2, fn: implementationOf[0x28] }),
      new Instruction({ opcode: 0x29, cycles: 8 , mnemonic: 'SRA C'      , byteLength: 2, fn: implementationOf[0x29] }),
      new Instruction({ opcode: 0x2A, cycles: 8 , mnemonic: 'SRA D'      , byteLength: 2, fn: implementationOf[0x2A] }),
      new Instruction({ opcode: 0x2B, cycles: 8 , mnemonic: 'SRA E'      , byteLength: 2, fn: implementationOf[0x2B] }),
      new Instruction({ opcode: 0x2C, cycles: 8 , mnemonic: 'SRA H'      , byteLength: 2, fn: implementationOf[0x2C] }),
      new Instruction({ opcode: 0x2D, cycles: 8 , mnemonic: 'SRA L'      , byteLength: 2, fn: implementationOf[0x2D] }),
      new Instruction({ opcode: 0x2E, cycles: 16, mnemonic: 'SRA (HL)'   , byteLength: 2, fn: implementationOf[0x2E] }),
      new Instruction({ opcode: 0x2F, cycles: 8 , mnemonic: 'SRA A'      , byteLength: 2, fn: implementationOf[0x2F] }),
      new Instruction({ opcode: 0x30, cycles: 8 , mnemonic: 'SWAP B'     , byteLength: 2, fn: implementationOf[0x30] }),
      new Instruction({ opcode: 0x31, cycles: 8 , mnemonic: 'SWAP C'     , byteLength: 2, fn: implementationOf[0x31] }),
      new Instruction({ opcode: 0x32, cycles: 8 , mnemonic: 'SWAP D'     , byteLength: 2, fn: implementationOf[0x32] }),
      new Instruction({ opcode: 0x33, cycles: 8 , mnemonic: 'SWAP E'     , byteLength: 2, fn: implementationOf[0x33] }),
      new Instruction({ opcode: 0x34, cycles: 8 , mnemonic: 'SWAP H'     , byteLength: 2, fn: implementationOf[0x34] }),
      new Instruction({ opcode: 0x35, cycles: 8 , mnemonic: 'SWAP L'     , byteLength: 2, fn: implementationOf[0x35] }),
      new Instruction({ opcode: 0x36, cycles: 16, mnemonic: 'SWAP (HL)'  , byteLength: 2, fn: implementationOf[0x36] }),
      new Instruction({ opcode: 0x37, cycles: 8 , mnemonic: 'SWAP A'     , byteLength: 2, fn: implementationOf[0x37] }),
      new Instruction({ opcode: 0x38, cycles: 8 , mnemonic: 'SRL B'      , byteLength: 2, fn: implementationOf[0x38] }),
      new Instruction({ opcode: 0x39, cycles: 8 , mnemonic: 'SRL C'      , byteLength: 2, fn: implementationOf[0x39] }),
      new Instruction({ opcode: 0x3A, cycles: 8 , mnemonic: 'SRL D'      , byteLength: 2, fn: implementationOf[0x3A] }),
      new Instruction({ opcode: 0x3B, cycles: 8 , mnemonic: 'SRL E'      , byteLength: 2, fn: implementationOf[0x3B] }),
      new Instruction({ opcode: 0x3C, cycles: 8 , mnemonic: 'SRL H'      , byteLength: 2, fn: implementationOf[0x3C] }),
      new Instruction({ opcode: 0x3D, cycles: 8 , mnemonic: 'SRL L'      , byteLength: 2, fn: implementationOf[0x3D] }),
      new Instruction({ opcode: 0x3E, cycles: 16, mnemonic: 'SRL (HL)'   , byteLength: 2, fn: implementationOf[0x3E] }),
      new Instruction({ opcode: 0x3F, cycles: 8 , mnemonic: 'SRL A'      , byteLength: 2, fn: implementationOf[0x3F] }),
      new Instruction({ opcode: 0x40, cycles: 8 , mnemonic: 'BIT 0, B'   , byteLength: 2, fn: implementationOf[0x40] }),
      new Instruction({ opcode: 0x41, cycles: 8 , mnemonic: 'BIT 0, C'   , byteLength: 2, fn: implementationOf[0x41] }),
      new Instruction({ opcode: 0x42, cycles: 8 , mnemonic: 'BIT 0, D'   , byteLength: 2, fn: implementationOf[0x42] }),
      new Instruction({ opcode: 0x43, cycles: 8 , mnemonic: 'BIT 0, E'   , byteLength: 2, fn: implementationOf[0x43] }),
      new Instruction({ opcode: 0x44, cycles: 8 , mnemonic: 'BIT 0, H'   , byteLength: 2, fn: implementationOf[0x44] }),
      new Instruction({ opcode: 0x45, cycles: 8 , mnemonic: 'BIT 0, L'   , byteLength: 2, fn: implementationOf[0x45] }),
      new Instruction({ opcode: 0x46, cycles: 16, mnemonic: 'BIT 0, (HL)', byteLength: 2, fn: implementationOf[0x46] }),
      new Instruction({ opcode: 0x47, cycles: 8 , mnemonic: 'BIT 0, A'   , byteLength: 2, fn: implementationOf[0x47] }),
      new Instruction({ opcode: 0x48, cycles: 8 , mnemonic: 'BIT 1, B'   , byteLength: 2, fn: implementationOf[0x48] }),
      new Instruction({ opcode: 0x49, cycles: 8 , mnemonic: 'BIT 1, C'   , byteLength: 2, fn: implementationOf[0x49] }),
      new Instruction({ opcode: 0x4A, cycles: 8 , mnemonic: 'BIT 1, D'   , byteLength: 2, fn: implementationOf[0x4A] }),
      new Instruction({ opcode: 0x4B, cycles: 8 , mnemonic: 'BIT 1, E'   , byteLength: 2, fn: implementationOf[0x4B] }),
      new Instruction({ opcode: 0x4C, cycles: 8 , mnemonic: 'BIT 1, H'   , byteLength: 2, fn: implementationOf[0x4C] }),
      new Instruction({ opcode: 0x4D, cycles: 8 , mnemonic: 'BIT 1, L'   , byteLength: 2, fn: implementationOf[0x4D] }),
      new Instruction({ opcode: 0x4E, cycles: 16, mnemonic: 'BIT 1, (HL)', byteLength: 2, fn: implementationOf[0x4E] }),
      new Instruction({ opcode: 0x4F, cycles: 8 , mnemonic: 'BIT 1, A'   , byteLength: 2, fn: implementationOf[0x4F] }),
      new Instruction({ opcode: 0x50, cycles: 8 , mnemonic: 'BIT 2, B'   , byteLength: 2, fn: implementationOf[0x50] }),
      new Instruction({ opcode: 0x51, cycles: 8 , mnemonic: 'BIT 2, C'   , byteLength: 2, fn: implementationOf[0x51] }),
      new Instruction({ opcode: 0x52, cycles: 8 , mnemonic: 'BIT 2, D'   , byteLength: 2, fn: implementationOf[0x52] }),
      new Instruction({ opcode: 0x53, cycles: 8 , mnemonic: 'BIT 2, E'   , byteLength: 2, fn: implementationOf[0x53] }),
      new Instruction({ opcode: 0x54, cycles: 8 , mnemonic: 'BIT 2, H'   , byteLength: 2, fn: implementationOf[0x54] }),
      new Instruction({ opcode: 0x55, cycles: 8 , mnemonic: 'BIT 2, L'   , byteLength: 2, fn: implementationOf[0x55] }),
      new Instruction({ opcode: 0x56, cycles: 16, mnemonic: 'BIT 2, (HL)', byteLength: 2, fn: implementationOf[0x56] }),
      new Instruction({ opcode: 0x57, cycles: 8 , mnemonic: 'BIT 2, A'   , byteLength: 2, fn: implementationOf[0x57] }),
      new Instruction({ opcode: 0x58, cycles: 8 , mnemonic: 'BIT 3, B'   , byteLength: 2, fn: implementationOf[0x58] }),
      new Instruction({ opcode: 0x59, cycles: 8 , mnemonic: 'BIT 3, C'   , byteLength: 2, fn: implementationOf[0x59] }),
      new Instruction({ opcode: 0x5A, cycles: 8 , mnemonic: 'BIT 3, D'   , byteLength: 2, fn: implementationOf[0x5A] }),
      new Instruction({ opcode: 0x5B, cycles: 8 , mnemonic: 'BIT 3, E'   , byteLength: 2, fn: implementationOf[0x5B] }),
      new Instruction({ opcode: 0x5C, cycles: 8 , mnemonic: 'BIT 3, H'   , byteLength: 2, fn: implementationOf[0x5C] }),
      new Instruction({ opcode: 0x5D, cycles: 8 , mnemonic: 'BIT 3, L'   , byteLength: 2, fn: implementationOf[0x5D] }),
      new Instruction({ opcode: 0x5E, cycles: 16, mnemonic: 'BIT 3, (HL)', byteLength: 2, fn: implementationOf[0x5E] }),
      new Instruction({ opcode: 0x5F, cycles: 8 , mnemonic: 'BIT 3, A'   , byteLength: 2, fn: implementationOf[0x5F] }),
      new Instruction({ opcode: 0x60, cycles: 8 , mnemonic: 'BIT 4, B'   , byteLength: 2, fn: implementationOf[0x60] }),
      new Instruction({ opcode: 0x61, cycles: 8 , mnemonic: 'BIT 4, C'   , byteLength: 2, fn: implementationOf[0x61] }),
      new Instruction({ opcode: 0x62, cycles: 8 , mnemonic: 'BIT 4, D'   , byteLength: 2, fn: implementationOf[0x62] }),
      new Instruction({ opcode: 0x63, cycles: 8 , mnemonic: 'BIT 4, E'   , byteLength: 2, fn: implementationOf[0x63] }),
      new Instruction({ opcode: 0x64, cycles: 8 , mnemonic: 'BIT 4, H'   , byteLength: 2, fn: implementationOf[0x64] }),
      new Instruction({ opcode: 0x65, cycles: 8 , mnemonic: 'BIT 4, L'   , byteLength: 2, fn: implementationOf[0x65] }),
      new Instruction({ opcode: 0x66, cycles: 16, mnemonic: 'BIT 4, (HL)', byteLength: 2, fn: implementationOf[0x66] }),
      new Instruction({ opcode: 0x67, cycles: 8 , mnemonic: 'BIT 4, A'   , byteLength: 2, fn: implementationOf[0x67] }),
      new Instruction({ opcode: 0x68, cycles: 8 , mnemonic: 'BIT 5, B'   , byteLength: 2, fn: implementationOf[0x68] }),
      new Instruction({ opcode: 0x69, cycles: 8 , mnemonic: 'BIT 5, C'   , byteLength: 2, fn: implementationOf[0x69] }),
      new Instruction({ opcode: 0x6A, cycles: 8 , mnemonic: 'BIT 5, D'   , byteLength: 2, fn: implementationOf[0x6A] }),
      new Instruction({ opcode: 0x6B, cycles: 8 , mnemonic: 'BIT 5, E'   , byteLength: 2, fn: implementationOf[0x6B] }),
      new Instruction({ opcode: 0x6C, cycles: 8 , mnemonic: 'BIT 5, H'   , byteLength: 2, fn: implementationOf[0x6C] }),
      new Instruction({ opcode: 0x6D, cycles: 8 , mnemonic: 'BIT 5, L'   , byteLength: 2, fn: implementationOf[0x6D] }),
      new Instruction({ opcode: 0x6E, cycles: 16, mnemonic: 'BIT 5, (HL)', byteLength: 2, fn: implementationOf[0x6E] }),
      new Instruction({ opcode: 0x6F, cycles: 8 , mnemonic: 'BIT 5, A'   , byteLength: 2, fn: implementationOf[0x6F] }),
      new Instruction({ opcode: 0x70, cycles: 8 , mnemonic: 'BIT 6, B'   , byteLength: 2, fn: implementationOf[0x70] }),
      new Instruction({ opcode: 0x71, cycles: 8 , mnemonic: 'BIT 6, C'   , byteLength: 2, fn: implementationOf[0x71] }),
      new Instruction({ opcode: 0x72, cycles: 8 , mnemonic: 'BIT 6, D'   , byteLength: 2, fn: implementationOf[0x72] }),
      new Instruction({ opcode: 0x73, cycles: 8 , mnemonic: 'BIT 6, E'   , byteLength: 2, fn: implementationOf[0x73] }),
      new Instruction({ opcode: 0x74, cycles: 8 , mnemonic: 'BIT 6, H'   , byteLength: 2, fn: implementationOf[0x74] }),
      new Instruction({ opcode: 0x75, cycles: 8 , mnemonic: 'BIT 6, L'   , byteLength: 2, fn: implementationOf[0x75] }),
      new Instruction({ opcode: 0x76, cycles: 16, mnemonic: 'BIT 6, (HL)', byteLength: 2, fn: implementationOf[0x76] }),
      new Instruction({ opcode: 0x77, cycles: 8 , mnemonic: 'BIT 6, A'   , byteLength: 2, fn: implementationOf[0x77] }),
      new Instruction({ opcode: 0x78, cycles: 8 , mnemonic: 'BIT 7, B'   , byteLength: 2, fn: implementationOf[0x78] }),
      new Instruction({ opcode: 0x79, cycles: 8 , mnemonic: 'BIT 7, C'   , byteLength: 2, fn: implementationOf[0x79] }),
      new Instruction({ opcode: 0x7A, cycles: 8 , mnemonic: 'BIT 7, D'   , byteLength: 2, fn: implementationOf[0x7A] }),
      new Instruction({ opcode: 0x7B, cycles: 8 , mnemonic: 'BIT 7, E'   , byteLength: 2, fn: implementationOf[0x7B] }),
      new Instruction({ opcode: 0x7C, cycles: 8 , mnemonic: 'BIT 7, H'   , byteLength: 2, fn: implementationOf[0x7C] }),
      new Instruction({ opcode: 0x7D, cycles: 8 , mnemonic: 'BIT 7, L'   , byteLength: 2, fn: implementationOf[0x7D] }),
      new Instruction({ opcode: 0x7E, cycles: 16, mnemonic: 'BIT 7, (HL)', byteLength: 2, fn: implementationOf[0x7E] }),
      new Instruction({ opcode: 0x7F, cycles: 8 , mnemonic: 'BIT 7, A'   , byteLength: 2, fn: implementationOf[0x7F] }),
      new Instruction({ opcode: 0x80, cycles: 8 , mnemonic: 'RES 0, B'   , byteLength: 2, fn: implementationOf[0x80] }),
      new Instruction({ opcode: 0x81, cycles: 8 , mnemonic: 'RES 0, C'   , byteLength: 2, fn: implementationOf[0x81] }),
      new Instruction({ opcode: 0x82, cycles: 8 , mnemonic: 'RES 0, D'   , byteLength: 2, fn: implementationOf[0x82] }),
      new Instruction({ opcode: 0x83, cycles: 8 , mnemonic: 'RES 0, E'   , byteLength: 2, fn: implementationOf[0x83] }),
      new Instruction({ opcode: 0x84, cycles: 8 , mnemonic: 'RES 0, H'   , byteLength: 2, fn: implementationOf[0x84] }),
      new Instruction({ opcode: 0x85, cycles: 8 , mnemonic: 'RES 0, L'   , byteLength: 2, fn: implementationOf[0x85] }),
      new Instruction({ opcode: 0x86, cycles: 16, mnemonic: 'RES 0, (HL)', byteLength: 2, fn: implementationOf[0x86] }),
      new Instruction({ opcode: 0x87, cycles: 8 , mnemonic: 'RES 0, A'   , byteLength: 2, fn: implementationOf[0x87] }),
      new Instruction({ opcode: 0x88, cycles: 8 , mnemonic: 'RES 1, B'   , byteLength: 2, fn: implementationOf[0x88] }),
      new Instruction({ opcode: 0x89, cycles: 8 , mnemonic: 'RES 1, C'   , byteLength: 2, fn: implementationOf[0x89] }),
      new Instruction({ opcode: 0x8A, cycles: 8 , mnemonic: 'RES 1, D'   , byteLength: 2, fn: implementationOf[0x8A] }),
      new Instruction({ opcode: 0x8B, cycles: 8 , mnemonic: 'RES 1, E'   , byteLength: 2, fn: implementationOf[0x8B] }),
      new Instruction({ opcode: 0x8C, cycles: 8 , mnemonic: 'RES 1, H'   , byteLength: 2, fn: implementationOf[0x8C] }),
      new Instruction({ opcode: 0x8D, cycles: 8 , mnemonic: 'RES 1, L'   , byteLength: 2, fn: implementationOf[0x8D] }),
      new Instruction({ opcode: 0x8E, cycles: 16, mnemonic: 'RES 1, (HL)', byteLength: 2, fn: implementationOf[0x8E] }),
      new Instruction({ opcode: 0x8F, cycles: 8 , mnemonic: 'RES 1, A'   , byteLength: 2, fn: implementationOf[0x8F] }),
      new Instruction({ opcode: 0x90, cycles: 8 , mnemonic: 'RES 2, B'   , byteLength: 2, fn: implementationOf[0x90] }),
      new Instruction({ opcode: 0x91, cycles: 8 , mnemonic: 'RES 2, C'   , byteLength: 2, fn: implementationOf[0x91] }),
      new Instruction({ opcode: 0x92, cycles: 8 , mnemonic: 'RES 2, D'   , byteLength: 2, fn: implementationOf[0x92] }),
      new Instruction({ opcode: 0x93, cycles: 8 , mnemonic: 'RES 2, E'   , byteLength: 2, fn: implementationOf[0x93] }),
      new Instruction({ opcode: 0x94, cycles: 8 , mnemonic: 'RES 2, H'   , byteLength: 2, fn: implementationOf[0x94] }),
      new Instruction({ opcode: 0x95, cycles: 8 , mnemonic: 'RES 2, L'   , byteLength: 2, fn: implementationOf[0x95] }),
      new Instruction({ opcode: 0x96, cycles: 16, mnemonic: 'RES 2, (HL)', byteLength: 2, fn: implementationOf[0x96] }),
      new Instruction({ opcode: 0x97, cycles: 8 , mnemonic: 'RES 2, A'   , byteLength: 2, fn: implementationOf[0x97] }),
      new Instruction({ opcode: 0x98, cycles: 8 , mnemonic: 'RES 3, B'   , byteLength: 2, fn: implementationOf[0x98] }),
      new Instruction({ opcode: 0x99, cycles: 8 , mnemonic: 'RES 3, C'   , byteLength: 2, fn: implementationOf[0x99] }),
      new Instruction({ opcode: 0x9A, cycles: 8 , mnemonic: 'RES 3, D'   , byteLength: 2, fn: implementationOf[0x9A] }),
      new Instruction({ opcode: 0x9B, cycles: 8 , mnemonic: 'RES 3, E'   , byteLength: 2, fn: implementationOf[0x9B] }),
      new Instruction({ opcode: 0x9C, cycles: 8 , mnemonic: 'RES 3, H'   , byteLength: 2, fn: implementationOf[0x9C] }),
      new Instruction({ opcode: 0x9D, cycles: 8 , mnemonic: 'RES 3, L'   , byteLength: 2, fn: implementationOf[0x9D] }),
      new Instruction({ opcode: 0x9E, cycles: 16, mnemonic: 'RES 3, (HL)', byteLength: 2, fn: implementationOf[0x9E] }),
      new Instruction({ opcode: 0x9F, cycles: 8 , mnemonic: 'RES 3, A'   , byteLength: 2, fn: implementationOf[0x9F] }),
      new Instruction({ opcode: 0xA0, cycles: 8 , mnemonic: 'RES 4, B'   , byteLength: 2, fn: implementationOf[0xA0] }),
      new Instruction({ opcode: 0xA1, cycles: 8 , mnemonic: 'RES 4, C'   , byteLength: 2, fn: implementationOf[0xA1] }),
      new Instruction({ opcode: 0xA2, cycles: 8 , mnemonic: 'RES 4, D'   , byteLength: 2, fn: implementationOf[0xA2] }),
      new Instruction({ opcode: 0xA3, cycles: 8 , mnemonic: 'RES 4, E'   , byteLength: 2, fn: implementationOf[0xA3] }),
      new Instruction({ opcode: 0xA4, cycles: 8 , mnemonic: 'RES 4, H'   , byteLength: 2, fn: implementationOf[0xA4] }),
      new Instruction({ opcode: 0xA5, cycles: 8 , mnemonic: 'RES 4, L'   , byteLength: 2, fn: implementationOf[0xA5] }),
      new Instruction({ opcode: 0xA6, cycles: 16, mnemonic: 'RES 4, (HL)', byteLength: 2, fn: implementationOf[0xA6] }),
      new Instruction({ opcode: 0xA7, cycles: 8 , mnemonic: 'RES 4, A'   , byteLength: 2, fn: implementationOf[0xA7] }),
      new Instruction({ opcode: 0xA8, cycles: 8 , mnemonic: 'RES 5, B'   , byteLength: 2, fn: implementationOf[0xA8] }),
      new Instruction({ opcode: 0xA9, cycles: 8 , mnemonic: 'RES 5, C'   , byteLength: 2, fn: implementationOf[0xA9] }),
      new Instruction({ opcode: 0xAA, cycles: 8 , mnemonic: 'RES 5, D'   , byteLength: 2, fn: implementationOf[0xAA] }),
      new Instruction({ opcode: 0xAB, cycles: 8 , mnemonic: 'RES 5, E'   , byteLength: 2, fn: implementationOf[0xAB] }),
      new Instruction({ opcode: 0xAC, cycles: 8 , mnemonic: 'RES 5, H'   , byteLength: 2, fn: implementationOf[0xAC] }),
      new Instruction({ opcode: 0xAD, cycles: 8 , mnemonic: 'RES 5, L'   , byteLength: 2, fn: implementationOf[0xAD] }),
      new Instruction({ opcode: 0xAE, cycles: 16, mnemonic: 'RES 5, (HL)', byteLength: 2, fn: implementationOf[0xAE] }),
      new Instruction({ opcode: 0xAF, cycles: 8 , mnemonic: 'RES 5, A'   , byteLength: 2, fn: implementationOf[0xAF] }),
      new Instruction({ opcode: 0xB0, cycles: 8 , mnemonic: 'RES 6, B'   , byteLength: 2, fn: implementationOf[0xB0] }),
      new Instruction({ opcode: 0xB1, cycles: 8 , mnemonic: 'RES 6, C'   , byteLength: 2, fn: implementationOf[0xB1] }),
      new Instruction({ opcode: 0xB2, cycles: 8 , mnemonic: 'RES 6, D'   , byteLength: 2, fn: implementationOf[0xB2] }),
      new Instruction({ opcode: 0xB3, cycles: 8 , mnemonic: 'RES 6, E'   , byteLength: 2, fn: implementationOf[0xB3] }),
      new Instruction({ opcode: 0xB4, cycles: 8 , mnemonic: 'RES 6, H'   , byteLength: 2, fn: implementationOf[0xB4] }),
      new Instruction({ opcode: 0xB5, cycles: 8 , mnemonic: 'RES 6, L'   , byteLength: 2, fn: implementationOf[0xB5] }),
      new Instruction({ opcode: 0xB6, cycles: 16, mnemonic: 'RES 6, (HL)', byteLength: 2, fn: implementationOf[0xB6] }),
      new Instruction({ opcode: 0xB7, cycles: 8 , mnemonic: 'RES 6, A'   , byteLength: 2, fn: implementationOf[0xB7] }),
      new Instruction({ opcode: 0xB8, cycles: 8 , mnemonic: 'RES 7, B'   , byteLength: 2, fn: implementationOf[0xB8] }),
      new Instruction({ opcode: 0xB9, cycles: 8 , mnemonic: 'RES 7, C'   , byteLength: 2, fn: implementationOf[0xB9] }),
      new Instruction({ opcode: 0xBA, cycles: 8 , mnemonic: 'RES 7, D'   , byteLength: 2, fn: implementationOf[0xBA] }),
      new Instruction({ opcode: 0xBB, cycles: 8 , mnemonic: 'RES 7, E'   , byteLength: 2, fn: implementationOf[0xBB] }),
      new Instruction({ opcode: 0xBC, cycles: 8 , mnemonic: 'RES 7, H'   , byteLength: 2, fn: implementationOf[0xBC] }),
      new Instruction({ opcode: 0xBD, cycles: 8 , mnemonic: 'RES 7, L'   , byteLength: 2, fn: implementationOf[0xBD] }),
      new Instruction({ opcode: 0xBE, cycles: 16, mnemonic: 'RES 7, (HL)', byteLength: 2, fn: implementationOf[0xBE] }),
      new Instruction({ opcode: 0xBF, cycles: 8 , mnemonic: 'RES 7, A'   , byteLength: 2, fn: implementationOf[0xBF] }),
      new Instruction({ opcode: 0xC0, cycles: 8 , mnemonic: 'SET 0, B'   , byteLength: 2, fn: implementationOf[0xC0] }),
      new Instruction({ opcode: 0xC1, cycles: 8 , mnemonic: 'SET 0, C'   , byteLength: 2, fn: implementationOf[0xC1] }),
      new Instruction({ opcode: 0xC2, cycles: 8 , mnemonic: 'SET 0, D'   , byteLength: 2, fn: implementationOf[0xC2] }),
      new Instruction({ opcode: 0xC3, cycles: 8 , mnemonic: 'SET 0, E'   , byteLength: 2, fn: implementationOf[0xC3] }),
      new Instruction({ opcode: 0xC4, cycles: 8 , mnemonic: 'SET 0, H'   , byteLength: 2, fn: implementationOf[0xC4] }),
      new Instruction({ opcode: 0xC5, cycles: 8 , mnemonic: 'SET 0, L'   , byteLength: 2, fn: implementationOf[0xC5] }),
      new Instruction({ opcode: 0xC6, cycles: 16, mnemonic: 'SET 0, (HL)', byteLength: 2, fn: implementationOf[0xC6] }),
      new Instruction({ opcode: 0xC7, cycles: 8 , mnemonic: 'SET 0, A'   , byteLength: 2, fn: implementationOf[0xC7] }),
      new Instruction({ opcode: 0xC8, cycles: 8 , mnemonic: 'SET 1, B'   , byteLength: 2, fn: implementationOf[0xC8] }),
      new Instruction({ opcode: 0xC9, cycles: 8 , mnemonic: 'SET 1, C'   , byteLength: 2, fn: implementationOf[0xC9] }),
      new Instruction({ opcode: 0xCA, cycles: 8 , mnemonic: 'SET 1, D'   , byteLength: 2, fn: implementationOf[0xCA] }),
      new Instruction({ opcode: 0xCB, cycles: 8 , mnemonic: 'SET 1, E'   , byteLength: 2, fn: implementationOf[0xCB] }),
      new Instruction({ opcode: 0xCC, cycles: 8 , mnemonic: 'SET 1, H'   , byteLength: 2, fn: implementationOf[0xCC] }),
      new Instruction({ opcode: 0xCD, cycles: 8 , mnemonic: 'SET 1, L'   , byteLength: 2, fn: implementationOf[0xCD] }),
      new Instruction({ opcode: 0xCE, cycles: 16, mnemonic: 'SET 1, (HL)', byteLength: 2, fn: implementationOf[0xCE] }),
      new Instruction({ opcode: 0xCF, cycles: 8 , mnemonic: 'SET 1, A'   , byteLength: 2, fn: implementationOf[0xCF] }),
      new Instruction({ opcode: 0xD0, cycles: 8 , mnemonic: 'SET 2, B'   , byteLength: 2, fn: implementationOf[0xD0] }),
      new Instruction({ opcode: 0xD1, cycles: 8 , mnemonic: 'SET 2, C'   , byteLength: 2, fn: implementationOf[0xD1] }),
      new Instruction({ opcode: 0xD2, cycles: 8 , mnemonic: 'SET 2, D'   , byteLength: 2, fn: implementationOf[0xD2] }),
      new Instruction({ opcode: 0xD3, cycles: 8 , mnemonic: 'SET 2, E'   , byteLength: 2, fn: implementationOf[0xD3] }),
      new Instruction({ opcode: 0xD4, cycles: 8 , mnemonic: 'SET 2, H'   , byteLength: 2, fn: implementationOf[0xD4] }),
      new Instruction({ opcode: 0xD5, cycles: 8 , mnemonic: 'SET 2, L'   , byteLength: 2, fn: implementationOf[0xD5] }),
      new Instruction({ opcode: 0xD6, cycles: 16, mnemonic: 'SET 2, (HL)', byteLength: 2, fn: implementationOf[0xD6] }),
      new Instruction({ opcode: 0xD7, cycles: 8 , mnemonic: 'SET 2, A'   , byteLength: 2, fn: implementationOf[0xD7] }),
      new Instruction({ opcode: 0xD8, cycles: 8 , mnemonic: 'SET 3, B'   , byteLength: 2, fn: implementationOf[0xD8] }),
      new Instruction({ opcode: 0xD9, cycles: 8 , mnemonic: 'SET 3, C'   , byteLength: 2, fn: implementationOf[0xD9] }),
      new Instruction({ opcode: 0xDA, cycles: 8 , mnemonic: 'SET 3, D'   , byteLength: 2, fn: implementationOf[0xDA] }),
      new Instruction({ opcode: 0xDB, cycles: 8 , mnemonic: 'SET 3, E'   , byteLength: 2, fn: implementationOf[0xDB] }),
      new Instruction({ opcode: 0xDC, cycles: 8 , mnemonic: 'SET 3, H'   , byteLength: 2, fn: implementationOf[0xDC] }),
      new Instruction({ opcode: 0xDD, cycles: 8 , mnemonic: 'SET 3, L'   , byteLength: 2, fn: implementationOf[0xDD] }),
      new Instruction({ opcode: 0xDE, cycles: 16, mnemonic: 'SET 3, (HL)', byteLength: 2, fn: implementationOf[0xDE] }),
      new Instruction({ opcode: 0xDF, cycles: 8 , mnemonic: 'SET 3, A'   , byteLength: 2, fn: implementationOf[0xDF] }),
      new Instruction({ opcode: 0xE0, cycles: 8 , mnemonic: 'SET 4, B'   , byteLength: 2, fn: implementationOf[0xE0] }),
      new Instruction({ opcode: 0xE1, cycles: 8 , mnemonic: 'SET 4, C'   , byteLength: 2, fn: implementationOf[0xE1] }),
      new Instruction({ opcode: 0xE2, cycles: 8 , mnemonic: 'SET 4, D'   , byteLength: 2, fn: implementationOf[0xE2] }),
      new Instruction({ opcode: 0xE3, cycles: 8 , mnemonic: 'SET 4, E'   , byteLength: 2, fn: implementationOf[0xE3] }),
      new Instruction({ opcode: 0xE4, cycles: 8 , mnemonic: 'SET 4, H'   , byteLength: 2, fn: implementationOf[0xE4] }),
      new Instruction({ opcode: 0xE5, cycles: 8 , mnemonic: 'SET 4, L'   , byteLength: 2, fn: implementationOf[0xE5] }),
      new Instruction({ opcode: 0xE6, cycles: 16, mnemonic: 'SET 4, (HL)', byteLength: 2, fn: implementationOf[0xE6] }),
      new Instruction({ opcode: 0xE7, cycles: 8 , mnemonic: 'SET 4, A'   , byteLength: 2, fn: implementationOf[0xE7] }),
      new Instruction({ opcode: 0xE8, cycles: 8 , mnemonic: 'SET 5, B'   , byteLength: 2, fn: implementationOf[0xE8] }),
      new Instruction({ opcode: 0xE9, cycles: 8 , mnemonic: 'SET 5, C'   , byteLength: 2, fn: implementationOf[0xE9] }),
      new Instruction({ opcode: 0xEA, cycles: 8 , mnemonic: 'SET 5, D'   , byteLength: 2, fn: implementationOf[0xEA] }),
      new Instruction({ opcode: 0xEB, cycles: 8 , mnemonic: 'SET 5, E'   , byteLength: 2, fn: implementationOf[0xEB] }),
      new Instruction({ opcode: 0xEC, cycles: 8 , mnemonic: 'SET 5, H'   , byteLength: 2, fn: implementationOf[0xEC] }),
      new Instruction({ opcode: 0xED, cycles: 8 , mnemonic: 'SET 5, L'   , byteLength: 2, fn: implementationOf[0xED] }),
      new Instruction({ opcode: 0xEE, cycles: 16, mnemonic: 'SET 5, (HL)', byteLength: 2, fn: implementationOf[0xEE] }),
      new Instruction({ opcode: 0xEF, cycles: 8 , mnemonic: 'SET 5, A'   , byteLength: 2, fn: implementationOf[0xEF] }),
      new Instruction({ opcode: 0xF0, cycles: 8 , mnemonic: 'SET 6, B'   , byteLength: 2, fn: implementationOf[0xF0] }),
      new Instruction({ opcode: 0xF1, cycles: 8 , mnemonic: 'SET 6, C'   , byteLength: 2, fn: implementationOf[0xF1] }),
      new Instruction({ opcode: 0xF2, cycles: 8 , mnemonic: 'SET 6, D'   , byteLength: 2, fn: implementationOf[0xF2] }),
      new Instruction({ opcode: 0xF3, cycles: 8 , mnemonic: 'SET 6, E'   , byteLength: 2, fn: implementationOf[0xF3] }),
      new Instruction({ opcode: 0xF4, cycles: 8 , mnemonic: 'SET 6, H'   , byteLength: 2, fn: implementationOf[0xF4] }),
      new Instruction({ opcode: 0xF5, cycles: 8 , mnemonic: 'SET 6, L'   , byteLength: 2, fn: implementationOf[0xF5] }),
      new Instruction({ opcode: 0xF6, cycles: 16, mnemonic: 'SET 6, (HL)', byteLength: 2, fn: implementationOf[0xF6] }),
      new Instruction({ opcode: 0xF7, cycles: 8 , mnemonic: 'SET 6, A'   , byteLength: 2, fn: implementationOf[0xF7] }),
      new Instruction({ opcode: 0xF8, cycles: 8 , mnemonic: 'SET 7, B'   , byteLength: 2, fn: implementationOf[0xF8] }),
      new Instruction({ opcode: 0xF9, cycles: 8 , mnemonic: 'SET 7, C'   , byteLength: 2, fn: implementationOf[0xF9] }),
      new Instruction({ opcode: 0xFA, cycles: 8 , mnemonic: 'SET 7, D'   , byteLength: 2, fn: implementationOf[0xFA] }),
      new Instruction({ opcode: 0xFB, cycles: 8 , mnemonic: 'SET 7, E'   , byteLength: 2, fn: implementationOf[0xFB] }),
      new Instruction({ opcode: 0xFC, cycles: 8 , mnemonic: 'SET 7, H'   , byteLength: 2, fn: implementationOf[0xFC] }),
      new Instruction({ opcode: 0xFD, cycles: 8 , mnemonic: 'SET 7, L'   , byteLength: 2, fn: implementationOf[0xFD] }),
      new Instruction({ opcode: 0xFE, cycles: 16, mnemonic: 'SET 7, (HL)', byteLength: 2, fn: implementationOf[0xFE] }),
      new Instruction({ opcode: 0xFF, cycles: 8 , mnemonic: 'SET 7, A'   , byteLength: 2, fn: implementationOf[0xFF] }),
    ];

    return instructions;
  }

  //#endregion

  //#region Opcode implementation

  #getMCImplementationByOpcode() {
    const noop = () => {};
    
    const operand = () => this.operand();
    
    const halt = () => this.#isHalted = true;
    
    const stop = (byte) => this.#isStopped = byte === 0x00;

    const enableInterrupts = () => this.#IME = true;
    const disableInterrupts = () => this.#IME = false;

    return {
      0x00: () => { noop(); },
      0x01: () => { stop( operand() ); },

      0x76: () => { halt(); },

      0xF3: () => { disableInterrupts(); },

      0xCB: () => { noop() },
      0xFB: () => { enableInterrupts()},
    };
  }

  #getJCImplementationByOpcode() {
    const extendByteSign = (byte) => byte << 24 >> 24;

    const operand = () => this.operand();
    const operand16 = () => {
      const lowByte = operand();
      const highByte = operand();
      return (highByte << 8) | lowByte;
    };

    const signedOperand = () => extendByteSign(operand());

    const popStack = () => this.#pop();
    const pushStack = (word) => this.#push(word);

    const saveRegisters = () => this.#saveRegisters();
    const restoreRegisters = () => this.#restoreRegisters();

    const isZeroFlagDisabled = () => this.#F.Z === 0;
    const isZeroFlagEnabled = () => this.#F.Z;
    const isCarryFlagDisabled = () => this.#F.C === 0;
    const isCarryFlagEnabled = () => this.#F.C;

    /** @type {(address: uint16) => void} */
    const jumpTo = (address) => {
      this.#PC = address; 
    };

    /** @type {(predicate: () => boolean) => uint8 | undefined} */
    const jumpIf = (predicate) => {
      const address = operand16();
      if (predicate()) {
        this.#PC = address;
        return 4;
      }
    };

    /** @type {(offset: int8) => void} */
    const relativeJumpBy = (offset) => {
      this.#PC += offset;
    };

    /** @type {(predicate: () => boolean) => uint8 | undefined} */
    const relativeJumpIf = (predicate) => {
      const offset = signedOperand();
      if (predicate()) {
        this.#PC += offset;
        return 4;
      }
    };


    const returnUnconditionally = () => {
      this.#PC = popStack();
    };

    /** @type {(predicate: () => boolean) => uint8 | undefined} */
    const returnIf = (predicate) => {
      if (predicate()) {
        this.#PC = popStack();
        return 12;
      }
    };

    const returnFromInterrupt = () => {
      restoreRegisters();
      this.#PC = popStack();
      this.#IME = 1;
    };

    /** @type {(address: uint16) => void} */
    const callTo = (address) => {
      pushStack(this.#PC);
      this.#PC = address;
    };
    
    /** @type {(predicate: () => boolean) => uint8 | undefined} */
    const callIf = (predicate) => {
      const address = operand16()
      if (predicate()) {
        pushStack(this.#PC);
        this.#PC = address;
        return 12;
      }
    };

    const restartAt = (byte) => {
      saveRegisters();
      pushStack(this.#PC);
      this.#PC = byte & 0xFF; // Page zero
    };

    return {
      0x20: () => { return relativeJumpIf( isZeroFlagDisabled ); },
      0x30: () => { return relativeJumpIf( isCarryFlagDisabled ); },

      0x18: () => { return relativeJumpBy( signedOperand() ); },
      0x28: () => { return relativeJumpIf( isZeroFlagEnabled ); },
      0x38: () => { return relativeJumpIf( isCarryFlagEnabled ); },

      0xC0: () => { return returnIf( isZeroFlagDisabled ); },
      0xD0: () => { return returnIf( isCarryFlagDisabled ); },

      0xC2: () => { return jumpIf( isZeroFlagDisabled ); },
      0xD2: () => { return jumpIf( isCarryFlagDisabled ); },

      0xC3: () => { return jumpTo( operand16() ); },

      0xC4: () => { return callIf( isZeroFlagDisabled ); },
      0xD4: () => { return callIf( isCarryFlagDisabled ); },

      0xC7: () => { return restartAt( 0x00 ); },
      0xD7: () => { return restartAt( 0x10 ); },
      0xE7: () => { return restartAt( 0x20 ); },
      0xF7: () => { return restartAt( 0x30 ); },

      0xC8: () => { return returnIf( isZeroFlagEnabled ); },
      0xD8: () => { return returnIf( isCarryFlagEnabled ); },

      0xC9: () => { return returnUnconditionally(); },
      0xD9: () => { return returnFromInterrupt(); },
      0xE9: () => { return jumpTo( this.#HL ); },

      0xCA: () => { return jumpIf( isZeroFlagEnabled ); },
      0xDA: () => { return jumpIf( isCarryFlagEnabled ); },

      0xCC: () => { return callIf( isZeroFlagEnabled ); },
      0xDC: () => { return callIf( isCarryFlagEnabled ); },

      0xCD: () => { return callTo( operand16() ); },

      0xCF: () => { return restartAt( 0x08 ); },
      0xDF: () => { return restartAt( 0x18 ); },
      0xEF: () => { return restartAt( 0x28 ); },
      0xFF: () => { return restartAt( 0x38 ); },
    };
  }

  #getLSM8bitImplementationByOpcode() {
    const readMemory = (address) => this.#read(address);
    const loadMemory = (address, byte) => this.#write(address, byte);

    const operand = () => this.operand();
    const operand16 = () => {
      const lowByte = operand();
      const highByte = operand();
      return (highByte << 8) | lowByte;
    };
    
    const readHRAM = (addressLowByte) => this.#read(0xFF00 | addressLowByte);
    const loadHRAM = (addressLowByte, byte) => this.#write(0xFF00 | addressLowByte, byte)

    const loadRegisterA = (byte) => this.#A = byte;
    const loadRegisterB = (byte) => this.#B = byte;
    const loadRegisterC = (byte) => this.#C = byte;
    const loadRegisterD = (byte) => this.#D = byte;
    const loadRegisterE = (byte) => this.#E = byte;
    const loadRegisterH = (byte) => this.#H = byte;
    const loadRegisterL = (byte) => this.#L = byte;

    const loadMemoryPointedByBC = (byte) => this.#write(this.#BC, byte);
    const loadMemoryPointedByDE = (byte) => this.#write(this.#DE, byte);
    const loadMemoryPointedByHL = (byte) => this.#write(this.#HL, byte);

    const decrementHL = () => this.#HL--;
    const incrementHL = () => this.#HL++;

    return {
      0x02: () => { loadMemoryPointedByBC( this.#A ); },
      0x12: () => { loadMemoryPointedByDE( this.#A ); },
      0x22: () => { loadMemoryPointedByHL( this.#A ); incrementHL(); },
      0x32: () => { loadMemoryPointedByHL( this.#A ); decrementHL(); },

      0x06: () => { loadRegisterB( operand() ); },
      0x16: () => { loadRegisterD( operand() ); },
      0x26: () => { loadRegisterH( operand() ); },
      0x36: () => { loadMemoryPointedByHL( operand() ); },

      0x0A: () => { loadRegisterA( readMemory(this.#BC) ); },
      0x1A: () => { loadRegisterA( readMemory(this.#DE) ); },
      0x2A: () => { loadRegisterA( readMemory(this.#HL) ); incrementHL() },
      0x3A: () => { loadRegisterA( readMemory(this.#HL) ); decrementHL() },

      0x0E: () => { loadRegisterC( operand() ); },
      0x1E: () => { loadRegisterE( operand() ); },
      0x2E: () => { loadRegisterL( operand() ); },
      0x3E: () => { loadRegisterA( operand() ); },

      0x40: () => { loadRegisterB( this.#B ); },
      0x41: () => { loadRegisterB( this.#C ); },
      0x42: () => { loadRegisterB( this.#D ); },
      0x43: () => { loadRegisterB( this.#E ); },
      0x44: () => { loadRegisterB( this.#H ); },
      0x45: () => { loadRegisterB( this.#L ); },
      0x46: () => { loadRegisterB( readMemory(this.#HL) ); },
      0x47: () => { loadRegisterB( this.#A ); },

      0x48: () => { loadRegisterC( this.#B ); },
      0x49: () => { loadRegisterC( this.#C ); },
      0x4A: () => { loadRegisterC( this.#D ); },
      0x4B: () => { loadRegisterC( this.#E ); },
      0x4C: () => { loadRegisterC( this.#H ); },
      0x4D: () => { loadRegisterC( this.#L ); },
      0x4E: () => { loadRegisterC( readMemory(this.#HL) ); },
      0x4F: () => { loadRegisterC( this.#A ); },

      0x50: () => { loadRegisterD( this.#B ); },
      0x51: () => { loadRegisterD( this.#C ); },
      0x52: () => { loadRegisterD( this.#D ); },
      0x53: () => { loadRegisterD( this.#E ); },
      0x54: () => { loadRegisterD( this.#H ); },
      0x55: () => { loadRegisterD( this.#L ); },
      0x56: () => { loadRegisterD( readMemory(this.#HL) ); },
      0x57: () => { loadRegisterD( this.#A ); },

      0x58: () => { loadRegisterE( this.#B ); },
      0x59: () => { loadRegisterE( this.#C ); },
      0x5A: () => { loadRegisterE( this.#D ); },
      0x5B: () => { loadRegisterE( this.#E ); },
      0x5C: () => { loadRegisterE( this.#H ); },
      0x5D: () => { loadRegisterE( this.#L ); },
      0x5E: () => { loadRegisterE( readMemory(this.#HL) ); },
      0x5F: () => { loadRegisterE( this.#A ); },

      0x60: () => { loadRegisterH( this.#B ); },
      0x61: () => { loadRegisterH( this.#C ); },
      0x62: () => { loadRegisterH( this.#D ); },
      0x63: () => { loadRegisterH( this.#E ); },
      0x64: () => { loadRegisterH( this.#H ); },
      0x65: () => { loadRegisterH( this.#L ); },
      0x66: () => { loadRegisterH( readMemory(this.#HL) ); },
      0x67: () => { loadRegisterH( this.#A ); },

      0x68: () => { loadRegisterL( this.#B ); },
      0x69: () => { loadRegisterL( this.#C ); },
      0x6A: () => { loadRegisterL( this.#D ); },
      0x6B: () => { loadRegisterL( this.#E ); },
      0x6C: () => { loadRegisterL( this.#H ); },
      0x6D: () => { loadRegisterL( this.#L ); },
      0x6E: () => { loadRegisterL( readMemory(this.#HL) ); },
      0x6F: () => { loadRegisterL( this.#A ); },

      0x70: () => { loadMemoryPointedByHL( this.#B ); },
      0x71: () => { loadMemoryPointedByHL( this.#C ); },
      0x72: () => { loadMemoryPointedByHL( this.#D ); },
      0x73: () => { loadMemoryPointedByHL( this.#E ); },
      0x74: () => { loadMemoryPointedByHL( this.#H ); },
      0x75: () => { loadMemoryPointedByHL( this.#L ); },
      0x77: () => { loadMemoryPointedByHL( this.#A ); },

      0x78: () => { loadRegisterA( this.#B ); },
      0x79: () => { loadRegisterA( this.#C ); },
      0x7A: () => { loadRegisterA( this.#D ); },
      0x7B: () => { loadRegisterA( this.#E ); },
      0x7C: () => { loadRegisterA( this.#H ); },
      0x7D: () => { loadRegisterA( this.#L ); },
      0x7E: () => { loadRegisterA( readMemory(this.#HL) ); },
      0x7F: () => { loadRegisterA( this.#A ); },

      0xE0: () => { loadHRAM( operand(), this.#A ); },
      0xF0: () => { loadRegisterA( readHRAM(operand()) ); },

      0xE2: () => { loadHRAM( this.#C, this.#A ) },
      0xF2: () => { loadRegisterA( readHRAM(this.#C) ) },

      0xEA: () => { loadMemory( operand16(), this.#A )  },
      0xFA: () => { loadRegisterA( readMemory(operand16()) ) },
    };
  }

  #getLSM16bitImplementationByOpcode() {
    const loadMemory = (address, byte) => this.#write(address, byte);

    const operand = () => this.operand();
    const operand16 = () => {
      const lowByte = operand();
      const highByte = operand();
      return (highByte << 8) | lowByte;
    };

    const loadRegisterBC = (word) => this.#BC = word;
    const loadRegisterDE = (word) => this.#DE = word;
    const loadRegisterHL = (word) => this.#HL = word;
    const loadRegisterSP = (word) => this.#SP = word;
    const loadRegisterAF = (word) => this.#AF = word;

    const popStack = () => this.#pop();
    const pushStack = (word) => this.#push(word);

    return {
      0x01: () => { loadRegisterBC( operand16() ) },
      0x11: () => { loadRegisterDE( operand16() ) },
      0x21: () => { loadRegisterHL( operand16() ) },
      0x31: () => { loadRegisterSP( operand16() ) },

      0x08: () => { loadMemory( operand16(), this.#SP ) },

      0xC1: () => { loadRegisterBC( popStack() ); },
      0xD1: () => { loadRegisterDE( popStack() ); },
      0xE1: () => { loadRegisterHL( popStack() ); },
      0xF1: () => { loadRegisterAF( popStack() ); }, // TODO: Handle flags

      0xC5: () => { pushStack( this.#BC ); },
      0xD5: () => { pushStack( this.#DE ); },
      0xE5: () => { pushStack( this.#HL ); },
      0xF5: () => { pushStack( this.#AF ); },

      0xF8: () => { null; }, // TODO: Pending implementation, and handle flags
      0xF9: () => { null; }, // TODO: Pending implementation
    };
  }

  // TODO: Handle flags
  #getAL8bitImplementationByOpcode() {
    const readMemory = (address) => this.#read(address);
    const loadMemory = (address, byte) => this.#write(address, byte);

    const operand = () => this.operand();
    
    const incrementA = () => { const previous = this.#A++; this.#F.Z = this.#A.equals(0); this.#F.N = 0; this.#F.H = ((previous & 0xF) > (this.#A & 0xF)); };
    const incrementB = () => { const previous = this.#B++; this.#F.Z = this.#B.equals(0); this.#F.N = 0; this.#F.H = ((previous & 0xF) > (this.#B & 0xF)); };
    const incrementC = () => { const previous = this.#C++; this.#F.Z = this.#C.equals(0); this.#F.N = 0; this.#F.H = ((previous & 0xF) > (this.#C & 0xF)); };
    const incrementD = () => { const previous = this.#D++; this.#F.Z = this.#D.equals(0); this.#F.N = 0; this.#F.H = ((previous & 0xF) > (this.#D & 0xF)); };
    const incrementE = () => { const previous = this.#E++; this.#F.Z = this.#E.equals(0); this.#F.N = 0; this.#F.H = ((previous & 0xF) > (this.#E & 0xF)); };
    const incrementH = () => { const previous = this.#H++; this.#F.Z = this.#H.equals(0); this.#F.N = 0; this.#F.H = ((previous & 0xF) > (this.#H & 0xF)); };
    const incrementL = () => { const previous = this.#L++; this.#F.Z = this.#L.equals(0); this.#F.N = 0; this.#F.H = ((previous & 0xF) > (this.#L & 0xF)); };

    const decrementA = () => { const previous = this.#A--; this.#F.Z = this.#A.equals(0); this.#F.N = 1; this.#F.H = ((previous & 0xF) > (this.#A & 0xF));};
    const decrementB = () => { const previous = this.#B--; this.#F.Z = this.#B.equals(0); this.#F.N = 1; this.#F.H = ((previous & 0xF) > (this.#B & 0xF));};
    const decrementC = () => { const previous = this.#C--; this.#F.Z = this.#C.equals(0); this.#F.N = 1; this.#F.H = ((previous & 0xF) > (this.#C & 0xF));};
    const decrementD = () => { const previous = this.#D--; this.#F.Z = this.#D.equals(0); this.#F.N = 1; this.#F.H = ((previous & 0xF) > (this.#D & 0xF));};
    const decrementE = () => { const previous = this.#E--; this.#F.Z = this.#E.equals(0); this.#F.N = 1; this.#F.H = ((previous & 0xF) > (this.#E & 0xF));};
    const decrementH = () => { const previous = this.#H--; this.#F.Z = this.#H.equals(0); this.#F.N = 1; this.#F.H = ((previous & 0xF) > (this.#H & 0xF));};
    const decrementL = () => { const previous = this.#L--; this.#F.Z = this.#L.equals(0); this.#F.N = 1; this.#F.H = ((previous & 0xF) > (this.#L & 0xF));};

    const nibble = (value, position) => (value >>> (4 * position)) & 0xF;
    const applyDecimalCorrectionForA = () => {
      const MAX_UINT4 = 0xF;
      const MAX_UINT4_BCD = 0x9;
      const BINARY_TO_BCD_GAP = MAX_UINT4 - MAX_UINT4_BCD;

      let bcdByte = this.#A;

      if (this.#F.H || nibble(bcdByte, 0) > MAX_UINT4_BCD) {
        bcdByte += BINARY_TO_BCD_GAP;
      }

      if (this.#F.C || nibble(bcdByte, 1) > MAX_UINT4_BCD) {
        bcdByte += BINARY_TO_BCD_GAP * 0x10;
      }

      this.#F.Z = bcdByte === 0;
      this.#F.H = 0;
      this.#F.C = nibble(bcdByte, 1) > MAX_UINT4_BCD; // Set C if there is a decimal carry

      this.#A = bcdByte;
    };


    const setCarryFlag = () => {
      this.#F.Cy = 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = 0;
    };

    const complementA = () => {
      this.#A ^= 0xFF;
      this.#F.N = 1;
      this.#F.H = 1;
    };

    const complementCarryFlag = () => {
      this.#F.Cy ^= 1;
      this.#F.N = 0;
      this.#F.H = 0;
    };

    const hasHalfCarry = (x, y) => (nibble(x, 0) + nibble(y, 0)) & 0x10;

    const hasCarry = (x, y) => (x + y) & 0x100;

    const register = {
      A: {
        add: (byte) => {    
          const oldA = this.#A;
          this.#A += byte;
          this.#F.Z = this.#A.equals(0);
          this.#F.N = 0;
          this.#F.H = hasHalfCarry(oldA, byte);
          this.#F.C = hasCarry(oldA, byte);
        },
        sub: (byte) => {    
          const oldA = this.#A;
          this.#A -= byte;
          this.#F.Z = this.#A.equals(0);
          this.#F.N = 1;
          this.#F.H = hasHalfCarry(oldA, byte);
          this.#F.C = hasCarry(oldA, byte);
        },
        and: (byte) => {    
          this.#A &= byte;
          this.#F.Z = this.#A.equals(0);
          this.#F.N = 0;
          this.#F.H = 1;
          this.#F.C = 0;
        },
        or: (byte) => {    
          this.#A |= byte;
          this.#F.Z = this.#A.equals(0);
          this.#F.N = 0;
          this.#F.H = 0;
          this.#F.C = 0;
        },
        adc: (byte) => register.A.add(byte + this.#F.C),
        sbc: (byte) => register.A.sub(byte - this.#F.C),
        xor: (byte) => {
          this.#A ^= byte;
          this.#F.Z = this.#A.equals(0);
          this.#F.N = 0;
          this.#F.H = 0;
          this.#F.C = 0;
        },
        cp: (byte) => {
          const difference = this.#A - byte;
          this.#F.Z = difference === 0;
          this.#F.N = 1;
          this.#F.H = hasHalfCarry(this.#A, byte);
          this.#F.C = hasCarry(this.#A, byte);
        },
      },
    };

    return {
      0x04: () => { incrementB(); },
      0x14: () => { incrementD(); },
      0x24: () => { incrementH(); },
      0x34: () => { loadMemory( this.#HL, readMemory(this.#HL) + 1 ); },

      0x05: () => { decrementB(); },
      0x15: () => { decrementD(); },
      0x25: () => { decrementH(); },
      0x35: () => { loadMemory( this.#HL, readMemory(this.#HL) - 1 ); },

      0x27: () => { applyDecimalCorrectionForA(); },
      0x37: () => { setCarryFlag() },

      0x0C: () => { incrementC(); },
      0x1C: () => { incrementE(); },
      0x2C: () => { incrementL(); },
      0x3C: () => { incrementA(); },

      0x0D: () => { decrementC(); },
      0x1D: () => { decrementE(); },
      0x2D: () => { decrementL(); },
      0x3D: () => { decrementA(); },

      0x2F: () => { complementA(); },
      0x3F: () => { complementCarryFlag(); },

      0x80: () => { register.A.add(this.#B); },
      0x90: () => { register.A.sub(this.#B); },
      0xA0: () => { register.A.and(this.#B); },
      0xB0: () => { register.A.or(this.#B); },

      0x81: () => { register.A.add(this.#C); },
      0x91: () => { register.A.sub(this.#C); },
      0xA1: () => { register.A.and(this.#C); },
      0xB1: () => { register.A.or(this.#C); },

      0x82: () => { register.A.add(this.#D); },
      0x92: () => { register.A.sub(this.#D); },
      0xA2: () => { register.A.and(this.#D); },
      0xB2: () => { register.A.or(this.#D); },

      0x83: () => { register.A.add(this.#E); },
      0x93: () => { register.A.sub(this.#E); },
      0xA3: () => { register.A.and(this.#E); },
      0xB3: () => { register.A.or(this.#E); },

      0x84: () => { register.A.add(this.#H); },
      0x94: () => { register.A.sub(this.#H); },
      0xA4: () => { register.A.and(this.#H); },
      0xB4: () => { register.A.or(this.#H); },

      0x85: () => { register.A.add(this.#L); },
      0x95: () => { register.A.sub(this.#L); },
      0xA5: () => { register.A.and(this.#L); },
      0xB5: () => { register.A.or(this.#L); },

      0x86: () => { register.A.add( readMemory(this.#HL) ); },
      0x96: () => { register.A.sub( readMemory(this.#HL) ); },
      0xA6: () => { register.A.and( readMemory(this.#HL) ); },
      0xB6: () => { register.A.or( readMemory(this.#HL) ); },

      0x87: () => { register.A.add(this.#A); },
      0x97: () => { register.A.sub(this.#A); },
      0xA7: () => { register.A.and(this.#A); },
      0xB7: () => { register.A.or(this.#A); },

      0x88: () => { register.A.adc(this.#B); },
      0x98: () => { register.A.sbc(this.#B); },
      0xA8: () => { register.A.xor(this.#B); },
      0xB8: () => { register.A.cp(this.#B); },

      0x89: () => { register.A.adc(this.#C); },
      0x99: () => { register.A.sbc(this.#C); },
      0xA9: () => { register.A.xor(this.#C); },
      0xB9: () => { register.A.cp(this.#C); },

      0x8A: () => { register.A.adc(this.#D); },
      0x9A: () => { register.A.sbc(this.#D); },
      0xAA: () => { register.A.xor(this.#D); },
      0xBA: () => { register.A.cp(this.#D); },

      0x8B: () => { register.A.adc(this.#E); },
      0x9B: () => { register.A.sbc(this.#E); },
      0xAB: () => { register.A.xor(this.#E); },
      0xBB: () => { register.A.cp(this.#E); },

      0x8C: () => { register.A.adc(this.#H); },
      0x9C: () => { register.A.sbc(this.#H); },
      0xAC: () => { register.A.xor(this.#H); },
      0xBC: () => { register.A.cp(this.#H); },

      0x8D: () => { register.A.adc(this.#L); },
      0x9D: () => { register.A.sbc(this.#L); },
      0xAD: () => { register.A.xor(this.#L); },
      0xBD: () => { register.A.cp(this.#L); },

      0x8E: () => { register.A.adc( readMemory(this.#HL) ); },
      0x9E: () => { register.A.sbc( readMemory(this.#HL) ); },
      0xAE: () => { register.A.xor( readMemory(this.#HL) ); },
      0xBE: () => { register.A.cp( readMemory(this.#HL) ); },

      0x8F: () => { register.A.adc(this.#A); },
      0x9F: () => { register.A.sbc(this.#A); },
      0xAF: () => { register.A.xor(this.#A); },
      0xBF: () => { register.A.cp(this.#A); },

      0xC6: () => { register.A.add( operand() ); },
      0xD6: () => { register.A.sub( operand() ); },
      0xE6: () => { register.A.and( operand() ); },
      0xF6: () => { register.A.or( operand() ); },

      0xCE: () => { register.A.adc( operand() ); },
      0xDE: () => { register.A.sbc( operand() ); },
      0xEE: () => { register.A.xor( operand() ); },
      0xFE: () => { register.A.cp( operand() ); },
    };
  }

  #getAL16bitImplementationByOpcode() {
    const operand = () => this.operand();

    const hasHalfCarry16 = (x, y) => ((x & 0xFFF) + (y & 0xFFF)) & 0x1000;

    const hasCarry16 = (x, y) => (x + y) & 0x10000;

    const register = {
      HL: {
        add: (word) => {
          const oldHL = this.#HL;
          this.#HL += word;
          this.#F.N = 0;
          this.#F.H = hasHalfCarry16(oldHL, word);
          this.#F.C = hasCarry16(oldHL, word);
        },
      },
      SP: {
        add: (word) => {
          const oldSP = this.#SP;
          this.#SP += word;
          this.#F.Z = 0;
          this.#F.N = 0;
          this.#F.H = hasHalfCarry16(oldSP, word);
          this.#F.C = hasCarry16(oldSP, word);
        },
      },
    };

    return {
      0x03: () => { this.#BC += 1; },
      0x13: () => { this.#DE += 1; },
      0x23: () => { this.#HL += 1; },
      0x33: () => { this.#SP += 1; },

      0x09: () => { register.HL.add(this.#BC); },
      0x19: () => { register.HL.add(this.#DE); },
      0x29: () => { register.HL.add(this.#HL); },
      0x39: () => { register.HL.add(this.#SP); },

      0x0B: () => { this.#BC -= 1; },
      0x1B: () => { this.#DE -= 1; },
      0x2B: () => { this.#HL -= 1; },
      0x3B: () => { this.#SP -= 1; },

      0xE8: () => { register.SP.add( operand() ); },
    };
  }

  #getR8bitImplementationByOpcode() {
    const register = {
      A: {
        rlc: () => {
          const high = (this.#A << 1);
          const low = (this.#A >>> 7);
          this.#A = (high & 0xFF) | (low & 1);
          this.#F.Z = 0;
          this.#F.N = 0;
          this.#F.H = 0;
          this.#F.C = high & 0x100;
        },
        rl: () => {
          const high = (this.#A << 1);
          this.#A = (high & 0xFF) | (this.C & 1);
          this.#F.Z = 0;
          this.#F.N = 0;
          this.#F.H = 0;
          this.#F.C = high & 0x100;
        },
        rrc: () => {
          const high = (this.#A << 7);
          const low = (this.#A >>> 1);
          this.#A = (high & 0x80) | (low & 0xFF);
          this.#F.Z = 0;
          this.#F.N = 0;
          this.#F.H = 0;
          this.#F.C = high & 0x80;
        },
        rr: () => {
          const low = this.#A >>> 1;
          const carry = this.#A & 1;
          this.#A = ((this.#F.C << 7) & 0x80) | (low & 0xFF);
          this.#F.Z = 0;
          this.#F.N = 0;
          this.#F.H = 0;
          this.#F.C = carry;
        },
      },
    };

    return {
      0x07: () => { register.A.rlc(); },
      0x17: () => { register.A.rl(); },

      0x0F: () => { register.A.rrc(); },
      0x1F: () => { register.A.rr(); },
    };
  }

  #getUBImplementationByOpcode() {
    const ub = () => console.log('????');

    return {
      0xD3: ub,
      0xE3: ub,

      0xE4: ub,
      0xF4: ub,

      0xDB: ub,
      0xEB: ub,

      0xEC: ub,
      0xFC: ub,

      0xDD: ub,
      0xED: ub,
      0xFD: ub,
    };
  }

  #getPrefixCBOperationByOpcode() {
    const readMemory = (address) => this.#read(address);

    const writeMemory = (address, byte) => this.#write(address, byte);

    const rlc = (byte) => {
      const rotated = ((byte << 1) & 0xFF) | ((byte >>> 7) & 1);
      this.#F.Z = rotated === 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = byte & 0x80;
      return rotated;
    };

    const rrc = (byte) => {
      const rotated = ((byte << 7) & 0x80) | ((byte >>> 1) & 0xFF);
      this.#F.Z = rotated === 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = byte & 1;
      return rotated;
    };

    const rl = (byte) => {
      const rotated = ((byte << 1) & 0xFF) | (this.#F.C & 1);
      this.#F.Z = rotated === 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = byte & 0x80;
      return rotated;
    };

    const rr = (byte) => {
      const rotated = ((this.#F.C << 7) & 0x80) | ((byte >>> 7) & 0xFF);
      this.#F.Z = rotated === 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = byte & 1;
      return rotated;
    };

    const sla = (byte) => {
      const shifted = (byte << 1) & 0xFF;
      this.#F.Z = shifted === 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = byte & 0x80;
      return shifted;
    };

    const sra = (byte) => {
      const shifted = (byte & 0x80) | ((byte >>> 1) & 0xFF);
      this.#F.Z = shifted === 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = 0;
      return shifted;
    };

    const swap = (byte) => {
      const swapped = ((byte & 0xF) << 4) | ((byte >>> 4) & 0xF);
      this.#F.Z = swapped === 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = 0;
      return swapped;
    };

    const srl = (byte) => {
      const shifted = (byte >>> 1) & 0xFF;
      this.#F.Z = shifted === 0;
      this.#F.N = 0;
      this.#F.H = 0;
      this.#F.C = byte & 1;
      return shifted;
    };

    const bit = (byte) => (position) => {
      this.#F.Z = ((byte >>> position) & 1) === 0;
      this.#F.N = 0;
      this.#F.H = 1;
    };

    const set = (byte) => (position) => byte | (1 << position);

    const res = (byte) => (position) => byte & ~(1 << position);

    const register = {
      B: {
         rlc: () => { this.#B = rlc(this.#B); },
         rrc: () => { this.#B = rrc(this.#B); },
          rl: () => { this.#B = rl(this.#B); },
          rr: () => { this.#B = rr(this.#B); },
         sla: () => { this.#B = sla(this.#B); },
         sra: () => { this.#B = sra(this.#B); },
        swap: () => { this.#B = swap(this.#B); },
         srl: () => { this.#B = srl(this.#B); },
         res: (position) => () => { this.#B = res(this.#B)(position); },
         bit: (position) => () => bit(this.#B)(position),
         set: (position) => () => { this.#B = set(this.#B)(position); },
      },
      C: {
        rlc: () => { this.#C = rlc(this.#C); },
        rrc: () => { this.#C = rrc(this.#C); },
         rl: () => { this.#C = rl(this.#C); },
         rr: () => { this.#C = rr(this.#C); },
        sla: () => { this.#C = sla(this.#C); },
        sra: () => { this.#C = sra(this.#C); },
       swap: () => { this.#C = swap(this.#C); },
        srl: () => { this.#C = srl(this.#C); },
        res: (position) => () => { this.#C = res(this.#C)(position); },
        bit: (position) => () => bit(this.#C)(position),
        set: (position) => () => { this.#C = set(this.#C)(position); },
      },
      D: {
         rlc: () => { this.#D = rlc(this.#D); },
         rrc: () => { this.#D = rrc(this.#D); },
          rl: () => { this.#D = rl(this.#D); },
          rr: () => { this.#D = rr(this.#D); },
         sla: () => { this.#D = sla(this.#D); },
         sra: () => { this.#D = sra(this.#D); },
        swap: () => { this.#D = swap(this.#D); },
         srl: () => { this.#D = srl(this.#D); },
         res: (position) => () => { this.#D = res(this.#D)(position); },
         bit: (position) => () => bit(this.#D)(position),
         set: (position) => () => { this.#D = set(this.#D)(position); },
      },
      E: {
        rlc: () => { this.#E = rlc(this.#E); },
        rrc: () => { this.#E = rrc(this.#E); },
         rl: () => { this.#E = rl(this.#E); },
         rr: () => { this.#E = rr(this.#E); },
        sla: () => { this.#E = sla(this.#E); },
        sra: () => { this.#E = sra(this.#E); },
       swap: () => { this.#E = swap(this.#E); },
        srl: () => { this.#E = srl(this.#E); },
        res: (position) => () => { this.#E = res(this.#E)(position); },
        bit: (position) => () => bit(this.#E)(position),
        set: (position) => () => { this.#E = set(this.#E)(position); },
      },
      H: {
        rlc: () => { this.#H = rlc(this.#H); },
        rrc: () => { this.#H = rrc(this.#H); },
         rl: () => { this.#H = rl(this.#H); },
         rr: () => { this.#H = rr(this.#H); },
        sla: () => { this.#H = sla(this.#H); },
        sra: () => { this.#H = sra(this.#H); },
       swap: () => { this.#H = swap(this.#H); },
        srl: () => { this.#H = srl(this.#H); },
        res: (position) => () => { this.#H = res(this.#H)(position); },
        bit: (position) => () => bit(this.#H)(position),
        set: (position) => () => { this.#H = set(this.#H)(position); },
      },
      L: {
        rlc: () => { this.#L = rlc(this.#L); },
        rrc: () => { this.#L = rrc(this.#L); },
         rl: () => { this.#L = rl(this.#L); },
         rr: () => { this.#L = rr(this.#L); },
        sla: () => { this.#L = sla(this.#L); },
        sra: () => { this.#L = sra(this.#L); },
       swap: () => { this.#L = swap(this.#L); },
        srl: () => { this.#L = srl(this.#L); },
        res: (position) => () => { this.#L = res(this.#L)(position); },
        bit: (position) => () => bit(this.#L)(position),
        set: (position) => () => { this.#L = set(this.#L)(position); },
      },
      HL: {
        rlc: () => { writeMemory( rlc( readMemory(this.#HL) ) ); },
        rrc: () => { writeMemory( rrc( readMemory(this.#HL) ) ); },
         rl: () => { writeMemory( rl( readMemory(this.#HL) ) ); },
         rr: () => { writeMemory( rr( readMemory(this.#HL) ) ); },
        sla: () => { writeMemory( sla( readMemory(this.#HL) ) ); },
        sra: () => { writeMemory( sra( readMemory(this.#HL) ) ); },
       swap: () => { writeMemory( swap( readMemory(this.#HL) ) ); },
        srl: () => { writeMemory( srl( readMemory(this.#HL) ) ); },
        res: (position) => () => { writeMemory( res(readMemory(this.#HL)(position)) ); },
        bit: (position) => () => bit( readMemory(this.#HL)(position) ),
        set: (position) => () => { writeMemory( set(readMemory(this.#HL))(position) ); },
      },
      A: {
        rlc: () => { this.#A = rlc(this.#A); },
        rrc: () => { this.#A = rrc(this.#A); },
         rl: () => { this.#A = rl(this.#A); },
         rr: () => { this.#A = rr(this.#A); },
        sla: () => { this.#A = sla(this.#A); },
        sra: () => { this.#A = sra(this.#A); },
       swap: () => { this.#A = swap(this.#A); },
        srl: () => { this.#A = srl(this.#A); },
        res: (position) => () => { this.#A = res(this.#A)(position); },
        bit: (position) => () => bit(this.#A)(position),
        set: (position) => () => { this.#A = set(this.#A)(position); },
      },
    };
    
    return {
      0x00: register.B.rlc,
      0x01: register.C.rlc,
      0x02: register.D.rlc,
      0x03: register.E.rlc,
      0x04: register.H.rlc,
      0x05: register.L.rlc,
      0x06: register.HL.rlc,
      0x07: register.A.rlc,
      
      0x08: register.B.rrc,
      0x09: register.C.rrc,
      0x0A: register.D.rrc,
      0x0B: register.E.rrc,
      0x0C: register.H.rrc,
      0x0D: register.L.rrc,
      0x0E: register.HL.rrc,
      0x0F: register.A.rrc,

      0x10: register.B.rl,
      0x11: register.C.rl,
      0x12: register.D.rl,
      0x13: register.E.rl,
      0x14: register.H.rl,
      0x15: register.L.rl,
      0x16: register.HL.rl,
      0x17: register.A.rl,

      0x18: register.B.rr,
      0x19: register.C.rr,
      0x1A: register.D.rr,
      0x1B: register.E.rr,
      0x1C: register.H.rr,
      0x1D: register.L.rr,
      0x1E: register.HL.rr,
      0x1F: register.A.rr,

      0x20: register.B.sla,
      0x21: register.C.sla,
      0x22: register.D.sla,
      0x23: register.E.sla,
      0x24: register.H.sla,
      0x25: register.L.sla,
      0x26: register.HL.sla,
      0x27: register.A.sla,

      0x28: register.B.sra,
      0x29: register.C.sra,
      0x2A: register.D.sra,
      0x2B: register.E.sra,
      0x2C: register.H.sra,
      0x2D: register.L.sra,
      0x2E: register.HL.sra,
      0x2F: register.A.sra,

      0x30: register.B.swap,
      0x31: register.C.swap,
      0x32: register.D.swap,
      0x33: register.E.swap,
      0x34: register.H.swap,
      0x35: register.L.swap,
      0x36: register.HL.swap,
      0x37: register.A.swap,

      0x38: register.B.srl,
      0x39: register.C.srl,
      0x3A: register.D.srl,
      0x3B: register.E.srl,
      0x3C: register.H.srl,
      0x3D: register.L.srl,
      0x3E: register.HL.srl,
      0x3F: register.A.srl,

      0x40: register.B.bit(0),
      0x41: register.C.bit(0),
      0x42: register.D.bit(0),
      0x43: register.E.bit(0),
      0x44: register.H.bit(0),
      0x45: register.L.bit(0),
      0x46: register.HL.bit(0),
      0x47: register.A.bit(0),

      0x48: register.B.bit(1),
      0x49: register.C.bit(1),
      0x4A: register.D.bit(1),
      0x4B: register.E.bit(1),
      0x4C: register.H.bit(1),
      0x4D: register.L.bit(1),
      0x4E: register.HL.bit(1),
      0x4F: register.A.bit(1),

      0x50: register.B.bit(2),
      0x51: register.C.bit(2),
      0x52: register.D.bit(2),
      0x53: register.E.bit(2),
      0x54: register.H.bit(2),
      0x55: register.L.bit(2),
      0x56: register.HL.bit(2),
      0x57: register.A.bit(2),

      0x58: register.B.bit(3),
      0x59: register.C.bit(3),
      0x5A: register.D.bit(3),
      0x5B: register.E.bit(3),
      0x5C: register.H.bit(3),
      0x5D: register.L.bit(3),
      0x5E: register.HL.bit(3),
      0x5F: register.A.bit(3),

      0x60: register.B.bit(4),
      0x61: register.C.bit(4),
      0x62: register.D.bit(4),
      0x63: register.E.bit(4),
      0x64: register.H.bit(4),
      0x65: register.L.bit(4),
      0x66: register.HL.bit(4),
      0x67: register.A.bit(4),

      0x68: register.B.bit(5),
      0x69: register.C.bit(5),
      0x6A: register.D.bit(5),
      0x6B: register.E.bit(5),
      0x6C: register.H.bit(5),
      0x6D: register.L.bit(5),
      0x6E: register.HL.bit(5),
      0x6F: register.A.bit(5),

      0x70: register.B.bit(6),
      0x71: register.C.bit(6),
      0x72: register.D.bit(6),
      0x73: register.E.bit(6),
      0x74: register.H.bit(6),
      0x75: register.L.bit(6),
      0x76: register.HL.bit(6),
      0x77: register.A.bit(6),

      0x78: register.B.bit(7),
      0x79: register.C.bit(7),
      0x7A: register.D.bit(7),
      0x7B: register.E.bit(7),
      0x7C: register.H.bit(7),
      0x7D: register.L.bit(7),
      0x7E: register.HL.bit(7),
      0x7F: register.A.bit(7),

      0x80: register.B.res(0),
      0x81: register.C.res(0),
      0x82: register.D.res(0),
      0x83: register.E.res(0),
      0x84: register.H.res(0),
      0x85: register.L.res(0),
      0x86: register.HL.res(0),
      0x87: register.A.res(0),

      0x88: register.B.res(1),
      0x89: register.C.res(1),
      0x8A: register.D.res(1),
      0x8B: register.E.res(1),
      0x8C: register.H.res(1),
      0x8D: register.L.res(1),
      0x8E: register.HL.res(1),
      0x8F: register.A.res(1),

      0x90: register.B.res(2),
      0x91: register.C.res(2),
      0x92: register.D.res(2),
      0x93: register.E.res(2),
      0x94: register.H.res(2),
      0x95: register.L.res(2),
      0x96: register.HL.res(2),
      0x97: register.A.res(2),

      0x98: register.B.res(3),
      0x99: register.C.res(3),
      0x9A: register.D.res(3),
      0x9B: register.E.res(3),
      0x9C: register.H.res(3),
      0x9D: register.L.res(3),
      0x9E: register.HL.res(3),
      0x9F: register.A.res(3),

      0xA0: register.B.res(4),
      0xA1: register.C.res(4),
      0xA2: register.D.res(4),
      0xA3: register.E.res(4),
      0xA4: register.H.res(4),
      0xA5: register.L.res(4),
      0xA6: register.HL.res(4),
      0xA7: register.A.res(4),

      0xA8: register.B.res(5),
      0xA9: register.C.res(5),
      0xAA: register.D.res(5),
      0xAB: register.E.res(5),
      0xAC: register.H.res(5),
      0xAD: register.L.res(5),
      0xAE: register.HL.res(5),
      0xAF: register.A.res(5),

      0xB0: register.B.res(6),
      0xB1: register.C.res(6),
      0xB2: register.D.res(6),
      0xB3: register.E.res(6),
      0xB4: register.H.res(6),
      0xB5: register.L.res(6),
      0xB6: register.HL.res(6),
      0xB7: register.A.res(6),

      0xB8: register.B.res(7),
      0xB9: register.C.res(7),
      0xBA: register.D.res(7),
      0xBB: register.E.res(7),
      0xBC: register.H.res(7),
      0xBD: register.L.res(7),
      0xBE: register.HL.res(7),
      0xBF: register.A.res(7),

      0xC0: register.B.set(0),
      0xC1: register.C.set(0),
      0xC2: register.D.set(0),
      0xC3: register.E.set(0),
      0xC4: register.H.set(0),
      0xC5: register.L.set(0),
      0xC6: register.HL.set(0),
      0xC7: register.A.set(0),

      0xC8: register.B.set(1),
      0xC9: register.C.set(1),
      0xCA: register.D.set(1),
      0xCB: register.E.set(1),
      0xCC: register.H.set(1),
      0xCD: register.L.set(1),
      0xCE: register.HL.set(1),
      0xCF: register.A.set(1),

      0xD0: register.B.set(2),
      0xD1: register.C.set(2),
      0xD2: register.D.set(2),
      0xD3: register.E.set(2),
      0xD4: register.H.set(2),
      0xD5: register.L.set(2),
      0xD6: register.HL.set(2),
      0xD7: register.A.set(2),

      0xD8: register.B.set(3),
      0xD9: register.C.set(3),
      0xDA: register.D.set(3),
      0xDB: register.E.set(3),
      0xDC: register.H.set(3),
      0xDD: register.L.set(3),
      0xDE: register.HL.set(3),
      0xDF: register.A.set(3),

      0xE0: register.B.set(4),
      0xE1: register.C.set(4),
      0xE2: register.D.set(4),
      0xE3: register.E.set(4),
      0xE4: register.H.set(4),
      0xE5: register.L.set(4),
      0xE6: register.HL.set(4),
      0xE7: register.A.set(4),

      0xE8: register.B.set(5),
      0xE9: register.C.set(5),
      0xEA: register.D.set(5),
      0xEB: register.E.set(5),
      0xEC: register.H.set(5),
      0xED: register.L.set(5),
      0xEE: register.HL.set(5),
      0xEF: register.A.set(5),

      0xF0: register.B.set(6),
      0xF1: register.C.set(6),
      0xF2: register.D.set(6),
      0xF3: register.E.set(6),
      0xF4: register.H.set(6),
      0xF5: register.L.set(6),
      0xF6: register.HL.set(6),
      0xF7: register.A.set(6),

      0xF8: register.B.set(7),
      0xF9: register.C.set(7),
      0xFA: register.D.set(7),
      0xFB: register.E.set(7),
      0xFC: register.H.set(7),
      0xFD: register.L.set(7),
      0xFE: register.HL.set(7),
      0xFF: register.A.set(7),
    };
  }

  //#endregion
}

/** @type {Cpu} */
export const SharpLR35902 = Cpu;
