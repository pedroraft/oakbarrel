import syncFs, { promises as fs } from 'fs';
import path from 'path';
import prettier from 'prettier';
import { ROOT_FOLDER, TEXT_ON_TOP } from './config';

export const writeIndex = async (indexPath: string, files?: string[]) => {
  if (!files?.length) return;
  const filesWithOptions = files
    .map(f => readFileOptions(f))
    .filter(o => o.exportType !== 'IGNORE');
  const indexDir = path.dirname(indexPath);
  const fowardExports = filesWithOptions
    .filter(f => f.exportType === 'FORWARD')
    .map(f => getIndexExportLine(indexDir, f.path))
    .join('\n');
  const defaultExports = filesWithOptions
    .filter(f => f.exportType === 'DEFAULT')
    .map(f => getDefaultExportLine(indexDir, f.path, f.isReact))
    .join('\n');
  const nameSpaceFiles = filesWithOptions.filter(
    f => f.exportType === 'NAMESPACE',
  );
  const nameSpaceImports = nameSpaceFiles
    .map(f => getNamedImportLine(path.dirname(indexPath), f.path, f.isReact))
    .join('\n');

  const nameSpaceExports = getNamedExports(nameSpaceFiles);

  const content = [
    TEXT_ON_TOP,
    nameSpaceImports,
    nameSpaceExports,
    defaultExports,
    fowardExports,
  ].join('\n');

  return fs.writeFile(indexPath, await prettierFormat(content));
};

const prettierFormat = async (content: string): Promise<string> => {
  const prettierConfigPath = path.join(ROOT_FOLDER, '.prettierrc.json');
  const prettierConfig = await fs
    .access(prettierConfigPath)
    .then(() => fs.readFile(prettierConfigPath, 'utf8'))
    .catch(() => undefined);

  const options = prettierConfig
    ? await prettier.resolveConfig(await prettierConfig)
    : {};
  return prettier.format(content, { ...options, parser: 'babel' });
};

const getIndexExportLine = (indexDir: string, filePath: string) =>
  `export * from './${getRelative(indexDir, filePath)}';`;

const getDefaultExportLine = (
  indexDir: string,
  filePath: string,
  pascal: boolean,
) =>
  `export { default as ${getNameSpace(
    filePath,
    pascal,
  )} } from './${getRelative(indexDir, filePath)}';`;

const getNamedImportLine = (
  indexDir: string,
  filePath: string,
  pascal: boolean,
) =>
  `import * as ${getNameSpace(filePath, pascal)} from './${getRelative(
    indexDir,
    filePath,
  )}';`;

const getNamedExports = (files: ReturnType<typeof readFileOptions>[]): string =>
  files?.length > 0
    ? files.reduce((collection, current, index) => {
        let text = '';
        if (index === 0) text += 'export {';
        text += `${collection}\n  ${getNameSpace(
          current.path,
          current.isReact,
        )},`;
        if (index === files.length - 1) text += `\n};`;
        return text;
      }, '')
    : '';

// TODO: this relace can be simplified
const getRelative = (indexDir: string, filePath: string) =>
  path
    .relative(indexDir, filePath)
    .replace('.tsx', '')
    .replace('.ts', '');

const getNameSpace = (filePath: string, pascal?: boolean) =>
  pascal
    ? pascalize(getNameWithoutExt(filePath))
    : camelize(getNameWithoutExt(filePath));

type ExportType = 'DEFAULT' | 'FORWARD' | 'IGNORE' | 'NAMESPACE';

// i know this is not fool proof
const isReact = (fileContent: string): boolean =>
  /import React/g.test(fileContent);

const readFileOptions = (filePath: string) => {
  const fileContent = syncFs.readFileSync(filePath, { encoding: 'utf8' });
  return {
    exportType: getExportType(fileContent, filePath),
    isReact: isReact(fileContent),
    path: filePath,
  };
};

const getExportType = (fileContent: string, filePath: string): ExportType => {
  // using regex because ts-morph was too slow

  if (!/export/g.test(fileContent) || /oakbarrel-ignore/g.test(fileContent))
    return 'IGNORE';
  if (fileIsIndex(filePath) && !/oakbarrel/g.test(fileContent))
    return 'FORWARD';

  const isNameSpace = /oakbarrel-namespace/g.test(fileContent);
  const isForward = /oakbarrel-forward/g.test(fileContent);
  if (
    (/export default/g.test(fileContent) && !isNameSpace && !isForward) ||
    /oakbarrel-default/g.test(fileContent)
  )
    return 'DEFAULT';
  if ((isNameSpace || isReact) && !isForward) return 'NAMESPACE';
  return 'FORWARD';
};

const fileIsIndex = (filePath: string) =>
  path.basename(filePath) === 'index.ts';

const getNameWithoutExt = (filePath: string) =>
  path.basename(filePath).split('.')[0];

// TODO: this relace can be simplified
const camelize = (str: string) =>
  str
    .replace(/[\W_]$/, '')
    .replace(/[\W_]([a-zA-Z0-9])/g, (_, x) => x.toUpperCase());

const pascalize = (str: string) =>
  str.substr(0, 1).toUpperCase() + camelize(str.substr(1));
