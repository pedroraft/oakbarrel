"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
exports.config = {
    folders: ['./src'],
};
exports.setupConfig = async () => {
    const file = await fs_1.promises.readFile('./.oakbarrel.json', { encoding: 'utf8' });
    if (!file) {
        console.log('.oakbarrel.json not found, using default config');
        return;
    }
    exports.config = JSON.parse(file);
};
exports.ROOT_FOLDER = process.cwd();
exports.CONCURRENCY = os_1.default.cpus().length;
exports.TEXT_ON_TOP = `// This is a auto-generated file, do not edit it`;
exports.FILES_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'];
exports.INDEX_GLOB = `index.{${exports.FILES_EXTENSIONS.join('\n')}}`;
