import { type Mock, vi } from "vitest"
import type { OpenSeaClient } from "../src/client.js"
import type { OutputFormat } from "../src/output.js"

export type MockClient = {
  get: Mock
  post: Mock
  put: Mock
  patch: Mock
  delete: Mock
  getApiKeyPrefix: Mock
  getBaseUrl: Mock
  allowsUntrustedBaseUrl: Mock
}

export type CommandTestContext = {
  mockClient: MockClient
  getClient: () => OpenSeaClient
  getFormat: () => OutputFormat
  consoleSpy: ReturnType<typeof vi.spyOn>
}

export function createCommandTestContext(): CommandTestContext {
  const mockClient: MockClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    getApiKeyPrefix: vi.fn().mockReturnValue("test..."),
    getBaseUrl: vi.fn().mockReturnValue("https://api.opensea.io"),
    allowsUntrustedBaseUrl: vi.fn().mockReturnValue(false),
  }
  const getClient = () => mockClient as unknown as OpenSeaClient
  const getFormat = () => "json" as OutputFormat
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

  return { mockClient, getClient, getFormat, consoleSpy }
}

const CLIENT_METHODS = ["get", "post", "put", "patch", "delete"] as const

export function resolveAllRequests(mockClient: MockClient): void {
  for (const method of CLIENT_METHODS) mockClient[method].mockResolvedValue({})
}

/** Every request the mock client received, as `"METHOD path"`, in method order. */
export function requestedPaths(mockClient: MockClient): string[] {
  return CLIENT_METHODS.flatMap(method =>
    mockClient[method].mock.calls.map(
      call => `${method.toUpperCase()} ${String(call[0])}`,
    ),
  )
}

export function mockFetchResponse(data: unknown, status = 200): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(data), { status }),
  )
}

export function mockFetchTextResponse(body: string, status = 200): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, { status }),
  )
}
