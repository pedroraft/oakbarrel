import FastGlob from 'fast-glob';
import syncFs from 'fs';
import micromatch from 'micromatch';
import path from 'path';
import { config, FILES_EXTENSIONS } from './config';

export const buildIndexTree = (folders: string[]) => {
  const files = getFiles(folders)
    // fast glob ignore is bugged
    .filter((f) => !config.ignore || !micromatch.isMatch(f, config.ignore));

  // cycle the indexes
  return (
    files
      // only index.ts files
      .filter((file) => {
        return path.basename(file).includes('index.');
      })
      // filter files marked with ignore
      .filter((indexPath) => {
        const file = syncFs.readFileSync(indexPath, { encoding: 'utf8' });
        return !/oakbarrel-ignore/g.test(file);
      })
      // deepest index first, because of index to index dependency
      .reverse()
      // add the children files to the index object using the path as key
      .reduce((acc, indexFile) => {
        return {
          ...acc,
          [indexFile]: files
            .filter(
              (f) =>
                // removing it self
                f !== indexFile &&
                // in the same path
                f.startsWith(path.dirname(indexFile)) &&
                // isn't in other index
                !Object.keys(acc)
                  .reduce((indexTree, key) => {
                    return [indexTree, ...acc[key]];
                  }, [])
                  .find((x) => x === f),
            )
            // alphabetically order
            .sort(),
        };
      }, {} as Record<string, string[]>)
  );
};

const getFiles = (folders: string[]) =>
  FastGlob.sync(
    folders.map(
      (folder) => path.join(folder, `**/*.{${FILES_EXTENSIONS.join(',')}}`),
      {
        ignore: ['**/node_modules/*', ...(config.ignore || [])],
      },
    ),
  );
