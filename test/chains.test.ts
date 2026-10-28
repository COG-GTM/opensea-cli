import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves scroll to 534352", () => {
    expect(resolveChainId("scroll")).toBe(534352)
    expect(CHAIN_IDS.scroll).toBe(534352)
  })

  it("passes numeric chain ids through", () => {
    expect(resolveChainId("534352")).toBe(534352)
    expect(resolveChainId(534352)).toBe(534352)
  })

  it("keeps CHAIN_IDS in numeric order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("rejects unknown chain names", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/Unknown chain/)
  })
})
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
