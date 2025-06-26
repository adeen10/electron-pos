// const { app, BrowserWindow, ipcMain } = require('electron');
// const path = require('path');
// const fs = require('fs');
// const crypto = require('crypto');

// const usersPath = path.join(__dirname, 'data', 'users.json');

// function createWindow() {
//   const win = new BrowserWindow({
//     width: 1200,
//     height: 700,
//     webPreferences: {
//       preload: path.join(__dirname, 'preload.js'),
//       contextIsolation: true,
//       nodeIntegration: false,
//     },
//   });
//   win.loadFile('renderer/index.html');
// }

// app.whenReady().then(createWindow);

// // ========== AUTH HANDLERS ==========

// ipcMain.handle('auth:signup', (event, username, password) => {
//   let users = [];
//   if (fs.existsSync(usersPath)) {
//     users = JSON.parse(fs.readFileSync(usersPath));
//   }
//   if (users.some(u => u.username === username)) {
//     return { success: false, message: 'User already exists' };
//   }
//   const hash = crypto.createHash('sha256').update(password).digest('hex');
//   users.push({ username, passwordHash: hash });
//   fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
//   return { success: true, message: 'Signup successful' };
// });

// ipcMain.handle('auth:login', (event, username, password) => {
//   if (!fs.existsSync(usersPath)) return { success: false, message: 'No users found' };
//   const users = JSON.parse(fs.readFileSync(usersPath));
//   const hash = crypto.createHash('sha256').update(password).digest('hex');
//   const match = users.find(u => u.username === username && u.passwordHash === hash);
//   return match
//     ? { success: true, message: 'Login successful' }
//     : { success: false, message: 'Invalid credentials' };
// });

// ipcMain.handle('auth:completeProfile', (event, username, address, regNo) => {
//   const users = JSON.parse(fs.readFileSync(usersPath));
//   const user = users.find(u => u.username === username);
//   if (!user) {
//     return { success: false, message: 'User not found' };
//   }
//   user.address = address;
//   user.registrationNumber = regNo;
//   fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
//   return { success: true, message: 'Profile saved' };
// });


// main.js
// --------------------------------------------------------------------
// 1) Core Electron imports FIRST
// --------------------------------------------------------------------
const { app, BrowserWindow, ipcMain } = require('electron');

// --------------------------------------------------------------------
// 2) Node helpers
// --------------------------------------------------------------------
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

// --------------------------------------------------------------------
// 3) Load the PDF handler so its ipcMain.handle('generate-pdf', …) exists
// --------------------------------------------------------------------
require(path.join(__dirname, 'services', 'pdf_generator.js'));

// --------------------------------------------------------------------
// 4) Users JSON path
// --------------------------------------------------------------------
const usersPath = path.join(__dirname, 'data', 'users.json');

// --------------------------------------------------------------------
// 5) Create window
// --------------------------------------------------------------------
function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// --------------------------------------------------------------------
// 6) AUTH IPC HANDLERS
// --------------------------------------------------------------------
ipcMain.handle('auth:signup', (_e, user, pass) => {
  let users = fs.existsSync(usersPath) ? JSON.parse(fs.readFileSync(usersPath)) : [];
  if (users.some(u => u.username === user)) return { success:false, message:'User already exists' };

  const hash = crypto.createHash('sha256').update(pass).digest('hex');
  users.push({ username:user, passwordHash:hash });
  fs.writeFileSync(usersPath, JSON.stringify(users,null,2));
  return { success:true, message:'Signup successful' };
});

ipcMain.handle('auth:login', (_e, user, pass) => {
  if (!fs.existsSync(usersPath)) return { success:false, message:'No users found' };
  const users = JSON.parse(fs.readFileSync(usersPath));
  const hash  = crypto.createHash('sha256').update(pass).digest('hex');
  return users.find(u => u.username===user && u.passwordHash===hash)
    ? { success:true, message:'Login successful' }
    : { success:false, message:'Invalid credentials' };
});

ipcMain.handle('auth:completeProfile', (_e, user, addr, reg) => {
  if (!fs.existsSync(usersPath)) return { success:false, message:'No users found' };
  const users = JSON.parse(fs.readFileSync(usersPath));
  const u     = users.find(x => x.username === user);
  if (!u) return { success:false, message:'User not found' };
  u.address = addr; u.registrationNumber = reg;
  fs.writeFileSync(usersPath, JSON.stringify(users,null,2));
  return { success:true, message:'Profile saved' };
});
