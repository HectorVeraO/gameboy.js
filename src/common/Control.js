import { Config } from "@root/gameboy.config";


export const assert = (valid, msg) => {
  if (Config.DISABLE_ASSERTIONS) return;
  if (valid) return;
  throw new Error(msg);
}

export const assertType = (o, type, msg = `${o} isn't and instance of ${type.name}`) => {
  assert(o instanceof type, msg);
}
