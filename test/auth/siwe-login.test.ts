import { afterEach, describe, expect, it, vi } from "vitest"
import {
  exchangeScopedToken,
  isTrustedSiweOrigin,
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

describe("trusted SIWE origins", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ["https://api.opensea.io", true],
    ["https://testnets-api.opensea.io/", true],
    ["http://api.opensea.io", false],
    ["https://api.opensea.io.evil.com", false],
    ["https://evil.com", false],
    ["not a url", false],
  ])("isTrustedSiweOrigin(%s) is %s", (baseUrl, trusted) => {
    expect(isTrustedSiweOrigin(baseUrl)).toBe(trusted)
  })

  it("refreshSiweSession refuses an untrusted origin before sending the cookie", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    await expect(
      refreshSiweSession(
        "https://evil.com",
        "access_token=a; refresh_token=r",
      ),
    ).rejects.toThrow("Untrusted SIWE API origin: https://evil.com")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("exchangeScopedToken refuses an untrusted origin before sending the PAT", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    await expect(
      exchangeScopedToken("http://api.opensea.io", "pat-value"),
    ).rejects.toThrow("Untrusted SIWE API origin: http://api.opensea.io")
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
