import syncFs, { promises as fs } from 'fs';
import path from 'path';
import prettier from 'prettier';
import { ROOT_FOLDER } from './config';

export const writeIndex = async (indexPath: string, files?: string[]) => {
  if (!files?.length) return;
  const indexDir = path.dirname(indexPath);
  const indexExports = files
    .filter(f => fileIsIndex(f))
    .map(f => getIndexExportLine(indexDir, f))
    .join('\n');
  const defaultExports = files
    .filter(f => !fileIsIndex(f) && fileHasDefault(f))
    .map(f => getDefaultExportLine(indexDir, f))
    .join('\n');
  const namedFiles = files.filter(f => !fileIsIndex(f) && !fileHasDefault(f));
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
  const content = [
    `// This is a auto-generated file, do not edit it`,
    namedImports,
    '',
    namedExports,
    '',
    defaultExports,
    '',
    indexExports,
  ].join('\n');
  const prettierConfigPath = path.join(ROOT_FOLDER, '.prettierrc.json');
  const prettierConfig = await fs
    .access(prettierConfigPath)
    .then(() => fs.readFile(prettierConfigPath, 'utf8'))
    .catch(() => undefined);

  const options = prettierConfig
    ? await prettier.resolveConfig(await prettierConfig)
    : {};
  const formatted = prettier.format(content, { ...options, parser: 'babel' });
  return fs.writeFile(indexPath, formatted);
};

const getIndexExportLine = (indexDir: string, filePath: string) =>
  `export * from './${getRelative(indexDir, filePath)}';`;

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

// TODO: this relace can be simplified
const getRelative = (indexDir: string, filePath: string) =>
  path
    .relative(indexDir, filePath)
    .replace('.tsx', '')
    .replace('.ts', '');

const getCamelizedName = (filePath: string) =>
  camelize(getNameWithoutExt(filePath));

const fileHasDefault = (filePath: string) => {
  try {
    const file = syncFs.readFileSync(filePath, { encoding: 'utf8' });
    // using regex because ts-morph was to slow
    return /export default/g.test(file);
  } catch (e) {
    return false;
  }
};

const fileIsIndex = (filePath: string) =>
  path.basename(filePath) === 'index.ts';

const getNameWithoutExt = (filePath: string) =>
  path.basename(filePath).split('.')[0];

// TODO: this relace can be simplified
const camelize = (str: string) =>
  str
    .replace(/-/g, ' ')
    .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, match =>
      +match === 0 ? '' : match.toUpperCase(),
    );
