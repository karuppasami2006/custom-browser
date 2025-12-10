// home.js — clock, favorites & search behavior for the homepage

const favorites = [
  { name: "Reddit", url: "https://www.reddit.com", icon: "https://www.redditstatic.com/icon.png" },
  { name: "GitHub", url: "https://github.com", icon: "https://github.githubassets.com/favicons/favicon.png" },
  { name: "YouTube", url: "https://www.youtube.com", icon: "https://www.youtube.com/s/desktop/2d2f3a2f/img/favicon_32.png" },
  { name: "StackOverflow", url: "https://stackoverflow.com", icon: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
  { name: "ChatGPT", url: "https://chat.openai.com", icon: "https://chat.openai.com/favicon.ico" },
  { name: "Google", url: "https://www.google.com", icon: "https://www.google.com/favicon.ico" },
];

function createFavorites() {
  const container = document.getElementById('favorites');
  favorites.forEach(f => {
    const a = document.createElement('a');
    a.className = 'fav';
    a.href = f.url;
    // open in same webview context so homepage is replaced by site
    a.target = '_self';
    a.innerHTML = `
      <div class="icon"><img src="${f.icon}" alt="${f.name}"></div>
      <div class="label">${f.name}</div>
    `;
    container.appendChild(a);
  });
}

function updateClock(){
  const el = document.getElementById('clock');
  if(!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initSearch(){
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchBtn');
  const engine = document.getElementById('engineSelect');

  function doSearch(q){
    if(!q) return;
    // if user typed URL-like (has dot) convert to https:// when necessary
    if(!q.includes(' ') && q.includes('.')) {
      let url = q;
      if(!/^https?:\/\//i.test(url)) url = 'https://' + url;
      window.location.href = url;
      return;
    }
    const target = engine.value + encodeURIComponent(q);
    window.location.href = target;
  }

  btn.addEventListener('click', ()=> doSearch(input.value.trim()));
  input.addEventListener('keydown', (e)=> { if(e.key === 'Enter') doSearch(input.value.trim()); });
}

document.addEventListener('DOMContentLoaded', ()=>{
  createFavorites();
  initSearch();
  updateClock();
  setInterval(updateClock, 60_000); // update every minute
});
