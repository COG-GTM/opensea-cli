import { selectUploadContext as selectSdkUploadContext } from "@opensea/sdk"
import type { UploadContext } from "./types/index.js"

/**
 * Narrow parsed JSON to a single `UploadContext`. An array (the shape
 * `create-item-media-upload` returns) is accepted only with an `index`.
 * The `--index` errors are worded for `opensea drops upload-file`; the
 * context shape check is the SDK's.
 */
export function selectUploadContext(
  value: unknown,
  index?: number,
): UploadContext {
  if (Array.isArray(value)) {
    if (index === undefined) {
      throw new Error(
        `Upload context is an array of ${value.length}; pass --index <n> or pipe a single element (e.g. jq '.[0]')`,
      )
    }
    if (!Number.isInteger(index) || index < 0 || index >= value.length) {
      throw new Error(
        `--index ${index} is out of range for ${value.length} upload contexts`,
      )
    }
  } else if (index !== undefined) {
    throw new Error("--index applies only to an array of upload contexts")
  }
  return selectSdkUploadContext(value, index)
}
