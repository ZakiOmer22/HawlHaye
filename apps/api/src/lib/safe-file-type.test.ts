import { describe, expect, it } from "vitest";
import { safeFromBuffer } from "./safe-file-type";

describe("safeFromBuffer", () => {
  it("refuses ASF containers before they reach the vulnerable parser (GHSA-5v7r-6r5c-r473)", async () => {
    const asf = Buffer.concat([Buffer.from("3026b2758e66cf11a6d900aa0062ce6c", "hex"), Buffer.alloc(64)]);
    await expect(safeFromBuffer(asf)).resolves.toBeUndefined();
  });

  it("still detects normal files", async () => {
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
    const res = await safeFromBuffer(Buffer.concat([png, Buffer.alloc(32)]));
    expect(res?.mime).toBe("image/png");
  });
});
