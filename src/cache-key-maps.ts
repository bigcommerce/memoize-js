export interface RootCacheKeyMap {
  maps: ChildCacheKeyMap[];
  // Index of child maps by their value, for constant-time lookup when the
  // default comparison is in use. Values compared by identity (or NaN)
  // resolve through this index; only shallowly-equal-but-distinct objects
  // need to fall back to scanning `maps`.
  valueIndex?: Map<any, ChildCacheKeyMap>;
}

export interface IntermediateCacheKeyMap {
  maps: ChildCacheKeyMap[];
  valueIndex?: Map<any, ChildCacheKeyMap>;
  parentMap: RootCacheKeyMap | IntermediateCacheKeyMap;
  usedCount: number;
  value: any;
}

export interface TerminalCacheKeyMap extends IntermediateCacheKeyMap {
  cacheKey: string;
}

export type ChildCacheKeyMap = IntermediateCacheKeyMap | TerminalCacheKeyMap;

export function isTerminalCacheKeyMap(map: ChildCacheKeyMap): map is TerminalCacheKeyMap {
  return map.hasOwnProperty('cacheKey');
}

export function isChildCacheKeyMap(
  map: RootCacheKeyMap | ChildCacheKeyMap,
): map is ChildCacheKeyMap {
  return map.hasOwnProperty('parentMap');
}
