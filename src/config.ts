import { promises as fs } from 'fs';
import os from 'os';

export interface Config {
  folders: string[]; // relative path list
  ignore?: string[]; // glob
}

export let config: Config = {
  folders: ['./src'],
};

export const setupConfig = async () => {
  const file = await fs.readFile('./.oakbarrel.json', { encoding: 'utf8' });
  if (!file) {
    console.log('.oakbarrel.json not found, using default config');
    return;
  }
  config = JSON.parse(file);
};

export const ROOT_FOLDER = process.cwd();
export const CONCURRENCY = os.cpus().length;

export const TEXT_ON_TOP = `// This is a auto-generated file, do not edit it`;

export const FILES_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'];
export const INDEX_GLOB = `index.{${FILES_EXTENSIONS.join('\n')}}`;
