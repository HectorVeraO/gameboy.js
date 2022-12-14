export const CartridgeType = {
  0x00: { code: 0x00, type: 'ROM ONLY' },
  0x01: { code: 0x01, type: 'MBC1' },
  0x02: { code: 0x02, type: 'MBC1+RAM' },
  0x03: { code: 0x03, type: 'MBC1+RAM+BATTERY' },
  0x05: { code: 0x05, type: 'MBC2' },
  0x06: { code: 0x06, type: 'MBC2+BATTERY' },
  0x08: { code: 0x08, type: 'ROM+RAM 1' },
  0x09: { code: 0x09, type: 'ROM+RAM+BATTERY 1' },
  0x0B: { code: 0x0B, type: 'MMM01' },
  0x0C: { code: 0x0C, type: 'MMM01+RAM' },
  0x0D: { code: 0x0D, type: 'MMM01+RAM+BATTERY' },
  0x0F: { code: 0x0F, type: 'MBC3+TIMER+BATTERY' },
  0x10: { code: 0x10, type: 'MBC3+TIMER+RAM+BATTERY 2' },
  0x11: { code: 0x11, type: 'MBC3' },
  0x12: { code: 0x12, type: 'MBC3+RAM 2' },
  0x13: { code: 0x13, type: 'MBC3+RAM+BATTERY 2' },
  0x19: { code: 0x19, type: 'MBC5' },
  0x1A: { code: 0x1A, type: 'MBC5+RAM' },
  0x1B: { code: 0x1B, type: 'MBC5+RAM+BATTERY' },
  0x1C: { code: 0x1C, type: 'MBC5+RUMBLE' },
  0x1D: { code: 0x1D, type: 'MBC5+RUMBLE+RAM' },
  0x1E: { code: 0x1E, type: 'MBC5+RUMBLE+RAM+BATTERY' },
  0x20: { code: 0x20, type: 'MBC6' },
  0x22: { code: 0x22, type: 'MBC7+SENSOR+RUMBLE+RAM+BATTERY' },
  0xFC: { code: 0xFC, type: 'POCKET CAMERA' },
  0xFD: { code: 0xFD, type: 'BANDAI TAMA5' },
  0xFE: { code: 0xFE, type: 'HuC3' },
  0xFF: { code: 0xFF, type: 'HuC1+RAM+BATTERY' },
};
