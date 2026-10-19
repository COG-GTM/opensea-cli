import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { profileCommand } from "../../src/commands/profile.js"
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

describe("profileCommand", () => {
  let ctx: CommandTestContext

  beforeEach(() => {
    ctx = createCommandTestContext()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates command with expected subcommands", () => {
    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    const names = cmd.commands.map(c => c.name())
    expect(cmd.name()).toBe("profile")
    expect(names).toContain("settings")
    expect(names).toContain("claim-username")
    expect(names).toContain("set-nft-pfp")
    expect(names).toContain("clear-nft-pfp")
    expect(names).toContain("create-shelf")
  })

  it("settings PATCHes the request body", async () => {
    ctx.mockClient.patch.mockResolvedValue({ success: true })
    const body = { displayName: "Vitalik", bio: "gm" }
    const file = writeTempJson(body)

    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(["settings", "--body", file], { from: "user" })
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.patch).toHaveBeenCalledWith("/api/v2/profile", body)
  })

  it("claim-username posts the username", async () => {
    ctx.mockClient.post.mockResolvedValue({ username: "vitalik" })

    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["claim-username", "vitalik"], { from: "user" })

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/profile/username",
      { username: "vitalik" },
    )
  })

  it("set-nft-pfp posts a camelCase request body", async () => {
    ctx.mockClient.post.mockResolvedValue({ image_url: "https://x" })

    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["set-nft-pfp", "0xcontract", "42", "ethereum"], {
      from: "user",
    })

    expect(ctx.mockClient.post).toHaveBeenCalledWith(
      "/api/v2/profile/nft-pfp",
      {
        contractAddress: "0xcontract",
        tokenId: "42",
        chain: "ethereum",
      },
    )
  })

  it("clear-nft-pfp deletes the nft pfp", async () => {
    ctx.mockClient.delete.mockResolvedValue({ success: true })

    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["clear-nft-pfp"], { from: "user" })

    expect(ctx.mockClient.delete).toHaveBeenCalledWith(
      "/api/v2/profile/nft-pfp",
    )
  })

  it("update-shelf patches a shelf by id", async () => {
    ctx.mockClient.patch.mockResolvedValue({ id: "s1" })
    const body = { title: "Faves" }
    const file = writeTempJson(body)

    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    try {
      await cmd.parseAsync(["update-shelf", "s1", "--body", file], {
        from: "user",
      })
    } finally {
      rmSync(file, { force: true })
    }

    expect(ctx.mockClient.patch).toHaveBeenCalledWith(
      "/api/v2/profile/shelves/s1",
      body,
    )
  })

  it("shelves lists a wallet's shelves by address", async () => {
    const shelves = [{ id: "s1", title: "Favorites" }]
    ctx.mockClient.get.mockResolvedValue(shelves)

    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["shelves", "0xabc"], { from: "user" })

    expect(ctx.mockClient.get).toHaveBeenCalledWith("/api/v2/profile/shelves", {
      address: "0xabc",
    })
    expect(ctx.consoleSpy).toHaveBeenCalledWith(
      JSON.stringify(shelves, null, 2),
    )
  })

  it("delete-shelf deletes a shelf by id", async () => {
    ctx.mockClient.delete.mockResolvedValue({ success: true })

    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(["delete-shelf", "s1"], { from: "user" })

    expect(ctx.mockClient.delete).toHaveBeenCalledWith(
      "/api/v2/profile/shelves/s1",
    )
  })
})

describe("profileCommand path arguments", () => {
  const BODY = "<body>"
  let ctx: CommandTestContext
  let body: string

  beforeEach(() => {
    ctx = createCommandTestContext()
    resolveAllRequests(ctx.mockClient)
    body = writeTempJson({})
  })

  afterEach(() => {
    rmSync(body, { force: true })
    vi.restoreAllMocks()
  })

  it.each<[string[], string]>([
    [
      ["update-shelf", "sh/1", "--body", BODY],
      "PATCH /api/v2/profile/shelves/sh%2F1",
    ],
    [["delete-shelf", "sh/1"], "DELETE /api/v2/profile/shelves/sh%2F1"],
  ])("%j encodes every path argument", async (argv, request) => {
    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    await cmd.parseAsync(
      argv.map(arg => (arg === BODY ? body : arg)),
      { from: "user" },
    )
    expect(requestedPaths(ctx.mockClient)).toEqual([request])
  })

  it.each([".", ".."])("rejects %j before any request", async segment => {
    const cmd = profileCommand(ctx.getClient, ctx.getFormat)
    await expect(
      cmd.parseAsync(["delete-shelf", segment], { from: "user" }),
    ).rejects.toThrow(`Invalid path segment: "${segment}"`)
    expect(requestedPaths(ctx.mockClient)).toEqual([])
  })
})
