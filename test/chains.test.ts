import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/index.js"
import { CHAIN_IDS as WALLET_CHAIN_IDS } from "../src/wallet/index.js"

const NEW_CHAINS: [string, number][] = [
  ["cronos", 25],
  ["gnosis", 100],
  ["world_chain", 480],
  ["lisk", 1135],
  ["moonbeam", 1284],
  ["kaia", 8217],
  ["mode", 34443],
  ["bob", 60808],
  ["taiko", 167000],
  ["scroll", 534352],
]

describe("resolveChainId", () => {
  describe.each(NEW_CHAINS)("%s", (name, id) => {
    it(`resolves to ${id}`, () => {
      expect(resolveChainId(name)).toBe(id)
      expect(CHAIN_IDS[name]).toBe(id)
    })

    it("passes the numeric chain id through as a number or string", () => {
      expect(resolveChainId(id)).toBe(id)
      expect(resolveChainId(String(id))).toBe(id)
    })

    it("is listed among the known names for an unknown chain", () => {
      expect(() => resolveChainId("not-a-chain")).toThrow(
        new RegExp(`Unknown chain "not-a-chain".*\\b${name}\\b`),
      )
    })
  })

  it("resolves the worldchain alias to 480", () => {
    expect(resolveChainId("worldchain")).toBe(480)
  })

  it("exports the same table from the root and wallet entry points", () => {
    expect(WALLET_CHAIN_IDS).toBe(CHAIN_IDS)
  })

  it("keeps CHAIN_IDS in numeric order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("rejects an unknown chain name", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(
      'Unknown chain "not-a-chain"',
    )
  })
})
