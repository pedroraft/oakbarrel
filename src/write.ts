import FastGlob from "fast-glob";
import fs from "fs";
import micromatch from "micromatch";
import path from "path";
import { config, FILES_EXTENSIONS } from "./config";

export const buildIndexTree = () => {
  const svgFiles = getFiles(config.foldersSvg, ["svg"]);
  const otherFiles = getFiles(
    config.folders,
    FILES_EXTENSIONS.filter(extension => extension !== "svg")
  );
  const files = [...svgFiles, ...otherFiles].filter(
    f => !config.ignore || !micromatch.isMatch(f, config.ignore)
  );

  return files
    .filter(file => path.basename(file).includes("index."))
    .filter(indexPath => {
      const file = fs.readFileSync(indexPath, { encoding: "utf8" });
      return !/oakbarrel-ignore/g.test(file);
    })
    .reverse()
    .reduce((acc, indexFile) => {
      const filesInOtherIndexes = Object.keys(acc).reduce(
        (indexTree, key) => [...indexTree, ...acc[key]],
        [] as string[]
      );

      return {
        ...acc,
        [indexFile]: files
          .filter(
            f =>
              f !== indexFile &&
              f.startsWith(path.dirname(indexFile)) &&
              !filesInOtherIndexes.find(x => x === f)
          )
          .sort()
      };
    }, {} as Record<string, string[]>);
};

const getFiles = (folders: string[], extensions: string[]) =>
  FastGlob.sync(
    folders.map(folder => path.join(folder, `**/*.{${extensions.join(",")}}`)),
    {
      ignore: ["**/node_modules/*", ...(config.ignore || [])]
    }
  );
