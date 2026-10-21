import r001 from "./r001";
import r002 from "./r002";
import r003 from "./r003";
import r004 from "./r004";
import r005 from "./r005";
import r006 from "./r006";
import r007 from "./r007";
import r008 from "./r008";
import r009 from "./r009";
import r010 from "./r010";
import type { Diagnostic, RequDocument } from "../model";
const rules = [r001, r002, r003, r004, r005, r006, r007, r008, r009, r010];
export function lint(doc: RequDocument): Diagnostic[] {
  return doc.diagrams.flatMap((d) => rules.flatMap((rule) => rule(d)));
}
