import { afterEach, describe, expect, it, vi } from "vitest"
import type { OpenSeaClient } from "../src/client.js"
import {
  formatOutput,
  outputGet,
  setOutputOptions,
  stringifyJson,
} from "../src/output.js"

// A name that clears the line, writes the clipboard over OSC 52, prints a fake
// status in green, then sends an 8-bit CSI and a DEL.
const HOSTILE_NAME =
  "Legit\r\u001b[2K\u001b]52;c;cGF5bG9hZA==\u0007\u001b[32mVerified\u001b[0m\u009b2J\u007f"
const ESCAPED_HOSTILE_NAME =
  "Legit\\u000d\\u001b[2K\\u001b]52;c;cGF5bG9hZA==\\u0007\\u001b[32mVerified\\u001b[0m\\u009b2J\\u007f"

// One character on each side of every escaped range's boundaries.
const BOUNDARIES = {
  "\u001f": "\\u001f",
  " ": " ",
  "~": "~",
  "\u007f": "\\u007f",
  "\u009f": "\\u009f",
  "\u00a0": "\u00a0",
  "\u061b": "\u061b",
  "\u061c": "\\u061c",
  "\u061d": "\u061d",
  "\u200d": "\u200d",
  "\u200e": "\\u200e",
  "\u200f": "\\u200f",
  "\u2010": "\u2010",
  "\u2029": "\u2029",
  "\u202a": "\\u202a",
  "\u202e": "\\u202e",
  "\u202f": "\u202f",
  "\u2065": "\u2065",
  "\u2066": "\\u2066",
  "\u2069": "\\u2069",
  "\u206a": "\u206a",
}

describe("formatOutput", () => {
  afterEach(() => {
    setOutputOptions({})
  })

  describe("json format", () => {
    it("formats data as pretty JSON", () => {
      const data = { name: "test", value: 42 }
      expect(formatOutput(data, "json")).toBe(JSON.stringify(data, null, 2))
    })

    it("formats arrays as pretty JSON", () => {
      const data = [{ a: 1 }, { a: 2 }]
      expect(formatOutput(data, "json")).toBe(JSON.stringify(data, null, 2))
    })

    it("escapes DEL, C1 and bidi controls that JSON.stringify leaves raw", () => {
      const data = { name: HOSTILE_NAME, "key\u009b": "\u202eabc" }
      const result = formatOutput(data, "json")

      // JSON.stringify's own escapes cover C0, with the short form for CR.
      const jsonName = ESCAPED_HOSTILE_NAME.replace("\\u000d", "\\r")
      expect(result).toBe(
        [
          "{",
          `  "name": "${jsonName}",`,
          `  "key\\u009b": "\\u202eabc"`,
          "}",
        ].join("\n"),
      )
      expect(JSON.parse(result)).toEqual(data)
    })
  })

  describe("stringifyJson", () => {
    it("escapes exactly the characters inside each boundary", () => {
      for (const [raw, shown] of Object.entries(BOUNDARIES)) {
        expect(stringifyJson(raw)).toBe(`"${shown}"`)
      }
    })

    it("renders undefined the way console.log printed it", () => {
      expect(stringifyJson(undefined)).toBe("undefined")
    })
  })

  describe("table format", () => {
    it("formats an array as a table with header and rows", () => {
      const data = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ]
      const result = formatOutput(data, "table")
      const lines = result.split("\n")
      expect(lines).toHaveLength(4)
      expect(lines[0]).toContain("name")
      expect(lines[0]).toContain("age")
      expect(lines[1]).toMatch(/^-/)
      expect(lines[2]).toContain("Alice")
      expect(lines[3]).toContain("Bob")
    })

    it("returns (empty) for empty array", () => {
      expect(formatOutput([], "table")).toBe("(empty)")
    })

    it("includes a field that first appears on a later row", () => {
      const result = formatOutput(
        [
          { name: "CryptoPunk #1", price: "10 ETH" },
          { name: "Bored Ape #2", price: "5 ETH", rarity: "Rare" },
        ],
        "table",
      )
      const lines = result.split("\n")

      expect(lines[0]).toContain("rarity")
      expect(lines[3]).toContain("Rare")
      // The row missing the key renders blank rather than shifting columns.
      expect(lines[2]).toContain("CryptoPunk #1")
      expect(lines[2]).not.toContain("Rare")
    })

    it("returns (empty) for empty object", () => {
      expect(formatOutput({}, "table")).toBe("(empty)")
    })

    it("formats an object as key-value pairs", () => {
      const data = { name: "test", count: 5 }
      const result = formatOutput(data, "table")
      expect(result).toContain("name")
      expect(result).toContain("test")
      expect(result).toContain("count")
      expect(result).toContain("5")
    })

    it("formats nested objects in key-value mode as JSON strings", () => {
      const data = { name: "test", meta: { foo: "bar" } }
      const result = formatOutput(data, "table")
      expect(result).toContain('{"foo":"bar"}')
    })

    it("handles null values in table rows", () => {
      const data = [{ name: "Alice", value: null }]
      const result = formatOutput(data, "table")
      expect(result).toContain("Alice")
    })

    it("handles null values in key-value mode", () => {
      const data = { key: null }
      const result = formatOutput(data, "table")
      expect(result).toContain("key")
    })

    it("formats primitive values as strings", () => {
      expect(formatOutput("hello", "table")).toBe("hello")
      expect(formatOutput(42, "table")).toBe("42")
    })

    it("escapes control characters in table cells and headers", () => {
      const data = [
        { name: HOSTILE_NAME, price: "1 ETH" },
        { name: "Other", price: "2 ETH", "x\u001b[8m": "line1\nline2" },
      ]
      const lines = formatOutput(data, "table").split("\n")

      expect(lines).toHaveLength(4)
      expect(lines[0].trimEnd()).toBe(
        `name${" ".repeat(ESCAPED_HOSTILE_NAME.length - 4)}  price  x\\u001b[8m`,
      )
      expect(lines[2]).toContain(ESCAPED_HOSTILE_NAME)
      expect(lines[3]).toContain("line1\\u000aline2")
      // Widths come from the escaped text, so the price column still lines up.
      expect(lines[2].indexOf("1 ETH")).toBe(lines[3].indexOf("2 ETH"))
    })

    it("escapes exactly the characters inside each boundary in a cell", () => {
      for (const [raw, shown] of Object.entries(BOUNDARIES)) {
        const lines = formatOutput([{ v: raw }], "table").split("\n")
        expect(lines[2].trimEnd()).toBe(shown.trimEnd())
      }
    })

    it("escapes control characters in key-value mode", () => {
      const result = formatOutput(
        {
          name: HOSTILE_NAME,
          "k\u007f": "v",
          meta: { label: "\u009b2J" },
        },
        "table",
      )
      const lines = result.split("\n")

      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe(`name     ${ESCAPED_HOSTILE_NAME}`)
      expect(lines[1]).toBe("k\\u007f  v")
      expect(lines[2]).toBe('meta     {"label":"\\u009b2J"}')
    })

    it("escapes control characters in a primitive", () => {
      expect(formatOutput(HOSTILE_NAME, "table")).toBe(ESCAPED_HOSTILE_NAME)
    })
  })

  describe("--fields option", () => {
    it("filters top-level fields on a plain object", () => {
      setOutputOptions({ fields: ["name", "collection"] })
      const data = {
        name: "Cool NFT",
        collection: "cool-cats",
        description: "A cool cat",
        image_url: "https://example.com/img.png",
      }
      const result = JSON.parse(formatOutput(data, "json"))
      expect(result).toEqual({ name: "Cool NFT", collection: "cool-cats" })
    })

    it("picks matching fields from wrapper objects", () => {
      setOutputOptions({ fields: ["nfts", "next"] })
      const data = {
        nfts: [
          { identifier: "1", name: "NFT #1" },
          { identifier: "2", name: "NFT #2" },
        ],
        next: "cursor123",
        extra: "dropped",
      }
      const result = JSON.parse(formatOutput(data, "json"))
      expect(result).toEqual({
        nfts: [
          { identifier: "1", name: "NFT #1" },
          { identifier: "2", name: "NFT #2" },
        ],
        next: "cursor123",
      })
    })

    it("filters fields on a bare array", () => {
      setOutputOptions({ fields: ["name"] })
      const data = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ]
      const result = JSON.parse(formatOutput(data, "json"))
      expect(result).toEqual([{ name: "Alice" }, { name: "Bob" }])
    })

    it("ignores fields that do not exist", () => {
      setOutputOptions({ fields: ["name", "nonexistent"] })
      const data = { name: "test", value: 42 }
      const result = JSON.parse(formatOutput(data, "json"))
      expect(result).toEqual({ name: "test" })
    })

    it("filters top-level fields on objects with array properties", () => {
      setOutputOptions({ fields: ["name", "collection"] })
      const data = {
        name: "Cool Cats",
        collection: "cool-cats",
        description: "A cool collection",
        contracts: [{ address: "0x1", chain: "ethereum" }],
        editors: ["alice"],
        fees: [{ fee: 250, recipient: "0x2", required: true }],
      }
      const result = JSON.parse(formatOutput(data, "json"))
      expect(result).toEqual({
        name: "Cool Cats",
        collection: "cool-cats",
      })
    })

    it("returns primitives unchanged", () => {
      setOutputOptions({ fields: ["name"] })
      expect(formatOutput("hello", "json")).toBe('"hello"')
    })

    it("works with table format", () => {
      setOutputOptions({ fields: ["name"] })
      const data = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ]
      const result = formatOutput(data, "table")
      expect(result).toContain("name")
      expect(result).not.toContain("age")
    })
  })

  describe("--max-lines option", () => {
    it("truncates output exceeding max lines", () => {
      setOutputOptions({ maxLines: 3 })
      const data = { a: 1, b: 2, c: 3, d: 4, e: 5 }
      const result = formatOutput(data, "json")
      const lines = result.split("\n")
      expect(lines).toHaveLength(4)
      expect(lines[3]).toBe("... (4 more lines)")
    })

    it("does not truncate when output fits within max lines", () => {
      setOutputOptions({ maxLines: 100 })
      const data = { a: 1 }
      const result = formatOutput(data, "json")
      expect(result).not.toContain("...")
      expect(result).toBe(JSON.stringify(data, null, 2))
    })

    it("uses singular 'line' for exactly one omitted line", () => {
      setOutputOptions({ maxLines: 2 })
      const data = { a: 1 }
      const result = formatOutput(data, "json")
      const lines = result.split("\n")
      expect(lines[lines.length - 1]).toBe("... (1 more line)")
    })

    it("works with table format", () => {
      setOutputOptions({ maxLines: 2 })
      const data = [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }]
      const result = formatOutput(data, "table")
      const lines = result.split("\n")
      expect(lines).toHaveLength(3)
      expect(lines[2]).toMatch(/\.\.\. \(\d+ more lines?\)/)
    })
  })

  describe("--fields and --max-lines combined", () => {
    it("applies field filtering then truncation", () => {
      setOutputOptions({ fields: ["name"], maxLines: 3 })
      const data = [
        { name: "A", id: 1 },
        { name: "B", id: 2 },
        { name: "C", id: 3 },
        { name: "D", id: 4 },
      ]
      const result = formatOutput(data, "json")
      expect(result).not.toContain("id")
      const lines = result.split("\n")
      expect(lines).toHaveLength(4)
      expect(lines[3]).toMatch(/\.\.\. \(\d+ more lines?\)/)
    })
  })
})

describe("outputGet toon", () => {
  afterEach(() => {
    setOutputOptions({})
    vi.restoreAllMocks()
  })

  function markdownClient(text: string): OpenSeaClient {
    return {
      getAsMarkdown: vi.fn().mockResolvedValue({ text, isMarkdown: true }),
    } as unknown as OpenSeaClient
  }

  it("escapes control characters but keeps newlines and tabs", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const text = `collections[1]{name,slug}:\r\n\t${HOSTILE_NAME},legit\n`

    await outputGet(markdownClient(text), "toon", "/api/v2/collections")

    expect(log).toHaveBeenCalledWith(
      `collections[1]{name,slug}:\n\t${ESCAPED_HOSTILE_NAME},legit\n`,
    )
  })

  it("escapes before truncating to --max-lines", async () => {
    setOutputOptions({ maxLines: 1 })
    const log = vi.spyOn(console, "log").mockImplementation(() => {})

    await outputGet(
      markdownClient("a\u009b\r\nb\nc"),
      "toon",
      "/api/v2/collections",
    )

    expect(log).toHaveBeenCalledWith("a\\u009b\n... (2 more lines)")
  })
})
