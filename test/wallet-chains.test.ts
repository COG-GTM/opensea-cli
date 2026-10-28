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
