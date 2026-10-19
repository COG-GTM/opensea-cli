import { Command } from "commander"
import type { OpenSeaClient } from "../client.js"
import type { OutputFormat } from "../output.js"
import { formatOutput, outputGet } from "../output.js"
import {
  addPaginationOptions,
  parseIntOption,
  pathSegment,
  readJsonBodyOption,
} from "../parse.js"
import type {
  BuildOfferRequest,
  BuildOfferResponse,
  CreateOfferActionsRequest,
  CreateOfferActionsResponse,
  CreateOfferFulfillmentActionsRequest,
  CreateOfferFulfillmentActionsResponse,
  CriteriaOfferRequest,
  FulfillListingResponse,
  Offer,
  OfferFulfillmentDataRequest,
  SignedOrderRequest,
} from "../types/index.js"

export function offersCommand(
  getClient: () => OpenSeaClient,
  getFormat: () => OutputFormat,
): Command {
  const cmd = new Command("offers").description("Query NFT offers")

  addPaginationOptions(
    cmd
      .command("all")
      .description("Get all offers for a collection")
      .argument("<collection>", "Collection slug"),
  )
    .option("--maker <address>", "Filter by order maker address")
    .action(
      async (
        collection: string,
        options: { limit: string; next?: string; maker?: string },
      ) => {
        const client = getClient()
        await outputGet(
          client,
          getFormat(),
          `/api/v2/offers/collection/${pathSegment(collection)}/all`,
          {
            limit: parseIntOption(options.limit, "--limit"),
            next: options.next,
            maker: options.maker,
          },
        )
      },
    )

  addPaginationOptions(
    cmd
      .command("by-nft")
      .description("Get all offers for a specific NFT")
      .argument("<collection>", "Collection slug")
      .argument("<token-id>", "Token ID"),
  ).action(
    async (
      collection: string,
      tokenId: string,
      options: { limit: string; next?: string },
    ) => {
      const client = getClient()
      await outputGet(
        client,
        getFormat(),
        `/api/v2/offers/collection/${pathSegment(collection)}/nfts/${pathSegment(tokenId)}`,
        {
          limit: parseIntOption(options.limit, "--limit"),
          next: options.next,
        },
      )
    },
  )

  addPaginationOptions(
    cmd
      .command("collection")
      .description("Get collection offers")
      .argument("<collection>", "Collection slug"),
  ).action(
    async (collection: string, options: { limit: string; next?: string }) => {
      const client = getClient()
      await outputGet(
        client,
        getFormat(),
        `/api/v2/offers/collection/${pathSegment(collection)}`,
        {
          limit: parseIntOption(options.limit, "--limit"),
          next: options.next,
        },
      )
    },
  )

  cmd
    .command("best-for-nft")
    .description("Get best offer for a specific NFT")
    .argument("<collection>", "Collection slug")
    .argument("<token-id>", "Token ID")
    .action(async (collection: string, tokenId: string) => {
      const client = getClient()
      await outputGet(
        client,
        getFormat(),
        `/api/v2/offers/collection/${pathSegment(collection)}/nfts/${pathSegment(tokenId)}/best`,
      )
    })

  addPaginationOptions(
    cmd
      .command("traits")
      .description("Get trait offers for a collection")
      .argument("<collection>", "Collection slug")
      .requiredOption("--type <type>", "Trait type (required)")
      .requiredOption("--value <value>", "Trait value (required)"),
  ).action(
    async (
      collection: string,
      options: {
        type: string
        value: string
        limit: string
        next?: string
      },
    ) => {
      const client = getClient()
      await outputGet(
        client,
        getFormat(),
        `/api/v2/offers/collection/${pathSegment(collection)}/traits`,
        {
          type: options.type,
          value: options.value,
          limit: parseIntOption(options.limit, "--limit"),
          next: options.next,
        },
      )
    },
  )

  cmd
    .command("actions")
    .description("Get ordered actions needed to create an offer")
    .requiredOption(
      "--body <path>",
      "Path to JSON file with the CreateOfferActionsRequest body",
    )
    .action(async (options: { body: string }) => {
      const client = getClient()
      const request = readJsonBodyOption<CreateOfferActionsRequest>(
        options.body,
        "--body",
      )
      const result = await client.post<CreateOfferActionsResponse>(
        "/api/v2/offers/actions",
        request,
      )
      console.log(formatOutput(result, getFormat()))
    })

  cmd
    .command("fulfillment-actions")
    .description("Get ordered actions needed to fulfill an offer")
    .requiredOption(
      "--body <path>",
      "Path to JSON file with the offer fulfillment request body",
    )
    .action(async (options: { body: string }) => {
      const client = getClient()
      const request = readJsonBodyOption<CreateOfferFulfillmentActionsRequest>(
        options.body,
        "--body",
      )
      const result = await client.post<CreateOfferFulfillmentActionsResponse>(
        "/api/v2/offers/fulfillment/actions",
        request,
      )
      console.log(formatOutput(result, getFormat()))
    })

  cmd
    .command("post")
    .description("Submit a signed item offer order")
    .argument("<chain>", "Chain the offer is on (e.g. ethereum, base)")
    .option("--protocol <protocol>", "Order protocol", "seaport")
    .requiredOption(
      "--body <path>",
      "Path to JSON file with the signed order (parameters, signature, protocol_address)",
    )
    .action(
      async (chain: string, options: { protocol: string; body: string }) => {
        const client = getClient()
        const request = readJsonBodyOption<SignedOrderRequest>(
          options.body,
          "--body",
        )
        const result = await client.post<Offer>(
          `/api/v2/orders/${pathSegment(chain)}/${pathSegment(options.protocol)}/offers`,
          request,
        )
        console.log(formatOutput(result, getFormat()))
      },
    )

  cmd
    .command("build")
    .description(
      "Build the unsigned parameters for a collection or trait offer",
    )
    .requiredOption(
      "--body <path>",
      "Path to JSON file with the BuildOfferRequest body",
    )
    .action(async (options: { body: string }) => {
      const client = getClient()
      const request = readJsonBodyOption<BuildOfferRequest>(
        options.body,
        "--body",
      )
      const result = await client.post<BuildOfferResponse>(
        "/api/v2/offers/build",
        request,
      )
      console.log(formatOutput(result, getFormat()))
    })

  cmd
    .command("post-criteria")
    .description("Submit a signed collection or trait offer")
    .requiredOption(
      "--body <path>",
      "Path to JSON file with the signed criteria offer (protocol_data, criteria, protocol_address)",
    )
    .action(async (options: { body: string }) => {
      const client = getClient()
      const request = readJsonBodyOption<CriteriaOfferRequest>(
        options.body,
        "--body",
      )
      const result = await client.post<Offer>("/api/v2/offers", request)
      console.log(formatOutput(result, getFormat()))
    })

  cmd
    .command("fulfillment-data")
    .description("Get the transaction data needed to fulfill an offer")
    .requiredOption(
      "--body <path>",
      "Path to JSON file with the offer fulfillment request body",
    )
    .action(async (options: { body: string }) => {
      const client = getClient()
      const request = readJsonBodyOption<OfferFulfillmentDataRequest>(
        options.body,
        "--body",
      )
      const result = await client.post<FulfillListingResponse>(
        "/api/v2/offers/fulfillment_data",
        request,
      )
      console.log(formatOutput(result, getFormat()))
    })

  return cmd
}
