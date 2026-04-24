import type {
  OfficialGalleryCategory,
  OfficialGalleryItemsPageResponse,
} from "@loomic/shared";

import {
  fetchOfficialGallery,
  fetchOfficialGallerySubtypeItems,
} from "./server-api";

export async function loadOfficialGalleryLibrary(
  accessToken: string,
): Promise<OfficialGalleryCategory[]> {
  console.info("[official-gallery] requesting database-backed official gallery structure from server");

  const response = await fetchOfficialGallery(accessToken);

  console.info("[official-gallery] received database-backed official gallery structure from server", {
    categoryCount: response.categories.length,
  });

  return response.categories;
}

export async function loadOfficialGallerySubtypeItemsPage(
  accessToken: string,
  subtypeId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<OfficialGalleryItemsPageResponse> {
  console.info("[official-gallery] requesting subtype items page from server", {
    limit: options?.limit ?? null,
    offset: options?.offset ?? null,
    subtypeId,
  });

  const response = await fetchOfficialGallerySubtypeItems(
    accessToken,
    subtypeId,
    options,
  );

  console.info("[official-gallery] received subtype items page from server", {
    itemCount: response.items.length,
    nextOffset: response.nextOffset,
    subtypeId,
    totalCount: response.totalCount,
  });

  return response;
}
