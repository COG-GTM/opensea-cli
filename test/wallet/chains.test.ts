import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves plasma to chain id 9745", () => {
    expect(CHAIN_IDS.plasma).toBe(9745)
    expect(resolveChainId("plasma")).toBe(9745)
  })

  it("still resolves base", () => {
    expect(resolveChainId("base")).toBe(8453)
  })

  it("passes numeric ids through", () => {
    expect(resolveChainId("9745")).toBe(9745)
    expect(resolveChainId(9745)).toBe(9745)
  })

  it("lists plasma among known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/plasma/)
  })
})
