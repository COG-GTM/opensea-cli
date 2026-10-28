import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.generated.js"

describe("resolveChainId", () => {
  it("resolves taiko to 167000", () => {
    expect(resolveChainId("taiko")).toBe(167000)
    expect(CHAIN_IDS.taiko).toBe(167000)
  })

  it("keeps CHAIN_IDS in numeric order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
