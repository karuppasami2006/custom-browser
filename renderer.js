// renderer.js — tab manager, navigation, bookmarks, simple Zen features

const DEFAULT_START = `file://D:\custom-browser/home/home.html`;


const viewContainer = document.getElementById('viewContainer');
const tabsList = document.getElementById('tabsList');
const bookmarksList = document.getElementById('bookmarksList');

const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const goBtn = document.getElementById('goBtn');
const urlInput = document.getElementById('urlInput');
const engineSelect = document.getElementById('engineSelect');

const tabsBtn = document.getElementById('tabsBtn');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const themeBtn = document.getElementById('themeBtn');

const STORAGE_BOOKMARKS = 'zen_bookmarks_v1';

let state = {
  tabs: [],
  activeId: null,
  bookmarks: JSON.parse(localStorage.getItem(STORAGE_BOOKMARKS) || '[]'),
  theme: 'dark'
};

// utils
function formatInput(text){
  if(!text) return DEFAULT_START;
  text = text.trim();
  if(/^[a-zA-Z]+:\/\//.test(text) || text.startsWith('data:')) return text;
  if(text.includes(' ')) return engineSelect.value + encodeURIComponent(text);
  if(text.includes('.')) return text.startsWith('http') ? text : 'https://' + text;
  return engineSelect.value + encodeURIComponent(text);
}

// webview creation & tab system (robust)
function createWebview(url){
  const w = document.createElement('webview');
  w.setAttribute('src', url || DEFAULT_START);
  w.setAttribute('partition', 'persist:zen');
  w.setAttribute('allowpopups', '');
  w.classList.add('hiddenTab');
  w.style.position = 'absolute';
  w.style.inset = '0';
  w.style.width = '100%';
  w.style.height = '100%';
  w.style.border = 'none';
  w.style.willChange = 'transform, opacity';
  w.addEventListener('did-navigate', (e) => onNavigate(e.url));
  w.addEventListener('did-navigate-in-page', (e) => onNavigate(e.url));
  w.addEventListener('page-title-updated', (e) => {
    const t = state.tabs.find(x => x.webview === w);
    if(t){ t.title = e.title; renderTabs(); }
  });
  return w;
}

function newTab(url){
  const webview = createWebview(url);
  viewContainer.appendChild(webview);
  const id = Date.now() + Math.floor(Math.random()*1000);
  const tab = { id, webview, url: url || DEFAULT_START, title: 'New Tab' };
  state.tabs.push(tab);
  switchTab(id);
  renderTabs();
  return id;
}

function switchTab(id){
  const target = state.tabs.find(t => t.id === id);
  if(!target) return;
  state.tabs.forEach(t=>{
    if(!t.webview) return;
    if(t.id === id){
      t.webview.classList.remove('hiddenTab');
      t.webview.classList.add('activeTab');
      try { viewContainer.appendChild(t.webview); } catch(e){}
      t.webview.style.transform = 'translateZ(0)';
    } else {
      t.webview.classList.remove('activeTab');
      t.webview.classList.add('hiddenTab');
    }
  });
  state.activeId = id;
  setTimeout(()=> {
    const active = getActiveWebview();
    try { urlInput.value = active ? (active.getURL() || target.url) : ''; } catch(e){}
  }, 50);
  renderTabs();
}

function closeTab(id){
  const idx = state.tabs.findIndex(t => t.id === id);
  if(idx === -1) return;
  const tab = state.tabs[idx];
  try { tab.webview.remove(); } catch(e){}
  state.tabs.splice(idx,1);
  if(state.activeId === id){
    if(state.tabs.length) switchTab(state.tabs[Math.max(0, idx-1)].id);
    else newTab(DEFAULT_START);
  } else {
    renderTabs();
  }
}

function getActiveWebview(){ return (state.tabs.find(t => t.id === state.activeId) || {}).webview; }

function onNavigate(url){
  urlInput.value = url;
  const active = state.tabs.find(t => t.id === state.activeId);
  if(active){ active.url = url; renderTabs(); }
}

// UI rendering
function renderTabs(){
  tabsList.innerHTML = '';
  state.tabs.forEach(t=>{
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title || t.url}</div>
      <div style="display:flex;gap:6px">
        <button class="tab-switch" data-id="${t.id}">⤴</button>
        <button class="tab-close" data-id="${t.id}">✕</button>
      </div>`;
    el.querySelector('.tab-switch').addEventListener('click', ()=> switchTab(t.id));
    el.querySelector('.tab-close').addEventListener('click', ()=> closeTab(t.id));
    if(t.id === state.activeId) el.style.outline = '2px solid rgba(75,139,255,0.12)';
    tabsList.appendChild(el);
  });
}

function renderBookmarks(){
  bookmarksList.innerHTML = '';
  state.bookmarks.forEach((b, i)=>{
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.name}</div>
      <div style="display:flex;gap:6px">
        <button class="open-bm" data-i="${i}">⤴</button>
        <button class="del-bm" data-i="${i}">✕</button>
      </div>`;
    el.querySelector('.open-bm').addEventListener('click', ()=> newTab(b.url));
    el.querySelector('.del-bm').addEventListener('click', ()=> {
      state.bookmarks.splice(parseInt(el.querySelector('.del-bm').dataset.i),1);
      saveBookmarks(); renderBookmarks();
    });
    bookmarksList.appendChild(el);
  });
}

function saveBookmarks(){ localStorage.setItem(STORAGE_BOOKMARKS, JSON.stringify(state.bookmarks)) }

// toolbar actions & bindings
function bindUI(){
  newTab(DEFAULT_START); // start with one tab

  goBtn.addEventListener('click', ()=> navigate(urlInput.value));
  urlInput.addEventListener('keydown', e => { if(e.key==='Enter') navigate(urlInput.value); });

  backBtn.addEventListener('click', ()=> { const w = getActiveWebview(); if(w && w.canGoBack()) w.goBack(); });
  forwardBtn.addEventListener('click', ()=> { const w = getActiveWebview(); if(w && w.canGoForward()) w.goForward(); });
  reloadBtn.addEventListener('click', ()=> { const w = getActiveWebview(); if(w) w.reload(); });

  tabsBtn.addEventListener('click', ()=> newTab(DEFAULT_START));

  bookmarkBtn.addEventListener('click', ()=>{
    const w = getActiveWebview();
    const url = w ? (w.getURL ? w.getURL() : '') : urlInput.value;
    const name = url || 'Bookmark';
    state.bookmarks.push({ name, url });
    saveBookmarks(); renderBookmarks();
  });

  themeBtn.addEventListener('click', ()=> {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });

  // keyboard shortcuts
  window.addEventListener('keydown', (e)=>{
    if(e.ctrlKey && e.key.toLowerCase()==='t'){ e.preventDefault(); newTab(DEFAULT_START); }
    if(e.ctrlKey && e.key.toLowerCase()==='w'){ e.preventDefault(); closeTab(state.activeId); }
    if(e.ctrlKey && e.key.toLowerCase()==='l'){ e.preventDefault(); urlInput.focus(); urlInput.select(); }
  });
}

function navigate(text){
  const url = formatInput(text);
  const w = getActiveWebview();
  if(!w) return;
  w.loadURL(url);
}

// initialisation
function init(){
  bindUI();
  renderBookmarks();
  // cleanup duplicates if any (hotfix)
  const all = Array.from(document.querySelectorAll('webview'));
  if(all.length > state.tabs.length){
    // keep newest webviews already tracked; remove others
    all.forEach(w=>{
      const found = state.tabs.some(t=>t.webview === w);
      if(!found) try{ w.remove(); }catch(e){}
    });
  }
}
init();
