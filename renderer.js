// renderer.js - handles tabs, bookmarks, history, command palette, navigation
const DEFAULT_START = 'https://search.brave.com/';

// DOM refs
const viewContainer = document.getElementById('viewContainer');
const tabsListEl = document.getElementById('tabsList');
const bookmarksListEl = document.getElementById('bookmarksList');
const historyListEl = document.getElementById('historyList');

const newTabBtn = document.getElementById('newTabBtn');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const urlInput = document.getElementById('urlInput');
const goBtn = document.getElementById('goBtn');
const searchEngineEl = document.getElementById('searchEngine');

const bookmarkNameInput = document.getElementById('bookmarkName');
const addBookmarkBtn = document.getElementById('addBookmarkBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

const cmdBtn = document.getElementById('cmdBtn');
const cmdPalette = document.getElementById('cmdPalette');
const cmdInput = document.getElementById('cmdInput');
const cmdHints = document.getElementById('cmdHints');
const themeToggle = document.getElementById('themeToggle');

// Storage helpers
const STORAGE = {
  tabs: 'atom_tabs_v1',
  bookmarks: 'atom_bookmarks_v1',
  history: 'atom_history_v1',
  theme: 'atom_theme_v1'
};

let state = {
  tabs: [],
  activeId: null,
  bookmarks: JSON.parse(localStorage.getItem(STORAGE.bookmarks) || '[]'),
  history: JSON.parse(localStorage.getItem(STORAGE.history) || '[]'),
  theme: localStorage.getItem(STORAGE.theme) || 'dark'
};

function saveBookmarks(){ localStorage.setItem(STORAGE.bookmarks, JSON.stringify(state.bookmarks)) }
function saveHistory(){ localStorage.setItem(STORAGE.history, JSON.stringify(state.history)) }
function applyTheme(){ document.documentElement.setAttribute('data-theme', state.theme); localStorage.setItem(STORAGE.theme, state.theme) }

// Utility: format input to URL or search
function formatInput(text){
  if(!text) return DEFAULT_START;
  text = text.trim();
  if(/^[a-zA-Z]+:\/\/|^data:/.test(text)) return text;
  if(text.includes(' ')) {
    const base = searchEngineEl.value;
    return base + encodeURIComponent(text);
  }
  if(text.includes('.')) {
    return text.startsWith('http') ? text : 'https://' + text;
  }
  return searchEngineEl.value + encodeURIComponent(text);
}

// TAB MANAGEMENT
function renderTabs(){
  tabsListEl.innerHTML = '';
  state.tabs.forEach(t=>{
    const el = document.createElement('div');
    el.className = 'tab-item' + (t.id===state.activeId ? ' active':'');
    el.innerHTML = `<div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title||t.url}</div>
      <div style="display:flex;gap:6px;align-items:center">
        <button data-id="${t.id}" class="tab-switch secondary">↗</button>
        <button data-id="${t.id}" class="tab-close">✕</button>
      </div>`;
    el.querySelector('.tab-switch').addEventListener('click', ()=> switchTab(t.id));
    el.querySelector('.tab-close').addEventListener('click', ()=> closeTab(t.id));
    tabsListEl.appendChild(el);
  });
}

function createWebview(url){
  const w = document.createElement('webview');
  w.setAttribute('src', url || DEFAULT_START);
  w.setAttribute('partition', 'persist:webview');
  w.setAttribute('allowpopups', '');
  w.style.display = 'none';
  w.addEventListener('did-navigate', (e)=> onNavigate(e.url));
  w.addEventListener('did-navigate-in-page', (e)=> onNavigate(e.url));
  w.addEventListener('page-title-updated', (e)=> {
    const t = state.tabs.find(x=>x.webview===w);
    if(t){ t.title = e.title; renderTabs(); }
  });
  return w;
}

function newTab(url){
  const webview = createWebview(url);
  viewContainer.appendChild(webview);
  const id = Date.now() + Math.floor(Math.random()*1000);
  const tab = { id, webview, url: url||DEFAULT_START, title: 'New Tab' };
  state.tabs.push(tab);
  switchTab(id);
  renderTabs();
  return id;
}

function switchTab(id){
  state.tabs.forEach(t=>{
    if(t.id===id){
      t.webview.style.display = 'block';
      state.activeId = id;
      // sync url input
      try{ urlInput.value = t.webview.getURL() || t.url }catch(e){}
    } else {
      t.webview.style.display = 'none';
    }
  });
  renderTabs();
}

function closeTab(id){
  const idx = state.tabs.findIndex(t=>t.id===id);
  if(idx===-1) return;
  const tab = state.tabs[idx];
  // remove webview from DOM and memory
  try{ tab.webview.remove(); } catch(e){}
  state.tabs.splice(idx,1);
  if(state.activeId===id){
    if(state.tabs.length) switchTab(state.tabs[Math.max(0, idx-1)].id);
    else newTab(DEFAULT_START);
  }
  renderTabs();
}

// NAV & URL
function getActiveWebview(){
  return (state.tabs.find(t=>t.id===state.activeId) || {}).webview;
}
function navigateTo(input){
  const url = formatInput(input);
  const webview = getActiveWebview();
  if(!webview) return;
  webview.loadURL(url);
  // add to history
  state.history.unshift({ url, ts: Date.now() });
  if(state.history.length>200) state.history.length = 200;
  saveHistory();
  renderHistory();
}

// EVENTS
function onNavigate(url){
  urlInput.value = url;
  const active = state.tabs.find(t=>t.id===state.activeId);
  if(active){ active.url = url; active.title = active.title || url; renderTabs(); }
  // push to history
  state.history.unshift({ url, ts: Date.now() });
  if(state.history.length>200) state.history.length = 200;
  saveHistory();
  renderHistory();
}

// BOOKMARKS & HISTORY UI
function renderBookmarks(){
  bookmarksListEl.innerHTML = '';
  state.bookmarks.forEach((b, i)=>{
    const el = document.createElement('div');
    el.className = 'bookmark-item';
    el.innerHTML = `<div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.name}</div>
      <div style="display:flex;gap:8px">
        <button class="open-bookmark" data-i="${i}">⤴</button>
        <button class="delete-bookmark" data-i="${i}">✕</button>
      </div>`;
    el.querySelector('.open-bookmark').addEventListener('click', ()=> {
      const b = state.bookmarks[parseInt(el.querySelector('.open-bookmark').dataset.i)];
      newTab(b.url); // open in new tab
    });
    el.querySelector('.delete-bookmark').addEventListener('click', ()=> {
      state.bookmarks.splice(parseInt(el.querySelector('.delete-bookmark').dataset.i),1);
      saveBookmarks(); renderBookmarks();
    });
    bookmarksListEl.appendChild(el);
  });
}

function renderHistory(){
  historyListEl.innerHTML = '';
  state.history.slice(0,50).forEach((h, i)=>{
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `<div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.url}</div>
      <div style="color:var(--muted);font-size:12px">${new Date(h.ts).toLocaleTimeString()}</div>`;
    el.addEventListener('click', ()=> newTab(h.url));
    historyListEl.appendChild(el);
  });
}

// COMMAND PALETTE
function showCmdPalette(){
  cmdPalette.classList.remove('hidden');
  cmdInput.value = '';
  cmdInput.focus();
  updateCmdHints('');
}
function hideCmdPalette(){ cmdPalette.classList.add('hidden'); }
function updateCmdHints(text){
  const t = text.toLowerCase();
  const hints = [];
  if(!t) hints.push('Commands: new tab, open <url>, toggle theme, bookmarks, history');
  if(t.startsWith('new')) hints.push('Type: new tab (open with default homepage)');
  if(t.startsWith('open ')) hints.push('Type: open https://example.com or open google.com');
  if(t.startsWith('toggle')) hints.push('toggle theme');
  cmdHints.textContent = hints.join(' • ');
}
function executeCmd(text){
  const t = text.trim();
  if(t==='new tab') newTab(DEFAULT_START);
  else if(t.startsWith('open ')) {
    const url = t.slice(5).trim();
    newTab(formatInput(url));
  }
  else if(t==='toggle theme'){
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  } else if(t==='bookmarks') {
    // focus bookmarks area (no fancy scroll here)
    alert('Bookmarks are in the left sidebar.');
  } else if(t==='history') {
    alert('History is in the left sidebar.');
  } else {
    // fallback: try navigate in active tab
    navigateTo(t);
  }
  hideCmdPalette();
}

// RENDERERS FOR LEFT SIDE
function bindUI(){
  newTabBtn.addEventListener('click', ()=> newTab(DEFAULT_START));
  goBtn.addEventListener('click', ()=> navigateTo(urlInput.value));
  urlInput.addEventListener('keydown', e=> { if(e.key==='Enter') navigateTo(urlInput.value); });

  backBtn.addEventListener('click', ()=> {
    const w = getActiveWebview(); if(w && w.canGoBack()) w.goBack();
  });
  forwardBtn.addEventListener('click', ()=> {
    const w = getActiveWebview(); if(w && w.canGoForward()) w.goForward();
  });
  reloadBtn.addEventListener('click', ()=> {
    const w = getActiveWebview(); if(w) w.reload();
  });

  addBookmarkBtn.addEventListener('click', ()=>{
    const w = getActiveWebview();
    const name = bookmarkNameInput.value.trim() || (w ? (w.getTitle && w.getTitle()) : 'Bookmark');
    const url = w ? (w.getURL ? w.getURL() : '') : urlInput.value;
    if(!url) return alert('No url to bookmark');
    state.bookmarks.push({ name, url });
    saveBookmarks(); renderBookmarks(); bookmarkNameInput.value='';
  });

  clearHistoryBtn.addEventListener('click', ()=> {
    state.history = []; saveHistory(); renderHistory();
  });

  // command palette
  cmdBtn.addEventListener('click', showCmdPalette);
  cmdInput.addEventListener('input', (e)=> updateCmdHints(e.target.value));
  cmdInput.addEventListener('keydown', (e)=> {
    if(e.key==='Enter') executeCmd(e.target.value);
    if(e.key==='Escape') hideCmdPalette();
  });

  // keyboard shortcuts
  window.addEventListener('keydown', (e)=> {
    if(e.ctrlKey && e.key.toLowerCase()==='k'){ e.preventDefault(); showCmdPalette(); }
    if(e.ctrlKey && e.key.toLowerCase()==='t'){ e.preventDefault(); newTab(DEFAULT_START); }
    if(e.ctrlKey && e.key.toLowerCase()==='w'){ e.preventDefault(); closeTab(state.activeId); }
  });

  themeToggle.addEventListener('click', ()=> {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  });
}

// Initialization
function init(){
  applyTheme();
  bindUI();

  // start with one tab
  if(state.tabs.length===0) newTab(DEFAULT_START);
  renderTabs();
  renderBookmarks();
  renderHistory();
}

// Expose functions for tab close/switch from sidebar items
function attachTabUIButtons(){
  // handled in renderTabs
}

// Start
init();
