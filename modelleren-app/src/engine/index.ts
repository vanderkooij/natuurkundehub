// Publieke API van de reken-engine (puur, DOM-vrij).
export { toDecimalPoint } from "./decimal";
export { parseExpr } from "./expr";
export { splitValueUnit, checkParens, parseLine, validateSyntax, type LineResult } from "./parse";
export {
  simulate,
  evalStartwaarden,
  checkFirstIteration,
  type SvRow,
  type SimResult,
} from "./simulate";
export { EXAMPLES, type Example } from "./examples";
