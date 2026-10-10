import type { Item } from '../domain/item.js';

export interface HomeItemsReader {
  list(): Promise<Item[]>;
  findById(id: number): Promise<Item | null>;
}

export function listHomeItems(reader: HomeItemsReader): Promise<Item[]> {
  return reader.list();
}

export function getHomeItem(id: number, reader: HomeItemsReader): Promise<Item | null> {
  return reader.findById(id);
}
