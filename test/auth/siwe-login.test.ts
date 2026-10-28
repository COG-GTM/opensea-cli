import { afterEach, describe, expect, it, vi } from "vitest"
import {
  exchangeScopedToken,
  refreshSiweSession,
  sessionCookie,
} from "../../src/auth/siwe-login.js"

describe("sessionCookie", () => {
  it("extracts access_token and refresh_token from getSetCookie entries", () => {
    const headers = new Headers()
    headers.append(
      "set-cookie",
      "access_token=session-access; Path=/; HttpOnly",
    )
    headers.append(
      "set-cookie",
      "refresh_token=session-refresh; Path=/; HttpOnly",
    )

    expect(sessionCookie(headers)).toBe(
      "access_token=session-access; refresh_token=session-refresh",
    )
  })

  it("parses a comma-joined set-cookie header as a fallback", () => {
    const headers = new Headers({
      "set-cookie":
        "access_token=session-access; Path=/, refresh_token=session-refresh; Path=/",
    })

    expect(sessionCookie(headers)).toBe(
      "access_token=session-access; refresh_token=session-refresh",
    )
  })

  it("throws when a required cookie is missing", () => {
    const headers = new Headers({
      "set-cookie": "access_token=session-access; Path=/",
    })

    expect(() => sessionCookie(headers)).toThrow(
      "SIWE verification did not create a session",
    )
  })
})

describe("SIWE credential requests", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    "https://evil.com",
    "http://api.opensea.io",
    "https://api.opensea.io.evil.com",
    "not a url",
  ])("refuses to send the session cookie or scoped token to %s", async baseUrl => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    await expect(
      refreshSiweSession(baseUrl, "access_token=a; refresh_token=r"),
    ).rejects.toThrow(`Untrusted SIWE API origin: ${baseUrl}`)
    await expect(exchangeScopedToken(baseUrl, "scoped-token")).rejects.toThrow(
      `Untrusted SIWE API origin: ${baseUrl}`,
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("refreshes the session against a trusted testnets origin", async () => {
    const headers = new Headers()
    headers.append("set-cookie", "access_token=a2; Path=/")
    headers.append("set-cookie", "refresh_token=r2; Path=/")
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200, headers }))

    await expect(
      refreshSiweSession(
        "https://testnets-api.opensea.io",
        "access_token=a; refresh_token=r",
      ),
    ).resolves.toBe("access_token=a2; refresh_token=r2")
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://testnets-api.opensea.io/api/v2/auth/session/refresh",
      expect.any(Object),
    )
  })
})
