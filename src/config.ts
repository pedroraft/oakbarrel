import { promises as fs } from 'fs';
import os from 'os';

export interface Config {
  folders: string[]; // relative path list
  ignore?: string; // regex exp
  ignoreMultiDot?: boolean;
}

export let config: Config = {
  folders: ['./src'],
  ignoreMultiDot: true,
};

export const setupConfig = async () => {
  try {
    const file = await fs.readFile('./.oakbarrel.json', { encoding: 'utf8' });
    if (!file) throw new Error();
    config = JSON.parse(file);
  } catch (e) {
    console.log('.oakbarrel.json not found, using default config');
  }
};

export const ROOT_FOLDER = process.cwd();
export const CONCURRENCY = os.cpus().length;
