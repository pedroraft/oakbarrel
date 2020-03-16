import async from 'async';
import nsfw, { ActionType } from 'nsfw';
import path from 'path';
import { CONCURRENCY, config, setupConfig } from './config';
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

const handleFileChange = async (events: any[]) => {
  const safeEvents = events
    .filter(
      (e: any) =>
        (e.file === 'index.ts' && e.action !== ActionType.MODIFIED) ||
        e.file !== 'index.ts',
    )
    .filter(
      (value: any, index, self) =>
        self.findIndex((x: any) => x.directory === value.directory) === index,
    );
  if (safeEvents.length === 0) return;
  console.log('EVENT DETECTED');
  const folders = config.folders.map(f => path.resolve(f));
  if (safeEvents.some((e: any) => e.file === 'index.ts')) buildIndexes(folders);
  else {
    const newIndex = buildIndexTree(folders);
    const alteredIndexes: string[] = [];
    safeEvents
      .map((e: any) => path.join(e.directory, e.file))
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

const buildIndexes = (folders: string[]) => {
  const indexes = buildIndexTree(folders);
  async.eachOfLimit(
    indexes,
    CONCURRENCY,
    (value, key, callback) => {
      writeIndex(key.toString(), value).then(() => callback());
    },
    e => (e ? console.log(e) : undefined),
  );
};
