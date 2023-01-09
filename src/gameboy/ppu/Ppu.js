import { RegisterBGP } from "./registers/RegisterBGP";
import { RegisterLCDC } from "./registers/RegisterLCDC";
import { RegisterLY } from "./registers/RegisterLY";
import { RegisterLYC } from "./registers/RegisterLYC";
import { RegisterSCX } from "./registers/RegisterSCX";
import { RegisterSCY } from "./registers/RegisterSCY";
import { RegisterSTAT } from "./registers/RegisterSTAT";
import { RegisterWX } from "./registers/RegisterWX";
import { RegisterWY } from "./registers/RegisterWY";

const MONOCHROME_COLOR_BY_VALUE = {
  0: { value: 0, pixel: 'Off'   , rgba: 0xFFFFFFFF },
  1: { value: 1, pixel: '33% on', rgba: 0xC0C0C0FF },
  2: { value: 2, pixel: '33% on', rgba: 0x606060FF },
  3: { value: 3, pixel: 'On'    , rgba: 0x000000FF },
};

const int8 = (byte) => byte << 24 >> 24;

export class Ppu {
  /** @param {{ read: (address: uint16) => uint8, write: (address: uint16, byte: uint8) => void }} memoryPins */
  constructor({ read, write }) {
    this.#read = read;
    this.#write = write;
  }

    /** Proctects reads of regions managed by PPU  */
    guardRead(address) {
      // TODO: Return null if address isn't managed by PPU
      if (address < 0xFF40 || address > 0xFF45)
        return null;
      // TODO: Return spec compliant value if address is managed by PPU
      if (address === RegisterLCDC.ADDRESS)
        return this.#LCDC.valueOf();
      if (address === RegisterSTAT.ADDRESS)
        return this.#STAT.valueOf();
      if (address === RegisterSCY.ADDRESS)
        return this.#SCY.valueOf();
      if (address === RegisterSCX.ADDRESS)
        return this.#SCX.valueOf();
      if (address === RegisterLY.ADDRESS)
        return this.#LY.valueOf();
      if (address === RegisterLYC.ADDRESS)
        return this.#LYC.valueOf();
      if (address === RegisterWY.ADDRESS)
        return this.#WY.valueOf();
      if (address === RegisterWX.ADDRESS)
        return this.#WX.valueOf();
    }
  
    guardWrite(address, byte) {
      let writePerformed = true
      if (address === RegisterLCDC.ADDRESS)
        this.#LCDC = byte;
      else if (address === RegisterSTAT.ADDRESS)
        this.#STAT = byte;
      else if (address === RegisterSCY.ADDRESS)
        this.#SCY = byte;
      else if (address === RegisterSCX.ADDRESS)
        this.#SCX = byte;
      else if (address === RegisterLY.ADDRESS)
        this.#LY = byte;
      else if (address === RegisterLYC.ADDRESS)
        this.#LYC = byte;
      else if (address === RegisterWY.ADDRESS)
        this.#WY = byte;
      else if (address === RegisterWX.ADDRESS)
        this.#WX = byte;
      else
        writePerformed = false;
      
      return writePerformed;
    }

  reset() {
    this.#LCDC = new RegisterLCDC();
    this.#STAT = new RegisterSTAT();
    this.#SCY = new RegisterSCY();
    this.#SCX = new RegisterSCX();
    this.#LY = new RegisterLY();
    this.#LYC = new RegisterLYC();
    this.#BGP = new RegisterBGP();
    this.#WX = new RegisterWX();
    this.#WY = new RegisterWY();

    this.#dotCount = 0;
    this.#modeDotCount = 0;

    this.#frameBuffer = new Uint32Array(Ppu.#FRAME_SIZE);
  }

  performDots(dotCount) {
    // TODO: Handle timing quirks listed here: https://gbdev.io/pandocs/STAT.html#properties-of-stat-modes
    this.#modeDotCount += dotCount;
    const { HBlank, VBlank, SearchingOAM, TransferingDataToLcdController } = Ppu.#MODE;
    switch (this.#STAT.lcdMode) {
      case HBlank:
        // TODO: Varying duration from 85 to 208 dots, depending on sprite count
        if (this.#modeDotCount  >= 208) {
          this.#modeDotCount = 0;
          this.#LY.increment();
          
          const isLastVisibleLine = this.#LY.equals(Ppu.#FRAME_PIXEL_HEIGHT - 1);
          if (isLastVisibleLine) {
            this.#STAT.lcdMode = VBlank;
            return this.#frameBuffer; // TODO: Improve frame emission
          } else {
            this.#STAT.lcdMode = SearchingOAM;
          }
        }
        break;

      case VBlank:
        if (this.#modeDotCount >= 456) {
          this.#modeDotCount = 0;
          this.#LY.increment();
          
          if (this.#LY >= Ppu.#FRAME_PIXEL_HEIGHT) {
            this.#LY.set(0);
            this.#STAT.lcdMode = SearchingOAM;
          }
        }

        break;

      case SearchingOAM:
        if (this.#modeDotCount >= 80) {
          this.#modeDotCount = 0;
          this.#STAT.lcdMode = TransferingDataToLcdController;
        }
        break;

      case TransferingDataToLcdController:
        // TODO: Varying duration from 168 to 291 dots, depending on sprite count
        if (this.#modeDotCount >= 168) {
          this.#modeDotCount = 0;
          this.#STAT.lcdMode = HBlank;
          this.#renderScanline();
        }
        break;
    }
  }

  #register = {
    LCDC: new RegisterLCDC(),
    STAT: new RegisterSTAT(),
    SCY: new RegisterSCY(),
    SCX: new RegisterSCX(),
    LY: new RegisterLY(),
    LYC: new RegisterLYC(),
    BGP: new RegisterBGP(),
    WX: new RegisterWX(),
    WY: new RegisterWY(),
  };

  get #LCDC() {
    return this.#register.LCDC;
  }

  get #STAT() {
    return this.#register.STAT;
  }

  get #SCY() {
    return this.#register.SCY;
  }

  get #SCX() {
    return this.#register.SCX;
  }

  get #LY() {
    return this.#register.LY;
  }

  get #LYC() {
    return this.#register.LYC;
  }

  get #BGP() {
    return this.#register.BGP;
  }

  get #WX() {
    return this.#register.WX;
  }

  get #WY() {
    return this.#register.WY;
  }

  set #LCDC(byte) {
    this.#LCDC.set(byte)
  }
  
  set #STAT(byte) {
    this.#STAT.set(byte)
  }
  
  set #SCY(byte) {
    this.#SCY.set(byte)
  }
  
  set #SCX(byte) {
    this.#SCX.set(byte)
  }
  
  set #LY(byte) {
    this.#LY.set(byte)
  }
  
  set #LYC(byte) {
    this.#LYC.set(byte)
  }
  
  set #BGP(byte) {
    this.#BGP.set(byte)
  }
  
  set #WX(byte) {
    this.#WX.set(byte)
  }
  
  set #WY(byte) {
    this.#WY.set(byte)
  }
  


  #dotCount = 0;
  #modeDotCount = 0;

  #frameBuffer = new Uint32Array(Ppu.#FRAME_SIZE);

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

  #renderScanline() {
    // Bit 0 (BGW_EN_PR) of LCDC has a different meaning in CGB mode
    const isTileRenderingDisabled = this.#LCDC.bgwEnPr === 0;
    if (isTileRenderingDisabled) {
      return;
    }

    // TODO: Count dots (cycles? see Pixel FIFO doc at gbdev.io)
    const isBackgroundEnabled = this.#LCDC.bgwEnPr;
    const isWindowEnabled = this.#LCDC.bgwEnPr && this.#LCDC.winEn;

    let pixelScanlinePosition = 0; // mod 160

    const isPixelInsideWindow = () => {
      const isInVerticalRange = this.#LY >= this.#WY;
      const isInHorizontalRange = (this.#WX - 7) >= pixelScanlinePosition;
      return isInVerticalRange && isInHorizontalRange;
    };

    const useAlternativeTilemap = () => {
      const insideWindowArea = isPixelInsideWindow();
      const useAlternativeBackground = this.#LCDC.bgMap && !insideWindowArea;
      const useAlternativeWindow = this.#LCDC.winMap && insideWindowArea;
      return useAlternativeBackground || useAlternativeWindow;
    };

    // TODO: When is the PPU's access to VRAM blocked?
    const isVramBlocked = () => {
      return false;
    };

    while (pixelScanlinePosition < Ppu.#FRAME_PIXEL_WIDTH) {
      // TODO: Complete the 160 pixels in the scanline, loop is missing
      const tilemapAddress = useAlternativeTilemap() ? 0x9C00 : 0x9800;
      const isWindowTile = this.#LCDC.winEn;

      if (isWindowEnabled) {
        return;
      }

      if (isBackgroundEnabled) {
        const x = ((this.#SCX >>> 3) + pixelScanlinePosition) & 0x1F;
        const y = (this.#SCY + this.#LY) & 0xFF;

        const tileIdAddress = tilemapAddress + y + x;
        const tileId = isVramBlocked() ? 0xFF : this.#read(tileIdAddress);

        const resolveTileAddress = (tileId) => {
          const resolvedTileId = this.#LCDC.tileSel ? int8(tileId) : tileId;
          const tileDataAreaAddress = this.#LCDC.tileSel ? 0x9000 : 0x8000;
          return tileDataAreaAddress + (resolvedTileId << 4); // Each tile is 16 bytes long so we multiply its ID by 16
        };

        const tileDataAddress = resolveTileAddress(tileId);
        const tilePositionY = (this.#LY + this.#SCY) % Ppu.#TILE_PIXEL_HEIGHT;
        const tilePositionX = this.#SCX % Ppu.#TILE_PIXEL_WIDTH;

        const tileLineDataLow = this.#read(tileDataAddress + (tilePositionY << 1) + 0);
        const tileLineDataHigh = this.#read(tileDataAddress + (tilePositionY << 1) + 1);

        // TODO: I could skip this loop but that would require fetching the tile data for each of its
        // row pixels being renderd (which is slow), or I could cache the tile data and refresh it once the tile has been redered
        const isFirstTile = pixelScanlinePosition === 0;
        let tilePixelOffset = 7 - (isFirstTile ? tilePositionX : 0);
        while (tilePixelOffset >= 0) {
        // for (let position = 7 - tilePositionX; position >= 0; position--) {
          const colorIndexLowBit = (tileLineDataLow >>> tilePixelOffset) & 1;
          const colorIndexHighBit = (tileLineDataHigh >>> tilePixelOffset) & 1;
          const colorIndex = (colorIndexHighBit << 1) | colorIndexLowBit;
          const colorValue = this.#BGP.colorOf(colorIndex);
          const pixelRgba8888 = MONOCHROME_COLOR_BY_VALUE[colorValue];
          const pixelFrameBufferPosition = this.#LY * Ppu.#FRAME_PIXEL_WIDTH + pixelScanlinePosition;
          this.#frameBuffer[pixelFrameBufferPosition] = pixelRgba8888.rgba;
          tilePixelOffset--;
          pixelScanlinePosition++;
        }
      }

      // TODO: Draw sprites (front layer)
    }
    // TOOD: Once complete improve code (like factor out stuff)
  }

  static #FRAME_PIXEL_HEIGHT = 144;
  static #FRAME_PIXEL_WIDTH = 160;
  static #FRAME_SIZE = Ppu.#FRAME_PIXEL_HEIGHT * Ppu.#FRAME_PIXEL_WIDTH;

  static #TILE_PIXEL_HEIGHT = 8;
  static #TILE_PIXEL_WIDTH = 8;

  static #MODE = {
    HBlank: 0,
    VBlank: 1,
    SearchingOAM: 2,
    TransferingDataToLcdController: 3,
  };
}
