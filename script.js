(function(){
  const STORAGE_KEY = 'notes-saver-v1';
  let notes = [];
  let activeId = null;

  const $notesList = document.getElementById('notesList');
  const $title = document.getElementById('titleInput');
  const $content = document.getElementById('contentInput');
  const $newBtn = document.getElementById('newBtn');
  const $saveBtn = document.getElementById('saveBtn');
  const $deleteBtn = document.getElementById('deleteBtn');
  const $exportBtn = document.getElementById('exportBtn');
  const $importBtn = document.getElementById('importBtn');
  const $importFile = document.getElementById('importFile');
  const $search = document.getElementById('searchInput');

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      notes = raw ? JSON.parse(raw) : [];
    }catch(e){
      console.error('Failed to load notes', e);
      notes = [];
    }
    renderList();
    if(notes.length){
      setActive(notes[0].id);
    } else {
      newNote();
    }
  }

  function saveToStorage(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  function uid(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  }

  function newNote(){
    activeId = null;
    $title.value = '';
    $content.value = '';
    clearActiveClass();
  }

  function setActive(id){
    const note = notes.find(n => n.id === id);
    if(!note) return;
    activeId = id;
    $title.value = note.title;
    $content.value = note.content;
    highlightActive();
  }

  function highlightActive(){
    Array.from($notesList.children).forEach(el => {
      el.classList.toggle('active', el.dataset.id === activeId);
    });
  }

  function clearActiveClass(){
    Array.from($notesList.children).forEach(el => el.classList.remove('active'));
  }

  function renderList(filter=""){
    $notesList.innerHTML = '';
    const items = notes.slice().sort((a,b)=> b.modifiedAt - a.modifiedAt);
    const q = filter.trim().toLowerCase();

    for(const n of items){
      if(q && !(n.title||'').toLowerCase().includes(q) && !(n.content||'').toLowerCase().includes(q)) continue;

      const div = document.createElement('div');
      div.className = 'note-item';
      div.dataset.id = n.id;
      div.innerHTML = `<strong>${escapeHtml(n.title||'(untitled)')}</strong>
      <div style="font-size:12px;color:#666">${new Date(n.modifiedAt).toLocaleString()}</div>`;

      div.addEventListener('click', ()=> setActive(n.id));
      $notesList.appendChild(div);
    }
    highlightActive();
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>\"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  $newBtn.addEventListener('click', newNote);

  $saveBtn.addEventListener('click', ()=>{
    const titleVal = $title.value.trim();
    const contentVal = $content.value;

    if(activeId){
      const note = notes.find(n=>n.id===activeId);
      if(note){
        note.title = titleVal;
        note.content = contentVal;
        note.modifiedAt = Date.now();
      }
    } else {
      const n = {id: uid(), title: titleVal, content: contentVal, modifiedAt: Date.now()};
      notes.push(n);
      activeId = n.id;
    }

    saveToStorage();
    renderList($search.value);
    alert('Saved.');
  });

  $deleteBtn.addEventListener('click', ()=>{
    if(!activeId){
      alert('No note selected to delete.');
      return;
    }
    if(!confirm('Delete this note?')) return;

    notes = notes.filter(n=>n.id!==activeId);
    saveToStorage();
    activeId = null;
    renderList($search.value);
    newNote();
  });

  $exportBtn.addEventListener('click', ()=>{
    const data = { exportedAt: Date.now(), notes };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'notes-saver-export-'+(new Date().toISOString().slice(0,19).replace(/[:T]/g,'-'))+'.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  $importBtn.addEventListener('click', ()=> $importFile.click());

  $importFile.addEventListener('change', (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;

    const reader = new FileReader();
    reader.onload = function(e){
      try{
        const parsed = JSON.parse(e.target.result);

        if(Array.isArray(parsed.notes)){
          const incoming = parsed.notes;
          const map = new Map(notes.map(n=>[n.id,n]));

          for(const n of incoming){
            if(!n.id) n.id = uid();
            map.set(n.id, n);
          }

          notes = Array.from(map.values());
          saveToStorage();
          renderList($search.value);
          alert('Import successful.');

        } else if(Array.isArray(parsed)){
          notes = parsed.map(n=> ({
            id: n.id || uid(),
            title: n.title || '',
            content: n.content || '',
            modifiedAt: n.modifiedAt || Date.now()
          }));

          saveToStorage();
          renderList($search.value);
          alert('Import successful.');
        } else {
          alert('No notes found.');
        }
      }catch(err){
        alert('Failed to parse JSON.');
      }
    };

    reader.readAsText(f);
    ev.target.value = '';
  });

  $search.addEventListener('input', ()=> renderList($search.value));

  $notesList.addEventListener('dblclick', ()=>{
    const first = notes.slice().sort((a,b)=> b.modifiedAt - a.modifiedAt)[0];
    if(first) setActive(first.id);
  });

  window.addEventListener('keydown', (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){
      e.preventDefault();
      $saveBtn.click();
    }
  });

  load();
})();
