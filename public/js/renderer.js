const { ipcRenderer } = require('electron');

// Window controls
document.getElementById('minimize-btn').addEventListener('click', () => {
    ipcRenderer.invoke('window-minimize');
});

document.getElementById('maximize-btn').addEventListener('click', () => {
    ipcRenderer.invoke('window-maximize');
});

document.getElementById('close-btn').addEventListener('click', () => {
    ipcRenderer.invoke('window-close');
});

// Tab navigation
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');
        
        // Remove active class from all nav items and tab contents
        navItems.forEach(nav => nav.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked nav item and corresponding tab
        item.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Authentication state
let isAuthenticated = false;
let userAuth = null;

// Microsoft authentication
document.getElementById('auth-btn').addEventListener('click', async () => {
    const authBtn = document.getElementById('auth-btn');
    const originalText = authBtn.innerHTML;
    
    authBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Authenticating...';
    authBtn.disabled = true;
    
    try {
        const result = await ipcRenderer.invoke('authenticate-microsoft');
        
        if (result.success) {
            isAuthenticated = true;
            userAuth = result.auth;
            
            // Update UI
            updateUserInfo(result.username, result.uuid);
            authBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>Authenticated';
            authBtn.disabled = true;
            
            // Enable launch button
            document.getElementById('launch-btn').disabled = false;
            
            showStatus('Successfully authenticated with Microsoft!', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Authentication failed:', error);
        authBtn.innerHTML = originalText;
        authBtn.disabled = false;
        showStatus(`Authentication failed: ${error.message}`, 'error');
    }
});

// Quick launch
document.getElementById('quick-launch').addEventListener('click', () => {
    if (!isAuthenticated) {
        showStatus('Please authenticate with Microsoft first', 'warning');
        return;
    }
    
    // Switch to launcher tab
    document.querySelector('[data-tab="launcher"]').click();
});

// Launch Minecraft
document.getElementById('launch-btn').addEventListener('click', async () => {
    if (!isAuthenticated) {
        showStatus('Please authenticate with Microsoft first', 'error');
        return;
    }
    
    const launchBtn = document.getElementById('launch-btn');
    const originalText = launchBtn.innerHTML;
    
    launchBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>Launching...';
    launchBtn.disabled = true;
    
    let options = {
        auth: userAuth,
        version: document.getElementById('version-select').value,
        memory: document.getElementById('memory-select').value,
        gameDirectory: document.getElementById('game-dir').value || null
    };
    
    // Add advanced settings if they exist
    const javaPath = document.getElementById('java-path').value;
    const jvmArgs = document.getElementById('jvm-args').value;
    const windowWidth = document.getElementById('window-width').value;
    const windowHeight = document.getElementById('window-height').value;
    const fullscreen = document.getElementById('fullscreen').checked;
    const demoMode = document.getElementById('demo-mode').checked;
    const keepLauncherOpen = document.getElementById('keep-launcher-open').checked;
    
    if (javaPath) options.javaPath = javaPath;
    if (jvmArgs) options.jvmArgs = jvmArgs;
    if (windowWidth) options.windowWidth = windowWidth;
    if (windowHeight) options.windowHeight = windowHeight;
    if (fullscreen) options.fullscreen = fullscreen;
    if (demoMode) options.demoMode = demoMode;
    if (keepLauncherOpen) options.keepLauncherOpen = keepLauncherOpen;
    
    try {
        const result = await ipcRenderer.invoke('launch-minecraft', options);
        
        if (result.success) {
            showStatus('Minecraft launched successfully!', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Launch failed:', error);
        showStatus(`Launch failed: ${error.message}`, 'error');
    } finally {
        launchBtn.innerHTML = originalText;
        launchBtn.disabled = false;
    }
});

// Load Minecraft versions
async function loadMinecraftVersions() {
    try {
        const result = await ipcRenderer.invoke('get-minecraft-versions');
        
        if (result.success) {
            const select = document.getElementById('version-select');
            select.innerHTML = '';
            
            result.versions.forEach(version => {
                const option = document.createElement('option');
                option.value = version.id;
                option.textContent = `${version.id} (${version.type})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load versions:', error);
    }
}

// Update user info
function updateUserInfo(username, uuid) {
    const userInfo = document.getElementById('user-info');
    const avatar = userInfo.querySelector('.user-avatar');
    const usernameEl = userInfo.querySelector('.username');
    const statusEl = userInfo.querySelector('.user-status');
    
    avatar.textContent = username.charAt(0).toUpperCase();
    usernameEl.textContent = username;
    statusEl.textContent = 'Online';
}

// Show status messages
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('launch-status');
    statusEl.textContent = message;
    statusEl.className = `launch-status show ${type}`;
    
    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 5000);
}

// Check dependencies status
function checkDependenciesStatus() {
    const depsStatus = document.getElementById('deps-status');
    
    // Simulate dependency check
    setTimeout(() => {
        depsStatus.textContent = 'Ready';
        depsStatus.style.color = '#00d4ff';
    }, 1000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMinecraftVersions();
    checkDependenciesStatus();
    
    // Load settings from localStorage
    const discordRpc = localStorage.getItem('discord-rpc');
    if (discordRpc !== null) {
        document.getElementById('discord-rpc').checked = discordRpc === 'true';
    }
    
    const autoUpdate = localStorage.getItem('auto-update');
    if (autoUpdate !== null) {
        document.getElementById('auto-update').checked = autoUpdate === 'true';
    }
    
    const defaultMemory = localStorage.getItem('default-memory');
    if (defaultMemory) {
        document.getElementById('default-memory').value = defaultMemory;
        document.getElementById('memory-select').value = defaultMemory;
    }
});

// Save settings
document.getElementById('discord-rpc').addEventListener('change', (e) => {
    localStorage.setItem('discord-rpc', e.target.checked);
});

document.getElementById('auto-update').addEventListener('change', (e) => {
    localStorage.setItem('auto-update', e.target.checked);
});

document.getElementById('default-memory').addEventListener('change', (e) => {
    localStorage.setItem('default-memory', e.target.value);
    document.getElementById('memory-select').value = e.target.value;
});

// Load saved user data on startup
async function loadSavedUserData() {
    try {
        const result = await ipcRenderer.invoke('load-user-data');
        if (result.success) {
            isAuthenticated = true;
            userAuth = result.auth;
            updateUserInfo(result.username, result.uuid);
            
            const authBtn = document.getElementById('auth-btn');
            authBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>Authenticated';
            authBtn.disabled = true;
            document.getElementById('launch-btn').disabled = false;
        }
    } catch (error) {
        console.error('Failed to load saved user data:', error);
    }
}

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await ipcRenderer.invoke('logout-user');
        
        // Reset UI
        isAuthenticated = false;
        userAuth = null;
        
        const userInfo = document.getElementById('user-info');
        const avatar = userInfo.querySelector('.user-avatar');
        const usernameEl = userInfo.querySelector('.username');
        const statusEl = userInfo.querySelector('.user-status');
        const logoutBtn = document.getElementById('logout-btn');
        
        avatar.textContent = '?';
        usernameEl.textContent = 'Not logged in';
        statusEl.textContent = 'Offline';
        logoutBtn.style.display = 'none';
        
        const authBtn = document.getElementById('auth-btn');
        authBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>Login with Microsoft';
        authBtn.disabled = false;
        document.getElementById('launch-btn').disabled = true;
        
        showStatus('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout failed:', error);
        showStatus('Logout failed', 'error');
    }
});

// Advanced settings toggle
function setupAdvancedSettings() {
    const toggleBtn = document.getElementById('advanced-toggle');
    const advancedSettings = document.getElementById('advanced-settings');
    
    toggleBtn.addEventListener('click', () => {
        const isOpen = advancedSettings.classList.contains('show');
        
        if (isOpen) {
            advancedSettings.classList.remove('show');
            toggleBtn.classList.remove('active');
        } else {
            advancedSettings.classList.add('show');
            toggleBtn.classList.add('active');
        }
    });
}

// Browse button functionality
function setupBrowseButtons() {
    document.getElementById('browse-dir').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('browse-directory');
        if (result.success && result.path) {
            document.getElementById('game-dir').value = result.path;
        }
    });
    
    document.getElementById('browse-java').addEventListener('click', async () => {
        const result = await ipcRenderer.invoke('browse-file', {
            title: 'Select Java Executable',
            filters: [
                { name: 'Java Executable', extensions: ['exe'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.success && result.path) {
            document.getElementById('java-path').value = result.path;
        }
    });
}