import isShallowEqual from './is-shallow-equal';

describe('isShallowEqual', () => {
  it('returns true for strictly equal values', () => {
    const object = { name: 'Foo' };

    expect(isShallowEqual('hello', 'hello')).toBe(true);
    expect(isShallowEqual(object, object)).toBe(true);
  });

  it('returns true for shallowly equal objects', () => {
    expect(isShallowEqual({ id: 1 }, { id: 1 })).toBe(true);
  });

  it('returns false for different values', () => {
    expect(isShallowEqual('hello', 'bye')).toBe(false);
    expect(isShallowEqual({ id: 1 }, { id: 2 })).toBe(false);
    expect(isShallowEqual({ id: 1 }, { id: 1, name: 'Foo' })).toBe(false);
  });

  it('treats NaN as equal to NaN', () => {
    expect(isShallowEqual(NaN, NaN)).toBe(true);
    expect(isShallowEqual({ value: NaN }, { value: NaN })).toBe(true);
    expect(isShallowEqual(NaN, 1)).toBe(false);
    expect(isShallowEqual({ value: NaN }, { value: 1 })).toBe(false);
  });

  it('compares arrays by their items', () => {
    expect(isShallowEqual([1, 'a'], [1, 'a'])).toBe(true);
    expect(isShallowEqual([1, 'a'], [1, 'b'])).toBe(false);
  });

  it('does not treat an array as equal to an object', () => {
    expect(isShallowEqual([], {})).toBe(false);
    expect(isShallowEqual({}, [])).toBe(false);
    expect(isShallowEqual(['a'], { 0: 'a' })).toBe(false);
  });

  it('compares objects without a prototype by their properties', () => {
    expect(isShallowEqual(Object.create(null), Object.create(null))).toBe(true);
    expect(isShallowEqual(Object.assign(Object.create(null), { id: 1 }), { id: 1 })).toBe(true);
  });

  it('compares objects that are not plain objects or arrays by identity', () => {
    const date = new Date('2020-01-01');

    expect(isShallowEqual(date, date)).toBe(true);
    expect(isShallowEqual(date, new Date('2020-01-01'))).toBe(false);
    expect(isShallowEqual(date, new Date('2021-01-01'))).toBe(false);
    expect(isShallowEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false);
    expect(isShallowEqual(new Set([1]), new Set([2]))).toBe(false);
    expect(isShallowEqual(/a/, /b/)).toBe(false);
  });

  it('compares class instances by identity', () => {
    class Foo {
      constructor(public id: number) {}
    }

    const foo = new Foo(1);

    expect(isShallowEqual(foo, foo)).toBe(true);
    expect(isShallowEqual(foo, new Foo(1))).toBe(false);
    expect(isShallowEqual(foo, { id: 1 })).toBe(false);
  });
});
