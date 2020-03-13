import nsfw from 'nsfw';
import path from 'path';
import fastGlob from 'fast-glob';
import fs from 'fs';

type exportType = 'named' | 'default';
type fileExportType = { [file: string]: exportType };
type indexInfo = { [index: string]: fileExportType };

// const mockFolder = path.join(process.cwd(), 'testfolder');
const mockFolder = '/home/pedroraft/Documentos/v2/src';
console.log(mockFolder);

const IGNORE_MULTI_DOT: string[] | boolean | undefined = true;

export const run = () => {
  console.log(buildIndexTree(getFiles()));
};

const getFiles = () => {
  const entries = fastGlob.sync([path.join(mockFolder, '**/*.{ts,tsx}')], {
    dot: false,
    ignore: ['**/node_modules/*'],
  });
  // console.log(entries);
  return filterMultidot(entries);
};

const filterMultidot = (files: string[]) =>
  IGNORE_MULTI_DOT
    ? files.filter(filePath => {
        const nameArray = path.basename(filePath).split('.');
        if (nameArray.length < 2) return;
        return Array.isArray(IGNORE_MULTI_DOT)
          ? !IGNORE_MULTI_DOT.includes(nameArray[1])
          : nameArray.length === 2;
      })
    : files;

const buildIndexTree = (files: string[]) => {
  let indexTree: { [path: string]: string[] } = {};

  const getFlatIndexes = () => {
    let indexes: string[] = [];
    Object.keys(indexTree).forEach(key => indexes.push(...indexTree[key]));
    return indexes;
  };

  files
    .filter(file => path.basename(file) === 'index.ts')
    // deepest index first, because of index to index dependency
    .reverse()
    .forEach(indexFile => {
      const flatIndex = getFlatIndexes();
      indexTree = {
        ...indexTree,
        [indexFile]: files.filter(
          f =>
            // in the same path
            f.startsWith(path.dirname(indexFile)) &&
            // ins't in other index
            flatIndex.every(x => x !== f) &&
            // removing it self
            f !== indexFile,
        ),
      };
    });
  return indexTree;
};
