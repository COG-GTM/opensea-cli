import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves sonic to chain id 146", () => {
    expect(CHAIN_IDS.sonic).toBe(146)
    expect(resolveChainId("sonic")).toBe(146)
  })

  it("accepts Sonic's numeric chain id", () => {
    expect(resolveChainId("146")).toBe(146)
    expect(resolveChainId(146)).toBe(146)
  })

  it("lists sonic among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/\bsonic\b/)
  })
})
