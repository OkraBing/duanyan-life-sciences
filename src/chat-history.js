/* 与全部对话共用 SESSIONS / CONV，搜索只刷新列表，不重建正在编辑的正文。 */
function researchHistoryList(){
  const host=document.querySelector('.history-list');if(!host)return;
  const scroll=host.scrollTop;
  const sessions=SESSIONS.filter(x=>!x.arch);
  const today=nowStamp().slice(0,10), yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const yd=[yesterday.getFullYear(),String(yesterday.getMonth()+1).padStart(2,'0'),String(yesterday.getDate()).padStart(2,'0')].join('-');
  const group=x=>x.pin?'置顶':String(x.at||'').startsWith(today)||String(x.at||'').startsWith('今天')?'今天':String(x.at||'').startsWith(yd)||String(x.at||'').startsWith('昨天')?'昨天':'更早';
  host.innerHTML=['置顶','今天','昨天','更早'].map(g=>{
    const rows=sessions.filter(x=>group(x)===g).sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
    return rows.length?`<h3 class="history-group">${g}</h3>`+rows.map(x=>{
      const project=DB.projects.find(p=>p.id===x.pid);
      return `<div class="history-item${S.sid===x.id?' is-current':''}"><button type="button" class="history-open" data-history-open="${esc(x.id)}" ${S.sid===x.id?'aria-current="page"':''} title="${esc(x.title||'未命名对话')}"><span class="history-title">${esc(x.title||'未命名对话')}</span><span class="history-meta">${esc(project?project.name:'未关联课题')} · ${esc(x.at||'')}</span></button><button type="button" class="history-more" data-history-more="${esc(x.id)}" aria-label="更多：${esc(x.title||'未命名对话')}">···</button></div>`;
    }).join(''):'';
  }).join('')||`<p class="history-empty">暂无历史对话，发送问题后会自动保存在这里。</p>`;
  host.scrollTop=scroll;
  host.querySelectorAll('[data-history-open]').forEach(b=>b.onclick=()=>{
    const x=SESSIONS.find(x=>x.id===b.dataset.historyOpen);if(x)openSession(x);
  });
  host.querySelectorAll('[data-history-more]').forEach(b=>b.onclick=()=>sessMenu(b,b.dataset.historyMore));
}
function paintResearchHistory(){
  let panel=document.getElementById('chatHistory');
  if(S.route!=='chat'){if(panel)panel.hidden=true;return}
  const messages=convOf(),id=S.sid||'new';
  if(messages.length&&!SESSIONS.some(x=>x.id===id)){
    const first=(messages.find(m=>m.role==='me')||{}).text||'未命名对话';
    SESSIONS.unshift({id,title:first.slice(0,40),pid:S.bind||null,at:nowStamp(),q:null});
  }
  if(!panel){
    panel=document.createElement('aside');panel.id='chatHistory';panel.className='chat-history';panel.setAttribute('aria-label','历史对话');
    panel.innerHTML=`<div class="chat-history-head"><strong>科研对话</strong><button type="button" class="history-search-trigger" aria-label="搜索对话" title="搜索对话" aria-haspopup="dialog">${SEARCH_IC}</button></div><button type="button" class="btn history-new">＋ 新建对话</button><div class="history-list" id="historyBody"></div><div class="history-foot">对话保存在当前浏览器</div>`;
    document.getElementById('main').prepend(panel);
    panel.querySelector('.history-new').onclick=()=>newChat();
    panel.querySelector('.history-search-trigger').onclick=()=>openHistorySearch();
  }
  panel.hidden=false;
  researchHistoryList();
}


/* 搜索在独立弹层完成，输入时不改变侧栏范围或正在编辑的对话。 */
function openHistorySearch(){
  let dialog=document.getElementById('historySearchDialog');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='historySearchDialog';dialog.className='history-search-dialog';
    dialog.setAttribute('aria-labelledby','historySearchTitle');
    dialog.innerHTML=`<div class="history-search-dialog-head"><h2 id="historySearchTitle">搜索对话</h2><button type="button" class="history-search-close" aria-label="关闭搜索">×</button></div><label class="history-search-field">${SEARCH_IC}<span class="sr">搜索对话关键词</span><input type="search" aria-label="搜索对话关键词" placeholder="输入标题、课题或对话内容" autocomplete="off"></label><p class="history-search-count" role="status" aria-live="polite"></p><div class="history-search-results"></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.history-search-close').onclick=()=>dialog.close();
    dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dialog.close()}});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
    dialog.querySelector('input').oninput=()=>paintHistorySearch(dialog);
    dialog.querySelector('input').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();dialog.querySelector('[data-history-result]')?.click()}};
  }
  dialog.querySelector('input').value='';paintHistorySearch(dialog);dialog.showModal();dialog.querySelector('input').focus();
}
function paintHistorySearch(dialog){
  const term=dialog.querySelector('input').value.trim().toLowerCase();
  const project=x=>DB.projects.find(p=>p.id===x.pid)?.name||'未关联课题';
  const rows=SESSIONS.filter(x=>!term||[x.title,x.q,project(x),...(CONV[x.id]||[]).map(m=>m.text||'')].join(' ').toLowerCase().includes(term))
    .slice().sort((a,b)=>(!!b.pin-!!a.pin)||String(b.at||'').localeCompare(String(a.at||'')));
  dialog.querySelector('.history-search-count').textContent=term?`找到 ${rows.length} 条对话`:`全部 ${rows.length} 条对话`;
  const results=dialog.querySelector('.history-search-results');results.scrollTop=0;
  results.innerHTML=rows.map(x=>`<button type="button" class="history-search-result" data-history-result="${esc(x.id)}"><span class="history-title">${esc(x.title||'未命名对话')}</span><span class="history-meta">${esc(project(x))} · ${esc(x.at||'')}${x.arch?' · 已归档':''}${x.pin?' · 置顶':''}</span></button>`).join('')||`<p class="history-empty">${term?'没有找到匹配的对话，试试其他关键词。':'暂无历史对话。'}</p>`;
  results.querySelectorAll('[data-history-result]').forEach(b=>b.onclick=()=>{const x=SESSIONS.find(x=>x.id===b.dataset.historyResult);if(!x)return;dialog.close();openSession(x)});
}
