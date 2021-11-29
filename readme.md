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
npm install --save-dev @pedroraft/oakbarrel

# or

yarn add -D @pedroraft/oakbarrel
```

### Config file

- folders: list of relative paths to folders where the code is
- ignore: glob pattern of files to ignore, useful for ignore tests.

example config:
```json
{
  "folders": ["./libs/ui-hybrid/src", "./libs/core/src"],
  "ignore": ["**/*.{spec,stories,native,ios,android}.{js,jsx,ts,tsx}"]
}
```

### run

```bash
yarn oakbarrel
```

## Why?

Updating index barrels is boring and all other tools I found had major problems, either buggy or slow file watcher performance, none worked well with mono repository.

This uses [nsfw](https://github.com/Axosoft/nsfw) file watcher with [fast-glob](https://github.com/mrmlnc/fast-glob), this combo is much faster and low memory consuming than other tools.
