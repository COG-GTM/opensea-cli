import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/index.js"

describe("resolveChainId", () => {
  it("resolves moonbeam to 1284", () => {
    expect(resolveChainId("moonbeam")).toBe(1284)
    expect(CHAIN_IDS.moonbeam).toBe(1284)
  })

  it("accepts Moonbeam's numeric chain ID as a number or string", () => {
    expect(resolveChainId(1284)).toBe(1284)
    expect(resolveChainId("1284")).toBe(1284)
  })

  it("lists moonbeam among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/moonbeam/)
  })

  it("keeps CHAIN_IDS sorted by chain ID", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
