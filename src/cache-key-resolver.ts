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

  constructor(options?: CacheKeyResolverOptions) {
    // Use destructuring defaults so that explicitly-undefined option
    // values fall back to the defaults instead of overriding them
    const { isEqual = isShallowEqual, maxSize = 0, onExpire = noop } = options ?? {};

    this._options = { isEqual, maxSize, onExpire };
  }

  getKey(...args: any[]): string {
    const { index, map: resolvedMap, parentMap } = this._resolveMap(...args);
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
    const { map } = this._resolveMap(...args);

    return map && isTerminalCacheKeyMap(map) ? map.usedCount : 0;
  }

  private _resolveMap(...args: any[]): ResolveResult {
    let index = 0;
    let parentMap = this._map;

    // Traverse the tree of maps to find the map that matches the last
    // argument of the call, and return it so that the caller can read or
    // set its cache key. If there is no such map, return the deepest
    // matching parent so that the caller can create the missing maps
    // under it. Each map holds a value that is compared with the
    // argument at its depth.
    while (parentMap.maps.length) {
      let isMatched = false;

      for (let mapIndex = 0; mapIndex < parentMap.maps.length; mapIndex++) {
        const map = parentMap.maps[mapIndex];

        if (!this._options.isEqual(map.value, args[index])) {
          continue;
        }

        // Move the most recently used map to the top of the stack
        // for quicker access, unless it is already at the top. The
        // check matters because repeated calls with the same
        // arguments always match at the top, and moving it in place
        // would still shift the entire array twice.
        if (mapIndex > 0) {
          parentMap.maps.unshift(...parentMap.maps.splice(mapIndex, 1));
        }

        if (args.length === 0 || index === args.length - 1) {
          return { index, map, parentMap };
        }

        isMatched = true;
        parentMap = map;
        index++;

        break;
      }

      if (!isMatched) {
        break;
      }
    }

    return { index, parentMap };
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
