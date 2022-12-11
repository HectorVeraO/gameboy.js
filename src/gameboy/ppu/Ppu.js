import { Uint8 } from "@common/Uint8";
import { RegisterBGP } from "./registers/RegisterBGP";
import { RegisterLCDC } from "./registers/RegisterLCDC";
import { RegisterLY } from "./registers/RegisterLY";
import { RegisterLYC } from "./registers/RegisterLYC";
import { RegisterSCX } from "./registers/RegisterSCX";
import { RegisterSCY } from "./registers/RegisterSCY";
import { RegisterSTAT } from "./registers/RegisterSTAT";

const MONOCHROME_COLOR_BY_VALUE = {
  0: { value: 0, pixel: 'Off'   , rgb: 0xFFFFFF },
  1: { value: 1, pixel: '33% on', rgb: 0xC0C0C0 },
  2: { value: 2, pixel: '33% on', rgb: 0x606060 },
  3: { value: 3, pixel: 'On'    , rgb: 0x000000 },
};

const int8 = (byte) => byte << 24 >> 24;

export class Ppu {

  /**
   * 
   * @param {(address: uint16) => uint8} readMemory 
   * @param {(address: uint16, byte: uint8) => void} writeMemory 
   */
  constructor(readMemory, writeMemory) {
    this.#read = readMemory;
    this.#write = writeMemory;
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
          
          const isLastVisibleLine = this.#LY === Ppu.#FRAME_PIXEL_HEIGHT - 1;
          if (isLastVisibleLine) {
            this.#STAT.lcdMode = VBlank;
            // TODO: Emit framebuffer
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

  #LCDC = new RegisterLCDC();
  #STAT = new RegisterSTAT();
  #SCY = new RegisterSCY();
  #SCX = new RegisterSCX();
  #LY = new RegisterLY();
  #LYC = new RegisterLYC();
  #BGP = new RegisterBGP();
  #WX = new Uint8();
  #WY = new Uint8();

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
    const isBackgroundEnabled = this.#LCDC.bgwEnPr && this.#LCDC.winEn;
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

    const tilemapAddress = useAlternativeTilemap() ? 0x9C00 : 0x9800;
    const isWindowTile = this.#LCDC.winEn;

    if (isWindowEnabled) {
      return;
    }

    if (isBackgroundEnabled) {
      const x = ((this.#SCX >>> 3) + pixelScanlinePosition) & 0x1F;
      const y = (this.#SCY + this.#LY) & 0xFF;

      // TODO: When is the PPU's access to VRAM blocked?
      const isVramBlocked = () => {
        return false;
      };

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

      for (let position = 7 - tilePositionX; position >= 0; position--) {
        const colorIndexLowBit = (tileLineDataLow >>> position) & 1;
        const colorIndexHighBit = (tileLineDataHigh >>> position) & 1;
        const colorIndex = (colorIndexHighBit << 1) | colorIndexLowBit;
        const colorValue = this.#BGP.colorOf(colorIndex);
        const pixelRgb888 = MONOCHROME_COLOR_BY_VALUE[colorValue];
        const pixelFrameBufferPosition = this.#LY * Ppu.#FRAME_PIXEL_WIDTH + pixelScanlinePosition;
        this.#frameBuffer[pixelFrameBufferPosition] = pixelRgb888;
      }

      return;
    }

    // TODO: Draw sprites (front layer)

    // TODO: Update scanline
    this.#LY++;
    if (this.#LY++ === Ppu.#FRAME_PIXEL_HEIGHT) {
      // TODO: Emit frame
      
      // TODO: Emit vertical interrupt

      // TODO: Prepare state for new frame
      this.#LY = 0;
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
