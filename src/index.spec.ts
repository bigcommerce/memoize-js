import { memoize, memoizeOne } from './index';

describe('index', () => {
  it('exposes the public API', () => {
    expect(typeof memoize).toBe('function');
    expect(typeof memoizeOne).toBe('function');
  });
});
