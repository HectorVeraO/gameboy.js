import { KiB } from '@common/constants/InformationUnits';

/** Bit capacity of a single RAM bank */
export const RAM_BANK_CAPACITY = 8 * KiB;

/**
 * Values for ROM size header
 * See: https://gbdev.io/pandocs/The_Cartridge_Header.html#0149--ram-size
 */
export const RAM_SIZES = {
  0x00: { code: 0x00, capacity: 0, bankCount: 0 },
  0x01: { code: 0x01, capacity: 0, bankCount: 0 },
  0x02: { code: 0x02, capacity: 8 * KiB, bankCount: 1 },
  0x03: { code: 0x03, capacity: 32 * KiB, bankCount: 4 },
  0x04: { code: 0x04, capacity: 128 * KiB, bankCount: 16 },
  0x05: { code: 0x05, capacity: 64 * KiB, bankCount: 8 },
};
