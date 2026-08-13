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
  // Fast path: strictly equal values (the overwhelmingly common case for
  // cache hits) and NaN pairs can be answered without entering
  // shallowequal, which would otherwise route every comparison through
  // the customizer.
  if (valueA === valueB || (Number.isNaN(valueA) && Number.isNaN(valueB))) {
    return true;
  }

  return shallowEqual(valueA, valueB, compareNaN);
}
