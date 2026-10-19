import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UploadContextError } from "@opensea/sdk"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest"
import { createProgram } from "../src/program.js"
import { selectUploadContext } from "../src/upload.js"

const API_KEY = "test-api-key-0000"
const AUTH_TOKEN = "test-auth-token-0000"
const API_ORIGIN = "https://api.opensea.io"
const STORAGE_URL = "https://uploads.example.com/bucket"

const CONTEXT_FIELD_SECRETS = {
  policy: "fake-policy-eyJleHBpcmF0aW9uIjoi",
  "x-amz-signature": "fake-context-signature-0000",
}

const STORAGE_ERROR_SECRETS = [
  "FAKEACCESSKEYID00000",
  "FAKE-STRING-TO-SIGN-AWS4-HMAC-SHA256",
  "fakesignatureprovided0000",
  "SignatureDoesNotMatch",
]

const SIGNATURE_MISMATCH_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<Error><Code>${STORAGE_ERROR_SECRETS[3]}</Code><Message>The request signature we calculated does not match the signature you provided.</Message><AWSAccessKeyId>${STORAGE_ERROR_SECRETS[0]}</AWSAccessKeyId><StringToSign>${STORAGE_ERROR_SECRETS[1]}</StringToSign><SignatureProvided>${STORAGE_ERROR_SECRETS[2]}</SignatureProvided></Error>`

const SECRETS = [
  ...STORAGE_ERROR_SECRETS,
  ...Object.values(CONTEXT_FIELD_SECRETS),
]

function postContext(key: string, token: string) {
  return {
    url: STORAGE_URL,
    method: "POST",
    fields: { key, ...CONTEXT_FIELD_SECRETS },
    token,
  }
}

describe("selectUploadContext", () => {
  const first = postContext("uploads/1.png", "token-1")
  const second = postContext("uploads/2.png", "token-2")

  it("returns the indexed element of an array, at both ends", () => {
    expect(selectUploadContext([first, second], 0)).toBe(first)
    expect(selectUploadContext([first, second], 1)).toBe(second)
  })

  it("names --index when an array comes without one", () => {
    expect(() => selectUploadContext([first, second])).toThrow(
      "Upload context is an array of 2; pass --index <n> or pipe a single element (e.g. jq '.[0]')",
    )
  })

  it.each([
    -1, 2, 1.5,
  ])("names --index when %s is out of range for two contexts", index => {
    expect(() => selectUploadContext([first, second], index)).toThrow(
      `--index ${index} is out of range for 2 upload contexts`,
    )
  })

  it("names --index when it is given for a single context", () => {
    expect(() => selectUploadContext(first, 0)).toThrow(
      "--index applies only to an array of upload contexts",
    )
  })

  it("rejects an element that is not an upload context", () => {
    expect(() =>
      selectUploadContext([{ ...first, method: "GET" }, second], 0),
    ).toThrow(
      "Not an upload context: expected an object with url, method (POST or PUT), fields and token",
    )
    expect(() => selectUploadContext({ ...first, fields: null })).toThrow(
      "Not an upload context",
    )
  })
})

describe("storage uploads through the opensea program", () => {
  const dirs: string[] = []
  let fetchSpy: MockInstance<typeof fetch>
  let output: string[]
  let apiResponses: Record<string, unknown>
  let storageResponse: () => Response

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "cli-upload-"))
    dirs.push(dir)
    return dir
  }

  function tempFile(name: string, contents: string | Uint8Array): string {
    const file = join(tempDir(), name)
    writeFileSync(file, contents)
    return file
  }

  function captureOutput(): void {
    output = []
    const record = (...args: unknown[]) => {
      output.push(args.map(String).join(" "))
    }
    vi.spyOn(console, "log").mockImplementation(record)
    vi.spyOn(console, "error").mockImplementation(record)
    vi.spyOn(console, "warn").mockImplementation(record)
    vi.spyOn(process.stdout, "write").mockImplementation(chunk => {
      record(chunk)
      return true
    })
    vi.spyOn(process.stderr, "write").mockImplementation(chunk => {
      record(chunk)
      return true
    })
  }

  function storageCalls(): [string, RequestInit][] {
    return fetchSpy.mock.calls
      .filter(([url]) => String(url).startsWith(STORAGE_URL))
      .map(([url, init]) => [String(url), init as RequestInit])
  }

  function apiCalls(): [string, RequestInit][] {
    return fetchSpy.mock.calls
      .filter(([url]) => String(url).startsWith(API_ORIGIN))
      .map(([url, init]) => [String(url), init as RequestInit])
  }

  function expectNoOpenSeaCredentials(init: RequestInit): void {
    expect(init.headers).toBeUndefined()
    const sent = JSON.stringify([
      ...((init.body as FormData).entries?.() ?? []),
    ])
    expect(sent).not.toContain(API_KEY)
    expect(sent).not.toContain(AUTH_TOKEN)
  }

  function expectApiCallsCarriedCredentials(): void {
    expect(apiCalls().length).toBeGreaterThan(0)
    for (const [, init] of apiCalls()) {
      expect(init.headers).toMatchObject({
        "x-api-key": API_KEY,
        Authorization: `Bearer ${AUTH_TOKEN}`,
      })
    }
  }

  function leakyStorageResponse(): {
    respond: () => Response
    reads: MockInstance[]
  } {
    const reads: MockInstance[] = []
    const respond = () => {
      const response = new Response(SIGNATURE_MISMATCH_BODY, {
        status: 403,
        headers: { "Content-Type": "application/xml" },
      })
      for (const method of [
        "text",
        "json",
        "arrayBuffer",
        "blob",
        "formData",
      ] as const) {
        reads.push(vi.spyOn(response, method))
      }
      return response
    }
    return { respond, reads }
  }

  async function run(...argv: string[]): Promise<void> {
    await createProgram().parseAsync(argv, { from: "user" })
  }

  async function runFailing(...argv: string[]): Promise<Error> {
    const error = await run(...argv).then(
      () => undefined,
      (err: unknown) => err as Error,
    )
    expect(error).toBeInstanceOf(Error)
    return error as Error
  }

  function expectNothingLeaked(error: Error): void {
    const surfaces = [
      error.message,
      String(error),
      error.stack ?? "",
      JSON.stringify(error),
      String((error.cause as Error | undefined)?.message ?? ""),
      ...output,
    ]
    for (const secret of SECRETS) {
      for (const surface of surfaces) expect(surface).not.toContain(secret)
    }
  }

  beforeEach(() => {
    vi.stubEnv("OPENSEA_API_KEY", API_KEY)
    vi.stubEnv("OPENSEA_AUTH_TOKEN", AUTH_TOKEN)
    apiResponses = {}
    storageResponse = () => new Response(null, { status: 204 })
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input)
      if (url.startsWith(STORAGE_URL)) return storageResponse()
      const path = new URL(url).pathname
      if (!(path in apiResponses)) {
        throw new Error(`Unexpected API request in test: ${url}`)
      }
      return new Response(JSON.stringify(apiResponses[path]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    captureOutput()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  describe("collections upload-page-media --file", () => {
    const mediaPath = "/api/v2/collections/cool-cats/media/hero_desktop"
    const argv = (file: string) => [
      "collections",
      "upload-page-media",
      "cool-cats",
      "hero_desktop",
      "--content-type",
      "image/png",
      "--file",
      file,
    ]

    it("POSTs the fields and the file to storage without OpenSea credentials", async () => {
      apiResponses[mediaPath] = postContext("collection/hero.png", "page-token")
      const file = tempFile("hero.png", new Uint8Array([137, 80, 78, 71]))

      await run(...argv(file))

      expectApiCallsCarriedCredentials()
      expect(storageCalls()).toHaveLength(1)
      const [url, init] = storageCalls()[0] as [string, RequestInit]
      expect(url).toBe(STORAGE_URL)
      expect(init.method).toBe("POST")
      expect(init.redirect).toBe("error")
      expectNoOpenSeaCredentials(init)
      const form = init.body as FormData
      expect([...form.keys()]).toEqual([
        "key",
        "policy",
        "x-amz-signature",
        "file",
      ])
      const uploaded = form.get("file") as File
      expect(uploaded.name).toBe("hero.png")
      expect(uploaded.type).toBe("image/png")
      expect([...new Uint8Array(await uploaded.arrayBuffer())]).toEqual([
        137, 80, 78, 71,
      ])
      expect(output).toContain(JSON.stringify({ token: "page-token" }, null, 2))
    })

    it("reports only the HTTP status when storage echoes signed material", async () => {
      apiResponses[mediaPath] = postContext("collection/hero.png", "page-token")
      const leaky = leakyStorageResponse()
      storageResponse = leaky.respond
      const file = tempFile("hero.png", new Uint8Array([1]))

      const error = await runFailing(...argv(file))

      expect(error.message).toBe("Storage upload failed with HTTP 403")
      expect(error).toBeInstanceOf(UploadContextError)
      expect((error as UploadContextError).status).toBe(403)
      for (const read of leaky.reads) expect(read).not.toHaveBeenCalled()
      expectNothingLeaked(error)
    })
  })

  describe("drops upload-file", () => {
    it("POSTs the fields and the file to storage without OpenSea credentials", async () => {
      const contextFile = tempFile(
        "context.json",
        JSON.stringify(postContext("uploads/manifest.csv", "upload-token")),
      )
      const csv = "tokenID,name\n1,One\n"
      const file = tempFile("manifest.csv", csv)

      await run(
        "drops",
        "upload-file",
        "--context",
        contextFile,
        "--file",
        file,
      )

      expect(apiCalls()).toHaveLength(0)
      expect(storageCalls()).toHaveLength(1)
      const [url, init] = storageCalls()[0] as [string, RequestInit]
      expect(url).toBe(STORAGE_URL)
      expect(init.method).toBe("POST")
      expect(init.redirect).toBe("error")
      expectNoOpenSeaCredentials(init)
      const uploaded = (init.body as FormData).get("file") as File
      expect(uploaded.name).toBe("manifest.csv")
      expect(await uploaded.text()).toBe(csv)
      expect(output).toContain(
        JSON.stringify({ token: "upload-token" }, null, 2),
      )
    })

    it("PUTs the raw bytes for a PUT context", async () => {
      const putUrl = `${STORAGE_URL}/object.png`
      const contextFile = tempFile(
        "context.json",
        JSON.stringify({ url: putUrl, method: "PUT", fields: {}, token: "t" }),
      )
      const file = tempFile("object.png", new Uint8Array([7, 8, 9]))

      await run(
        "drops",
        "upload-file",
        "--context",
        contextFile,
        "--file",
        file,
      )

      const [url, init] = storageCalls()[0] as [string, RequestInit]
      expect(url).toBe(putUrl)
      expect(init.method).toBe("PUT")
      expect(init.redirect).toBe("error")
      expect(init.headers).toBeUndefined()
      const body = init.body as Blob
      expect([...new Uint8Array(await body.arrayBuffer())]).toEqual([7, 8, 9])
    })

    it("reports only the HTTP status when storage echoes signed material", async () => {
      const leaky = leakyStorageResponse()
      storageResponse = leaky.respond
      const contextFile = tempFile(
        "context.json",
        JSON.stringify(postContext("uploads/manifest.csv", "upload-token")),
      )
      const file = tempFile("manifest.csv", "tokenID\n")

      const error = await runFailing(
        "drops",
        "upload-file",
        "--context",
        contextFile,
        "--file",
        file,
      )

      expect(error.message).toBe("Storage upload failed with HTTP 403")
      expect(error).toBeInstanceOf(UploadContextError)
      for (const read of leaky.reads) expect(read).not.toHaveBeenCalled()
      expectNothingLeaked(error)
    })

    it("the opensea entrypoint prints only the status to stderr", async () => {
      storageResponse = leakyStorageResponse().respond
      const contextFile = tempFile(
        "context.json",
        JSON.stringify(postContext("uploads/manifest.csv", "upload-token")),
      )
      const file = tempFile("manifest.csv", "tokenID\n")
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never)
      vi.spyOn(process, "argv", "get").mockReturnValue([
        process.execPath,
        "opensea",
        "drops",
        "upload-file",
        "--context",
        contextFile,
        "--file",
        file,
      ])

      await import("../src/cli.js")
      await vi.waitFor(() => expect(exitSpy).toHaveBeenCalled())

      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(output).toEqual([
        JSON.stringify(
          {
            error: "UploadContextError",
            message: "Storage upload failed with HTTP 403",
          },
          null,
          2,
        ),
      ])
      expectNothingLeaked(new Error(output.join("\n")))
    })
  })

  describe("drops upload-items --manifest", () => {
    function mockItemApi(): void {
      apiResponses["/api/v2/drops/cool-cats/items/manifest"] = postContext(
        "uploads/manifest.csv",
        "manifest-token",
      )
      apiResponses["/api/v2/drops/cool-cats/items/media"] = [
        postContext("uploads/1.png", "token-1"),
      ]
      apiResponses["/api/v2/drops/cool-cats/items/media/save-batch"] = {
        success: true,
      }
    }

    function itemsDir(): { dir: string; manifest: string; csv: string } {
      const dir = tempDir()
      writeFileSync(join(dir, "1.png"), new Uint8Array([1, 2, 3]))
      const csv = "tokenID,name,description,file_name\n1,One,First,1.png\n"
      const manifest = tempFile("manifest.csv", csv)
      return { dir, manifest, csv }
    }

    it("POSTs the manifest and each file to storage without OpenSea credentials", async () => {
      mockItemApi()
      const { dir, manifest, csv } = itemsDir()

      await run(
        "drops",
        "upload-items",
        "cool-cats",
        dir,
        "--manifest",
        manifest,
      )

      expectApiCallsCarriedCredentials()
      const uploads = storageCalls()
      expect(uploads).toHaveLength(2)
      for (const [url, init] of uploads) {
        expect(url).toBe(STORAGE_URL)
        expect(init.method).toBe("POST")
        expect(init.redirect).toBe("error")
        expectNoOpenSeaCredentials(init)
      }
      const [manifestForm, itemForm] = uploads.map(
        ([, init]) => init.body as FormData,
      ) as [FormData, FormData]
      expect(manifestForm.get("key")).toBe("uploads/manifest.csv")
      const manifestFile = manifestForm.get("file") as File
      expect(manifestFile.name).toBe("manifest.csv")
      expect(await manifestFile.text()).toBe(csv)
      expect(itemForm.get("key")).toBe("uploads/1.png")
      const itemFile = itemForm.get("file") as File
      expect(itemFile.name).toBe("1.png")
      expect([...new Uint8Array(await itemFile.arrayBuffer())]).toEqual([
        1, 2, 3,
      ])
    })

    it("reports only the HTTP status when storage echoes signed material", async () => {
      mockItemApi()
      const leaky = leakyStorageResponse()
      storageResponse = leaky.respond
      const { dir } = itemsDir()

      const error = await runFailing("drops", "upload-items", "cool-cats", dir)

      expect(error.message).toBe(
        "Uploading 1.png failed: Storage upload failed with HTTP 403",
      )
      expect(error.cause).toBeInstanceOf(UploadContextError)
      for (const read of leaky.reads) expect(read).not.toHaveBeenCalled()
      expectNothingLeaked(error)
    })
  })
})
