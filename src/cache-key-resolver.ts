import shallowEqual from 'shallowequal';

import {
  ChildCacheKeyMap,
  IntermediateCacheKeyMap,
  isChildCacheKeyMap,
  isTerminalCacheKeyMap,
  RootCacheKeyMap,
  TerminalCacheKeyMap,
} from './cache-key-maps';

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
  map?: TerminalCacheKeyMap;
}

export default class CacheKeyResolver {
  private _lastId = 0;
  private _map: RootCacheKeyMap = { maps: [] };
  private _usedMaps: TerminalCacheKeyMap[] = [];
  private _options: Required<CacheKeyResolverOptions>;

  constructor(options?: CacheKeyResolverOptions) {
    // Use destructuring defaults so that explicitly-undefined option
    // values fall back to the defaults instead of overriding them
    const { isEqual = shallowEqual, maxSize = 0, onExpire = noop } = options ?? {};

    this._options = { isEqual, maxSize, onExpire };
  }

  getKey(...args: any[]): string {
    const result = this._resolveMap(...args);
    const { index, parentMap } = result;
    let { map } = result;

    if (map?.cacheKey) {
      map.usedCount++;
    } else {
      map = this._generateMap(parentMap, args.slice(index));
    }

    // Keep track of the least used map so we can remove it if the size of
    // the stack exceeds the maximum size.
    this._removeLeastUsedMap(map);

    return map.cacheKey;
  }

  getUsedCount(...args: any[]): number {
    const { map } = this._resolveMap(...args);

    return map ? map.usedCount : 0;
  }

  private _resolveMap(...args: any[]): ResolveResult {
    let index = 0;
    let parentMap = this._map;

    // Traverse the tree to find the linked list of maps that match the
    // arguments of the call. Each intermediate or terminal map contains a
    // value that could be used to match with the arguments. The last map in
    // the list (the terminal) should contain a cache key. If it can does
    // not exist, we will return a falsy value so that the caller could
    // handle and generate a new cache key.
    while (parentMap.maps.length) {
      let isMatched = false;

      for (let mapIndex = 0; mapIndex < parentMap.maps.length; mapIndex++) {
        const map = parentMap.maps[mapIndex];

        if (!this._options.isEqual(map.value, args[index])) {
          continue;
        }

        // Move the most recently used map to the top of the stack for
        // quicker access
        parentMap.maps.unshift(...parentMap.maps.splice(mapIndex, 1));

        if ((args.length === 0 || index === args.length - 1) && isTerminalCacheKeyMap(map)) {
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

    const index = this._usedMaps.indexOf(recentlyUsedMap);

    // Move the most recently used map to the front of the stack so that
    // the map at the end is always the least recently used one.
    if (index !== -1) {
      this._usedMaps.splice(index, 1);
    }

    this._usedMaps.unshift(recentlyUsedMap);

    if (this._usedMaps.length <= this._options.maxSize) {
      return;
    }

    const map = this._usedMaps.pop();

    if (!map) {
      return;
    }

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
