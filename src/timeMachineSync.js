const path = require("path");
const fs = require("fs").promises;

/**
 *
 *
 * @param {string} pathName
 * @returns
 */
async function lastDir(pathName) {
  pathName = path.resolve(pathName);
  let rsp = pathName;
  list = await fs.readdir(pathName);
  for (const file of list) {
    const filePath = path.join(pathName, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      if (filePath > rsp) {
        rsp = filePath;
      }
    }
  }
  return rsp;
}

/**
 *
 *
 * @param {string} pathName
 * @returns
 */
function nowString(pathName) {
  pathName = path.resolve(pathName);
  const now = new Date();
  return path.join(
    pathName,
    now
      .toISOString()
      .substring(0, 19)
      .replace(/[^0-9]/g, "")
  );
}

/**
 *
 *
 * @param {string} destinyName
 * @returns
 */
async function destinyFactory(destinyName) {
  destinyName = path.resolve(destinyName);
  const rsp = [];
  rsp[0] = await lastDir(destinyName);
  rsp[1] = nowString(destinyName);
  return rsp;
}

/**
 *
 *
 * @param {string} pathRoot
 * @param {string} pathRelative
 * @param {string} fileName
 * @returns {object} path, fileName, fileFull, stats, isEqual
 */
async function fileFactory(pathRoot, pathRelative, fileName) {
  const me = {};
  me.pathRoot = path.resolve(pathRoot);
  me.pathRelative = pathRelative;
  me.pathFull = path.resolve(pathRoot, pathRelative);
  me.fileName = fileName;
  me.fileFull = path.join(me.pathFull, me.fileName);
  me.stats = await fs.stat(me.fileFull);
  me.isEqual = (file) => {
    return true;
  };

  me.link = async (dirDestinyName) => {
    const dirDestinyNameFull = path.join(dirDestinyName, me.pathRelative);
    try {
      await fs.mkdir(dirDestinyNameFull, { recursive: true });
      await fs.link(me.fileFull, path.join(dirDestinyNameFull, me.fileName));
      return `linkando ${me.fileFull} ${dirDestinyNameFull}`;
    } catch (error) {
      return `Erro linkando ${me.fileFull}  ${dirDestinyNameFull} ${error.message}`;
    }
  };

  me.copy = async (dirDestinyName) => {
    const dirDestinyNameFull = path.join(dirDestinyName, me.pathRelative);
    try {
      await fs.mkdir(dirDestinyNameFull, { recursive: true });
      await fs.copyFile(
        me.fileFull,
        path.join(dirDestinyNameFull, me.fileName)
      );
      await fs.utimes(
        path.join(dirDestinyNameFull, me.fileName),
        me.stats.atime,
        me.stats.mtime
      );
      return `copiando ${me.fileFull} ${dirDestinyNameFull}`;
    } catch (error) {
      return `Erro copiando ${me.fileFull}  ${dirDestinyNameFull} ${error.message}`;
    }
  };
  return me;
}

/**
 *
 *
 * @param {string} pathRoot
 * @param {string} [pathRelative="."]
 * @returns
 */
async function dirFactory(pathRoot, pathRelative = ".") {
  let me = [];

  pathRoot = path.resolve(pathRoot);
  const pathAbsolute = path.join(pathRoot, pathRelative);

  list = await fs.readdir(pathAbsolute);
  for (const filename of list) {
    const file = await fileFactory(pathRoot, pathRelative, filename);
    if (file.stats.isDirectory()) {
      const subDir = await dirFactory(pathAbsolute, filename);
      me = me.concat(subDir);
    } else {
      me.push(file);
    }
  }
  me.findEqual = (fileDir) => {
    return me.find((item) => {
      const rsp =
        item.fileName === fileDir.fileName &&
        item.pathRelative === fileDir.pathRelative &&
        Math.abs(item.stats.mtimeMs - fileDir.stats.mtimeMs) < 10;

      return rsp;
    });
  };

  me.sync = async (destinyName) => {
    const log = [];
    destinyName = path.resolve(destinyName);
    const destinyNames = await destinyFactory(destinyName);
    const dirDestino = await dirFactory(destinyNames[0]);
    for (const item of me) {
      // console.log("me.sync -> item", item);
      const fileDestiny = dirDestino.findEqual(item);
      // console.log("me.sync -> fileDestiny", fileDestiny);
      if (fileDestiny === undefined) {
        log.push(await item.copy(destinyNames[1]));
      } else {
        log.push(await fileDestiny.link(destinyNames[1]));
      }
    }
    return log;
  };

  return me;
}

async function timeMachine(origem, destino) {
  origem = path.resolve(origem);
  destino = path.resolve(destino);

  const dirOrigem = await dirFactory(origem);
  return await dirOrigem.sync(destino);
}

const origem = process.argv[2];
const destino = process.argv[3];

console.log("Time Machine");
console.log(origem, " -> ", destino);

timeMachine(origem, destino).then((log) => console.log(log));

module.exports = timeMachine;
