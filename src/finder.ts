import FastGlob from "fast-glob";
import syncFs from "fs";
import micromatch from "micromatch";
import path from "path";
import { config, FILES_EXTENSIONS } from "./config";

export const buildIndexTree = () => {
  const svgFiles = getSvgFiles(config.foldersSvg);
  const otherFiles = getFiles(config.folders).filter(
    f => !config.ignore || !micromatch.isMatch(f, config.ignore)
  );

  const files = [...svgFiles, ...otherFiles];

  return files
    .filter(file => path.basename(file).includes("index."))
    .filter(indexPath => {
      const file = syncFs.readFileSync(indexPath, { encoding: "utf8" });
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

const getFiles = (folders: string[]) =>
  FastGlob.sync(
    folders.map(
      folder => path.join(folder, `**/*.{${FILES_EXTENSIONS.join(",")}}`),
      {
        ignore: ["**/node_modules/*", ...(config.ignore || [])]
      }
    )
  );

const getSvgFiles = (folders: string[]) =>
  FastGlob.sync(
    folders.map(folder => path.join(folder, "**/*.svg")),
    {
      ignore: ["**/node_modules/*", ...(config.ignore || [])]
    }
  );
