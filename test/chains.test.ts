import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves mode to 34443", () => {
    expect(resolveChainId("mode")).toBe(34443)
    expect(CHAIN_IDS.mode).toBe(34443)
  })

  it("accepts Mode's numeric chain id", () => {
    expect(resolveChainId(34443)).toBe(34443)
    expect(resolveChainId("34443")).toBe(34443)
  })

  it("lists mode among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/\bmode\b/)
  })

  it("keeps CHAIN_IDS sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
