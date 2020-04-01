import syncFs, { promises as fs } from 'fs';
import path from 'path';
import prettier from 'prettier';
import { ROOT_FOLDER } from './config';

export const writeIndex = async (indexPath: string, files?: string[]) => {
  if (!files?.length) return;
  const filesWithOptions = files
    .map(f => readFileOptions(f))
    .filter(o => !o.doNotExport);
  const indexDir = path.dirname(indexPath);
  const fowardExports = filesWithOptions
    .filter(
      f =>
        fileIsIndex(f.path) ||
        (f.exportAll && !f.exportDefault && !f.exportNamed),
    )
    .map(f => getIndexExportLine(indexDir, f.path))
    .join('\n');
  const defaultExports = filesWithOptions
    .filter(
      f =>
        (!fileIsIndex(f.path) && f.defaultExport) ||
        (!f.exportAll && f.exportDefault && !f.exportNamed),
    )
    .map(f => getDefaultExportLine(indexDir, f.path))
    .join('\n');
  const namedFiles = filesWithOptions.filter(
    f =>
      (!fileIsIndex(f.path) && !f.defaultExport) ||
      (!f.exportAll && !f.exportDefault && f.exportNamed),
  );
  const namedImports = namedFiles
    .map(f => getNamedImportLine(path.dirname(indexPath), f.path))
    .join('\n');
  const namedExports =
    namedFiles?.length > 0
      ? namedFiles.reduce((collection, current, index) => {
          let text = '';
          if (index === 0) text += 'export {';
          text += `${collection}\n  ${getCamelizedName(current.path)},`;
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
    fowardExports,
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

const readFileOptions = (filePath: string) => {
  const file = syncFs.readFileSync(filePath, { encoding: 'utf8' });
  return {
    // using regex because ts-morph was to slow
    defaultExport: /export default/g.test(file),
    doNotExport: /oakbarrel-ignore/g.test(file),
    exportAll: /oakbarrel-all/g.test(file),
    exportNamed: /oakbarrel-named/g.test(file),
    exportDefault: /oakbarrel-default/g.test(file),
    hasExport: /export/g.test(file),
    path: filePath,
  };
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
