const {
  app,
  BrowserWindow,
  ipcMain,
  Menu
} = require("electron");

const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const {
  execFile
} = require("child_process");

const {
  Readable
} = require("stream");

const extract = require("extract-zip");

const {
  Version,
  diagnose
} = require("@xmcl/core");

const {
  getVersionList,
  installTask,
  installForge,
  installDependencies
} = require("@xmcl/installer");

const {
  createMicrosoftAuth
} = require("./services/microsoftAuth");


/* =========================================================
   CARPETA DE ELECTRON

   Los caches de Electron irán dentro de:
   CloudyLauncher/electron
========================================================= */

const CLOUDY_ROOT =
  path.join(
    app.getPath("appData"),
    "CloudyLauncher"
  );

app.setPath(
  "userData",
  path.join(
    CLOUDY_ROOT,
    "electron"
  )
);


/* =========================================================
   CONSTANTES
========================================================= */

const DEFAULT_RAM_MB = 8192;

const MIN_RAM_MB = 4096;

const MAX_RAM_CAP_MB = 32768;


/* =========================================================
   VENTANA
========================================================= */

function createWindow() {

  const mainWindow =
    new BrowserWindow({
      width: 1200,
      height: 750,

      minWidth: 1000,
      minHeight: 650,

      backgroundColor: "#080c18",

      title: "CloudyLauncher",

      webPreferences: {

        preload:
          path.join(
            __dirname,
            "preload.js"
          ),

        contextIsolation: true,

        nodeIntegration: false,

        sandbox: true

      }
    });


  mainWindow.setMenuBarVisibility(
    false
  );


  mainWindow.loadFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

}


/* =========================================================
   RUTAS
========================================================= */

function getCloudyRoot() {

  return CLOUDY_ROOT;

}


function getMinecraftRoot() {

  return path.join(
    getCloudyRoot(),
    "minecraft"
  );

}


function getInstancesRoot() {

  return path.join(
    getCloudyRoot(),
    "instances"
  );

}


function getRuntimeRoot() {

  return path.join(
    getCloudyRoot(),
    "runtime"
  );

}


function getJava17Root() {

  return path.join(
    getRuntimeRoot(),
    "java-17"
  );

}


function getJava17Home() {

  return path.join(
    getJava17Root(),
    "home"
  );

}


function getManagedJavaExecutable() {

  return path.join(
    getJava17Home(),
    "bin",
    process.platform === "win32"
      ? "java.exe"
      : "java"
  );

}


/* =========================================================
   JSON
========================================================= */

function readJSON(
  filePath,
  fallback
) {

  try {

    const content =
      fs.readFileSync(
        filePath,
        "utf8"
      );


    return JSON.parse(
      content
    );

  } catch (error) {

    return fallback;

  }

}


/* =========================================================
   CATÁLOGO
========================================================= */

function getCatalog() {

  return readJSON(
    path.join(
      __dirname,
      "data",
      "instances.json"
    ),

    {
      instances: []
    }
  );

}


/* =========================================================
   CÓDIGOS
========================================================= */

function getCodes() {

  return readJSON(
    path.join(
      __dirname,
      "data",
      "codes.json"
    ),

    {
      codes: {}
    }
  );

}


/* =========================================================
   MICROSOFT AUTH
========================================================= */

function getAuthConfig() {

  return readJSON(
    path.join(
      __dirname,
      "data",
      "auth.json"
    ),

    {
      microsoftClientId: ""
    }
  );

}


let microsoftAuthService =
  null;


function getMicrosoftAuthService() {

  if (
    !microsoftAuthService
  ) {

    const config =
      getAuthConfig();


    microsoftAuthService =
      createMicrosoftAuth({

        dataRoot:
          getCloudyRoot(),

        clientId:
          config.microsoftClientId

      });

  }


  return microsoftAuthService;

}


/* =========================================================
   ESTADO
========================================================= */

function getStatePath() {

  return path.join(
    getCloudyRoot(),
    "launcher-state.json"
  );

}


function normalizeState(
  state
) {

  return {

    unlockedInstances:
      Array.isArray(
        state?.unlockedInstances
      )
        ? state.unlockedInstances
        : [],


    installedInstances:
      state?.installedInstances &&
      typeof state.installedInstances ===
        "object"

        ? state.installedInstances
        : {},


    settings: {

      ramMB:
        Number(
          state?.settings?.ramMB
        ) ||
        DEFAULT_RAM_MB

    }

  };

}


function getState() {

  return normalizeState(
    readJSON(
      getStatePath(),
      {}
    )
  );

}


function saveState(
  state
) {

  fs.mkdirSync(
    getCloudyRoot(),
    {
      recursive: true
    }
  );


  fs.writeFileSync(
    getStatePath(),

    JSON.stringify(
      state,
      null,
      2
    ),

    "utf8"
  );

}


/* =========================================================
   RAM
========================================================= */

function getRamLimits() {

  const totalRamMB =
    Math.floor(
      os.totalmem() /
      1024 /
      1024
    );


  let maxRamMB =
    Math.floor(
      totalRamMB * 0.75
    );


  maxRamMB =
    Math.floor(
      maxRamMB / 1024
    ) * 1024;


  maxRamMB =
    Math.min(
      maxRamMB,
      MAX_RAM_CAP_MB
    );


  maxRamMB =
    Math.max(
      maxRamMB,
      MIN_RAM_MB
    );


  return {

    totalRamMB,

    minRamMB:
      MIN_RAM_MB,

    maxRamMB

  };

}


function getRamSettings() {

  const state =
    getState();


  const limits =
    getRamLimits();


  const ramMB =
    Math.max(
      limits.minRamMB,

      Math.min(
        state.settings.ramMB,
        limits.maxRamMB
      )
    );


  return {

    ramMB,

    ...limits

  };

}


function setRamSetting(
  requestedRam
) {

  const limits =
    getRamLimits();


  let ramMB =
    Number(
      requestedRam
    );


  if (
    !Number.isFinite(
      ramMB
    )
  ) {

    ramMB =
      DEFAULT_RAM_MB;

  }


  /*
   * Saltos de 1 GB.
   */

  ramMB =
    Math.round(
      ramMB / 1024
    ) * 1024;


  ramMB =
    Math.max(
      limits.minRamMB,

      Math.min(
        ramMB,
        limits.maxRamMB
      )
    );


  const state =
    getState();


  state.settings.ramMB =
    ramMB;


  saveState(
    state
  );


  return {

    ok: true,

    ramMB,

    ...limits

  };

}


/* =========================================================
   ACCESO
========================================================= */

function canAccessInstance(
  instance,
  state
) {

  if (
    instance.visibility ===
    "public"
  ) {

    return true;

  }


  return state
    .unlockedInstances
    .includes(
      instance.id
    );

}


/* =========================================================
   JAVA 17
========================================================= */

async function checkManagedJava17() {

  const javaPath =
    getManagedJavaExecutable();


  if (
    !fs.existsSync(
      javaPath
    )
  ) {

    return {

      installed: false,

      version: null,

      path: null

    };

  }


  return new Promise(
    resolve => {

      execFile(
        javaPath,
        ["-version"],

        {
          windowsHide: true
        },

        (
          error,
          stdout,
          stderr
        ) => {

          if (error) {

            resolve({

              installed: false,

              version: null,

              path:
                javaPath

            });

            return;

          }


          const output =
            `${stdout}\n${stderr}`;


          const match =
            output.match(
              /version\s+"([^"]+)"/i
            );


          resolve({

            installed: true,

            version:
              match
                ? match[1]
                : "17",

            path:
              javaPath

          });

        }
      );

    }
  );

}


/* =========================================================
   SHA256
========================================================= */

function calculateSHA256(
  filePath
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const hash =
        crypto.createHash(
          "sha256"
        );


      const stream =
        fs.createReadStream(
          filePath
        );


      stream.on(
        "error",
        reject
      );


      stream.on(
        "data",

        chunk => {

          hash.update(
            chunk
          );

        }
      );


      stream.on(
        "end",

        () => {

          resolve(
            hash.digest(
              "hex"
            )
          );

        }
      );

    }
  );

}


/* =========================================================
   DESCARGA GENÉRICA
========================================================= */

async function downloadFile(
  url,
  destination,
  onProgress
) {

  const response =
    await fetch(
      url,

      {
        redirect: "follow",

        headers: {

          "User-Agent":
            "CloudyLauncher/1.0"

        }
      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `Error HTTP ${response.status}`
    );

  }


  if (
    !response.body
  ) {

    throw new Error(
      "La descarga no contiene datos."
    );

  }


  const total =
    Number(
      response.headers.get(
        "content-length"
      )
    ) || 0;


  let downloaded =
    0;


  await fs.promises.mkdir(
    path.dirname(
      destination
    ),

    {
      recursive: true
    }
  );


  const nodeStream =
    Readable.fromWeb(
      response.body
    );


  const fileStream =
    fs.createWriteStream(
      destination
    );


  nodeStream.on(
    "data",

    chunk => {

      downloaded +=
        chunk.length;


      if (
        total > 0 &&
        onProgress
      ) {

        onProgress(
          downloaded,
          total
        );

      }

    }
  );


  await new Promise(
    (
      resolve,
      reject
    ) => {

      nodeStream.pipe(
        fileStream
      );


      fileStream.on(
        "finish",
        resolve
      );


      fileStream.on(
        "error",
        reject
      );


      nodeStream.on(
        "error",
        reject
      );

    }
  );

}


/* =========================================================
   PAQUETE JAVA 17
========================================================= */

async function getJava17Package() {

  const url =
    "https://api.adoptium.net/v3/assets/latest/17/hotspot" +
    "?architecture=x64" +
    "&image_type=jre" +
    "&os=windows" +
    "&vendor=eclipse";


  const response =
    await fetch(
      url,

      {
        headers: {

          "User-Agent":
            "CloudyLauncher/1.0"

        }
      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `Adoptium respondió ${response.status}`
    );

  }


  const data =
    await response.json();


  const pkg =
    data?.[0]?.binary?.package;


  if (
    !pkg?.link ||
    !pkg?.checksum
  ) {

    throw new Error(
      "No se pudo obtener Java 17."
    );

  }


  return {

    url:
      pkg.link,

    checksum:
      String(
        pkg.checksum
      ).toLowerCase()

  };

}


/* =========================================================
   INSTALAR JAVA AUTOMÁTICAMENTE
========================================================= */

async function installManagedJava17(
  progressCallback
) {

  const current =
    await checkManagedJava17();


  if (
    current.installed
  ) {

    progressCallback?.(
      100,
      "Java 17 ya está listo."
    );


    return current;

  }


  const javaRoot =
    getJava17Root();


  const tempRoot =
    path.join(
      javaRoot,
      "temp"
    );


  const zipPath =
    path.join(
      javaRoot,
      "java17.zip"
    );


  const javaHome =
    getJava17Home();


  progressCallback?.(
    3,
    "Buscando Java 17..."
  );


  await fs.promises.mkdir(
    javaRoot,
    {
      recursive: true
    }
  );


  const pkg =
    await getJava17Package();


  progressCallback?.(
    8,
    "Descargando Java 17..."
  );


  await downloadFile(
    pkg.url,
    zipPath,

    (
      downloaded,
      total
    ) => {

      const percentage =
        8 +
        Math.floor(
          (
            downloaded /
            total
          ) * 55
        );


      progressCallback?.(
        percentage,
        "Descargando Java 17..."
      );

    }
  );


  progressCallback?.(
    68,
    "Verificando Java 17..."
  );


  const checksum =
    await calculateSHA256(
      zipPath
    );


  if (
    checksum.toLowerCase() !==
    pkg.checksum
  ) {

    throw new Error(
      "La verificación de Java 17 falló."
    );

  }


  progressCallback?.(
    75,
    "Extrayendo Java 17..."
  );


  await fs.promises.rm(
    tempRoot,

    {
      recursive: true,
      force: true
    }
  );


  await fs.promises.mkdir(
    tempRoot,

    {
      recursive: true
    }
  );


  await extract(
    zipPath,

    {
      dir:
        tempRoot
    }
  );


  const entries =
    await fs.promises.readdir(
      tempRoot,

      {
        withFileTypes: true
      }
    );


  const extracted =
    entries.find(
      entry =>
        entry.isDirectory()
    );


  if (
    !extracted
  ) {

    throw new Error(
      "No se encontró Java después de extraerlo."
    );

  }


  await fs.promises.rm(
    javaHome,

    {
      recursive: true,
      force: true
    }
  );


  progressCallback?.(
    88,
    "Preparando Java 17..."
  );


  await fs.promises.rename(

    path.join(
      tempRoot,
      extracted.name
    ),

    javaHome

  );


  await fs.promises.rm(
    tempRoot,

    {
      recursive: true,
      force: true
    }
  );


  await fs.promises.rm(
    zipPath,

    {
      force: true
    }
  );


  const installed =
    await checkManagedJava17();


  if (
    !installed.installed
  ) {

    throw new Error(
      "Java 17 no pudo ejecutarse."
    );

  }


  progressCallback?.(
    100,
    "Java 17 listo."
  );


  return installed;

}


/* =========================================================
   MINECRAFT - DIAGNÓSTICO
========================================================= */

async function checkMinecraftBase(
  version
) {

  const root =
    getMinecraftRoot();


  const versionRoot =
    path.join(
      root,
      "versions",
      version
    );


  const jsonPath =
    path.join(
      versionRoot,
      `${version}.json`
    );


  if (
    !fs.existsSync(
      jsonPath
    )
  ) {

    return {

      installed: false,

      issuesCount: null

    };

  }


  try {

    const resolved =
      await Version.parse(
        root,
        version
      );


    const report =
      await diagnose(
        resolved.id,
        resolved.minecraftDirectory
      );


    const issues =
      Array.isArray(
        report?.issues
      )
        ? report.issues
        : [];


    return {

      installed:
        issues.length === 0,

      issuesCount:
        issues.length,

      issues

    };


  } catch (error) {

    console.error(
      "Diagnóstico Minecraft:",
      error
    );


    return {

      installed: false,

      issuesCount: null,

      error:
        error.message

    };

  }

}


/* =========================================================
   LIMPIAR ARCHIVOS VACÍOS
========================================================= */

async function removeEmptyFiles(
  directory
) {

  if (
    !fs.existsSync(
      directory
    )
  ) {

    return 0;

  }


  let removed =
    0;


  const entries =
    await fs.promises.readdir(
      directory,

      {
        withFileTypes: true
      }
    );


  for (
    const entry of entries
  ) {

    const fullPath =
      path.join(
        directory,
        entry.name
      );


    if (
      entry.isDirectory()
    ) {

      removed +=
        await removeEmptyFiles(
          fullPath
        );


      continue;

    }


    try {

      const stat =
        await fs.promises.stat(
          fullPath
        );


      if (
        stat.size === 0
      ) {

        await fs.promises.unlink(
          fullPath
        );


        removed++;

      }

    } catch (error) {

      console.warn(
        "No se pudo revisar:",
        fullPath
      );

    }

  }


  return removed;

}


/* =========================================================
   UNA EJECUCIÓN DE INSTALACIÓN MINECRAFT
========================================================= */

async function runMinecraftInstallTask(
  metadata,
  progressCallback,
  attempt
) {

  const minecraftRoot =
    getMinecraftRoot();


  const task =
    installTask(
      metadata,
      minecraftRoot
    );


  let lastPercentage =
    0;


  await task.startAndWait({

    onStart(
      taskItem
    ) {

      const taskPath =
        String(
          taskItem?.path || ""
        );


      let message =
        "Descargando Minecraft...";


      if (
        taskPath.includes(
          "assets"
        )
      ) {

        message =
          "Descargando recursos de Minecraft...";

      }


      if (
        taskPath.includes(
          "libraries"
        )
      ) {

        message =
          "Descargando librerías de Minecraft...";

      }


      progressCallback?.(
        lastPercentage,
        message
      );

    },


    onUpdate() {

      const total =
        Number(
          task.total
        );


      const current =
        Number(
          task.progress
        );


      if (
        total > 0 &&
        Number.isFinite(
          current
        )
      ) {

        const fraction =
          Math.max(
            0,

            Math.min(
              1,
              current / total
            )
          );


        const percentage =
          Math.floor(
            fraction * 94
          );


        if (
          percentage >
          lastPercentage
        ) {

          lastPercentage =
            percentage;


          progressCallback?.(

            percentage,

            attempt > 1
              ? `Reparando Minecraft · intento ${attempt}/3...`
              : "Descargando archivos de Minecraft..."

          );

        }

      }

    },


    onFailed(
      taskItem,
      error
    ) {

      console.error(
        `Minecraft intento ${attempt}:`,
        taskItem?.path,
        error
      );

    }

  });

}


/* =========================================================
   ASEGURAR MINECRAFT
========================================================= */

async function ensureMinecraft(
  version,
  progressCallback
) {

  const initial =
    await checkMinecraftBase(
      version
    );


  if (
    initial.installed
  ) {

    progressCallback?.(
      100,
      `Minecraft ${version} ya está listo.`
    );


    return initial;

  }


  const root =
    getMinecraftRoot();


  await fs.promises.mkdir(
    root,
    {
      recursive: true
    }
  );


  const versionList =
    await getVersionList();


  const metadata =
    versionList.versions.find(
      versionItem =>
        versionItem.id ===
        version
    );


  if (
    !metadata
  ) {

    throw new Error(
      `No se encontró Minecraft ${version}.`
    );

  }


  let lastError =
    null;


  for (
    let attempt = 1;
    attempt <= 3;
    attempt++
  ) {

    try {

      progressCallback?.(
        2,
        attempt === 1
          ? `Preparando Minecraft ${version}...`
          : `Preparando reparación ${attempt}/3...`
      );


      /*
       * El error que vimos anteriormente
       * dejó assets de 0 bytes.
       */

      await removeEmptyFiles(
        path.join(
          root,
          "assets",
          "objects"
        )
      );


      await removeEmptyFiles(
        path.join(
          root,
          "libraries"
        )
      );


      await runMinecraftInstallTask(
        metadata,
        progressCallback,
        attempt
      );


      progressCallback?.(
        96,
        "Comprobando Minecraft..."
      );


      const result =
        await checkMinecraftBase(
          version
        );


      if (
        result.installed
      ) {

        progressCallback?.(
          100,
          `Minecraft ${version} listo.`
        );


        return result;

      }


      throw new Error(
        `Quedan ${result.issuesCount ?? "algunos"} archivos por reparar.`
      );


    } catch (error) {

      lastError =
        error;


      console.error(
        `Minecraft intento ${attempt}:`,
        error
      );


      if (
        attempt < 3
      ) {

        progressCallback?.(
          3,
          `La descarga tuvo un problema. Reintentando ${attempt + 1}/3...`
        );


        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              2500
            )
        );

      }

    }

  }


  throw (
    lastError ||
    new Error(
      "Minecraft no pudo instalarse."
    )
  );

}


/* =========================================================
   FORGE - ENCONTRAR ID
========================================================= */

async function findForgeVersionId(
  instance
) {

  const expected =
    `${instance.minecraftVersion}-forge-${instance.loaderVersion}`;


  const versionsRoot =
    path.join(
      getMinecraftRoot(),
      "versions"
    );


  const expectedJson =
    path.join(
      versionsRoot,
      expected,
      `${expected}.json`
    );


  if (
    fs.existsSync(
      expectedJson
    )
  ) {

    return expected;

  }


  if (
    !fs.existsSync(
      versionsRoot
    )
  ) {

    return null;

  }


  const directories =
    await fs.promises.readdir(
      versionsRoot,
      {
        withFileTypes: true
      }
    );


  const match =
    directories.find(
      entry => {

        if (
          !entry.isDirectory()
        ) {

          return false;

        }


        const name =
          entry.name.toLowerCase();


        return (
          name.includes(
            "forge"
          ) &&
          name.includes(
            String(
              instance.loaderVersion
            ).toLowerCase()
          ) &&
          name.startsWith(
            instance.minecraftVersion
          )
        );

      }
    );


  return match
    ? match.name
    : null;

}


/* =========================================================
   FORGE - DIAGNÓSTICO
========================================================= */

async function checkForge(
  instance
) {

  const versionId =
    await findForgeVersionId(
      instance
    );


  if (
    !versionId
  ) {

    return {

      installed: false,

      versionId: null,

      issuesCount: null

    };

  }


  try {

    const resolved =
      await Version.parse(
        getMinecraftRoot(),
        versionId
      );


    const report =
      await diagnose(
        resolved.id,
        resolved.minecraftDirectory
      );


    const issues =
      Array.isArray(
        report?.issues
      )
        ? report.issues
        : [];


    return {

      installed:
        issues.length === 0,

      versionId,

      issuesCount:
        issues.length,

      issues

    };


  } catch (error) {

    console.error(
      "Diagnóstico Forge:",
      error
    );


    return {

      installed: false,

      versionId,

      issuesCount: null,

      error:
        error.message

    };

  }

}


/* =========================================================
   ASEGURAR FORGE
========================================================= */

async function ensureForge(
  instance,
  progressCallback
) {

  const minecraftRoot =
    getMinecraftRoot();


  let current =
    await checkForge(
      instance
    );


  /*
   * Existe la versión, pero quizá le faltan
   * librerías. Primero intentamos repararla.
   */

  if (
    current.versionId &&
    !current.installed
  ) {

    try {

      progressCallback?.(
        15,
        "Reparando dependencias de Forge..."
      );


      const resolved =
        await Version.parse(
          minecraftRoot,
          current.versionId
        );


      await installDependencies(
        resolved
      );


      current =
        await checkForge(
          instance
        );


      if (
        current.installed
      ) {

        progressCallback?.(
          100,
          `Forge ${instance.loaderVersion} listo.`
        );


        return current;

      }

    } catch (error) {

      console.warn(
        "La reparación inicial de Forge falló:",
        error
      );

    }

  }


  if (
    current.installed
  ) {

    progressCallback?.(
      100,
      `Forge ${instance.loaderVersion} ya está listo.`
    );


    return current;

  }


  progressCallback?.(
    10,
    `Preparando Forge ${instance.loaderVersion}...`
  );


  /*
   * installForge devuelve el ID de la
   * versión creada.
   */

  const installedVersionId =
    await installForge(

      {

        version:
          instance.loaderVersion,

        mcversion:
          instance.minecraftVersion

      },

      minecraftRoot,

      {

        java:
          getManagedJavaExecutable()

      }

    );


  progressCallback?.(
    65,
    "Descargando dependencias de Forge..."
  );


  /*
   * IMPORTANTE:
   *
   * installDependencies necesita
   * ResolvedVersion, NO un string.
   */

  const resolvedForge =
    await Version.parse(
      minecraftRoot,
      installedVersionId
    );


  await installDependencies(
    resolvedForge
  );


  progressCallback?.(
    90,
    "Comprobando Forge..."
  );


  let result =
    await checkForge(
      instance
    );


  /*
   * Un segundo intento de dependencias
   * si alguna descarga quedó incompleta.
   */

  if (
    !result.installed
  ) {

    progressCallback?.(
      92,
      "Reparando dependencias pendientes..."
    );


    await installDependencies(
      resolvedForge
    );


    result =
      await checkForge(
        instance
      );

  }


  if (
    !result.installed
  ) {

    throw new Error(
      `Forge quedó incompleto. ${
        result.issuesCount ?? "Algunos"
      } archivos necesitan reparación.`
    );

  }


  progressCallback?.(
    100,
    `Forge ${instance.loaderVersion} listo.`
  );


  return result;

}


/* =========================================================
   ARCHIVOS DE LA INSTANCIA
========================================================= */

function getInstancePath(
  instance
) {

  return path.join(
    getInstancesRoot(),
    instance.id
  );

}


async function checkInstanceFiles(
  instance
) {

  const root =
    getInstancePath(
      instance
    );


  const instanceJson =
    path.join(
      root,
      "instance.json"
    );


  return {

    installed:
      fs.existsSync(
        instanceJson
      ),

    path:
      root

  };

}


async function prepareInstanceFiles(
  instance
) {

  const root =
    getInstancePath(
      instance
    );


  await fs.promises.mkdir(
    root,
    {
      recursive: true
    }
  );


  const folders = [

    "mods",
    "config",
    "resourcepacks",
    "shaderpacks",
    "screenshots",
    "logs"

  ];


  for (
    const folder of folders
  ) {

    await fs.promises.mkdir(

      path.join(
        root,
        folder
      ),

      {
        recursive: true
      }

    );

  }


  const data = {

    id:
      instance.id,

    name:
      instance.name,

    minecraftVersion:
      instance.minecraftVersion,

    loader:
      instance.loader,

    loaderVersion:
      instance.loaderVersion,

    javaVersion:
      instance.javaVersion,

    packVersion:
      instance.packVersion,

    installedAt:
      new Date()
        .toISOString()

  };


  await fs.promises.writeFile(

    path.join(
      root,
      "instance.json"
    ),

    JSON.stringify(
      data,
      null,
      2
    ),

    "utf8"

  );


  return {

    installed: true,

    path:
      root

  };

}


/* =========================================================
   ESTADO COMPLETO DE UNA INSTANCIA
========================================================= */

async function getInstanceSetup(
  instance
) {

  const java =
    await checkManagedJava17();


  const minecraft =
    await checkMinecraftBase(
      instance.minecraftVersion
    );


  let forge = {

    installed: false,

    versionId: null

  };


  if (
    minecraft.installed
  ) {

    forge =
      await checkForge(
        instance
      );

  }


  const files =
    await checkInstanceFiles(
      instance
    );


  const ready =
    java.installed &&
    minecraft.installed &&
    forge.installed &&
    files.installed;


  const any =
    java.installed ||
    minecraft.installed ||
    Boolean(
      forge.versionId
    ) ||
    files.installed;


  return {

    ready,

    any,


    java: {

      installed:
        java.installed,

      version:
        java.version

    },


    minecraft: {

      installed:
        minecraft.installed,

      issuesCount:
        minecraft.issuesCount

    },


    forge: {

      installed:
        forge.installed,

      issuesCount:
        forge.issuesCount,

      versionId:
        forge.versionId

    },


    files: {

      installed:
        files.installed

    }

  };

}


/* =========================================================
   LISTAR INSTANCIAS
========================================================= */

async function getVisibleInstances() {

  const catalog =
    getCatalog();


  const state =
    getState();


  const visible =
    catalog.instances.filter(
      instance =>
        canAccessInstance(
          instance,
          state
        )
    );


  const result = [];


  for (
    const instance of visible
  ) {

    const setup =
      await getInstanceSetup(
        instance
      );


    result.push({

      ...instance,

      installed:
        setup.ready,

      setup

    });

  }


  return result;

}


/* =========================================================
   PROGRESO GLOBAL
========================================================= */

function sendSetupProgress(
  event,
  data
) {

  event.sender.send(
    "instance:setup-progress",
    data
  );

}


/* =========================================================
   INSTALADOR COMPLETO DE UNA INSTANCIA
========================================================= */

async function prepareCompleteInstance(
  event,
  instanceId
) {

  const catalog =
    getCatalog();


  const instance =
    catalog.instances.find(
      item =>
        item.id ===
        instanceId
    );


  if (
    !instance
  ) {

    return {

      ok: false,

      message:
        "La instancia no existe."

    };

  }


  const state =
    getState();


  if (
    !canAccessInstance(
      instance,
      state
    )
  ) {

    return {

      ok: false,

      message:
        "No tienes acceso a esta instancia."

    };

  }


  const steps = {

    java:
      "pending",

    minecraft:
      "pending",

    forge:
      "pending",

    files:
      "pending"

  };


  function emit(
    progress,
    message,
    activeStep
  ) {

    sendSetupProgress(
      event,

      {

        instanceId:
          instance.id,

        progress,

        message,

        activeStep,

        steps: {
          ...steps
        }

      }
    );

  }


  try {

    /* -----------------------------------------------------
       JAVA
    ----------------------------------------------------- */

    const existingJava =
      await checkManagedJava17();


    if (
      existingJava.installed
    ) {

      steps.java =
        "done";


      emit(
        20,
        "Java 17 listo.",
        "java"
      );

    } else {

      steps.java =
        "active";


      emit(
        2,
        "Preparando Java 17...",
        "java"
      );


      await installManagedJava17(
        (
          progress,
          message
        ) => {

          emit(

            Math.floor(
              progress * 0.20
            ),

            message,

            "java"

          );

        }
      );


      steps.java =
        "done";


      emit(
        20,
        "Java 17 listo.",
        "java"
      );

    }


    /* -----------------------------------------------------
       MINECRAFT
    ----------------------------------------------------- */

    steps.minecraft =
      "active";


    emit(
      22,
      "Comprobando Minecraft...",
      "minecraft"
    );


    await ensureMinecraft(

      instance.minecraftVersion,

      (
        progress,
        message
      ) => {

        /*
         * Minecraft ocupa:
         * 20% → 70%
         */

        const global =
          20 +
          Math.floor(
            progress * 0.50
          );


        emit(
          global,
          message,
          "minecraft"
        );

      }

    );


    steps.minecraft =
      "done";


    emit(
      70,
      `Minecraft ${instance.minecraftVersion} listo.`,
      "minecraft"
    );


    /* -----------------------------------------------------
       FORGE
    ----------------------------------------------------- */

    steps.forge =
      "active";


    emit(
      72,
      `Comprobando Forge ${instance.loaderVersion}...`,
      "forge"
    );


    await ensureForge(

      instance,

      (
        progress,
        message
      ) => {

        /*
         * Forge ocupa:
         * 70% → 95%
         */

        const global =
          70 +
          Math.floor(
            progress * 0.25
          );


        emit(
          global,
          message,
          "forge"
        );

      }

    );


    steps.forge =
      "done";


    emit(
      95,
      `Forge ${instance.loaderVersion} listo.`,
      "forge"
    );


    /* -----------------------------------------------------
       ARCHIVOS INSTANCIA
    ----------------------------------------------------- */

    steps.files =
      "active";


    emit(
      97,
      "Preparando archivos de Apocalipsis...",
      "files"
    );


    const files =
      await prepareInstanceFiles(
        instance
      );


    steps.files =
      "done";


    /*
     * Solo AHORA la marcamos instalada.
     */

    state.installedInstances[
      instance.id
    ] = {

      installed: true,

      installedAt:
        new Date()
          .toISOString(),

      installPath:
        files.path

    };


    saveState(
      state
    );


    emit(
      100,
      `${instance.name} está listo.`,
      null
    );


    return {

      ok: true,

      ready: true

    };


  } catch (error) {

    console.error(
      `Error preparando ${instance.name}:`,
      error
    );


    if (
      steps.java === "active"
    ) {

      steps.java =
        "error";

    }


    if (
      steps.minecraft ===
      "active"
    ) {

      steps.minecraft =
        "error";

    }


    if (
      steps.forge ===
      "active"
    ) {

      steps.forge =
        "error";

    }


    if (
      steps.files ===
      "active"
    ) {

      steps.files =
        "error";

    }


    state.installedInstances[
      instance.id
    ] = {

      installed: false,

      installPath:
        getInstancePath(
          instance
        )

    };


    saveState(
      state
    );


    sendSetupProgress(
      event,

      {

        instanceId:
          instance.id,

        error: true,

        progress: null,

        message:
          error?.message ||
          "La instalación no pudo completarse.",

        steps: {
          ...steps
        }

      }
    );


    return {

      ok: false,

      message:
        error?.message ||
        "La instalación no pudo completarse."

    };

  }

}


/* =========================================================
   IPC
========================================================= */

function registerIPC() {


  ipcMain.handle(
    "launcher:get-version",

    () =>
      app.getVersion()
  );


  /* -------------------------------------------------------
     INSTANCIAS
  ------------------------------------------------------- */

  ipcMain.handle(
    "instances:list",

    async () =>
      getVisibleInstances()
  );


  ipcMain.handle(
    "instances:redeem-code",

    (
      event,
      rawCode
    ) => {

      const code =
        String(
          rawCode || ""
        )
          .trim()
          .toUpperCase();


      if (
        !code
      ) {

        return {

          ok: false,

          message:
            "Escribe un código."

        };

      }


      const codes =
        getCodes();


      const instanceId =
        codes.codes[
          code
        ];


      if (
        !instanceId
      ) {

        return {

          ok: false,

          message:
            "Ese código no existe."

        };

      }


      const catalog =
        getCatalog();


      const instance =
        catalog.instances.find(
          item =>
            item.id ===
            instanceId
        );


      if (
        !instance
      ) {

        return {

          ok: false,

          message:
            "La instancia asociada no existe."

        };

      }


      const state =
        getState();


      if (
        !state
          .unlockedInstances
          .includes(
            instanceId
          )
      ) {

        state
          .unlockedInstances
          .push(
            instanceId
          );


        saveState(
          state
        );

      }


      return {

        ok: true,

        message:
          `${instance.name} agregada correctamente.`

      };

    }
  );


  ipcMain.handle(
    "instance:prepare",

    async (
      event,
      instanceId
    ) => {

      return await prepareCompleteInstance(
        event,
        instanceId
      );

    }
  );


  /* -------------------------------------------------------
     MICROSOFT
  ------------------------------------------------------- */

  ipcMain.handle(
    "auth:get-status",

    async () => {

      return await getMicrosoftAuthService()
        .getStatus();

    }
  );


  ipcMain.handle(
    "auth:login",

    async event => {

      return await getMicrosoftAuthService()
        .login(
          data => {

            try {

              if (
                !event.sender.isDestroyed()
              ) {

                event.sender.send(
                  "auth:event",
                  data
                );

              }

            } catch (error) {

              console.error(
                "No se pudo enviar auth:event:",
                error
              );

            }

          }
        );

    }
  );


  ipcMain.handle(
    "auth:logout",

    async () => {

      return await getMicrosoftAuthService()
        .logout();

    }
  );


  /* -------------------------------------------------------
     RAM
  ------------------------------------------------------- */

  ipcMain.handle(
    "settings:get-ram",

    () =>
      getRamSettings()
  );


  ipcMain.handle(
    "settings:set-ram",

    (
      event,
      ramMB
    ) =>
      setRamSetting(
        ramMB
      )
  );

}


/* =========================================================
   ELECTRON
========================================================= */

app.whenReady().then(
  () => {

    Menu.setApplicationMenu(
      null
    );


    registerIPC();


    createWindow();


    app.on(
      "activate",

      () => {

        if (
          BrowserWindow
            .getAllWindows()
            .length === 0
        ) {

          createWindow();

        }

      }
    );

  }
);


app.on(
  "window-all-closed",

  () => {

    if (
      process.platform !==
      "darwin"
    ) {

      app.quit();

    }

  }
);