import lodashMemoize from 'lodash.memoize';
import shallowEqual from 'shallowequal';

import CacheKeyResolver from './cache-key-resolver';

export interface MemoizeOptions {
  maxSize?: number;
  isEqual?(valueA: any, valueB: any): boolean;
}

export default function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options?: MemoizeOptions,
) {
  // Use destructuring defaults so that explicitly-undefined option values
  // fall back to the defaults instead of overriding them
  const { maxSize = 0, isEqual = shallowEqual } = options ?? {};
  const cache = new Map();
  const resolver = new CacheKeyResolver({
    isEqual,
    maxSize,
    onExpire: (key) => cache.delete(key),
  });
  const memoized = lodashMemoize(fn, (...args) => resolver.getKey(...args));

  memoized.cache = cache;

  return memoized;
}

export function memoizeOne<T extends (...args: any[]) => any>(
  fn: T,
  options?: Omit<MemoizeOptions, 'maxSize'>,
) {
  return memoize(fn, { ...options, maxSize: 1 });
}
