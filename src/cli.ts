import async from 'async';
import micromatch from 'micromatch';
import nsfw, { ActionType } from 'nsfw';
import path from 'path';
import { CONCURRENCY, config, setupConfig } from './config';
import { buildIndexTree } from './finder';
import { writeIndex } from './write';

export const run = async () => {
  await setupConfig();
  console.log(`watching: \n${config.folders.join('\n')}`);
  const folders = config.folders.map((f) => path.resolve(f));
  buildIndexes(folders);
  // await indexes write
  folders.forEach((folder) =>
    setTimeout(() => {
      nsfw(folder, handleFileChange, {
        debounceMS: 300,
      }).then((watcher) => watcher.start()),
        200;
    }),
  );
};

const handleFileChange = async (events: nsfw.ModifiedFileEvent[]) => {
  const safeEvents = events.filter(
    (e, index, self) =>
      (e.file.includes('index.') && e.action !== ActionType.MODIFIED) ||
      (!e.file.includes('index.') &&
        self.findIndex((x) => x.directory === e.directory) === index),
  );
  if (safeEvents.length === 0) return;
  const folders = config.folders.map((f) => path.resolve(f));
  if (safeEvents.some((e) => path.basename(e.file).includes('index.')))
    buildIndexes(folders);
  else {
    const newIndex = buildIndexTree(folders);
    const alteredIndexes: string[] = [];
    safeEvents
      .map((e) => path.join(e.directory, e.file))
      .forEach((f) =>
        Object.keys(newIndex).forEach((key) => {
          if (newIndex[key].includes(f)) alteredIndexes.push(key);
        }),
      );
    const indexes = alteredIndexes.filter(
      (value, index, self) => self.indexOf(value) === index,
    );
    async.eachLimit(
      indexes,
      CONCURRENCY,
      (key, callback) => {
        writeIndex(key, newIndex[key]).then(() => callback());
      },
      (e) => (e ? console.log(e) : undefined),
    );
  }
};

const buildIndexes = (folders: string[]) =>
  async.eachOfLimit(
    buildIndexTree(folders),
    CONCURRENCY,
    (value, key, callback) => {
      writeIndex(key.toString(), value).then(() => callback());
    },
    (e) => (e ? console.log(e) : undefined),
  );
