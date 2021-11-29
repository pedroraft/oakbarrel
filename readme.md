# OakBarrel

Tool for automatic typescript (js support coming soon) barrel (export index) updating with file change watcher.
Works with monorepos.

```typescript
// example output
export * from './mixins/margin';
export * from './mixins/padding';
export * from './mixins/position';
export * from './mixins/size';
```

## How to use it

Create an index.ts any where in your project and run the cli, it will update the exports for all the subdirectories below that index unless there is an index inside that subdirectory.

### Install

```bash
npm install --save-dev oakbarrel

# or

yarn add -D oakbarrel
```

### Config file

```json
{
  "folders": ["./libs/ui-hybrid/src", "./libs/core/src"],
  "ignore": ["**/*.{spec,stories,native,ios,android}.{js,jsx,ts,tsx}"] // glob pattern of files to ignore
}
```

### run

```bash
yarn oakbarrel
```

## Why?

Updating index barrels is boring and all other tools I found had major problems, either buggy or slow file watcher performance, none worked well with mono repository.

This uses [nsfw](https://github.com/Axosoft/nsfw) file watcher with fast-glob, a much faster and low memory consuming than other tools.
