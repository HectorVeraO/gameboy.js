/**
 * Provides information about the game itself and the hardware it expects to run on
 * 
 * See: https://gbdev.io/pandocs/The_Cartridge_Header.html#the-cartridge-header
 */
 export class Header {

  /** Header address in the GamePak's ROM */
  static #position = 0x100;

  /** Header size */
  static #length = 0x50;

  /** 0x100...0x103 Game's entry point, this is reached after the built-in boot ROM sequence */
  entryPoint = null;

  /** 0x104...0x133 Bitmap image displayed on boot. It must match an exact hexadecimal dump otherwise the game won't boot */
  nintendoLogo = null;

  /** 0x134...0x143 Game's title, up to 16 upper case ASCII chars on old titles and up to 11 chars on GBC titles */
  title = null;

  /** 0x13F...0x142 Unknown purpose, 4 upper case ASCII chars, present on newer cartridges and "steals" bytes from the title region */
  manufacturerCode = null;

  /** 0x143...0x143 Enables color mode (CGB mode), present in newer titles and "steals" 1 byte form the title region */
  cgbFlag = null;

  /** 0x144...0x145 Game's publisher in 2 ASCII chars */
  newLicenseeCode = null;

  /** 0x146...0x146 Indicates if the game supports SGB functions */
  sgbFlag = null;

  /** 0x147...0x147 Indicates what kind of hardware is present on the cartridge, most notably its mapper */
  cartridgeType = null;

  /** 0x148...0x148 Indicates how much ROM is present on the cartridge. */
  romSize = null;

  /** 0x149...0x149 Indicates how much RAM is present on the cartridge, if any. Set to zero if cartridge type does not include "RAM" in its name */
  ramSize = null;

  /** 0x14A...0x14A Indicates whether this version of the game is intended to be sold in Japan or elsewhere */
  destinationCode = null;

  /** 0x14B...0x14B Used in older cartridges to specify the game's publisher */
  oldLicenseeCode = null;

  /** 0x14C...0x14C Specifyes the version number of the game, it's often 0x00 */
  maskRomVersionNumber = null;

  /** 0x14D...0x14D 8-bit checksum computed from the cartridge header bytes 0x134...0x14C */
  headerChecksum = null;

  /** 0x14E...0x14F 16-bit (big-endian) checksum. This checksum is not verified */
  globalChecksum = null;

  constructor(gamepakBytes) {
    this.bytes = gamepakBytes.slice(Header.#position, Header.#length);
    this.entryPoint =  gamepakBytes.slice(0x100, 0x4);
    this.nintendoLogo = gamepakBytes.slice(0x104, 0x30);
    this.title = gamepakBytes.slice(0x134, 0x10);
    this.manufacturerCode = gamepakBytes.slice(0x13F, 0x4);
    this.cgbFlag = gamepakBytes.slice(0x143, 0x1);
    this.newLicenseeCode = gamepakBytes.slice(0x144, 0x2);
    this.sgbFlag = gamepakBytes.slice(0x146, 0x1);
    this.cartridgeType = gamepakBytes.slice(0x147, 0x1);
    this.romSize = gamepakBytes.slice(0x148, 0x1);
    this.ramSize = gamepakBytes.slice(0x149, 0x1);
    this.destinationCode = gamepakBytes.slice(0x14A, 0x1);
    this.oldLicenseeCode = gamepakBytes.slice(0x14B, 0x1);
    this.maskRomVersionNumber = gamepakBytes.slice(0x14C, 0x1);
  }
}

