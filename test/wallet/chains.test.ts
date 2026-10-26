import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves mantle to 5000", () => {
    expect(CHAIN_IDS.mantle).toBe(5000)
    expect(resolveChainId("mantle")).toBe(5000)
  })

  it("accepts Mantle's numeric chain id", () => {
    expect(resolveChainId("5000")).toBe(5000)
    expect(resolveChainId(5000)).toBe(5000)
  })

  it("lists mantle among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/mantle/)
  })

  it("keeps CHAIN_IDS sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
