import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves mantle to chain id 5000", () => {
    expect(CHAIN_IDS.mantle).toBe(5000)
    expect(resolveChainId("mantle")).toBe(5000)
  })

  it("still resolves base and numeric ids", () => {
    expect(resolveChainId("base")).toBe(8453)
    expect(resolveChainId("5000")).toBe(5000)
    expect(resolveChainId(5000)).toBe(5000)
  })

  it("lists mantle among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/mantle/)
  })
})
