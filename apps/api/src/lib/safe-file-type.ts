// apps/api/src/lib/safe-file-type.ts
// Wrapper around file-type's fromBuffer().
//
// GHSA-5v7r-6r5c-r473: file-type 13.0.0 – 21.3.0 can loop forever parsing a malformed ASF (.wma/.wmv)
// container. The fix only ships in file-type 22, which is ESM-only and would force a module-system
// migration of this CommonJS API. HAWL never accepts ASF files, so we refuse that signature BEFORE the
// parser sees it. Remove this guard when file-type is upgraded to >= 21.3.1 / 22.
import { fromBuffer } from "file-type";

// First 8 bytes of the ASF Header Object GUID (30 26 B2 75 8E 66 CF 11 ...).
const ASF_MAGIC = Buffer.from("3026b2758e66cf11", "hex");

export async function safeFromBuffer(buf: Buffer): Promise<Awaited<ReturnType<typeof fromBuffer>>> {
  if (buf.length >= ASF_MAGIC.length && buf.subarray(0, ASF_MAGIC.length).equals(ASF_MAGIC)) {
    return undefined; // treated as "unknown type" => rejected by the callers' allow-list
  }
  return fromBuffer(buf);
}
