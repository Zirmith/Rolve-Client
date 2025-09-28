const { app, BrowserWindow } = require("electron");
const path = require("path");
const rpc = require("discord-rpc");
const clientIdd = "1270436944387641416";

rpc.register(clientIdd);
const client = new rpc.Client({ transport: "ipc" });

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 873,
    height: 428,
    resizable: false,
    roundedCorners: true,
    show: false,
    title: "Fusion",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "public", "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  client.login({ clientId: clientIdd }).catch(console.error);

  const uncPercentage = 83;
  const UncText = calculateLevelAndText(uncPercentage);

  client.on("ready", () => {
    console.log("Discord RPC is active.");
    client.setActivity({
      details: "Private - Scripting Utility",
      state: "ᵁⁿᶦᵛᵉʳˢᵃˡ ᴱˣᵖˡᵒᶦᵗ ⁽ᵂᶦⁿᵈᵒʷˢ / ᴹᵃᶜ⁾ ⁻ ᶜˡᵒˢᵉᵈ ᵀᵉˢᵗᶦⁿᵍ",
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

  return `Executor Level: ${level} | Unified Naming Convention (UNC): ${uncPercentage}%`;
}

app.whenReady().then(() => {
  // const settings = revernclient.loadSettings(); // uncomment if defined
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
