import shallowEqual from 'shallowequal';

function compareNaN(valueA: any, valueB: any): boolean | undefined {
  // Treat a pair of NaN values as equal, otherwise return undefined so
  // that shallowequal falls back to its default strict-equality check.
  return Number.isNaN(valueA) && Number.isNaN(valueB) ? true : undefined;
}

function isPlainObject(value: object): boolean {
  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

/**
 * Compares two values shallowly, treating NaN as equal to itself. Without
 * this, a NaN argument could never resolve to an existing cache key, so
 * every call would create a new cache entry.
 *
 * Only plain objects and arrays are compared by their own properties.
 * Anything else, such as a Date, Map, Set or class instance, keeps its
 * state elsewhere, so comparing its own properties would treat e.g. any two
 * dates as equal. Those are compared by identity instead.
 */
export default function isShallowEqual(valueA: any, valueB: any): boolean {
  // Fast path: strictly equal values (the overwhelmingly common case for
  // cache hits) and NaN pairs can be answered without entering
  // shallowequal, which would otherwise route every comparison through
  // the customizer.
  if (valueA === valueB || (Number.isNaN(valueA) && Number.isNaN(valueB))) {
    return true;
  }

  if (
    typeof valueA !== 'object' ||
    typeof valueB !== 'object' ||
    valueA === null ||
    valueB === null
  ) {
    return false;
  }

  if (Array.isArray(valueA) || Array.isArray(valueB)) {
    return (
      Array.isArray(valueA) && Array.isArray(valueB) && shallowEqual(valueA, valueB, compareNaN)
    );
  }

  return isPlainObject(valueA) && isPlainObject(valueB) && shallowEqual(valueA, valueB, compareNaN);
}
