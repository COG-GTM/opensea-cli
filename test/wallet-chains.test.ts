import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.generated.js"

describe("resolveChainId", () => {
  it("resolves taiko to 167000", () => {
    expect(resolveChainId("taiko")).toBe(167000)
    expect(CHAIN_IDS.taiko).toBe(167000)
  })

  it("keeps CHAIN_IDS in numeric order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/index.js"

describe("resolveChainId", () => {
  it("resolves gnosis to chain id 100", () => {
    expect(resolveChainId("gnosis")).toBe(100)
    expect(CHAIN_IDS.gnosis).toBe(100)
  })

  it("keeps CHAIN_IDS in numeric order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("accepts a numeric chain id", () => {
    expect(resolveChainId("100")).toBe(100)
    expect(resolveChainId(100)).toBe(100)
  })

  it("rejects an unknown chain name", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(
      'Unknown chain "not-a-chain"',
    )
  })
})
