import shallowEqual from 'shallowequal';

function compareNaN(valueA: any, valueB: any): boolean | undefined {
  // Treat a pair of NaN values as equal, otherwise return undefined so
  // that shallowequal falls back to its default strict-equality check.
  return Number.isNaN(valueA) && Number.isNaN(valueB) ? true : undefined;
}

/**
 * Compares two values shallowly, treating NaN as equal to itself. Without
 * this, a NaN argument could never resolve to an existing cache key, so
 * every call would create a new cache entry.
 */
export default function isShallowEqual(valueA: any, valueB: any): boolean {
  return shallowEqual(valueA, valueB, compareNaN);
}
