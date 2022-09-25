import { KiB } from "@common/InformationUnitConstants";

export const RamSize = {
  0x00: { code: 0x00, sramSize: 0, comment: 'No RAM' },
  0x01: { code: 0x01, sramSize: null, comment: 'Unused' },
  0x02: { code: 0x02, sramSize: 8 * KiB, comment: '1 bank' },
  0x03: { code: 0x03, sramSize: 32 * KiB, comment: '4 banks of 8 KiB each' },
  0x04: { code: 0x04, sramSize: 128 * KiB, comment: '16 banks of 8 KiB each' },
  0x05: { code: 0x05, sramSize: 64 * KiB, comment: '8 banks of 8 KiB each' },
}