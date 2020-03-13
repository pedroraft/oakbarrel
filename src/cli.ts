import fastGlob from 'fast-glob';
import fs from 'fs';
import os from 'os';
import path from 'path';
import prettier from 'prettier';
import { Project } from 'ts-morph';
import nsfw, { ActionType } from 'nsfw';

type exportType = 'named' | 'default';
type fileExportType = { [file: string]: exportType };
const project = new Project();
const CONCURRENCY = os.cpus().length;

// const mockFolder = path.join(process.cwd(), 'testfolder');
const mockFolder = '/Users/Pedroraft/Documents/v2/src';
console.log(mockFolder);

const IGNORE_MULTI_DOT: string[] | boolean | undefined = true;

export const run = () => {
  project.addSourceFilesAtPaths(path.join(mockFolder, '**/*.{ts,tsx}'));
  buildIndexes();
  // await indexes write
  setTimeout(
    () =>
      nsfw(
        mockFolder,
        events => {
          const safeEvents = events.filter(
            (e: any) =>
              (e.file === 'index.ts' && e.action !== ActionType.MODIFIED) ||
              e.file !== 'index.ts',
          );
          if (safeEvents.find((e: any) => e.file === 'index.ts'))
            buildIndexes();
          else {
            const newIndex = buildIndexTree(getFiles());
            const alteredIndexes: string[] = [];
            safeEvents
              .map((e: any) => path.join(e.directory, e.file))
              .forEach(f =>
                Object.keys(newIndex).forEach(key => {
                  if (newIndex[key].includes(f)) alteredIndexes.push(key);
                }),
              );
            alteredIndexes
              .filter((value, index, self) => self.indexOf(value) === index)
              .forEach(key => writeIndex(key, newIndex[key]));
          }
        },
        { debounceMS: 200 },
      ).then(watcher => watcher.start()),
    200,
  );
};

const buildIndexes = () => {
  const files = getFiles();
  const indexes = buildIndexTree(files);
  Object.keys(indexes).forEach(key => writeIndex(key, indexes[key]));
};

const writeIndex = (indexPath: string, files?: string[]) => {
  if (!files?.length) return;
  const indexDir = path.dirname(indexPath);
  const defaultExports = files
    .filter(f => fileHasDefault(f))
    .map(f => getDefaultExportLine(indexDir, f))
    .join('\n');
  const namedFiles = files.filter(f => !fileHasDefault(f));
  const namedImports = namedFiles
    .map(f => getNamedImportLine(path.dirname(indexPath), f))
    .join('\n');
  const namedExports =
    namedFiles?.length > 0
      ? namedFiles.reduce((collection, current, index) => {
          let text = '';
          if (index === 0) text += 'export {';
          text += `${collection}\n  ${getCamelizedName(current)},`;
          if (index === namedFiles.length - 1) text += `\n};`;
          return text;
        }, '')
      : '';
  const content = [namedImports, '', namedExports, '', defaultExports, ''].join(
    '\n',
  );
  // const pretty = prettier.format(content);
  fs.writeFileSync(indexPath, content);
};

const getNameWithoutExt = (filePath: string) =>
  path.basename(filePath).split('.')[0];

const camelize = (str: string) =>
  str
    .replace(/-/g, ' ')
    .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, match =>
      +match === 0 ? '' : match.toUpperCase(),
    );

const getRelative = (indexDir: string, filePath: string) =>
  path
    .relative(indexDir, filePath)
    .replace('.tsx', '')
    .replace('.ts', '');

const getCamelizedName = (filePath: string) =>
  camelize(getNameWithoutExt(filePath));

const getDefaultExportLine = (indexDir: string, filePath: string) =>
  `export { default as ${getCamelizedName(filePath)} } from './${getRelative(
    indexDir,
    filePath,
  )}';`;

const getNamedImportLine = (indexDir: string, filePath: string) =>
  `import * as ${getCamelizedName(filePath)} from './${getRelative(
    indexDir,
    filePath,
  )}';`;

const fileHasDefault = (filePath: string) => {
  try {
    const exports = project.getSourceFile(filePath).getExportedDeclarations();
    return exports.has('default');
  } catch (e) {
    return false;
  }
};

const getFiles = () => {
  const entries = fastGlob.sync([path.join(mockFolder, '**/*.{ts,tsx}')], {
    dot: false,
    ignore: ['**/node_modules/*'],
  });
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
