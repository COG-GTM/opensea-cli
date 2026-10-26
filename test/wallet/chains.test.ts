import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../../src/wallet/chains.js"

const NEW_CHAINS: Array<[string, number]> = [
  ["plasma", 9745],
  ["sonic", 146],
  ["linea", 59144],
  ["mantle", 5000],
  ["katana", 747474],
  ["celo", 42220],
]

describe("resolveChainId", () => {
  it.each(NEW_CHAINS)("resolves %s to chain id %i", (name, id) => {
    expect(CHAIN_IDS[name]).toBe(id)
    expect(resolveChainId(name)).toBe(id)
  })

  it("still resolves base", () => {
    expect(resolveChainId("base")).toBe(8453)
  })

  it("passes numeric ids through", () => {
    expect(resolveChainId("146")).toBe(146)
    expect(resolveChainId(747474)).toBe(747474)
  })

  it("lists the new chains in the unknown-chain error", () => {
    let message = ""
    try {
      resolveChainId("not-a-chain")
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain('Unknown chain "not-a-chain"')
    for (const [name] of NEW_CHAINS) {
      expect(message).toContain(name)
    }
  })

  it("keeps the table ordered by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
