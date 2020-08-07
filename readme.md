# OakBarrel

Tool for automatic typescript (maybe es6 soon) barrel (export index) updating with file change watcher. Works with monorepos.

It's not stable yet, and the types of export are currently optimized for React Native workflow, i intend to change this soon.
Also the config file under development.

```typescript
// example output
import * as Icons from './Icons';
export { Icons };
export { default as Button } from './Button';
export { default as Checkbox } from './Checkbox';
export { default as Chip } from './Chip';
export { default as Container } from './Container';
export { default as DefaultHeader } from './DefaultHeader';
export * from './mixins/margin';
export * from './mixins/padding';
export * from './mixins/position';
export * from './mixins/size';
```
## How to use it
Create a index.ts any where in your project and run the cli, it will update the exports for all the subdirectories below that index unless there is a index inside that subdirectory.
- ### Install
TODO
- ### Config file
TODO
- #### Types of export patterns
 TODO, there is only one mode right now and its optimized for react native, i intend to change this.

## Why?
Updating index barrels is borring and all other tools i found had major problems, either buggy or slow file watcher performance, none worked well with monorepository.
This uses [nfsw](https://github.com/Axosoft/nsfw) file watcher with fast-glob, a much faster and low memory consuming than other tools, oakbarrel also uses parallel processing.
I intended to use AST analysis but after some testing i changed to regex for performance.
