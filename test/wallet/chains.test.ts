import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves linea to its EVM chain ID", () => {
    expect(resolveChainId("linea")).toBe(59144)
    expect(CHAIN_IDS.linea).toBe(59144)
  })

  it("resolves base for parity with the reference chain", () => {
    expect(resolveChainId("base")).toBe(8453)
  })

  it("passes numeric chain IDs through", () => {
    expect(resolveChainId(59144)).toBe(59144)
    expect(resolveChainId("59144")).toBe(59144)
  })

  it("lists linea among known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/linea/)
  })
})
