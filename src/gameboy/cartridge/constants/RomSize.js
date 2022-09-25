import { KiB, MiB } from "@common/InformationUnitConstants";

/**
 * ROM sizes
 * 
 * Sizes marked with "untrusted" are often listed in unofficial docs but the source is unknown and
 * there aren't any known ROM files using such values.
 */
export const RomSize = {
  0x00: { code: 0x00, romSize: 32 * KiB, romBankCount: 2 },
  0x01: { code: 0x01, romSize: 64 * KiB, romBankCount: 4 },
  0x02: { code: 0x02, romSize: 128 * KiB, romBankCount: 8 },
  0x03: { code: 0x03, romSize: 256 * KiB, romBankCount: 16 },
  0x04: { code: 0x04, romSize: 512 * KiB, romBankCount: 32 },
  0x05: { code: 0x05, romSize: 1 * MiB, romBankCount: 64 },
  0x06: { code: 0x06, romSize: 2 * MiB, romBankCount: 128 },
  0x07: { code: 0x07, romSize: 4 * MiB, romBankCount: 256 },
  0x08: { code: 0x08, romSize: 8 * MiB, romBankCount: 512 },
  0x52: { code: 0x52, romSize: 1.1 * MiB, romBankCount: 72, untrusted: true },
  0x53: { code: 0x53, romSize: 1.2 * MiB, romBankCount: 80, untrusted: true },
  0x54: { code: 0x54, romSize: 1.5 * MiB, romBankCount: 96, untrusted: true },
};
