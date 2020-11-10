"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = __importDefault(require("async"));
const nsfw_1 = __importDefault(require("nsfw"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const finder_1 = require("./finder");
const write_1 = require("./write");
const fs_1 = __importStar(require("fs"));
const hjson_1 = __importDefault(require("hjson"));
exports.run = async () => {
    await config_1.setupConfig();
    console.log(`reading ${config_1.config.folders.join(', ')} with ${config_1.CONCURRENCY} threads`);
    const folders = config_1.config.folders.map(f => path_1.default.resolve(f));
    buildIndexes(folders);
    console.log('FINISHED INITIAL BUILD');
    folders.forEach(folder => setTimeout(() => {
        console.log('watching', folder);
        nsfw_1.default(folder, handleFileChange, {
            debounceMS: 300,
        }).then(watcher => watcher.start()),
            200;
    }));
};
const handleFileChange = async (events) => {
    const safeEvents = events
        .filter((e) => (e.file === 'index.ts' && e.action !== 2) ||
        e.file !== 'index.ts')
        .filter((value, index, self) => self.findIndex((x) => x.directory === value.directory) === index);
    if (safeEvents.length === 0)
        return;
    console.log('EVENT DETECTED');
    const folders = config_1.config.folders.map(f => path_1.default.resolve(f));
    if (safeEvents.some((e) => e.file === 'index.ts'))
        buildIndexes(folders);
    else {
        const newIndex = finder_1.buildIndexTree(folders);
        const alteredIndexes = [];
        safeEvents
            .map((e) => path_1.default.join(e.directory, e.file))
            .forEach(f => Object.keys(newIndex).forEach(key => {
            if (newIndex[key].includes(f))
                alteredIndexes.push(key);
        }));
        const indexes = alteredIndexes.filter((value, index, self) => self.indexOf(value) === index);
        async_1.default.eachLimit(indexes, config_1.CONCURRENCY, (key, callback) => {
            write_1.writeIndex(key, newIndex[key]).then(() => callback());
        }, e => (e ? console.log(e) : console.log('FINISHED UPDATE', new Date())));
    }
};
const buildIndexes = (folders) => {
    const indexes = finder_1.buildIndexTree(folders);
    buildImportPaths(indexes);
    async_1.default.eachOfLimit(indexes, config_1.CONCURRENCY, (value, key, callback) => {
        write_1.writeIndex(key.toString(), value).then(() => callback());
    }, e => (e ? console.log(e) : undefined));
};
const buildImportPaths = async (indexes) => {
    const indexesRelatives = Object.keys(indexes).reduce((acc, x) => {
        return Object.assign(Object.assign({}, acc), { [`@${path_1.default.relative(config_1.ROOT_FOLDER, x).split(path_1.default.sep)[1]}`]: [
                `.${path_1.default.sep}${path_1.default.dirname(path_1.default.relative(config_1.ROOT_FOLDER, x))}`,
            ] });
    }, {});
    const tsconfigPath = path_1.default.join(config_1.ROOT_FOLDER, 'tsconfig.json');
    const file = fs_1.default.readFileSync(tsconfigPath, { encoding: 'utf8' });
    const tsconfig = hjson_1.default.rt.parse(file);
    tsconfig.compilerOptions.paths = indexesRelatives;
    fs_1.promises.writeFile(tsconfigPath, hjson_1.default.rt.stringify(tsconfig, {
        quotes: 'all',
        separator: true,
    }));
};
