# @bigcommerce/memoize

[![CircleCI](https://circleci.com/gh/bigcommerce/memoize-js.svg?style=svg)](https://circleci.com/gh/bigcommerce/memoize-js)

This library can be used to memoize the result of a pure function. 

Unlike the default `memoize` function provided by Lodash, it can be applied to functions that accept multiple non-primitive arguments. It can also be configured to expire its cache after certain number of unique calls. By default, it compares object-based arguments shallowly; but it can be configured to compare arguments strictly or deeply depending on your usage requirement.


## Install

You can install this library using [npm](https://www.npmjs.com/get-npm).

```sh
npm install --save @bigcommerce/memoize
```


## Usage

To memoize a function:

```ts
function fn(a, b) {
    return { a, b };
}

const memoizedFn = memoize(fn);
const result = memoizedFn({ message: 'hello' }, { message: 'world' });
const result2 = memoizedFn({ message: 'hello' }, { message: 'world' });

expect(result).toBe(result2);
```

To set a limit on the cache size:

```ts
function fn(a, b) {
    return { a, b };
}

const memoizedFn = memoize(fn, { maxSize: 1 });
const result = memoizedFn({ message: 'hello' }, { message: 'world' });

// This call will expire the cache of the previous call because it is called with a different set of arguments
const result2 = memoizedFn({ message: 'hello' }, { message: 'foobar' });
const result3 = memoizedFn({ message: 'hello' }, { message: 'world' });

expect(result3).not.toBe(result);
```

There is a convenience method for setting the cache size to one:

```ts
const memoizedFn = memoizeOne(fn);
```

To use a different argument comparison function:

```ts
const memoizedFn = memoize(fn, { 
    isEqual: (a, b) => a === b,
});
```


## Contribution

To release:

```sh
npm run release
```

To see other available commands:

```sh
npm run
```

## License

MIT
