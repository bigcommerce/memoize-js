import lodashMemoize from 'lodash.memoize'; // tslint:disable-line:match-default-export-name
import shallowEqual from 'shallowequal';

import CacheKeyResolver from './cache-key-resolver';
import { Omit } from './types';

export interface MemoizeOptions {
    maxSize?: number;
    isEqual?(valueA: any, valueB: any): boolean;
}

export default function memoize<T extends (...args: any[]) => any>(
    fn: T,
    options?: MemoizeOptions
) {
    const { maxSize, isEqual } = { maxSize: 0, isEqual: shallowEqual, ...options };
    const cache = new Map();
    const resolver = new CacheKeyResolver({
        isEqual,
        maxSize,
        onExpire: key => cache.delete(key),
    });
    const memoized = lodashMemoize(fn, (...args) => resolver.getKey(...args));

    memoized.cache = cache;

    return memoized;
}

export function memoizeOne<T extends (...args: any[]) => any>(
    fn: T,
    options?: Omit<MemoizeOptions, 'maxSize'>
) {
    return memoize(fn, { ...options, maxSize: 1 });
}
