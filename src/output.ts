import type { OpenSeaClient } from "./client.js"

export type OutputFormat = "json" | "table" | "toon"

export interface OutputOptions {
  fields?: string[]
  maxLines?: number
}

let _outputOptions: OutputOptions = {}

// Names and descriptions come from public metadata anyone can set, and a
// terminal acts on control characters instead of printing them: a crafted name
// could erase or rewrite earlier lines, write the clipboard (OSC 52), or
// reorder what the reader sees (bidi controls). These are C0, DEL, C1, the
// bidi marks, embeddings, overrides and isolates, each shown as a `\uXXXX`
// escape.
const CONTROL_CHARS =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point
  /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g

function escapeControlChars(value: string, keep = ""): string {
  return value.replace(CONTROL_CHARS, char =>
    keep.includes(char)
      ? char
      : `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  )
}

function escapeControlCharsInText(text: string): string {
  return escapeControlChars(text.replace(/\r\n/g, "\n"), "\n\t")
}

/**
 * `JSON.stringify` with no raw terminal control characters in its output.
 * Raw C0 in the output is only the indentation's newlines, since
 * `JSON.stringify` escapes C0 inside strings. DEL, C1 and bidi controls can
 * only sit inside string literals, where `\uXXXX` is a valid escape, so the
 * result parses to the same value.
 */
export function stringifyJson(value: unknown, space?: number): string {
  const json: string | undefined = JSON.stringify(value, null, space)
  if (json === undefined) return "undefined"
  return escapeControlChars(json, "\n")
}

export function setOutputOptions(options: OutputOptions): void {
  _outputOptions = options
}

export function formatOutput(data: unknown, format: OutputFormat): string {
  const processed = _outputOptions.fields
    ? filterFields(data, _outputOptions.fields)
    : data

  let result: string
  if (format === "table") {
    result = formatTable(processed)
  } else {
    result = stringifyJson(processed, 2)
  }

  if (_outputOptions.maxLines != null) {
    result = truncateOutput(result, _outputOptions.maxLines)
  }

  return result
}

function formatTable(data: unknown): string {
  if (Array.isArray(data)) {
    if (data.length === 0) return "(empty)"
    // Columns are the union of every row's keys, in first-seen order. Reading
    // only data[0] silently drops fields that appear later, and API responses
    // carry optional fields that differ between items.
    const keys = [
      ...new Set(
        data.flatMap(row => Object.keys(row as Record<string, unknown>)),
      ),
    ]
    const headers = keys.map(key => escapeControlChars(key))
    const cells = data.map(row =>
      keys.map(key =>
        escapeControlChars(String((row as Record<string, unknown>)[key] ?? "")),
      ),
    )
    const widths = headers.map((header, i) =>
      Math.max(header.length, ...cells.map(row => row[i].length)),
    )

    const header = headers.map((h, i) => h.padEnd(widths[i])).join("  ")
    const separator = widths.map(w => "-".repeat(w)).join("  ")
    const rows = cells.map(row =>
      row.map((cell, i) => cell.padEnd(widths[i])).join("  "),
    )

    return [header, separator, ...rows].join("\n")
  }

  if (data && typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>).map(
      ([key, value]) => [escapeControlChars(key), value] as const,
    )
    if (entries.length === 0) return "(empty)"
    const maxKeyLength = Math.max(...entries.map(([k]) => k.length))
    return entries
      .map(([key, value]) => {
        const displayValue =
          typeof value === "object" && value !== null
            ? stringifyJson(value)
            : escapeControlChars(String(value ?? ""))
        return `${key.padEnd(maxKeyLength)}  ${displayValue}`
      })
      .join("\n")
  }

  return escapeControlChars(String(data))
}

function pickFields(
  obj: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field]
    }
  }
  return result
}

function filterFields(data: unknown, fields: string[]): unknown {
  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, fields))
  }
  if (data && typeof data === "object") {
    return pickFields(data as Record<string, unknown>, fields)
  }
  return data
}

function truncateOutput(text: string, maxLines: number): string {
  const lines = text.split("\n")
  if (lines.length <= maxLines) return text
  const omitted = lines.length - maxLines
  return (
    lines.slice(0, maxLines).join("\n") +
    `\n... (${omitted} more line${omitted === 1 ? "" : "s"})`
  )
}

export async function outputGet(
  client: OpenSeaClient,
  format: OutputFormat,
  path: string,
  params?: Record<string, unknown>,
): Promise<void> {
  if (format === "toon" && !_outputOptions.fields) {
    const { text } =
      params != null
        ? await client.getAsMarkdown(path, params)
        : await client.getAsMarkdown(path)
    const safeText = escapeControlCharsInText(text)
    console.log(
      _outputOptions.maxLines != null
        ? truncateOutput(safeText, _outputOptions.maxLines)
        : safeText,
    )
    return
  }
  const result =
    params != null ? await client.get(path, params) : await client.get(path)
  console.log(formatOutput(result, format))
}
