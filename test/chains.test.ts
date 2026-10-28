import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/index.js"

describe("resolveChainId", () => {
  it("resolves kaia to 8217", () => {
    expect(resolveChainId("kaia")).toBe(8217)
    expect(CHAIN_IDS.kaia).toBe(8217)
  })

  it("accepts Kaia's numeric chain id as a number or string", () => {
    expect(resolveChainId(8217)).toBe(8217)
    expect(resolveChainId("8217")).toBe(8217)
  })

  it("keeps CHAIN_IDS sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("throws for an unknown chain name", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(
      'Unknown chain "not-a-chain"',
    )
  })
})
