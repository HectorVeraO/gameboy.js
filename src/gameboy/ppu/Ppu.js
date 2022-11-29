import { Uint8 } from "@common/Uint8";
import { RegisterLCDC } from "./registers/RegisterLCDC";

export class Ppu {
  constructor() {
    // TODO: State invariants
  }

  #LCDC = new RegisterLCDC();
  #STAT = new Uint8();
  #SCY = new Uint8();
  #SCX = new Uint8();
  #LY = new Uint8();
  #LYC = new Uint8();

}
