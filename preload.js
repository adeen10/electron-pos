// // preload.js
// const { contextBridge, ipcRenderer } = require('electron');
// const path   = require('path');
// const fs     = require('fs');
// const crypto = require('crypto');

// const usersPath = path.join(__dirname, 'data', 'users.json');

// // 1️⃣ Auth API: signup, login, completeProfile
// contextBridge.exposeInMainWorld('authAPI', {
//   signup: (username, password) =>
//     ipcRenderer.invoke('auth:signup', username, password),

//   login: (username, password) =>
//     ipcRenderer.invoke('auth:login', username, password),

//   completeProfile: (username, address, regNo) =>
//     ipcRenderer.invoke('auth:completeProfile', username, address, regNo),
// });

// // 2️⃣ Invoice PDF API: generatePDF(invoiceData)
// contextBridge.exposeInMainWorld('electronAPI', {
//   generatePDF: (invoiceData) =>
//     ipcRenderer.invoke('generate-pdf', invoiceData),
// });


// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// ---------- Auth bridge ----------
contextBridge.exposeInMainWorld('authAPI', {
  signup:          (u,p) => ipcRenderer.invoke('auth:signup', u, p),
  login:           (u,p) => ipcRenderer.invoke('auth:login',  u, p),
  completeProfile: (u,a,r)=> ipcRenderer.invoke('auth:completeProfile', u, a, r)
});

// ---------- PDF bridge ----------
contextBridge.exposeInMainWorld('electronAPI', {
  generatePDF: (invoice) => ipcRenderer.invoke('generate-pdf', invoice)
});
