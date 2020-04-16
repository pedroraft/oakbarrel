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
        .filter(o => o.exportType !== 'IGNORE');
    const indexDir = path_1.default.dirname(indexPath);
    const fowardExports = filesWithOptions
        .filter(f => f.exportType === 'FORWARD')
        .map(f => getIndexExportLine(indexDir, f.path))
        .join('\n');
    const defaultExports = filesWithOptions
        .filter(f => f.exportType === 'DEFAULT')
        .map(f => getDefaultExportLine(indexDir, f.path, f.isReact))
        .join('\n');
    const nameSpaceFiles = filesWithOptions.filter(f => f.exportType === 'NAMESPACE');
    const nameSpaceImports = nameSpaceFiles
        .map(f => getNamedImportLine(path_1.default.dirname(indexPath), f.path, f.isReact))
        .join('\n');
    const nameSpaceExports = getNamedExports(nameSpaceFiles);
    const content = [
        config_1.TEXT_ON_TOP,
        nameSpaceImports,
        nameSpaceExports,
        defaultExports,
        fowardExports,
    ].join('\n');
    return fs_1.promises.writeFile(indexPath, await prettierFormat(content));
};
const prettierFormat = async (content) => {
    const prettierConfigPath = path_1.default.join(config_1.ROOT_FOLDER, '.prettierrc.json');
    const prettierConfig = await fs_1.promises
        .access(prettierConfigPath)
        .then(() => fs_1.promises.readFile(prettierConfigPath, 'utf8'))
        .catch(() => undefined);
    const options = prettierConfig
        ? await prettier_1.default.resolveConfig(await prettierConfig)
        : {};
    return prettier_1.default.format(content, Object.assign(Object.assign({}, options), { parser: 'babel' }));
};
const getIndexExportLine = (indexDir, filePath) => `export * from './${getRelative(indexDir, filePath)}';`;
const getDefaultExportLine = (indexDir, filePath, pascal) => `export { default as ${getNameSpace(filePath, pascal)} } from './${getRelative(indexDir, filePath)}';`;
const getNamedImportLine = (indexDir, filePath, pascal) => `import * as ${getNameSpace(filePath, pascal)} from './${getRelative(indexDir, filePath)}';`;
const getNamedExports = (files) => (files === null || files === void 0 ? void 0 : files.length) > 0
    ? files.reduce((collection, current, index) => {
        let text = '';
        if (index === 0)
            text += 'export {';
        text += `${collection}\n  ${getNameSpace(current.path, current.isReact)},`;
        if (index === files.length - 1)
            text += `\n};`;
        return text;
    }, '')
    : '';
const getRelative = (indexDir, filePath) => path_1.default
    .relative(indexDir, filePath)
    .replace('.tsx', '')
    .replace('.ts', '');
const getNameSpace = (filePath, pascal) => pascal
    ? pascalize(getNameWithoutExt(filePath))
    : camelize(getNameWithoutExt(filePath));
const isReact = (fileContent) => /import React/g.test(fileContent);
const readFileOptions = (filePath) => {
    const fileContent = fs_1.default.readFileSync(filePath, { encoding: 'utf8' });
    return {
        exportType: getExportType(fileContent, filePath),
        isReact: isReact(fileContent),
        path: filePath,
    };
};
const getExportType = (fileContent, filePath) => {
    if (!/export/g.test(fileContent) || /oakbarrel-ignore/g.test(fileContent))
        return 'IGNORE';
    if (fileIsIndex(filePath) && !/oakbarrel/g.test(fileContent))
        return 'FORWARD';
    const isNameSpace = /oakbarrel-namespace/g.test(fileContent);
    const isForward = /oakbarrel-forward/g.test(fileContent);
    if ((/export default/g.test(fileContent) && !isNameSpace && !isForward) ||
        /oakbarrel-default/g.test(fileContent))
        return 'DEFAULT';
    if ((isNameSpace || isReact) && !isForward)
        return 'NAMESPACE';
    return 'FORWARD';
};
const fileIsIndex = (filePath) => path_1.default.basename(filePath) === 'index.ts';
const getNameWithoutExt = (filePath) => path_1.default.basename(filePath).split('.')[0];
const camelize = (str) => str
    .replace(/[\W_]$/, '')
    .replace(/[\W_]([a-zA-Z0-9])/g, (_, x) => x.toUpperCase());
const pascalize = (str) => str.substr(0, 1).toUpperCase() + camelize(str.substr(1));
