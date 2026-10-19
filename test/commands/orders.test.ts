import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ordersCommand } from "../../src/commands/orders.js"
import { type CommandTestContext, createCommandTestContext } from "../mocks.js"

function writeTempJson(data: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "cli-test-"))
  const file = join(dir, "body.json")
  writeFileSync(file, JSON.stringify(data))
  return file
}

describe("ordersCommand", () => {
  let ctx: CommandTestContext

  beforeEach(() => {
    ctx = createCommandTestContext()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates command with cancellation subcommands", () => {
    const cmd = ordersCommand(ctx.getClient, ctx.getFormat)
    expect(cmd.name()).toBe("orders")
    expect(cmd.commands.map(c => c.name())).toContain("cancel")
    expect(cmd.commands.map(c => c.name())).toContain("cancel-actions")
  })

  it("cancel posts to the cancel endpoint without a body by default", async () => {
    ctx.mockClient.post.mockResolvedValue({ success: true })

    const cmd = ordersCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["cancel", "ethereum", "0xproto", "0xhash"], {
      from: "user",
    })

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/orders/chain/ethereum/protocol/0xproto/0xhash/cancel",
      undefined,
    )
  })

  it("cancel forwards an optional body", async () => {
    ctx.mockClient.post.mockResolvedValue({ success: true })
    const body = { offererSignature: "0xsig" }
    const file = writeTempJson(body)

    const cmd = ordersCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(
        ["cancel", "ethereum", "0xproto", "0xhash", "--body", file],
        { from: "user" },
      )
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/orders/chain/ethereum/protocol/0xproto/0xhash/cancel",
      body,
    )
  })

  it("cancel-actions posts the maker body to the action endpoint", async () => {
    ctx.mockClient.post.mockResolvedValue({ steps: [] })
    const body = { address: "MakerBase58Address" }
    const file = writeTempJson(body)

    const cmd = ordersCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(
        [
          "cancel-actions",
          "solana",
          "AuctionHouseBase58Address",
          "solana-order-id",
          "--body",
          file,
        ],
        { from: "user" },
      )
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/orders/chain/solana/protocol/AuctionHouseBase58Address/solana-order-id/cancel/actions",
      body,
    )
  })

  it("get fetches the order by chain, protocol address and hash", async () => {
    const response = { order: { order_hash: "0xhash" } }
    ctx.mockClient.get.mockResolvedValue(response)

    const cmd = ordersCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["get", "ethereum", "0xproto", "0xhash"], {
      from: "user",
    })

    expect(ctx.mockClient.post).not.toHaveBeenCalled()
    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/orders/chain/ethereum/protocol/0xproto/0xhash",
    )
    expect(ctx.consoleSpy).toHaveBeenCalledWith(
      JSON.stringify(response, null, 2),
    )
  })

  it("get encodes an order hash containing a slash", async () => {
    ctx.mockClient.get.mockResolvedValue({})

    const cmd = ordersCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["get", "ethereum", "0xproto", "0xhash/cancel"], {
      from: "user",
    })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/orders/chain/ethereum/protocol/0xproto/0xhash%2Fcancel",
    )
  })

  it("get rejects a dot-segment protocol address without sending a request", async () => {
    const cmd = ordersCommand(ctx.getClient, ctx.getFormat)
    await expect(
      cmd.parseAsync(["get", "ethereum", "..", "0xhash"], { from: "user" }),
    ).rejects.toThrow('Invalid path segment: ".."')

    expect(ctx.mockClient.get).not.toHaveBeenCalled()
  })
})
