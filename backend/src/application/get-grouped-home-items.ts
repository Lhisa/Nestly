import type { ClassificationCatalogReader } from './get-classification-catalog.js';
import { resolveHomeItemsFilters } from './home-items-filters.js';
import { projectGroupedHomeItems } from './home-items-projection.js';
import type { GroupedHomeItemsResponse, HomeItemProjectionInput } from './home-items-projection.js';

export interface GroupedHomeItemsReader {
  listForProjection(): Promise<HomeItemProjectionInput[]>;
}

/** Application entry point; deliberately not connected to the HTTP routes yet. */
export async function getGroupedHomeItems(
  entries: Iterable<readonly [string, string]>,
  reader: GroupedHomeItemsReader,
  catalogReader: ClassificationCatalogReader,
): Promise<GroupedHomeItemsResponse> {
  const catalog = await catalogReader.read();
  const resolved = resolveHomeItemsFilters(entries, catalog);
  const items = await reader.listForProjection();
  return projectGroupedHomeItems(items, catalog, resolved);
}
