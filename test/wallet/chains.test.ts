import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves katana to its EVM chain id", () => {
    expect(resolveChainId("katana")).toBe(747474)
    expect(CHAIN_IDS.katana).toBe(747474)
  })

  it("accepts Katana's numeric chain id as a string or number", () => {
    expect(resolveChainId("747474")).toBe(747474)
    expect(resolveChainId(747474)).toBe(747474)
  })

  it("lists katana among the known names for an unknown chain", () => {
    expect(() => resolveChainId("katanaa")).toThrow(/katana/)
  })

  it("keeps the table sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
