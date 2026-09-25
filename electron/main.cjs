/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const INITIAL_PORT = 3117;
let serverProcess;
let serverPort = INITIAL_PORT;
let isQuitting = false;

function getStandaloneDir() {
  return path.join(process.resourcesPath, "app", ".next", "standalone");
}

function startBundledServer() {
  if (!app.isPackaged) return Promise.resolve();
  return findAvailablePort(INITIAL_PORT).then((port) => {
    serverPort = port;
    const standaloneDir = getStandaloneDir();
    const serverPath = path.join(standaloneDir, "server.js");
    const nodeExecutable = process.platform === "win32"
      ? process.execPath.replace(/Electron(\\|\/)electron\.exe$/i, "node.exe")
      : process.execPath;
    serverProcess = spawn(nodeExecutable, [serverPath], {
      cwd: standaloneDir,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", PORT: String(serverPort), HOSTNAME: "127.0.0.1" },
      stdio: "ignore",
      windowsHide: true,
    });
    serverProcess.on("error", (error) => {
      if (!isQuitting) dialog.showErrorBox("Susan AI could not start", error.message);
    });
    serverProcess.on("exit", (code) => {
      if (!isQuitting && code !== 0) {
        dialog.showErrorBox("Susan AI server stopped", `The bundled server exited unexpectedly (code ${code ?? "unknown"}).`);
        app.quit();
      }
    });
    return waitForServer(serverPort);
  });
}

function waitForServer(port, attempts = 60) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
        response.resume();
        if (response.statusCode === 200) return resolve();
        retry();
      });
      request.on("error", retry);
      request.setTimeout(1000, () => request.destroy());
    };
    const retry = () => {
      if (attempts-- <= 0) return reject(new Error("Susan AI server did not become ready."));
      setTimeout(check, 250);
    };
    check();
  });
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", () => {
      probe.close();
      if (startPort >= INITIAL_PORT + 20) return reject(new Error("No available local port was found for Susan AI."));
      resolve(findAvailablePort(startPort + 1));
    });
    probe.listen(startPort, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => resolve(typeof address === "object" && address ? address.port : startPort));
    });
  });
}

async function createWindow() {
  try {
    await startBundledServer();
    const window = new BrowserWindow({
      width: 1280,
      height: 820,
      minWidth: 900,
      minHeight: 640,
      title: "Susan AI",
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    await window.loadURL(`http://127.0.0.1:${app.isPackaged ? serverPort : 3000}`);
  } catch (error) {
    dialog.showErrorBox("Susan AI could not start", error.message);
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => {
  isQuitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
