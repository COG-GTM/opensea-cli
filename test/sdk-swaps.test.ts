import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OpenSeaClient } from "../src/client.js"
import { OpenSeaCLI } from "../src/sdk.js"
import type {
  EvmWalletAdapter,
  SvmWalletAdapter,
  WalletAdapter,
} from "../src/wallet/index.js"
import { WrongChainTypeError } from "../src/wallet/index.js"

vi.mock("../src/client.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../src/client.js")>()
  const MockOpenSeaClient = vi.fn()
  MockOpenSeaClient.prototype.get = vi.fn()
  MockOpenSeaClient.prototype.post = vi.fn()
  MockOpenSeaClient.prototype.getDefaultChain = vi.fn(() => "ethereum")
  MockOpenSeaClient.prototype.getApiKeyPrefix = vi.fn(() => "test...")
  MockOpenSeaClient.prototype.getBaseUrl = vi.fn(
    () => "https://api.opensea.io",
  )
  MockOpenSeaClient.prototype.allowsUntrustedBaseUrl = vi.fn(() => false)
  return {
    OpenSeaClient: MockOpenSeaClient,
    OpenSeaAPIError: actual.OpenSeaAPIError,
  }
})

function createMockWallet(
  address = "0x1234567890abcdef1234567890abcdef12345678",
): EvmWalletAdapter & { sendTransaction: ReturnType<typeof vi.fn> } {
  return {
    name: "mock",
    chainType: "evm",
    // Required by WalletAdapter. This fake never exercises the optional signing
    // methods, so every capability is declared false.
    capabilities: {
      signMessage: false,
      signTypedData: false,
      managedGas: false,
      managedNonce: false,
    },
    getAddress: vi.fn().mockResolvedValue(address),
    sendTransaction: vi.fn().mockResolvedValue({ hash: "0xabc123" }),
  }
}

const NATIVE = "0x0000000000000000000000000000000000000000"

describe("SwapsAPI.execute", () => {
  let sdk: OpenSeaCLI
  let mockGet: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sdk = new OpenSeaCLI({ apiKey: "test-key" })
    mockGet = vi.mocked(OpenSeaClient.prototype.get)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("executes a single-transaction quote", async () => {
    const wallet = createMockWallet()

    mockGet.mockResolvedValue({
      transactions: [
        { to: "0xRouter", data: "0xcalldata", value: "0", chain: "ethereum" },
      ],
    })

    const results = await sdk.swaps.execute(
      {
        fromChain: "ethereum",
        fromAddress: "0xTokenA",
        toChain: "ethereum",
        toAddress: "0xTokenB",
        quantity: "1000000",
      },
      wallet,
    )

    expect(results).toHaveLength(1)
    expect(results[0].hash).toBe("0xabc123")
    expect(wallet.sendTransaction).toHaveBeenCalledWith({
      to: "0xRouter",
      data: "0xcalldata",
      value: "0",
      chainId: 1,
    })
  })

  it("executes multi-transaction quotes in order", async () => {
    const wallet = createMockWallet()
    wallet.sendTransaction
      .mockResolvedValueOnce({ hash: "0xhash1" })
      .mockResolvedValueOnce({ hash: "0xhash2" })

    mockGet.mockResolvedValue({
      transactions: [
        {
          to: "0xApproval",
          data: "0xapprove",
          value: "0",
          chain: "ethereum",
        },
        { to: "0xRouter", data: "0xswap", value: "100", chain: "ethereum" },
      ],
    })

    const results = await sdk.swaps.execute(
      {
        fromChain: "ethereum",
        fromAddress: NATIVE,
        toChain: "ethereum",
        toAddress: "0xTokenB",
        quantity: "1000000",
      },
      wallet,
    )

    expect(results).toHaveLength(2)
    expect(results[0].hash).toBe("0xhash1")
    expect(results[1].hash).toBe("0xhash2")
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(2)
  })

  it("skips transactions with missing 'to' address", async () => {
    const wallet = createMockWallet()
    const onSkipped = vi.fn()

    mockGet.mockResolvedValue({
      transactions: [
        { to: null, data: "0x", value: "0", chain: "ethereum" },
        { to: "0xRouter", data: "0xswap", value: "0", chain: "ethereum" },
      ],
    })

    const results = await sdk.swaps.execute(
      {
        fromChain: "ethereum",
        fromAddress: "0xTokenA",
        toChain: "ethereum",
        toAddress: "0xTokenB",
        quantity: "1000000",
      },
      wallet,
      { onSkipped },
    )

    expect(results).toHaveLength(1)
    expect(onSkipped).toHaveBeenCalledWith({
      chain: "ethereum",
      reason: "missing 'to' address",
    })
    expect(wallet.sendTransaction).toHaveBeenCalledTimes(1)
  })

  it("throws on zero transactions in quote", async () => {
    const wallet = createMockWallet()

    mockGet.mockResolvedValue({ transactions: [] })

    await expect(
      sdk.swaps.execute(
        {
          fromChain: "ethereum",
          fromAddress: "0xTokenA",
          toChain: "ethereum",
          toAddress: "0xTokenB",
          quantity: "1000000",
        },
        wallet,
      ),
    ).rejects.toThrow("zero transactions")
  })

  it("throws when all transactions are skipped", async () => {
    const wallet = createMockWallet()

    mockGet.mockResolvedValue({
      transactions: [
        { to: null, data: "0x", value: "0", chain: "ethereum" },
        { to: undefined, data: "0x", value: "0", chain: "base" },
      ],
    })

    await expect(
      sdk.swaps.execute(
        {
          fromChain: "ethereum",
          fromAddress: "0xTokenA",
          toChain: "base",
          toAddress: "0xTokenB",
          quantity: "1000000",
        },
        wallet,
      ),
    ).rejects.toThrow("All swap transactions were skipped")
  })

  it("calls onQuote and onSending callbacks", async () => {
    const wallet = createMockWallet()
    const onQuote = vi.fn()
    const onSending = vi.fn()

    const quote = {
      transactions: [
        { to: "0xRouter", data: "0x", value: "0", chain: "ethereum" },
      ],
    }
    mockGet.mockResolvedValue(quote)

    await sdk.swaps.execute(
      {
        fromChain: "ethereum",
        fromAddress: "0xTokenA",
        toChain: "ethereum",
        toAddress: "0xTokenB",
        quantity: "1000000",
      },
      wallet,
      { onQuote, onSending },
    )

    expect(onQuote).toHaveBeenCalledWith(quote)
    expect(onSending).toHaveBeenCalledWith({
      to: "0xRouter",
      chain: "ethereum",
      chainId: 1,
    })
  })

  it("uses provided address instead of calling getAddress", async () => {
    const wallet = createMockWallet()

    mockGet.mockResolvedValue({
      transactions: [
        { to: "0xRouter", data: "0x", value: "0", chain: "ethereum" },
      ],
    })

    await sdk.swaps.execute(
      {
        fromChain: "ethereum",
        fromAddress: "0xTokenA",
        toChain: "ethereum",
        toAddress: "0xTokenB",
        quantity: "1000000",
        address: "0xPreComputedAddress",
      },
      wallet,
    )

    // Should NOT call getAddress since address was provided
    expect(wallet.getAddress).not.toHaveBeenCalled()
    // Should pass the provided address in the quote request
    expect(mockGet).toHaveBeenCalledWith(
      "/api/v2/swap/quote",
      expect.objectContaining({ address: "0xPreComputedAddress" }),
    )
  })

  it("calls getAddress when no address is provided", async () => {
    const wallet = createMockWallet("0xWalletAddress")

    mockGet.mockResolvedValue({
      transactions: [
        { to: "0xRouter", data: "0x", value: "0", chain: "ethereum" },
      ],
    })

    await sdk.swaps.execute(
      {
        fromChain: "ethereum",
        fromAddress: "0xTokenA",
        toChain: "ethereum",
        toAddress: "0xTokenB",
        quantity: "1000000",
      },
      wallet,
    )

    expect(wallet.getAddress).toHaveBeenCalledOnce()
    expect(mockGet).toHaveBeenCalledWith(
      "/api/v2/swap/quote",
      expect.objectContaining({ address: "0xWalletAddress" }),
    )
  })

  it("accepts a WalletAdapter-typed wallet, as createWalletFromEnv returns", async () => {
    // `createWalletFromEnv()` is typed `WalletAdapter`, so this is the documented happy path.
    // Narrowing `execute` to `EvmWalletAdapter` stopped it compiling, a breaking change no test
    // caught. Passing the union through the published signature pins that it still works.
    //
    // It has to arrive as a function's return type, not `const wallet: WalletAdapter = ...`:
    // control-flow analysis narrows an annotated const straight back to its initializer's type,
    // so that form still compiles against a narrowed parameter and guards nothing. Verified by
    // re-narrowing the signature and watching this line fail to error.
    const fromEnv = (): WalletAdapter => createMockWallet("0xUnionTyped")
    const wallet = fromEnv()

    mockGet.mockResolvedValue({
      transactions: [
        { to: "0xRouter", data: "0x", value: "0", chain: "ethereum" },
      ],
    })

    const results = await sdk.swaps.execute(
      {
        fromChain: "ethereum",
        fromAddress: "0xTokenA",
        toChain: "ethereum",
        toAddress: "0xTokenB",
        quantity: "1000000",
      },
      wallet,
    )

    expect(results).toHaveLength(1)
  })

  it("rejects an SVM wallet before requesting a quote", async () => {
    // `execute` takes the union, which is what `createWalletFromEnv()` returns, so this is a
    // caller that compiles cleanly and is rejected at runtime. The CLI command has its own guard
    // for the same case; this one covers the library entry point.
    const svm: SvmWalletAdapter = {
      name: "svm-mock",
      chainType: "svm",
      capabilities: {
        signMessage: true,
        signTypedData: false,
        managedGas: false,
        managedNonce: false,
      },
      getAddress: vi
        .fn()
        .mockResolvedValue("So11111111111111111111111111111111111111112"),
      signTransaction: vi.fn().mockResolvedValue({ signedTransaction: "" }),
    }

    mockGet.mockResolvedValue({
      transactions: [
        { to: "0xRouter", data: "0x", value: "0", chain: "ethereum" },
      ],
    })

    const call = sdk.swaps.execute(
      {
        fromChain: "ethereum",
        fromAddress: "0xTokenA",
        toChain: "ethereum",
        toAddress: "0xTokenB",
        quantity: "1000000",
      },
      svm,
    )

    await expect(call).rejects.toThrow(WrongChainTypeError)
    await expect(call).rejects.toThrow(
      'wallet "svm-mock" signs for svm; swap execution requires an EVM wallet',
    )
    // The guard runs first, so no quote is fetched and getAddress is never reached. Without it the
    // failure surfaces later as a missing sendTransaction, after a network round trip.
    expect(mockGet).not.toHaveBeenCalled()
    expect(svm.getAddress).not.toHaveBeenCalled()
  })

  describe("refuses quote transactions that do not match the request", () => {
    const nativeSwap = {
      fromChain: "ethereum",
      fromAddress: NATIVE,
      toChain: "base",
      toAddress: "0xTokenB",
      quantity: "1000",
    }

    it("a native value above the requested quantity", async () => {
      const wallet = createMockWallet()
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "1001", chain: "ethereum" },
        ],
      })

      await expect(sdk.swaps.execute(nativeSwap, wallet)).rejects.toThrow(
        "more than the requested quantity 1000",
      )
      expect(wallet.sendTransaction).not.toHaveBeenCalled()
    })

    it("native values that add up to more than the quantity, before sending any", async () => {
      const wallet = createMockWallet()
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "600", chain: "ethereum" },
          { to: "0xRouter", data: "0x", value: "0x258", chain: "ethereum" },
        ],
      })

      await expect(sdk.swaps.execute(nativeSwap, wallet)).rejects.toThrow(
        "send 1200 wei of native currency",
      )
      expect(wallet.sendTransaction).not.toHaveBeenCalled()
    })

    it("a native value when the source token is not native", async () => {
      const wallet = createMockWallet()
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "1", chain: "ethereum" },
        ],
      })

      await expect(
        sdk.swaps.execute(
          { ...nativeSwap, fromAddress: "0xTokenA", quantity: "1000000" },
          wallet,
        ),
      ).rejects.toThrow("the swap spends token 0xTokenA")
      expect(wallet.sendTransaction).not.toHaveBeenCalled()
    })

    it("a native value on the destination chain", async () => {
      const wallet = createMockWallet()
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "1", chain: "base" },
        ],
      })

      await expect(sdk.swaps.execute(nativeSwap, wallet)).rejects.toThrow(
        "native currency only on ethereum",
      )
      expect(wallet.sendTransaction).not.toHaveBeenCalled()
    })

    it("a transaction on a chain that is neither from nor to chain", async () => {
      const wallet = createMockWallet()
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "0", chain: "ethereum" },
          { to: "0xRouter", data: "0x", value: "0", chain: "polygon" },
        ],
      })

      await expect(sdk.swaps.execute(nativeSwap, wallet)).rejects.toThrow(
        "transaction for chain polygon",
      )
      expect(wallet.sendTransaction).not.toHaveBeenCalled()
    })

    it("a malformed value", async () => {
      const wallet = createMockWallet()
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "-5", chain: "ethereum" },
        ],
      })

      await expect(sdk.swaps.execute(nativeSwap, wallet)).rejects.toThrow(
        "Swap transaction has an invalid value: -5",
      )
      expect(wallet.sendTransaction).not.toHaveBeenCalled()
    })

    it("sends value up to the quantity on the from chain", async () => {
      const wallet = createMockWallet()
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "0x3e8", chain: "ethereum" },
          { to: "0xBridge", data: "0x", value: "0", chain: "base" },
        ],
      })

      await sdk.swaps.execute(nativeSwap, wallet)
      expect(wallet.sendTransaction).toHaveBeenNthCalledWith(1, {
        to: "0xRouter",
        data: "0x",
        value: "1000",
        chainId: 1,
      })
      expect(wallet.sendTransaction).toHaveBeenNthCalledWith(2, {
        to: "0xBridge",
        data: "0x",
        value: "0",
        chainId: 8453,
      })
    })
  })

  describe("API base URL trust", () => {
    const swap = {
      fromChain: "ethereum",
      fromAddress: "0xTokenA",
      toChain: "ethereum",
      toAddress: "0xTokenB",
      quantity: "1000000",
    }

    it("refuses to sign quotes from a base URL other than api.opensea.io", async () => {
      const wallet = createMockWallet()
      vi.mocked(OpenSeaClient.prototype.getBaseUrl).mockReturnValueOnce(
        "https://mallory.example",
      )
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "0", chain: "ethereum" },
        ],
      })

      await expect(sdk.swaps.execute(swap, wallet)).rejects.toThrow(
        "Refusing to sign swap transactions built by https://mallory.example",
      )
      expect(mockGet).not.toHaveBeenCalled()
      expect(wallet.sendTransaction).not.toHaveBeenCalled()
    })

    it("signs them with allowUntrustedBaseUrl", async () => {
      const wallet = createMockWallet()
      vi.mocked(OpenSeaClient.prototype.getBaseUrl).mockReturnValueOnce(
        "https://staging.example",
      )
      vi.mocked(
        OpenSeaClient.prototype.allowsUntrustedBaseUrl,
      ).mockReturnValueOnce(true)
      mockGet.mockResolvedValue({
        transactions: [
          { to: "0xRouter", data: "0x", value: "0", chain: "ethereum" },
        ],
      })

      await sdk.swaps.execute(swap, wallet)
      expect(wallet.sendTransaction).toHaveBeenCalledTimes(1)
    })
  })
})
