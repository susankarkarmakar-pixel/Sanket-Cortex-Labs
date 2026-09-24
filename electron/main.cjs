/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const PORT = 3117;
let serverProcess;

function getStandaloneDir() {
  return path.join(process.resourcesPath, "app", ".next", "standalone");
}

function startBundledServer() {
  if (!app.isPackaged) return Promise.resolve();
  const standaloneDir = getStandaloneDir();
  const serverPath = path.join(standaloneDir, "server.js");
  serverProcess = spawn(process.execPath.replace(/Electron(\\|\/)electron\.exe$/i, "node.exe"), [serverPath], {
    cwd: standaloneDir,
    env: { ...process.env, NODE_ENV: "production", PORT: String(PORT), HOSTNAME: "127.0.0.1" },
    stdio: "ignore",
    windowsHide: true,
  });
  serverProcess.on("error", (error) => {
    dialog.showErrorBox("Susan AI could not start", error.message);
  });
  return waitForServer();
}

function waitForServer(attempts = 60) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(`http://127.0.0.1:${PORT}/api/health`, (response) => {
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

async function createWindow() {
  try {
    await startBundledServer();
    const window = new BrowserWindow({ width: 1280, height: 820, minWidth: 900, minHeight: 640, title: "Susan AI", webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await window.loadURL(`http://127.0.0.1:${app.isPackaged ? PORT : 3000}`);
  } catch (error) {
    dialog.showErrorBox("Susan AI could not start", error.message);
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { if (serverProcess && !serverProcess.killed) serverProcess.kill(); });
