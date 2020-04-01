"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_1 = __importDefault(require("async"));
const nsfw_1 = __importDefault(require("nsfw"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const finder_1 = require("./finder");
const write_1 = require("./write");
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
    async_1.default.eachOfLimit(indexes, config_1.CONCURRENCY, (value, key, callback) => {
        write_1.writeIndex(key.toString(), value).then(() => callback());
    }, e => (e ? console.log(e) : undefined));
};
