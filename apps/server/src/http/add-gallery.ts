import type { FastifyInstance, FastifyReply } from "fastify";

import {
  applicationErrorResponseSchema,
  officialGalleryItemsPageResponseSchema,
  officialGalleryResponseSchema,
  unauthenticatedErrorResponseSchema,
} from "@loomic/shared";

import {
  AddGalleryServiceError,
  type AddGalleryService,
} from "../features/add-gallery/add-gallery-service.js";
import type { RequestAuthenticator } from "../supabase/user.js";

export async function registerAddGalleryRoutes(
  app: FastifyInstance,
  options: {
    addGalleryService: AddGalleryService;
    auth: RequestAuthenticator;
  },
) {
  app.get("/api/add-gallery", async (request, reply) => {
    try {
      const user = await options.auth.authenticate(request);

      if (!user) {
        return reply.code(401).send(
          unauthenticatedErrorResponseSchema.parse({
            error: {
              code: "unauthorized",
              message: "Missing or invalid bearer token.",
            },
          }),
        );
      }

      const categories = await options.addGalleryService.listLibrary();

      request.log.info(
        {
          categoryCount: categories.length,
          userId: user.id,
        },
        "addGallery.list success",
      );

      return reply.code(200).send(
        officialGalleryResponseSchema.parse({
          categories,
        }),
      );
    } catch (error) {
      request.log.error(
        {
          err: error,
        },
        "addGallery.list failed",
      );
      return sendAddGalleryError(error, reply);
    }
  });

  app.get("/api/add-gallery/subtypes/:subtypeId/items", async (request, reply) => {
    try {
      const user = await options.auth.authenticate(request);

      if (!user) {
        return reply.code(401).send(
          unauthenticatedErrorResponseSchema.parse({
            error: {
              code: "unauthorized",
              message: "Missing or invalid bearer token.",
            },
          }),
        );
      }

      const subtypeId = String((request.params as { subtypeId?: string } | undefined)?.subtypeId ?? "");
      const query = (request.query as { limit?: string | number; offset?: string | number } | undefined) ?? {};
      const rawLimit = Number.parseInt(String(query.limit ?? "60"), 10);
      const rawOffset = Number.parseInt(String(query.offset ?? "0"), 10);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 120)) : 60;
      const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

      const page = await options.addGalleryService.listSubtypeItems({
        limit,
        offset,
        subtypeId,
      });

      request.log.info(
        {
          itemCount: page.items.length,
          subtypeId,
          userId: user.id,
        },
        "addGallery.subtypeItems success",
      );

      return reply.code(200).send(
        officialGalleryItemsPageResponseSchema.parse(page),
      );
    } catch (error) {
      request.log.error(
        {
          err: error,
        },
        "addGallery.subtypeItems failed",
      );
      return sendAddGalleryError(error, reply);
    }
  });
}

function sendAddGalleryError(error: unknown, reply: FastifyReply) {
  if (error instanceof AddGalleryServiceError) {
    return reply.code(error.statusCode).send(
      applicationErrorResponseSchema.parse({
        error: {
          code: error.code,
          message: error.message,
        },
      }),
    );
  }

  return reply.code(500).send(
    applicationErrorResponseSchema.parse({
      error: {
        code: "add_gallery_query_failed",
        message: "Unable to load add gallery.",
      },
    }),
  );
}
