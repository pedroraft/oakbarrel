"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const prettier_1 = __importDefault(require("prettier"));
const config_1 = require("./config");
exports.writeIndex = async (indexPath, files) => {
    if (!(files === null || files === void 0 ? void 0 : files.length))
        return;
    const filesWithOptions = files
        .map(f => readFileOptions(f))
        .filter(o => !o.doNotExport);
    const indexDir = path_1.default.dirname(indexPath);
    const fowardExports = filesWithOptions
        .filter(f => fileIsIndex(f.path) ||
        (f.exportAll && !f.exportDefault && !f.exportNamed))
        .map(f => getIndexExportLine(indexDir, f.path))
        .join('\n');
    const defaultExports = filesWithOptions
        .filter(f => (!fileIsIndex(f.path) && f.defaultExport) ||
        (!f.exportAll && f.exportDefault && !f.exportNamed))
        .map(f => getDefaultExportLine(indexDir, f.path))
        .join('\n');
    const namedFiles = filesWithOptions.filter(f => (!fileIsIndex(f.path) && !f.defaultExport) ||
        (!f.exportAll && !f.exportDefault && f.exportNamed));
    const namedImports = namedFiles
        .map(f => getNamedImportLine(path_1.default.dirname(indexPath), f.path))
        .join('\n');
    const namedExports = (namedFiles === null || namedFiles === void 0 ? void 0 : namedFiles.length) > 0
        ? namedFiles.reduce((collection, current, index) => {
            let text = '';
            if (index === 0)
                text += 'export {';
            text += `${collection}\n  ${getCamelizedName(current.path)},`;
            if (index === namedFiles.length - 1)
                text += `\n};`;
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
    const prettierConfigPath = path_1.default.join(config_1.ROOT_FOLDER, '.prettierrc.json');
    const prettierConfig = await fs_1.promises
        .access(prettierConfigPath)
        .then(() => fs_1.promises.readFile(prettierConfigPath, 'utf8'))
        .catch(() => undefined);
    const options = prettierConfig
        ? await prettier_1.default.resolveConfig(await prettierConfig)
        : {};
    const formatted = prettier_1.default.format(content, Object.assign(Object.assign({}, options), { parser: 'babel' }));
    return fs_1.promises.writeFile(indexPath, formatted);
};
const getIndexExportLine = (indexDir, filePath) => `export * from './${getRelative(indexDir, filePath)}';`;
const getDefaultExportLine = (indexDir, filePath) => `export { default as ${getCamelizedName(filePath)} } from './${getRelative(indexDir, filePath)}';`;
const getNamedImportLine = (indexDir, filePath) => `import * as ${getCamelizedName(filePath)} from './${getRelative(indexDir, filePath)}';`;
const getRelative = (indexDir, filePath) => path_1.default
    .relative(indexDir, filePath)
    .replace('.tsx', '')
    .replace('.ts', '');
const getCamelizedName = (filePath) => camelize(getNameWithoutExt(filePath));
const readFileOptions = (filePath) => {
    const file = fs_1.default.readFileSync(filePath, { encoding: 'utf8' });
    return {
        defaultExport: /export default/g.test(file),
        doNotExport: /oakbarrel-ignore/g.test(file),
        exportAll: /oakbarrel-all/g.test(file),
        exportNamed: /oakbarrel-named/g.test(file),
        exportDefault: /oakbarrel-default/g.test(file),
        hasExport: /export/g.test(file),
        path: filePath,
    };
};
const fileIsIndex = (filePath) => path_1.default.basename(filePath) === 'index.ts';
const getNameWithoutExt = (filePath) => path_1.default.basename(filePath).split('.')[0];
const camelize = (str) => str
    .replace(/-/g, ' ')
    .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, match => +match === 0 ? '' : match.toUpperCase());
