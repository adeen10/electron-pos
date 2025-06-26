const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('authAPI', {
  signup:          (u,p) => ipcRenderer.invoke('auth:signup', u, p),
  login:           (u,p) => ipcRenderer.invoke('auth:login',  u, p),
  completeProfile: (u,a,r)=> ipcRenderer.invoke('auth:completeProfile', u, a, r)
});

// preload.js
// … existing authAPI, customerAPI …

contextBridge.exposeInMainWorld('productAPI', {
  getAll:    () => ipcRenderer.invoke('db:get-products'),
  search:    (q) => ipcRenderer.invoke('db:search-products', q),
  getById:   (id)=> ipcRenderer.invoke('db:get-product-by-id', id),
  create:    (data) => ipcRenderer.invoke('db:create-product', data),
  update:    (id, data) => ipcRenderer.invoke('db:update-product', id, data),
});


// preload.js (append inside the electronAPI or in its own section)
contextBridge.exposeInMainWorld('customerAPI', {
  getAll:        () => ipcRenderer.invoke('db:get-customers'),
  search:        (q) => ipcRenderer.invoke('db:search-customers', q),
  getById:       (id)=> ipcRenderer.invoke('db:get-customer-by-id', id),
  // create & update will be used on the detail page:
  create:        (data) => ipcRenderer.invoke('db:create-customer', data),
  update:        (id, data) => ipcRenderer.invoke('db:update-customer', id, data),
});


contextBridge.exposeInMainWorld('electronAPI', {
  generatePDF: (invoice) => ipcRenderer.invoke('generate-pdf', invoice)
});
