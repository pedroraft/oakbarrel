import async from 'async';
import micromatch from 'micromatch';
import nsfw, { ActionType } from 'nsfw';
import path from 'path';
import { CONCURRENCY, config, INDEX_GLOB, setupConfig } from './config';
import { buildIndexTree } from './finder';
import { writeIndex } from './write';

export const run = async () => {
  await setupConfig();
  console.log(
    `reading ${config.folders.join(', ')} with ${CONCURRENCY} threads`,
  );
  const folders = config.folders.map(f => path.resolve(f));
  buildIndexes(folders);
  console.log('FINISHED INITIAL BUILD');
  // await indexes write
  folders.forEach(folder =>
    setTimeout(() => {
      console.log('watching', folder);
      nsfw(folder, handleFileChange, {
        debounceMS: 300,
      }).then(watcher => watcher.start()),
        200;
    }),
  );
};

const handleFileChange = async (events: nsfw.ModifiedFileEvent[]) => {
  const safeEvents = events.filter(
    (e, index, self) =>
      ((micromatch.isMatch(e.file, INDEX_GLOB) &&
        e.action !== ActionType.MODIFIED) ||
        !micromatch.isMatch(e.file, INDEX_GLOB)) &&
      self.findIndex(x => x.directory === e.directory) === index,
  );
  if (safeEvents.length === 0) return;
  console.log('EVENT DETECTED');
  const folders = config.folders.map(f => path.resolve(f));
  if (
    safeEvents.some(e => micromatch.isMatch(path.basename(e.file), INDEX_GLOB))
  )
    buildIndexes(folders);
  else {
    const newIndex = buildIndexTree(folders);
    const alteredIndexes: string[] = [];
    safeEvents
      .map(e => path.join(e.directory, e.file))
      .forEach(f =>
        Object.keys(newIndex).forEach(key => {
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
      e => (e ? console.log(e) : console.log('FINISHED UPDATE', new Date())),
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
    e => (e ? console.log(e) : undefined),
  );
