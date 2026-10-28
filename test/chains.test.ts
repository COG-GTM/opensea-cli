import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves lisk to chain id 1135", () => {
    expect(CHAIN_IDS.lisk).toBe(1135)
    expect(resolveChainId("lisk")).toBe(1135)
  })

  it("accepts Lisk's numeric chain id", () => {
    expect(resolveChainId("1135")).toBe(1135)
    expect(resolveChainId(1135)).toBe(1135)
  })

  it("keeps CHAIN_IDS sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("rejects an unknown chain name", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/Unknown chain/)
  })
})
