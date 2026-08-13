import memoize, { memoizeOne } from './memoize';

interface Person {
  id: number;
  name: string;
}

const isSamePerson = (valueA?: Person, valueB?: Person): boolean =>
  valueA?.id === valueB?.id && valueA !== undefined;

describe('memoize', () => {
  it('only calls function again if parameters are different', () => {
    const add = jest.fn((a: number, b: number) => a + b);
    const memoizedAdd = memoize(add);

    memoizedAdd(1, 1);
    memoizedAdd(1, 1);

    expect(add).toHaveBeenCalledTimes(1);

    memoizedAdd(2, 2);

    expect(add).toHaveBeenCalledTimes(2);
  });

  it('deletes cached result when key expires', () => {
    const add = jest.fn((a: number, b: number) => a + b);
    const memoizedAdd = memoize(add, { maxSize: 1 });
    const cache = memoizedAdd.cache as Map<string, number>;

    memoizedAdd(1, 1);

    expect(cache.values().next().value).toBe(2);
    expect(Array.from(cache.values())).toHaveLength(1);

    // This call should remove the previous result from the cache
    memoizedAdd(2, 2);

    expect(cache.values().next().value).toBe(4);
    expect(Array.from(cache.values())).toHaveLength(1);
  });

  it('falls back to default options if explicitly-undefined values are provided', () => {
    const add = jest.fn((a: number, b: number) => a + b);
    const memoizedAdd = memoize(add, { maxSize: undefined, isEqual: undefined });

    expect(memoizedAdd(1, 1)).toBe(2);
    expect(memoizedAdd(1, 1)).toBe(2);

    expect(add).toHaveBeenCalledTimes(1);
  });

  it('uses custom equality function to compare arguments', () => {
    const getId = jest.fn((person: { id: number; name: string }) => person.id);
    const memoizedGetId = memoize(getId, {
      isEqual: isSamePerson,
    });

    memoizedGetId({ id: 1, name: 'Foo' });
    memoizedGetId({ id: 1, name: 'Bar' });

    expect(getId).toHaveBeenCalledTimes(1);

    memoizedGetId({ id: 2, name: 'Foo' });

    expect(getId).toHaveBeenCalledTimes(2);
  });

  it('returns same result for same set of arguments', () => {
    const fn = jest.fn((a: string, b: string) => ({ a, b }));
    const memoizedFn = memoize(fn);

    expect(memoizedFn('hello', 'world')).toBe(memoizedFn('hello', 'world'));
  });
});

describe('memoizeOne', () => {
  it('only calls function again if parameters are different', () => {
    const add = jest.fn((a: number, b: number) => a + b);
    const memoizedAdd = memoizeOne(add);

    memoizedAdd(1, 1);
    memoizedAdd(1, 1);

    expect(add).toHaveBeenCalledTimes(1);
  });

  it('only keeps the result of the most recent call', () => {
    const add = jest.fn((a: number, b: number) => a + b);
    const memoizedAdd = memoizeOne(add);
    const cache = memoizedAdd.cache as Map<string, number>;

    memoizedAdd(1, 1);
    memoizedAdd(2, 2);

    expect(Array.from(cache.values())).toEqual([4]);

    // This call is a miss again because the previous call evicted it
    memoizedAdd(1, 1);

    expect(add).toHaveBeenCalledTimes(3);
    expect(Array.from(cache.values())).toEqual([2]);
  });

  it('uses custom equality function to compare arguments', () => {
    const getId = jest.fn((person: { id: number; name: string }) => person.id);
    const memoizedGetId = memoizeOne(getId, {
      isEqual: isSamePerson,
    });

    memoizedGetId({ id: 1, name: 'Foo' });
    memoizedGetId({ id: 1, name: 'Bar' });

    expect(getId).toHaveBeenCalledTimes(1);
  });
});
