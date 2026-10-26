import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

describe("resolveChainId", () => {
  it.each([
    ["ethereum", 1],
    ["base", 8453],
    ["ink", 57073],
    ["katana", 747474],
  ])("resolves %s to %i", (name, id) => {
    expect(resolveChainId(name)).toBe(id)
  })

  it("maps katana to chain ID 747474", () => {
    expect(CHAIN_IDS.katana).toBe(747474)
  })

  it("passes numeric chain IDs through", () => {
    expect(resolveChainId(747474)).toBe(747474)
    expect(resolveChainId("747474")).toBe(747474)
  })

  it("lists katana among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/katana/)
  })
})
