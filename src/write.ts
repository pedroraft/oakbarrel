import { promises as fs } from "fs";
import path from "path";
import prettier from "prettier";
import { ROOT_FOLDER, TEXT_ON_TOP } from "./config";

export const writeIndex = async (indexPath: string, files?: string[]) => {
  const content = [
    TEXT_ON_TOP,
    files
      .map(f => {
        if (f.endsWith(".svg"))
          return getIndexExportSvg(path.dirname(indexPath), f);
        return getIndexExportLine(path.dirname(indexPath), f);
      })
      .join("\n")
  ].join("\n");

  return fs.writeFile(indexPath, await prettierFormat(content));
};

const prettierFormat = async (content: string): Promise<string> => {
  const options = (await prettier.resolveConfig(ROOT_FOLDER)) || {};
  return prettier.format(content, { ...options, parser: "babel" });
};

const getIndexExportLine = (indexDir: string, filePath: string) =>
  `export * from './${getRelative(indexDir, filePath)}';`;

const getIndexExportSvg = (indexDir: string, filePath: string) => {
  const filePathArray = filePath.split("/");
  const fileName = filePathArray[filePathArray.length - 1].split(".")[0];
  return `export * as ${fileName} from './${getRelative(indexDir, filePath)}';`;
};

const getRelative = (indexDir: string, filePath: string) =>
  path.relative(indexDir, filePath).replace(/\.[0-9a-z]+$/i, "");
