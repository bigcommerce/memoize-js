import {
  ChildCacheKeyMap,
  IntermediateCacheKeyMap,
  isChildCacheKeyMap,
  isTerminalCacheKeyMap,
  RootCacheKeyMap,
  TerminalCacheKeyMap,
} from './cache-key-maps';
import isShallowEqual from './is-shallow-equal';

function noop(): void {
  /* intentional no-op */
}

// Up to this many siblings, a linear scan is cheaper than a Map lookup.
const MAX_SIBLINGS_FOR_SCAN = 8;

export interface CacheKeyResolverOptions {
  maxSize?: number;
  onExpire?(key: string): void;
  isEqual?(valueA: any, valueB: any): boolean;
}

interface ResolveResult {
  index: number;
  parentMap: RootCacheKeyMap | IntermediateCacheKeyMap;
  map?: ChildCacheKeyMap;
}

export default class CacheKeyResolver {
  private _lastId = 0;
  private _map: RootCacheKeyMap = { maps: [] };
  private _usedMaps = new Set<TerminalCacheKeyMap>();
  private _options: Required<CacheKeyResolverOptions>;
  private _useValueIndex: boolean;

  constructor(options?: CacheKeyResolverOptions) {
    // Use destructuring defaults so that explicitly-undefined option
    // values fall back to the defaults instead of overriding them
    const { isEqual = isShallowEqual, maxSize = 0, onExpire = noop } = options ?? {};

    this._options = { isEqual, maxSize, onExpire };

    // Maps compare keys the same way the default comparison treats
    // everything except shallowly-equal-but-distinct objects, so sibling
    // maps can be indexed by value for constant-time lookup. A custom
    // comparison could equate values a Map would keep apart, so the index
    // can only be used with the default one.
    this._useValueIndex = isEqual === isShallowEqual;
  }

  getKey(...args: any[]): string {
    const { index, map: resolvedMap, parentMap } = this._resolveMap(args);
    let map: TerminalCacheKeyMap;

    if (!resolvedMap) {
      // Cache miss: no existing map matches all the arguments, so
      // create maps for the unmatched ones.
      map = this._generateMap(parentMap, args.slice(index));
    } else if (isTerminalCacheKeyMap(resolvedMap)) {
      // Cache hit: the map already has a cache key.
      map = resolvedMap;
      map.usedCount++;
    } else {
      // The map matches all the arguments but has no cache key of its
      // own, because the arguments are a prefix of a longer set of
      // arguments seen earlier, or because its key has expired. Attach
      // a new key to it so that the same arguments resolve to the same
      // key from now on.
      map = resolvedMap as TerminalCacheKeyMap;
      map.cacheKey = `${++this._lastId}`;
      map.usedCount = 1;
    }

    // Keep track of the least used map so we can remove it if the size of
    // the stack exceeds the maximum size.
    this._removeLeastUsedMap(map);

    return map.cacheKey;
  }

  getUsedCount(...args: any[]): number {
    const { map } = this._resolveMap(args);

    return map && isTerminalCacheKeyMap(map) ? map.usedCount : 0;
  }

  private _resolveMap(args: any[]): ResolveResult {
    let index = 0;
    let parentMap = this._map;

    // Traverse the tree of maps to find the map that matches the last
    // argument of the call, and return it so that the caller can read or
    // set its cache key. If there is no such map, return the deepest
    // matching parent so that the caller can create the missing maps
    // under it. Each map holds a value that is compared with the
    // argument at its depth.
    while (parentMap.maps.length) {
      const arg = args[index];
      const map = this._findMap(parentMap, arg);

      if (!map) {
        break;
      }

      if (args.length === 0 || index === args.length - 1) {
        return { index, map, parentMap };
      }

      parentMap = map;
      index++;
    }

    return { index, parentMap };
  }

  // A Map matches keys by SameValueZero (identity, except that NaN equals
  // NaN and -0 equals 0), so it agrees with the default comparison for
  // everything except shallowly-equal-but-distinct objects. Those still
  // need a linear scan; anything else that misses the index is a
  // definitive miss. Without an index, the level is always scanned.
  private _findMap(
    parentMap: RootCacheKeyMap | IntermediateCacheKeyMap,
    arg: any,
  ): ChildCacheKeyMap | undefined {
    const { maps, valueIndex } = parentMap;

    // Narrow levels are scanned even if they have an index, e.g. after
    // expiry has shrunk them, since a scan is cheaper there. Index hits
    // do not move the map to the top of the stack, so the scan order of
    // such a level may be stale, which only affects its speed.
    if (valueIndex && maps.length > MAX_SIBLINGS_FOR_SCAN) {
      const indexedMap = valueIndex.get(arg);

      if (indexedMap || typeof arg !== 'object' || arg === null) {
        return indexedMap;
      }
    }

    // A manual loop avoids allocating a closure on every call, which
    // findIndex(callback) would do in this hot path.
    for (let mapIndex = 0; mapIndex < maps.length; mapIndex++) {
      if (!this._options.isEqual(maps[mapIndex].value, arg)) {
        continue;
      }

      // Move the most recently used map to the top of the stack for
      // quicker access on the next linear scan, unless it is already
      // at the top.
      if (mapIndex > 0) {
        maps.unshift(...maps.splice(mapIndex, 1));
      }

      return maps[0];
    }

    return undefined;
  }

  // Most levels never grow past a handful of siblings, and in a trie of
  // multi-argument calls almost every intermediate level has exactly one.
  // So the index is only built once a level becomes wide enough to be
  // looked up through it, and kept up to date from then on.
  private _indexMap(
    parentMap: RootCacheKeyMap | IntermediateCacheKeyMap,
    map: ChildCacheKeyMap,
  ): void {
    if (parentMap.valueIndex) {
      parentMap.valueIndex.set(map.value, map);

      return;
    }

    if (parentMap.maps.length <= MAX_SIBLINGS_FOR_SCAN) {
      return;
    }

    const valueIndex = new Map<any, ChildCacheKeyMap>();

    parentMap.maps.forEach((siblingMap) => valueIndex.set(siblingMap.value, siblingMap));

    parentMap.valueIndex = valueIndex;
  }

  private _generateMap(
    parent: RootCacheKeyMap | IntermediateCacheKeyMap,
    args: any[],
  ): TerminalCacheKeyMap {
    let index = 0;
    let parentMap = parent;
    let map: IntermediateCacheKeyMap;

    do {
      map = {
        maps: [],
        parentMap,
        usedCount: 1,
        value: args[index],
      };

      // Continue to build the tree of maps so that it could be resolved
      // next time when the function is called with the same set of
      // arguments.
      parentMap.maps.unshift(map);

      if (this._useValueIndex) {
        this._indexMap(parentMap, map);
      }

      parentMap = map;
      index++;
    } while (index < args.length);

    const terminalMap = map as TerminalCacheKeyMap;

    terminalMap.cacheKey = `${++this._lastId}`;

    return terminalMap;
  }

  private _removeLeastUsedMap(recentlyUsedMap: TerminalCacheKeyMap): void {
    if (!this._options.maxSize) {
      return;
    }

    // Re-inserting the map moves it to the end of the set, so the first
    // map in the set is always the least recently used one. Unlike an
    // array, a set can do this without scanning or shifting the other
    // maps.
    this._usedMaps.delete(recentlyUsedMap);
    this._usedMaps.add(recentlyUsedMap);

    if (this._usedMaps.size <= this._options.maxSize) {
      return;
    }

    const map = this._usedMaps.values().next().value;

    if (!map) {
      return;
    }

    this._usedMaps.delete(map);

    const { cacheKey } = map;

    this._removeMap(map);
    this._options.onExpire(cacheKey);
  }

  private _removeMap(map: ChildCacheKeyMap): void {
    // If the map still has children, it is part of the path to other
    // cached entries. Only remove its own cache key so that the other
    // entries remain resolvable.
    if (map.maps.length) {
      delete (map as Partial<TerminalCacheKeyMap>).cacheKey;

      return;
    }

    const { parentMap } = map;

    if (!parentMap) {
      return;
    }

    parentMap.maps.splice(parentMap.maps.indexOf(map), 1);
    parentMap.valueIndex?.delete(map.value);

    // Also remove ancestors that no longer lead to any cache key,
    // otherwise they would accumulate indefinitely as keys expire.
    if (
      parentMap.maps.length === 0 &&
      isChildCacheKeyMap(parentMap) &&
      !isTerminalCacheKeyMap(parentMap)
    ) {
      this._removeMap(parentMap);
    }
  }
}
