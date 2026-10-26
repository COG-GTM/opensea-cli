import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves celo to chain id 42220", () => {
    expect(CHAIN_IDS.celo).toBe(42220)
    expect(resolveChainId("celo")).toBe(42220)
  })

  it("accepts Celo's numeric chain id", () => {
    expect(resolveChainId("42220")).toBe(42220)
    expect(resolveChainId(42220)).toBe(42220)
  })

  it("lists celo among known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/celo/)
  })
})
