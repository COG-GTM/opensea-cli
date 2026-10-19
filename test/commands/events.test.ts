import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { eventsCommand } from "../../src/commands/events.js"
import {
  type CommandTestContext,
  createCommandTestContext,
  requestedPaths,
  resolveAllRequests,
} from "../mocks.js"

describe("eventsCommand", () => {
  let ctx: CommandTestContext

  beforeEach(() => {
    ctx = createCommandTestContext()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates command with correct subcommands", () => {
    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    expect(cmd.name()).toBe("events")
    const subcommands = cmd.commands.map(c => c.name())
    expect(subcommands).toContain("list")
    expect(subcommands).toContain("by-account")
    expect(subcommands).toContain("by-collection")
    expect(subcommands).toContain("by-nft")
  })

  it("list subcommand passes options", async () => {
    ctx.mockClient.get.mockResolvedValue({ asset_events: [] })

    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["list", "--event-type", "sale", "--limit", "5"], {
      from: "user",
    })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/events",
      expect.objectContaining({
        event_type: "sale",
        limit: 5,
      }),
    )
    expect(ctx.mockClient.get.mock.calls[0][1]).not.toHaveProperty("chain")
  })

  it("list subcommand refuses --chain instead of sending an ignored filter", async () => {
    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    cmd.exitOverride()
    cmd.commands.find(c => c.name() === "list")?.exitOverride()
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true)

    await expect(
      cmd.parseAsync(["list", "--chain", "base"], { from: "user" }),
    ).rejects.toMatchObject({ code: "opensea.unsupportedChainFilter" })

    expect(ctx.mockClient.get).not.toHaveBeenCalled()
    const message = stderr.mock.calls.flat().join("")
    expect(message).toContain("events list cannot filter by chain")
    expect(message).toContain("events by-account <address> --chain <chain>")
    expect(message).toContain("events by-nft <chain>")
  })

  it("list help does not advertise --chain", () => {
    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    const list = cmd.commands.find(c => c.name() === "list")
    expect(list?.helpInformation()).not.toContain("--chain")
  })

  it("list subcommand parses after/before timestamps", async () => {
    ctx.mockClient.get.mockResolvedValue({ asset_events: [] })

    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(
      ["list", "--after", "1000000", "--before", "2000000"],
      { from: "user" },
    )

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/events",
      expect.objectContaining({
        after: 1000000,
        before: 2000000,
      }),
    )
  })

  it("by-account subcommand passes options", async () => {
    ctx.mockClient.get.mockResolvedValue({ asset_events: [] })

    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["by-account", "0xabc", "--event-type", "transfer"], {
      from: "user",
    })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/events/accounts/0xabc",
      expect.objectContaining({ event_type: "transfer" }),
    )
  })

  it("by-collection subcommand passes options", async () => {
    ctx.mockClient.get.mockResolvedValue({ asset_events: [] })

    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["by-collection", "cool-cats", "--limit", "10"], {
      from: "user",
    })

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/events/collection/cool-cats",
      expect.objectContaining({ limit: 10 }),
    )
  })

  it("by-nft subcommand passes options", async () => {
    ctx.mockClient.get.mockResolvedValue({ asset_events: [] })

    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(
      ["by-nft", "ethereum", "0xabc", "1", "--event-type", "sale"],
      { from: "user" },
    )

    expect(ctx.mockClient.get).toHaveBeenCalledWith(
      "/api/v2/events/chain/ethereum/contract/0xabc/nfts/1",
      expect.objectContaining({ event_type: "sale" }),
    )
  })
})

describe("eventsCommand path arguments", () => {
  let ctx: CommandTestContext

  beforeEach(() => {
    ctx = createCommandTestContext()
    resolveAllRequests(ctx.mockClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each<[string[], string]>([
    [["by-account", "0xa/1"], "GET /api/v2/events/accounts/0xa%2F1"],
    [["by-collection", "cats/1"], "GET /api/v2/events/collection/cats%2F1"],
    [
      ["by-nft", "base/1", "0xc/2", "7/3"],
      "GET /api/v2/events/chain/base%2F1/contract/0xc%2F2/nfts/7%2F3",
    ],
  ])("%j encodes every path argument", async (argv, request) => {
    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(argv, { from: "user" })
    expect(requestedPaths(ctx.mockClient)).toEqual([request])
  })

  it.each([".", ".."])("rejects %j before any request", async segment => {
    const cmd = eventsCommand(ctx.getClient, ctx.getFormat)
    await expect(
      cmd.parseAsync(["by-nft", "base", "0xc", segment], { from: "user" }),
    ).rejects.toThrow(`Invalid path segment: "${segment}"`)
    expect(requestedPaths(ctx.mockClient)).toEqual([])
  })
})
