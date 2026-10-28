import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves cronos to chain id 25", () => {
    expect(resolveChainId("cronos")).toBe(25)
    expect(CHAIN_IDS.cronos).toBe(25)
  })

  it("accepts Cronos's numeric chain id as a string or number", () => {
    expect(resolveChainId("25")).toBe(25)
    expect(resolveChainId(25)).toBe(25)
  })

  it("keeps CHAIN_IDS sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("rejects an unknown chain name and lists cronos among the known names", () => {
    expect(() => resolveChainId("cronos-demo-placeholder")).toThrow(
      /Unknown chain "cronos-demo-placeholder".*cronos/,
    )
  })
})
