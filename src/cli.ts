import {
  describeApiError,
  EXIT_API_ERROR,
  EXIT_AUTH_ERROR,
} from "./api-error.js"
import { TokenRefreshError } from "./auth/refresh.js"
import { UntrustedSiweOriginError } from "./auth/siwe-login.js"
import { OpenSeaAPIError } from "./client.js"
import { stringifyJson } from "./output.js"
import { createProgram } from "./program.js"

const program = createProgram()

async function main() {
  try {
    await program.parseAsync(process.argv)
  } catch (error) {
    if (error instanceof OpenSeaAPIError) {
      const { exitCode, payload } = describeApiError(error)
      console.error(stringifyJson(payload, 2))
      process.exit(exitCode)
    }
    if (error instanceof TokenRefreshError) {
      console.error(
        stringifyJson(
          { error: error.name, status: error.status, message: error.message },
          2,
        ),
      )
      process.exit(EXIT_AUTH_ERROR)
    }
    if (error instanceof UntrustedSiweOriginError) {
      console.error(
        stringifyJson({ error: error.name, message: error.message }, 2),
      )
      process.exit(EXIT_AUTH_ERROR)
    }
    const label =
      error instanceof TypeError ? "Network Error" : (error as Error).name
    console.error(
      stringifyJson(
        {
          error: label,
          message: (error as Error).message,
        },
        2,
      ),
    )
    process.exit(EXIT_API_ERROR)
  }
}

main()
