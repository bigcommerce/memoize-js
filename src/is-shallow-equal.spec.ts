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
});
