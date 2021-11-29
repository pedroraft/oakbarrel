"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const prettier_1 = __importDefault(require("prettier"));
const config_1 = require("./config");
exports.writeIndex = async (indexPath, files) => {
    const content = [
        config_1.TEXT_ON_TOP,
        files.map((f) => getIndexExportLine(path_1.default.dirname(indexPath), f)).join('\n'),
    ].join('\n');
    return fs_1.promises.writeFile(indexPath, await prettierFormat(content));
};
const prettierFormat = async (content) => {
    const options = (await prettier_1.default.resolveConfig(config_1.ROOT_FOLDER)) || {};
    return prettier_1.default.format(content, Object.assign(Object.assign({}, options), { parser: 'babel' }));
};
const getIndexExportLine = (indexDir, filePath) => `export * from './${getRelative(indexDir, filePath)}';`;
const getRelative = (indexDir, filePath) => path_1.default.relative(indexDir, filePath).replace(/\.[0-9a-z]+$/i, '');
