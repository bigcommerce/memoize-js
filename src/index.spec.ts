import { memoize, memoizeOne } from './index';

describe('index', () => {
    it('exposes the public API', () => {
        expect(typeof memoize).toEqual('function');
        expect(typeof memoizeOne).toEqual('function');
    });
});
