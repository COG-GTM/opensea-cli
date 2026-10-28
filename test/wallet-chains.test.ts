import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves world_chain to 480", () => {
    expect(resolveChainId("world_chain")).toBe(480)
  })

  it("resolves the worldchain alias to 480", () => {
    expect(resolveChainId("worldchain")).toBe(480)
  })

  it("accepts World Chain's numeric id", () => {
    expect(resolveChainId("480")).toBe(480)
    expect(resolveChainId(480)).toBe(480)
  })

  it("lists world_chain among the known names for an unknown chain", () => {
    expect(() => resolveChainId("world-chain")).toThrow(/world_chain/)
  })

  it("keeps CHAIN_IDS in numeric order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
