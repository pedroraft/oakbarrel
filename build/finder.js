"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const fast_glob_1 = __importDefault(require("fast-glob"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
exports.buildIndexTree = (folders) => {
    let indexTree = {};
    const files = getFiles(folders);
    const getFlatIndexes = () => {
        let indexes = [];
        Object.keys(indexTree).forEach(key => indexes.push(...indexTree[key]));
        return indexes;
    };
    files
        .filter(file => path_1.default.basename(file) === 'index.ts')
        .filter(indexPath => {
        const file = fs_1.default.readFileSync(indexPath, { encoding: 'utf8' });
        return !/oakbarrel-ignore/g.test(file);
    })
        .reverse()
        .forEach(indexFile => {
        const flatIndex = getFlatIndexes();
        indexTree = Object.assign(Object.assign({}, indexTree), { [indexFile]: files
                .filter(f => f !== indexFile &&
                f.startsWith(path_1.default.dirname(indexFile)) &&
                flatIndex.every(x => x !== f))
                .sort() });
    });
    return indexTree;
};
const getFiles = (folders) => {
    const entries = fast_glob_1.default.sync(folders.map(folder => path_1.default.join(folder, '**/*.{ts,tsx}')), {
        dot: false,
        ignore: ['**/node_modules/*'],
    });
    return filterMultidot(entries);
};
const filterMultidot = (files) => config_1.config.ignoreMultiDot || config_1.config.ignore
    ? files.filter(filePath => {
        const nameArray = path_1.default.basename(filePath).split('.');
        if (nameArray.length === 2)
            return true;
        if (config_1.config.ignoreMultiDot && nameArray.length === 3)
            return false;
        if (config_1.config.ignore) {
            const regex = new RegExp(config_1.config.ignore);
            return regex.test(path_1.default.basename(filePath));
        }
    })
    : files;
