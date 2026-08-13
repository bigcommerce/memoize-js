import CacheKeyResolver from './cache-key-resolver';

describe('CacheKeyResolver', () => {
  it('returns same cache key if params are equal', () => {
    const resolver = new CacheKeyResolver();

    expect(resolver.getKey('hello')).toBe('1');
    expect(resolver.getKey('bye')).toBe('2');
    expect(resolver.getKey('hello')).toBe('1');
    expect(resolver.getKey('bye')).toBe('2');
  });

  it('returns same cache key if multiple params are equal', () => {
    const resolver = new CacheKeyResolver();

    expect(resolver.getKey('hello', 'world')).toBe('1');
    expect(resolver.getKey('hello', 'good', 'bye')).toBe('2');
    expect(resolver.getKey('hello', 'world')).toBe('1');
    expect(resolver.getKey('hello', 'good', 'bye')).toBe('2');
  });

  it('returns same cache key if params are a prefix of a previous call', () => {
    const resolver = new CacheKeyResolver();

    expect(resolver.getKey('hello', 'world')).toBe('1');
    expect(resolver.getKey('hello')).toBe('2');
    expect(resolver.getKey('hello')).toBe('2');
    expect(resolver.getKey('hello', 'world')).toBe('1');
  });

  it('does not grow internal maps when repeatedly called with a prefix of a previous call', () => {
    const resolver = new CacheKeyResolver();

    resolver.getKey('hello', 'world');

    for (let index = 0; index < 10; index++) {
      resolver.getKey('hello');
    }

    // eslint-disable-next-line no-underscore-dangle
    expect((resolver as any)._map.maps).toHaveLength(1);
    // eslint-disable-next-line no-underscore-dangle
    expect((resolver as any)._map.maps[0].maps).toHaveLength(1);
  });

  it('returns same cache key if no params are provided', () => {
    const resolver = new CacheKeyResolver();

    expect(resolver.getKey()).toBe('1');
    expect(resolver.getKey()).toBe('1');
  });

  it('returns same cache key for a call with no params and a call with a single undefined param', () => {
    const resolver = new CacheKeyResolver();

    // The resolver represents the end of an argument list with an
    // undefined value, so these two calls are indistinguishable. This
    // test pins the current behaviour rather than mandating it.
    expect(resolver.getKey()).toBe('1');
    expect(resolver.getKey(undefined)).toBe('1');
  });

  it('works with non-primitive params', () => {
    const resolver = new CacheKeyResolver();
    const personA = { name: 'Foo' };
    const personB = { name: 'Bar' };
    const personC = { name: 'Foobar' };

    expect(resolver.getKey(personA, personB)).toBe('1');
    expect(resolver.getKey(personB, personA)).toBe('2');
    expect(resolver.getKey(personA, personB)).toBe('1');
    expect(resolver.getKey(personB, personA, personC)).toBe('3');
  });

  it('works with functions', () => {
    const resolver = new CacheKeyResolver();
    const functionA = () => 'a';
    const functionB = () => 'b';

    expect(resolver.getKey('foobar', functionA)).toBe('1');
    expect(resolver.getKey('foobar', functionB)).toBe('2');
    expect(resolver.getKey('foobar', functionA)).toBe('1');
    expect(resolver.getKey('foobar', functionB)).toBe('2');
  });

  it('works with unserializable objects with cyclical reference', () => {
    const resolver = new CacheKeyResolver();
    const objectB: any = { child: undefined };
    const objectA: any = { child: objectB };

    objectB.child = objectA;

    expect(resolver.getKey(objectA, objectB)).toBe('1');
    expect(resolver.getKey(objectA, objectB)).toBe('1');
  });

  it('returns same key if objects are shallowly equivalent', () => {
    const resolver = new CacheKeyResolver();
    const objectA = { id: 1 };
    const objectB = { id: 1 };

    expect(resolver.getKey('foobar', objectA)).toEqual(resolver.getKey('foobar', objectB));
  });

  it('returns different cache key for least recently used set of arguments', () => {
    const resolver = new CacheKeyResolver({ maxSize: 2 });

    expect(resolver.getKey('hello', 'world')).toBe('1');
    // This will return the cache key
    expect(resolver.getKey('hello', 'world')).toBe('1');
    expect(resolver.getKey('hello', 'good')).toBe('2');
    expect(resolver.getKey('bad', 'guys')).toBe('3');
    // This will return a new cache key because the set of arguments is
    // least recently used and the number of cache keys already exceed the
    // maximum size
    expect(resolver.getKey('hello', 'world')).toBe('4');
  });

  it('only expires cache key if number of unique calls exceeds limit', () => {
    const resolver = new CacheKeyResolver({ maxSize: 2 });

    expect(resolver.getKey('hello', 'world')).toBe('1');
    expect(resolver.getKey('hello', 'world')).toBe('1');
    // The previous call should not expire the key because it is called with
    // the same set of arguments
    expect(resolver.getKey('hello', 'world')).toBe('1');

    expect(resolver.getKey('foo', 'bar')).toBe('2');
    expect(resolver.getKey('hello', 'bye')).toBe('3');

    // This call should return a new key because the previous two calls are
    // made with different sets of arguments
    expect(resolver.getKey('hello', 'world')).toBe('4');
  });

  it('notifies the caller via onExpire when a cache key expires', () => {
    const onExpire = jest.fn();
    const resolver = new CacheKeyResolver({ maxSize: 1, onExpire });

    resolver.getKey('a');

    expect(onExpire).not.toHaveBeenCalled();

    // This call expires the key for ('a')
    resolver.getKey('b');

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onExpire).toHaveBeenCalledWith('1');
  });

  it('cleans up internal maps when cache keys expire', () => {
    const resolver = new CacheKeyResolver({ maxSize: 1 });

    for (let index = 0; index < 100; index++) {
      resolver.getKey(`arg${index}`, 'second');
    }

    // Only the branch for the most recent call should remain
    // eslint-disable-next-line no-underscore-dangle
    expect((resolver as any)._map.maps).toHaveLength(1);
  });

  it('keeps cache keys that share arguments with an expired key', () => {
    const resolver = new CacheKeyResolver({ maxSize: 2 });

    expect(resolver.getKey('a')).toBe('1');
    expect(resolver.getKey('a', 'b')).toBe('2');

    // This call expires the key for ('a'), which shares a path with ('a', 'b')
    expect(resolver.getKey('c')).toBe('3');

    expect(resolver.getKey('a', 'b')).toBe('2');
  });

  it('keeps sibling cache keys when a key expires', () => {
    const resolver = new CacheKeyResolver({ maxSize: 2 });

    expect(resolver.getKey('x', 'y')).toBe('1');
    expect(resolver.getKey('x', 'z')).toBe('2');

    // This call expires the key for ('x', 'y'), which shares its first
    // argument with ('x', 'z')
    expect(resolver.getKey('c')).toBe('3');

    expect(resolver.getKey('x', 'z')).toBe('2');
  });

  it('issues a stable cache key when an expired key is requested again', () => {
    const resolver = new CacheKeyResolver({ maxSize: 2 });

    expect(resolver.getKey('a')).toBe('1');
    expect(resolver.getKey('a', 'b')).toBe('2');

    // This call expires the key for ('a'), whose map remains in the tree
    // because it is part of the path to ('a', 'b')
    expect(resolver.getKey('c')).toBe('3');

    // Requesting ('a') again should issue a new key once and then keep
    // returning it
    expect(resolver.getKey('a')).toBe('4');
    expect(resolver.getKey('a')).toBe('4');
  });

  it('does not expire a cache key that was recently reused', () => {
    const resolver = new CacheKeyResolver({ maxSize: 2 });

    expect(resolver.getKey('a')).toBe('1');
    expect(resolver.getKey('b')).toBe('2');

    // Reusing ('a') makes ('b') the least recently used key
    expect(resolver.getKey('a')).toBe('1');

    // This call expires ('b'), not ('a')
    expect(resolver.getKey('c')).toBe('3');

    expect(resolver.getKey('a')).toBe('1');
    expect(resolver.getKey('b')).not.toBe('2');
  });

  it('falls back to default options if explicitly-undefined values are provided', () => {
    const resolver = new CacheKeyResolver({
      isEqual: undefined,
      maxSize: undefined,
      onExpire: undefined,
    });

    expect(resolver.getKey('hello')).toBe('1');
    expect(resolver.getKey('hello')).toBe('1');
  });

  it('returns cache key used count', () => {
    const resolver = new CacheKeyResolver();

    expect(resolver.getUsedCount('hello', 'world')).toBe(0);

    resolver.getKey('hello', 'world');

    expect(resolver.getUsedCount('hello', 'world')).toBe(1);

    resolver.getKey('hello', 'world');

    expect(resolver.getUsedCount('hello', 'world')).toBe(2);
  });

  it('returns cache key used count for a prefix of a previous call', () => {
    const resolver = new CacheKeyResolver();

    resolver.getKey('hello', 'world');

    expect(resolver.getUsedCount('hello')).toBe(0);

    resolver.getKey('hello');

    expect(resolver.getUsedCount('hello')).toBe(1);
    expect(resolver.getUsedCount('hello', 'world')).toBe(1);
  });
});
