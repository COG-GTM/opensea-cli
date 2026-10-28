import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves scroll to 534352", () => {
    expect(resolveChainId("scroll")).toBe(534352)
    expect(CHAIN_IDS.scroll).toBe(534352)
  })

  it("passes numeric chain ids through", () => {
    expect(resolveChainId("534352")).toBe(534352)
    expect(resolveChainId(534352)).toBe(534352)
  })

  it("keeps CHAIN_IDS in numeric order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("rejects unknown chain names", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/Unknown chain/)
  })
})
import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves mode to 34443", () => {
    expect(resolveChainId("mode")).toBe(34443)
    expect(CHAIN_IDS.mode).toBe(34443)
  })

  it("accepts Mode's numeric chain id", () => {
    expect(resolveChainId(34443)).toBe(34443)
    expect(resolveChainId("34443")).toBe(34443)
  })

  it("lists mode among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/\bmode\b/)
  })

  it("keeps CHAIN_IDS sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/index.js"

describe("resolveChainId", () => {
  it("resolves moonbeam to 1284", () => {
    expect(resolveChainId("moonbeam")).toBe(1284)
    expect(CHAIN_IDS.moonbeam).toBe(1284)
  })

  it("accepts Moonbeam's numeric chain ID as a number or string", () => {
    expect(resolveChainId(1284)).toBe(1284)
    expect(resolveChainId("1284")).toBe(1284)
  })

  it("lists moonbeam among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/moonbeam/)
  })

  it("keeps CHAIN_IDS sorted by chain ID", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })
})
import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves lisk to chain id 1135", () => {
    expect(CHAIN_IDS.lisk).toBe(1135)
    expect(resolveChainId("lisk")).toBe(1135)
  })

  it("accepts Lisk's numeric chain id", () => {
    expect(resolveChainId("1135")).toBe(1135)
    expect(resolveChainId(1135)).toBe(1135)
  })

  it("keeps CHAIN_IDS sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("rejects an unknown chain name", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/Unknown chain/)
  })
})
import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/index.js"

describe("resolveChainId", () => {
  it("resolves kaia to 8217", () => {
    expect(resolveChainId("kaia")).toBe(8217)
    expect(CHAIN_IDS.kaia).toBe(8217)
  })

  it("accepts Kaia's numeric chain id as a number or string", () => {
    expect(resolveChainId(8217)).toBe(8217)
    expect(resolveChainId("8217")).toBe(8217)
  })

  it("keeps CHAIN_IDS sorted by chain id", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("throws for an unknown chain name", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(
      'Unknown chain "not-a-chain"',
    )
  })
})
import { describe, expect, it } from "vitest"
import { CHAIN_IDS, resolveChainId } from "../src/wallet/chains.js"

describe("resolveChainId", () => {
  it("resolves bob to BOB's chain id 60808", () => {
    expect(resolveChainId("bob")).toBe(60808)
    expect(CHAIN_IDS.bob).toBe(60808)
  })

  it("passes BOB's numeric chain id through", () => {
    expect(resolveChainId("60808")).toBe(60808)
    expect(resolveChainId(60808)).toBe(60808)
  })

  it("keeps CHAIN_IDS in numeric chain id order", () => {
    const ids = Object.values(CHAIN_IDS)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it("lists bob among the known names for an unknown chain", () => {
    expect(() => resolveChainId("not-a-chain")).toThrow(/\bbob\b/)
  })
})
