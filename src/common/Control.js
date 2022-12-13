// TODO: Find a way to set "env" varibles
const process = { env: { DISABLE_ASSERTIONS: false } }; // FIXME: Node::process mock xd
const { DISABLE_ASSERTIONS } = process.env;

export const assert = (valid, msg) => {
  if (DISABLE_ASSERTIONS) return;
  if (valid) return;
  throw new Error(msg);
}

export const assertType = (o, type, msg = `${o} isn't and instance of ${type.name}`) => {
  assert(o instanceof type, msg);
}
