"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
exports.config = {
    folders: ['./src'],
    ignoreMultiDot: true,
};
exports.setupConfig = async () => {
    try {
        const file = await fs_1.promises.readFile('./.oakbarrel.json', { encoding: 'utf8' });
        if (!file)
            throw new Error();
        exports.config = JSON.parse(file);
    }
    catch (e) {
        console.log('.oakbarrel.json not found, using default config');
    }
};
exports.ROOT_FOLDER = process.cwd();
exports.CONCURRENCY = os_1.default.cpus().length;
exports.TEXT_ON_TOP = `// This is a auto-generated file, do not edit it`;
