const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const rpc = require("discord-rpc");
const { Client, Authenticator } = require("minecraft-launcher-core");
const { Auth } = require("msmc");
const winston = require("winston");
const fs = require("fs");
const axios = require("axios");

const clientId = "1270436944387641416";

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'rolve.log' }),
    new winston.transports.Console()
  ]
});

rpc.register(clientId);
const rpcClient = new rpc.Client({ transport: "ipc" });

let mainWindow;
let launcher;

// Dependency checker
const requiredDependencies = [
  'minecraft-launcher-core',
  'msmc',
  'axios',
  'winston',
  'discord-rpc'
];

async function checkDependencies() {
  logger.info('Checking dependencies...');
  const missing = [];
  
  for (const dep of requiredDependencies) {
    try {
      require.resolve(dep);
      logger.info(`✓ ${dep} found`);
    } catch (error) {
      logger.error(`✗ ${dep} missing`);
      missing.push(dep);
    }
  }
  
  if (missing.length > 0) {
    logger.error(`Missing dependencies: ${missing.join(', ')}`);
    return false;
  }
  
  logger.info('All dependencies satisfied');
  return true;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    show: false,
    title: "Rolve - Minecraft Client",
    titleBarStyle: "hidden",
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
  });

  mainWindow.loadFile(path.join(__dirname, "public", "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    logger.info('Main window shown');
  });

  // Setup Discord RPC
  setupDiscordRPC();
}

function setupDiscordRPC() {
  rpcClient.login({ clientId }).catch(error => {
    logger.error('Discord RPC login failed:', error);
  });

  const uncPercentage = 83;
  const UncText = calculateLevelAndText(uncPercentage);

  rpcClient.on("ready", () => {
    logger.info("Discord RPC is active");
    rpcClient.setActivity({
      details: "Rolve Minecraft Client",
      state: "Ready to Launch",
      startTimestamp: Date.now(),
      largeImageKey: "tool-icon",
      largeImageText: UncText,
      instance: false,
    });
  });
}

function calculateLevelAndText(uncPercentage) {
  let level;
  if (uncPercentage >= 90) level = 10;
  else if (uncPercentage >= 80) level = 9;
  else if (uncPercentage >= 60) level = 8;
  else if (uncPercentage >= 40) level = 7;
  else if (uncPercentage >= 20) level = 6;
  else level = 5;

  return `Client Level: ${level} | Performance: ${uncPercentage}%`;
}

// IPC handlers for window controls
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

// Minecraft launcher functionality
ipcMain.handle('launch-minecraft', async (event, options) => {
  try {
    logger.info('Launching Minecraft with options:', options);
    
    // Update Discord RPC
    rpcClient.setActivity({
      details: "Playing Minecraft",
      state: `Version: ${options.version || 'Latest'}`,
      startTimestamp: Date.now(),
      largeImageKey: "tool-icon",
      largeImageText: "Rolve Minecraft Client",
      instance: false,
    });

    const launcher = new Client();
    
    const launchOptions = {
      authorization: options.auth,
      root: options.gameDirectory || path.join(__dirname, 'minecraft'),
      version: {
        number: options.version || "1.20.1",
        type: "release"
      },
      memory: {
        max: options.memory || "4G",
        min: "2G"
      }
    };

    launcher.launch(launchOptions);
    
    launcher.on('debug', (e) => logger.info(`[Launcher] ${e}`));
    launcher.on('data', (e) => logger.info(`[Minecraft] ${e.toString()}`));
    launcher.on('close', (code) => {
      logger.info(`Minecraft closed with code ${code}`);
      // Reset Discord RPC
      rpcClient.setActivity({
        details: "Rolve Minecraft Client",
        state: "Ready to Launch",
        startTimestamp: Date.now(),
        largeImageKey: "tool-icon",
        largeImageText: "Rolve Minecraft Client",
        instance: false,
      });
    });

    return { success: true, message: 'Minecraft launched successfully' };
  } catch (error) {
    logger.error('Failed to launch Minecraft:', error);
    return { success: false, message: error.message };
  }
});

// Microsoft authentication
ipcMain.handle('authenticate-microsoft', async () => {
  try {
    logger.info('Starting Microsoft authentication...');
    const authManager = new Auth("select_account");
    const xboxManager = await authManager.launch("raw");
    const token = await xboxManager.getMinecraft();
    
    logger.info('Microsoft authentication successful');
    return { 
      success: true, 
      auth: token,
      username: token.mclc().name,
      uuid: token.mclc().uuid
    };
  } catch (error) {
    logger.error('Microsoft authentication failed:', error);
    return { success: false, message: error.message };
  }
});

// Check Minecraft versions
ipcMain.handle('get-minecraft-versions', async () => {
  try {
    const response = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest.json');
    return {
      success: true,
      versions: response.data.versions.slice(0, 20) // Get latest 20 versions
    };
  } catch (error) {
    logger.error('Failed to fetch Minecraft versions:', error);
    return { success: false, message: error.message };
  }
});

app.whenReady().then(async () => {
  // Check dependencies before starting
  const depsOk = await checkDependencies();
  if (!depsOk) {
    dialog.showErrorBox('Missing Dependencies', 'Some required dependencies are missing. Please run npm install.');
    app.quit();
    return;
  }
  
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});