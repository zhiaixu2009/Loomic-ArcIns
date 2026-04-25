import type {
  OfficialGalleryCategory,
  OfficialGalleryItemsPageResponse,
} from "@loomic/shared";

import {
  fetchAddGallery,
  fetchAddGallerySubtypeItems,
} from "./server-api";

export async function loadAddGalleryLibrary(
  accessToken: string,
): Promise<OfficialGalleryCategory[]> {
  console.info("[add-gallery] requesting persisted add gallery structure from server");

  const response = await fetchAddGallery(accessToken);

  console.info("[add-gallery] received persisted add gallery structure from server", {
    categoryCount: response.categories.length,
  });

  return response.categories;
}

export async function loadAddGallerySubtypeItemsPage(
  accessToken: string,
  subtypeId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<OfficialGalleryItemsPageResponse> {
  console.info("[add-gallery] requesting subtype items page from server", {
    limit: options?.limit ?? null,
    offset: options?.offset ?? null,
    subtypeId,
  });

  const response = await fetchAddGallerySubtypeItems(
    accessToken,
    subtypeId,
    options,
  );

  console.info("[add-gallery] received subtype items page from server", {
    itemCount: response.items.length,
    nextOffset: response.nextOffset,
    subtypeId,
    totalCount: response.totalCount,
  });

  return response;
}
