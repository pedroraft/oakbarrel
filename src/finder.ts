import { ROOT_FOLDER, config } from './config';
import FastGlob from 'fast-glob';
import path from 'path';
import syncFs from 'fs';

export const buildIndexTree = (folders: string[]) => {
  let indexTree: { [path: string]: string[] } = {};

  const files = getFiles(folders);
  const getFlatIndexes = () => {
    let indexes: string[] = [];
    // TODO: multithread this
    Object.keys(indexTree).forEach(key => indexes.push(...indexTree[key]));
    return indexes;
  };

  files
    .filter(file => path.basename(file) === 'index.ts')
    .filter(indexPath => {
      const file = syncFs.readFileSync(indexPath, { encoding: 'utf8' });
      return !/oakbarrel-ignore/g.test(file);
    })
    // deepest index first, because of index to index dependency
    .reverse()
    // TODO: multithread this
    .forEach(indexFile => {
      const flatIndex = getFlatIndexes();
      indexTree = {
        ...indexTree,
        [indexFile]: files
          .filter(
            f =>
              // removing it self
              f !== indexFile &&
              // in the same path
              f.startsWith(path.dirname(indexFile)) &&
              // ins't in other index
              flatIndex.every(x => x !== f),
          )
          // alphabetically order
          .sort(),
      };
    });
  return indexTree;
};

const getFiles = (folders: string[]) => {
  const entries = FastGlob.sync(
    folders.map(folder => path.join(folder, '**/*.{ts,tsx}')),
    {
      dot: false,
      ignore: ['**/node_modules/*'],
    },
  );
  return filterMultidot(entries);
};

const filterMultidot = (files: string[]) =>
  config.ignoreMultiDot || config.ignore
    ? files.filter(filePath => {
        const nameArray = path.basename(filePath).split('.');
        if (nameArray.length === 2) return true;
        if (config.ignoreMultiDot && nameArray.length === 3) return false;
        if (config.ignore) {
          const regex = new RegExp(config.ignore);
          return regex.test(path.basename(filePath));
        }
      })
    : files;
