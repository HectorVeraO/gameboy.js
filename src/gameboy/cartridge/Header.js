/**
 * Provides information about the game itself and the hardware it expects to run on
 * 
 * See: https://gbdev.io/pandocs/The_Cartridge_Header.html#the-cartridge-header
 */
 export class Header {

  /** 0x100...0x103 Game's entry point, this is reached after the built-in boot ROM sequence */
  entryPoint;

  /** 0x104...0x133 Bitmap image displayed on boot. It must match an exact hexadecimal dump otherwise the game won't boot */
  nintendoLogo;

  /** @type {string} 0x134...0x143 Game's title, up to 16 upper case ASCII chars on old titles and up to 11 chars on GBC titles */
  title;

  /** 0x13F...0x142 Unknown purpose, 4 upper case ASCII chars, present on newer cartridges and "steals" bytes from the title region */
  manufacturerCode;

  /** 0x143...0x143 Enables color mode (CGB mode), present in newer titles and "steals" 1 byte form the title region */
  cgbFlag;

  /** 0x144...0x145 Game's publisher in 2 ASCII chars */
  newLicenseeCode;

  /** 0x146...0x146 Indicates if the game supports SGB functions */
  sgbFlag;

  /** 0x147...0x147 Indicates what kind of hardware is present on the cartridge, most notably its mapper */
  cartridgeType;

  /** 0x148...0x148 Indicates how much ROM is present on the cartridge. */
  romSize;

  /** 0x149...0x149 Indicates how much RAM is present on the cartridge, if any. Set to zero if cartridge type does not include "RAM" in its name */
  ramSize;

  /** 0x14A...0x14A Indicates whether this version of the game is intended to be sold in Japan or elsewhere */
  destinationCode;

  /** 0x14B...0x14B Used in older cartridges to specify the game's publisher */
  oldLicenseeCode;

  /** 0x14C...0x14C Specifyes the version number of the game, it's often 0x00 */
  maskRomVersionNumber;

  /** 0x14D...0x14D 8-bit checksum computed from the cartridge header bytes 0x134...0x14C */
  headerChecksum;

  /** 0x14E...0x14F 16-bit (big-endian) checksum. This checksum is not verified */
  globalChecksum;

  constructor(gamepakBytes) {
    const slice = (collection, start, length) => collection.slice(start, (start + length));
    const stringFromCharCodes = (codes) => codes.reduce((str, code) => `${str}${String.fromCharCode(code)}`, '');
    this.bytes = slice(gamepakBytes, Header.#position, Header.#length);
    this.entryPoint = slice(gamepakBytes, 0x100, 0x4);
    this.nintendoLogo = slice(gamepakBytes, 0x104, 0x30);
    this.title = stringFromCharCodes(slice(gamepakBytes, 0x134, 0x10));
    this.manufacturerCode = slice(gamepakBytes, 0x13F, 0x4);
    this.cgbFlag = gamepakBytes.at(0x143);
    this.newLicenseeCode = slice(gamepakBytes, 0x144, 0x2);
    this.sgbFlag = gamepakBytes.at(0x146);
    this.cartridgeType = gamepakBytes.at(0x147);
    this.romSize = gamepakBytes.at(0x148);
    this.ramSize = gamepakBytes.at(0x149);
    this.destinationCode = gamepakBytes.at(0x14A);
    this.oldLicenseeCode = gamepakBytes.at(0x14B);
    this.maskRomVersionNumber = gamepakBytes.at(0x14C);
  }

  /** Header address in the GamePak's ROM */
  static #position = 0x100;

  /** Header size */
  static #length = 0x50;
}

