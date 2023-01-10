import { Gameboy } from "@gameboy/gameboy";
import { saveFile } from "./utils/saveFile";

const screenCanvas = document.querySelector('#screen');
if (screenCanvas === null)
  throw new Error('Screen canvas missing');

// TODO: Resize according to settings
screenCanvas.width = 160;
screenCanvas.height = 144;

const screenContext = screenCanvas.getContext('2d')
if (screenContext === null)
  throw new Error('Requested canvas context is not supported');

const cartridgeInput = document.querySelector('#cartridgeInput');
if (cartridgeInput === null)
  throw new Error('Cartridge input missing');

const canvasFrame = screenContext.createImageData(160, 144);

const cartridgeFetcher = async () => {
  const buffer = await cartridgeInput.files[0]?.arrayBuffer()
  if (buffer)
    return new Uint8Array(buffer);
  else
    return null;
};

const gameboy = new Gameboy();

cartridgeInput.addEventListener('change', async () => {
  const bytes = await cartridgeFetcher();
  if (bytes === null){
    console.warn('Cartridge file missing');
    return;
  }
  gameboy.load(bytes);
  
  const frames = gameboy.power();
  for await (const frame of frames) {
    frame.forEach((rgba, position) => {
      canvasFrame.data[position * 4 + 0] = (rgba >>> 24) & 0xFF;
      canvasFrame.data[position * 4 + 1] = (rgba >>> 16) & 0xFF;
      canvasFrame.data[position * 4 + 2] = (rgba >>>  8) & 0xFF;
      canvasFrame.data[position * 4 + 3] = (rgba >>>  0) & 0xFF;
    });
    screenContext.putImageData(canvasFrame, 0, 0);
  }

  console.debug('Cartridge replaced')
});

const downloadLogs = document.querySelector('#downloadLogs');
const onDownloadLogs = () => {
  saveFile({
    file: {
      content: gameboy.getTrace(),
      extension: 'log',
      mimeType: 'text/plain',
      prefix: 'gb-trace',
    },
  });
};
downloadLogs.addEventListener('click', onDownloadLogs);
