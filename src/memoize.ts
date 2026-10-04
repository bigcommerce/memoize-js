import type { MemoizedFunction } from 'lodash';

import CacheKeyResolver from './cache-key-resolver';
import isShallowEqual from './is-shallow-equal';

export interface MemoizeOptions {
  maxSize?: number;
  isEqual?(valueA: any, valueB: any): boolean;
}

export default function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options?: MemoizeOptions,
): T & MemoizedFunction {
  // Use destructuring defaults so that explicitly-undefined option values
  // fall back to the defaults instead of overriding them
  const { maxSize = 0, isEqual = isShallowEqual } = options ?? {};
  const resolver = new CacheKeyResolver({
    isEqual,
    maxSize,
    onExpire: (key) => memoized.cache.delete(key),
  });

  function memoized(this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const { cache } = memoized;
    const cachedKey = resolver.findKey(...args);

    if (cachedKey !== undefined && cache.has(cachedKey)) {
      return cache.get(cachedKey) as ReturnType<T>;
    }

    const result = fn.apply(this, args) as ReturnType<T>;

    // Only issue a key once the call has succeeded. Issuing it beforehand
    // would let a call that throws expire another cached result, and let
    // a recursive call expire this key before its result is stored, which
    // would leave the result in the cache forever.
    cache.set(resolver.getKey(...args), result);

    return result;
  }

  memoized.cache = new Map() as MemoizedFunction['cache'];

  // Keep the type of lodash.memoize, which this used to wrap, so that
  // callers relying on it are unaffected. The wrapper has the same
  // signature as fn, but TypeScript cannot tell that it satisfies every
  // possible subtype of T.
  return memoized as unknown as T & MemoizedFunction;
}

export function memoizeOne<T extends (...args: any[]) => any>(
  fn: T,
  options?: Omit<MemoizeOptions, 'maxSize'>,
) {
  return memoize(fn, { ...options, maxSize: 1 });
}
