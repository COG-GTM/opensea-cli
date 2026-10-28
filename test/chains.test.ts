import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves bob to BOB's chain id 60808", () => {
    expect(resolveChainId("bob")).toBe(60808)
    expect(CHAIN_IDS.bob).toBe(60808)
  })

  it("passes BOB's numeric chain id through", () => {
    expect(resolveChainId("60808")).toBe(60808)
    expect(resolveChainId(60808)).toBe(60808)
  })

  it("keeps CHAIN_IDS in numeric chain id order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("lists bob among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/\bbob\b/)
  })
})
