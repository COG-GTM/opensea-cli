import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { accountsCommand } from "../../src/commands/accounts.js"
import {
  type CommandTestContext,
  createCommandTestContext,
  requestedPaths,
  resolveAllRequests,
} from "../mocks.js"

function writeTempJson(data: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "cli-test-"))
  const file = join(dir, "body.json")
  writeFileSync(file, JSON.stringify(data))
  return file
}

describe("accountsCommand", () => {
  let ctx: CommandTestContext

  beforeEach(() => {
    ctx = createCommandTestContext()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates command with correct name and subcommands", () => {
    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    expect(cmd.name()).toBe("accounts")
    const subcommands = cmd.commands.map(c => c.name())
    expect(subcommands).toContain("get")
    // The retired wallet-level designation, removed with the rest of the model.
    expect(subcommands).not.toContain("mark-agent")
    expect(subcommands).not.toContain("remove-agent")
    expect(subcommands).toContain("make-private")
    expect(subcommands).toContain("make-public")
    expect(subcommands).toContain("agent-relationships")
  })

  it("make-private marks a registered wallet as private", async () => {
    ctx.mockClient.put.mockResolvedValue({
      address: "0xabc",
      is_private: true,
    })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["make-private", "0xabc"], { from: "user" })

    expect(ctx.mockClient.put).toHaveBeenCalledWith(
      "/api/v2/accounts/wallets/0xabc/private",
    )
  })

  it("make-public marks a registered wallet as public", async () => {
    ctx.mockClient.delete.mockResolvedValue({
      address: "0xabc",
      is_private: false,
    })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["make-public", "0xabc"], { from: "user" })

    expect(ctx.mockClient.delete).toHaveBeenCalledWith(
      "/api/v2/accounts/wallets/0xabc/private",
    )
  })

  it("agent-relationships fetches public agent relationships", async () => {
    ctx.mockClient.get.mockResolvedValue({
      public_agent_wallets: [],
    })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["agent-relationships", "vitalik.eth"], {
      from: "user",
    })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/accounts/vitalik.eth/agent-relationships",
    )
  })

  it("get subcommand fetches account by address", async () => {
    ctx.mockClient.get.mockResolvedValue({ address: "0xabc", username: "user" })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["get", "0xabc"], { from: "user" })

    expect(ctx.mockClient.get).toHaveBeenCalledWith("/api/v2/accounts/0xabc")
  })

  it("relationship subcommand fetches relationship", async () => {
    ctx.mockClient.get.mockResolvedValue({ is_following: true })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["relationship", "vitalik.eth"], { from: "user" })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/accounts/vitalik.eth/relationship",
    )
  })

  it("followers subcommand passes pagination", async () => {
    ctx.mockClient.get.mockResolvedValue({ accounts: [] })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(
      ["followers", "vitalik.eth", "--limit", "5", "--next", "abc"],
      { from: "user" },
    )

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/accounts/vitalik.eth/followers",
      expect.objectContaining({ limit: 5, cursor: "abc" }),
    )
  })

  it("follow subcommand posts to follow endpoint", async () => {
    ctx.mockClient.post.mockResolvedValue({ success: true })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["follow", "vitalik.eth"], { from: "user" })

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/accounts/vitalik.eth/follow",
    )
  })

  it("unfollow subcommand deletes the follow", async () => {
    ctx.mockClient.delete.mockResolvedValue({ success: true })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["unfollow", "vitalik.eth"], { from: "user" })

    expect(ctx.mockClient.delete).toHaveBeenCalledWith(
      "/api/v2/accounts/vitalik.eth/follow",
    )
  })

  it("watch subcommand posts to watch endpoint", async () => {
    ctx.mockClient.post.mockResolvedValue({ success: true })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["watch", "0xabc"], { from: "user" })

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/accounts/0xabc/watch",
    )
  })

  it("unwatch subcommand deletes the watch", async () => {
    ctx.mockClient.delete.mockResolvedValue({ success: true })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["unwatch", "0xabc"], { from: "user" })

    expect(ctx.mockClient.delete).toHaveBeenCalledWith(
      "/api/v2/accounts/0xabc/watch",
    )
  })

  it("token-watchlist subcommand fetches token watchlist", async () => {
    ctx.mockClient.get.mockResolvedValue({ tokens: [] })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["token-watchlist", "0xabc"], { from: "user" })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/account/0xabc/token_watchlist",
    )
  })

  it("perpetual-watchlist subcommand fetches perpetual watchlist", async () => {
    ctx.mockClient.get.mockResolvedValue({ markets: [] })

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["perpetual-watchlist", "0xabc"], { from: "user" })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/account/0xabc/perpetual_watchlist",
    )
  })

  it("watchlist-add posts the request body", async () => {
    ctx.mockClient.post.mockResolvedValue({ success: true })
    const body = { type: "collection", slug: "cool-cats" }
    const file = writeTempJson(body)

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(["watchlist-add", "--body", file], { from: "user" })
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.post).toHaveBeenCalledWith("/api/v2/watchlist", body)
  })

  it("watchlist-remove deletes with the request body", async () => {
    ctx.mockClient.delete.mockResolvedValue({ success: true })
    const body = { type: "collection", slug: "cool-cats" }
    const file = writeTempJson(body)

    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(["watchlist-remove", "--body", file], {
        from: "user",
      })
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.delete).toHaveBeenCalledWith(
      "/api/v2/watchlist",
      body,
    )
  })
})

describe("accountsCommand path arguments", () => {
  let ctx: CommandTestContext

  beforeEach(() => {
    ctx = createCommandTestContext()
    resolveAllRequests(ctx.mockClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each<[string[], string]>([
    [["get", "0xa/1"], "GET /api/v2/accounts/0xa%2F1"],
    [["make-private", "0xa/1"], "PUT /api/v2/accounts/wallets/0xa%2F1/private"],
    [
      ["make-public", "0xa/1"],
      "DELETE /api/v2/accounts/wallets/0xa%2F1/private",
    ],
    [
      ["agent-relationships", "alice/1"],
      "GET /api/v2/accounts/alice%2F1/agent-relationships",
    ],
    [["tokens", "0xa/1"], "GET /api/v2/account/0xa%2F1/tokens"],
    [["resolve", "alice/1"], "GET /api/v2/accounts/resolve/alice%2F1"],
    [["portfolio", "0xa/1"], "GET /api/v2/account/0xa%2F1/portfolio"],
    [
      ["portfolio-history", "0xa/1"],
      "GET /api/v2/account/0xa%2F1/portfolio/history",
    ],
    [["offers", "0xa/1"], "GET /api/v2/account/0xa%2F1/offers"],
    [
      ["offers-received", "0xa/1"],
      "GET /api/v2/account/0xa%2F1/offers_received",
    ],
    [["listings", "0xa/1"], "GET /api/v2/account/0xa%2F1/listings"],
    [["favorites", "0xa/1"], "GET /api/v2/account/0xa%2F1/favorites"],
    [["collections", "0xa/1"], "GET /api/v2/account/0xa%2F1/collections"],
    [["pnl", "0xa/1"], "GET /api/v2/account/0xa%2F1/pnl"],
    [
      ["closed-positions", "0xa/1"],
      "GET /api/v2/account/0xa%2F1/pnl/closed-positions",
    ],
    [
      [
        "token-transfers",
        "0xa/1",
        "--contract-address",
        "0xc",
        "--chain",
        "base",
      ],
      "GET /api/v2/account/0xa%2F1/pnl/token-transfers",
    ],
    [
      ["relationship", "alice/1"],
      "GET /api/v2/accounts/alice%2F1/relationship",
    ],
    [["followers", "alice/1"], "GET /api/v2/accounts/alice%2F1/followers"],
    [["following", "alice/1"], "GET /api/v2/accounts/alice%2F1/following"],
    [["follow", "alice/1"], "POST /api/v2/accounts/alice%2F1/follow"],
    [["unfollow", "alice/1"], "DELETE /api/v2/accounts/alice%2F1/follow"],
    [["watch", "alice/1"], "POST /api/v2/accounts/alice%2F1/watch"],
    [["unwatch", "alice/1"], "DELETE /api/v2/accounts/alice%2F1/watch"],
    [
      ["token-watchlist", "0xa/1"],
      "GET /api/v2/account/0xa%2F1/token_watchlist",
    ],
    [
      ["perpetual-watchlist", "0xa/1"],
      "GET /api/v2/account/0xa%2F1/perpetual_watchlist",
    ],
  ])("%j encodes the path argument", async (argv, request) => {
    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(argv, { from: "user" })
    expect(requestedPaths(ctx.mockClient)).toEqual([request])
  })

  it.each([".", ".."])("rejects %j before any request", async segment => {
    const cmd = accountsCommand(ctx.getClient, ctx.getFormat)
    await expect(
      cmd.parseAsync(["follow", segment], { from: "user" }),
    ).rejects.toThrow(`Invalid path segment: "${segment}"`)
    expect(requestedPaths(ctx.mockClient)).toEqual([])
  })
})
