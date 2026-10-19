import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { listingsCommand } from "../../src/commands/listings.js"
import { type CommandTestContext, createCommandTestContext } from "../mocks.js"

function writeTempJson(data: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "cli-test-"))
  const file = join(dir, "body.json")
  writeFileSync(file, JSON.stringify(data))
  return file
}

describe("listingsCommand", () => {
  let ctx: CommandTestContext

  beforeEach(() => {
    ctx = createCommandTestContext()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates command with correct subcommands", () => {
    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    expect(cmd.name()).toBe("listings")
    const subcommands = cmd.commands.map(c => c.name())
    expect(subcommands).toContain("all")
    expect(subcommands).toContain("best")
    expect(subcommands).toContain("best-for-nft")
    expect(subcommands).toContain("cross-chain-fulfill")
    expect(subcommands).toContain("actions")
    expect(subcommands).toContain("fulfillment-actions")
  })

  it("all subcommand fetches all listings", async () => {
    ctx.mockClient.get.mockResolvedValue({ listings: [] })

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["all", "cool-cats", "--limit", "10"], {
      from: "user",
    })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/listings/collection/cool-cats/all",
      expect.objectContaining({ limit: 10 }),
    )
  })

  it("best subcommand fetches best listings", async () => {
    ctx.mockClient.get.mockResolvedValue({ listings: [] })

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["best", "cool-cats"], { from: "user" })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/listings/collection/cool-cats/best",
      expect.objectContaining({ limit: 20 }),
    )
  })

  it("best-for-nft subcommand fetches best listing for NFT", async () => {
    ctx.mockClient.get.mockResolvedValue({})

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["best-for-nft", "cool-cats", "123"], {
      from: "user",
    })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/listings/collection/cool-cats/nfts/123/best",
    )
  })

  it("cross-chain-fulfill subcommand posts correct body", async () => {
    ctx.mockClient.post.mockResolvedValue({ transactions: [] })

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(
      [
        "cross-chain-fulfill",
        "--hashes",
        "0xabc",
        "--listing-chain",
        "ethereum",
        "--protocol-address",
        "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
        "--fulfiller",
        "0x1234567890abcdef1234567890abcdef12345678",
        "--payment-chain",
        "base",
        "--payment-token",
        "0x0000000000000000000000000000000000000000",
      ],
      { from: "user" },
    )

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/listings/cross_chain_fulfillment_data",
      {
        listings: [
          {
            hash: "0xabc",
            chain: "ethereum",
            protocol_address: "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
          },
        ],
        fulfiller: {
          address: "0x1234567890abcdef1234567890abcdef12345678",
        },
        payment: {
          chain: "base",
          token_address: "0x0000000000000000000000000000000000000000",
        },
      },
    )
  })

  it("cross-chain-fulfill supports multiple hashes", async () => {
    ctx.mockClient.post.mockResolvedValue({ transactions: [] })

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(
      [
        "cross-chain-fulfill",
        "--hashes",
        "0xabc,0xdef",
        "--listing-chain",
        "ethereum",
        "--protocol-address",
        "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
        "--fulfiller",
        "0x1234567890abcdef1234567890abcdef12345678",
        "--payment-chain",
        "base",
        "--payment-token",
        "0x0000000000000000000000000000000000000000",
      ],
      { from: "user" },
    )

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/listings/cross_chain_fulfillment_data",
      expect.objectContaining({
        listings: [
          expect.objectContaining({ hash: "0xabc" }),
          expect.objectContaining({ hash: "0xdef" }),
        ],
      }),
    )
  })

  it("cross-chain-fulfill passes optional recipient", async () => {
    ctx.mockClient.post.mockResolvedValue({ transactions: [] })

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(
      [
        "cross-chain-fulfill",
        "--hashes",
        "0xabc",
        "--listing-chain",
        "ethereum",
        "--protocol-address",
        "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC",
        "--fulfiller",
        "0x1234567890abcdef1234567890abcdef12345678",
        "--payment-chain",
        "base",
        "--payment-token",
        "0x0000000000000000000000000000000000000000",
        "--recipient",
        "0xrecipient",
      ],
      { from: "user" },
    )

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/listings/cross_chain_fulfillment_data",
      expect.objectContaining({
        recipient: "0xrecipient",
      }),
    )
  })

  it("fulfillment-actions posts the request body", async () => {
    ctx.mockClient.post.mockResolvedValue({ steps: [] })
    const body = {
      listing: {
        hash: "solana-listing-id",
        chain: "solana",
        protocol_address: "AuctionHouseBase58Address",
      },
      fulfiller: { address: "BuyerBase58Address" },
      include_optional_creator_fees: false,
    }
    const file = writeTempJson(body)

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(["fulfillment-actions", "--body", file], {
        from: "user",
      })
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/listings/fulfillment/actions",
      body,
    )
  })

  it("post submits the signed order unchanged to the chain and protocol listing endpoint", async () => {
    const response = { order_hash: "0xhash", chain: "base" }
    ctx.mockClient.post.mockResolvedValue(response)
    const body = {
      parameters: { offerer: "0xmaker", salt: "1", counter: "0" },
      signature: "0xsig",
      protocol_address: "0x0000000000000068f116a894984e2db1123eb395",
    }
    const file = writeTempJson(body)

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(["post", "base", "--body", file], { from: "user" })
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.get).not.toHaveBeenCalled()
    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/orders/base/seaport/listings",
      body,
    )
    expect(ctx.consoleSpy).toHaveBeenCalledWith(
      JSON.stringify(response, null, 2),
    )
  })

  it("post encodes a chain or protocol containing a slash", async () => {
    ctx.mockClient.post.mockResolvedValue({})
    const file = writeTempJson({ signature: "0xsig" })

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(
        [
          "post",
          "base/../../listings",
          "--protocol",
          "seaport/x",
          "--body",
          file,
        ],
        { from: "user" },
      )
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/orders/base%2F..%2F..%2Flistings/seaport%2Fx/listings",
      { signature: "0xsig" },
    )
  })

  it("post rejects a dot-segment chain without sending a request", async () => {
    const file = writeTempJson({ signature: "0xsig" })

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    try {
      await expect(
        cmd.parseAsync(["post", "..", "--body", file], { from: "user" }),
      ).rejects.toThrow('Invalid path segment: ".."')
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.post).not.toHaveBeenCalled()
  })

  it("fulfillment-data posts the request body unchanged and prints the response", async () => {
    const response = { protocol: "seaport1.6", fulfillment_data: {} }
    ctx.mockClient.post.mockResolvedValue(response)
    const body = {
      listing: {
        hash: "0xlisting",
        chain: "ethereum",
        protocol_address: "0x0000000000000068f116a894984e2db1123eb395",
      },
      fulfiller: { address: "0xbuyer" },
    }
    const file = writeTempJson(body)

    const cmd = listingsCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(["fulfillment-data", "--body", file], {
        from: "user",
      })
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.get).not.toHaveBeenCalled()
    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/listings/fulfillment_data",
      body,
    )
    expect(ctx.consoleSpy).toHaveBeenCalledWith(
      JSON.stringify(response, null, 2),
    )
  })
})
