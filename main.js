const {app,BrowserWindow,BrowserView,ipcMain,shell,Menu}=require('electron');
const path=require('node:path');
const {autoUpdater}=require('electron-updater');
const log=require('electron-log');
autoUpdater.logger=log;
autoUpdater.autoDownload=true;
autoUpdater.autoInstallOnAppQuit=true;
let win,view=null,active=null,updateReady=false;
const PORTALS={admin:'https://87freight-admin.vercel.app/',company:'https://87freight-company.vercel.app/',employee:'https://87freight-employee.vercel.app/',carrier:'https://87freight-carrier.vercel.app/',broker:'https://87freight-broker.vercel.app/',shipper:'https://87freight-shipper.vercel.app/'};
const portalHosts=new Map(Object.entries(PORTALS).map(([k,url])=>[new URL(url).hostname,k]));
function parse(url){try{return new URL(url)}catch{return null}}
function portalName(url){const u=parse(url);return u&&u.protocol==='https:'?portalHosts.get(u.hostname):null}
function notifyUpdate(status,detail=''){if(win&&!win.isDestroyed())win.webContents.send('desktop-update',{status,detail})}
function initUpdates(){
 if(!app.isPackaged){notifyUpdate('development');return}
 autoUpdater.on('checking-for-update',()=>notifyUpdate('checking'));
 autoUpdater.on('update-available',()=>notifyUpdate('downloading'));
 autoUpdater.on('update-not-available',()=>notifyUpdate('current'));
 autoUpdater.on('download-progress',p=>notifyUpdate('downloading',Math.round(p.percent)+'%'));
 autoUpdater.on('update-downloaded',()=>{updateReady=true;notifyUpdate('ready')});
 autoUpdater.on('error',e=>{log.error('Updater',e);notifyUpdate('unavailable',e.message||'Cannot reach update feed')});
 autoUpdater.checkForUpdates().catch(e=>log.warn('Update check',e.message));
}
function bounds(){if(!win||!view)return;const [w,h]=win.getContentSize();view.setBounds({x:0,y:56,width:w,height:Math.max(100,h-56)});view.setAutoResize({width:true,height:true})}
function state(){if(win&&!win.isDestroyed())win.webContents.send('portal-state',{active,canGoBack:!!(view&&view.webContents.canGoBack())})}
function closeView(){if(view){win.removeBrowserView(view);view.webContents.close();view=null}active=null;state()}
function home(){closeView();if(win&&!win.isDestroyed())win.webContents.executeJavaScript('window.desktopHome?.()').catch(()=>{})}
function external(url){const u=parse(url);if(u&&u.protocol==='https:')shell.openExternal(url).catch(()=>{})}
function openPortal(name){
 if(!Object.hasOwn(PORTALS,name)||!win||win.isDestroyed())return;
 closeView();active=name;
 view=new BrowserView({webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,partition:'persist:87freight-portals'}});
 win.setBrowserView(view);bounds();const wc=view.webContents;
 wc.setWindowOpenHandler(({url})=>{const other=portalName(url);if(other){openPortal(other);return{action:'deny'}};const u=parse(url);if(u&&u.protocol==='https:'){wc.loadURL(url).catch(()=>{});return{action:'deny'}};return{action:'deny'}});
 wc.on('will-navigate',(event,url)=>{const u=parse(url);if(!u||!['https:','about:'].includes(u.protocol))event.preventDefault()});
 wc.on('will-attach-webview',e=>e.preventDefault());wc.on('did-navigate',state);wc.on('did-navigate-in-page',state);
 wc.loadURL(PORTALS[name]).catch(err=>log.error('Portal',name,err));state();
}
function back(){if(view&&view.webContents.canGoBack())view.webContents.goBack();else home()}
function create(){
 win=new BrowserWindow({title:'87 Freight Desktop',width:1150,height:820,minWidth:760,minHeight:580,backgroundColor:'#111e32',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 win.on('resize',bounds);win.webContents.setWindowOpenHandler(({url})=>{const p=portalName(url);if(p)openPortal(p);else external(url);return{action:'deny'}});
 win.webContents.on('will-navigate',(event,url)=>{if(url.startsWith('file:'))return;event.preventDefault();const p=portalName(url);if(p)openPortal(p);else external(url)});
 win.webContents.on('will-attach-webview',e=>e.preventDefault());win.loadFile(path.join(__dirname,'shell.html'));
 win.webContents.once('did-finish-load',()=>setTimeout(initUpdates,2500));
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Navigation',submenu:[{label:'Home',accelerator:'Alt+Home',click:home},{label:'Back',accelerator:'Alt+Left',click:back},{label:'Reload Portal',accelerator:'CmdOrCtrl+R',click:()=>view?view.webContents.reload():win.reload()},{role:'quit'}]},{label:'Portals',submenu:Object.keys(PORTALS).map(n=>({label:n,click:()=>openPortal(n)}))}]));
}
app.whenReady().then(()=>{
 ipcMain.handle('update-check',()=>{if(app.isPackaged)return autoUpdater.checkForUpdates().then(()=>true).catch(e=>{notifyUpdate('unavailable',e.message);return false});return false});
 ipcMain.handle('update-restart',()=>{if(updateReady)autoUpdater.quitAndInstall(false,true)});
 ipcMain.handle('portal-open',(_e,name)=>openPortal(name));ipcMain.handle('portal-home',home);ipcMain.handle('portal-back',back);
 ipcMain.handle('portal-refresh',()=>{if(view)view.webContents.reloadIgnoringCache();else win.webContents.reloadIgnoringCache()});create();
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)create()});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
