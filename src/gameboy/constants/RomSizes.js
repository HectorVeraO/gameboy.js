import { KiB, MiB } from "@common/InformationUnitConstants";

/** Bit capacity of a single ROM bank */
export const ROM_BANK_CAPACITY = 16 * KiB

/**
 * Values for ROM size header
 * See: https://gbdev.io/pandocs/The_Cartridge_Header.html#0148--rom-size
 */
export const ROM_SIZES = {
  0x00:	{ code: 0x00, capacity: 32 * KiB, bankCount: 2 },
  0x01:	{ code: 0x01, capacity: 64 * KiB, bankCount: 4 },
  0x02:	{ code: 0x02, capacity: 128 * KiB, bankCount: 8 },
  0x03:	{ code: 0x03, capacity: 256 * KiB, bankCount: 16 },
  0x04:	{ code: 0x04, capacity: 512 * KiB, bankCount: 32 },
  0x05:	{ code: 0x05, capacity: 1 * MiB, bankCount: 64 },
  0x06:	{ code: 0x06, capacity: 2 * MiB, bankCount: 128 },
  0x07:	{ code: 0x07, capacity: 4 * MiB, bankCount: 256 },
  0x08:	{ code: 0x08, capacity: 8 * MiB, bankCount: 512 },
  0x52:	{ code: 0x52, capacity: 1.1 * MiB, bankCount: 72, untrusted: true },
  0x53:	{ code: 0x53, capacity: 1.2 * MiB, bankCount: 80, untrusted: true },
  0x54:	{ code: 0x54, capacity: 1.5 * MiB, bankCount: 96, untrusted: true },
}
