/* Global navigation groups and settings routes. */
Object.assign(NAV_PARENT,{shared:'projects',sharednew:'projects',shareddetail:'projects',me:'settings',set:'settings',files:'materials',chats:'chat',project:'projects',pw:'projects'});
Object.assign(NAVNAME,{projects:'课题项目',shared:'共享项目',dsets:'数据集',mdl:'模型',tools:'工具',shelf:'科研工具',data:'公共数据库',settings:'设置'});
Object.assign(BACKNAME,{projects:'课题项目',settings:'设置'});
NAV_ROUTE.shared=1;
NAV_ROUTE.settings=NAV_ROUTE.me=NAV_ROUTE.set=1;
const navigationProjectViews={projects:V.projects,shared:V.shared};
function navigationProjectSharedLabel(card,shared){
 card.querySelector('.pcard-st')?.remove();
 if(shared)card.querySelector('.pcard-t')?.insertAdjacentHTML('beforeend','<span class="navigation-project-source">共享</span>');
}
function navigationProjectProgress(p,shared){
 let kind='',label='',title='',detail='',action='',task=null,at='',percent=null;
 if(!p){
  if(!shared)return '';
  kind='empty';label='项目进展';title='暂无进展记录';detail='可进入项目查看团队已共享的研究资产。';action='查看项目';
 }else
 {
  const tasks=(workbenchData({pid:p.id}).tasks||[]).filter(t=>t.pid===p.id&&t.isTask!==false&&!['canceled'].includes(t.status));
  const member=shared?.members.find(m=>m.id==='me'&&m.status==='active');
  const editable=shared?['owner','admin','editor'].includes(member?.role):can('edit')&&(p.ownerId||'me')==='me';
  const pending=editable?tasks.filter(t=>t.needsAction||t.status==='failed'):[];
  const active=tasks.filter(t=>['active','queued'].includes(t.status));
  const completed=tasks.filter(t=>t.status==='done').sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
  if(pending.length){
   task=pending[0];kind='confirm';label='待我处理';title=pending.length+' 项任务待处理';
   detail=(task.name||task.id)+' · '+(task.detail||task.label||'请查看并处理');action='查看并处理';
  }else if(active.length){
   task=active[0];kind='running';label='正在执行';title=task.name||task.id;
   detail=task.detail||task.label||'任务正在执行';action='查看任务';
   if(Number.isFinite(task.progress))percent=Math.min(100,Math.max(0,task.progress));
  }else if(completed.length){
   task=completed[0];kind='summary';label='最近进展';title=task.name||task.id;
   detail=task.detail||task.label||'已有任务结果可查看';action='查看进展';
  }else if((p.returned||0)>0){
   kind='summary';label='进展概括';title='已积累 '+p.returned+' 条回流结果';
   detail='共 '+(p.rounds?.length||1)+' 轮研究记录，可进入课题查看已有结果。';action='查看进展';at=p.updated||'';
  }else if(!tasks.length&&!(p.kb||[]).length&&!(p.tools||[]).length&&!(p.arch||[]).length&&!(p.models||[]).length&&!(p.dsets||[]).length&&!(p.variants||0)){
   if(!editable)return '';
   return '<div class="project-start"><span>从一个研究问题开始</span><button class="project-update-action" type="button" data-project-progress-pid="'+esc(p.id)+'">开始科研对话 →</button></div>';
  }else return '';
  if(task)at=task.at||'';
 }
 const attrs=kind==='confirm'?'data-project-progress-pending="'+esc(p.id)+'"':task?'data-project-progress-task="'+esc(task.key)+'"':p?'data-project-progress-pid="'+esc(p.id)+'"':'data-project-progress-shared="'+esc(shared.id)+'"';
 return '<div class="navigation-progress project-update is-'+kind+'"><div class="project-update-head"><span>'+label+'</span>'+(at?'<time>'+esc(at)+'</time>':'')+'</div><strong>'+esc(title)+'</strong><p>'+esc(detail)+'</p>'+(percent!==null?'<div class="project-task-progress"><span>当前任务进度 '+percent+'%</span><progress value="'+percent+'" max="100" aria-label="当前任务进度 '+percent+'%"></progress></div>':'')+'<button class="project-update-action" type="button" '+attrs+'>'+action+' →</button></div>';
}
V.projects=()=>{
 const template=document.createElement('template');template.innerHTML=navigationProjectViews.projects();
 const heading=template.content.querySelector('h1');if(heading)heading.textContent='课题项目';
 const create=template.content.querySelector('[data-act="newproj"]');
 if(create){create.textContent='＋ 新建课题';create.insertAdjacentHTML('beforebegin','<button class="btn" type="button" data-project-join>申请加入课题</button>');}
 const description=template.content.querySelector('.projects-header p');if(description)description.textContent='我的项目 · 包含我创建的和共享给我的项目';
 let grid=template.content.querySelector('.pgrid');
 if(!grid){const section=template.content.querySelector('section');if(section){section.querySelector('.empty')?.remove();grid=document.createElement('div');grid.className='pgrid';section.appendChild(grid);}}
 if(!grid)return template.innerHTML;
 const ownIds=new Set();
 grid.querySelectorAll('[data-proj]').forEach(card=>{
  const p=rsProject(card.dataset.proj);ownIds.add(card.dataset.proj);
  card.querySelectorAll('[data-project-shared]').forEach(b=>b.remove());
  navigationProjectSharedLabel(card,!!rsProjectShared(p.id));
  card.insertAdjacentHTML('afterend',navigationProjectProgress(p,rsProjectShared(p.id)));
  card.parentElement.insertAdjacentHTML('beforeend',navigationProjectTeam(p,rsProjectShared(p.id)));
 });
 const shared=document.createElement('template');shared.innerHTML=navigationProjectViews.shared();
 const inbox=shared.content.querySelector('.request-inbox');
 if(inbox)grid.before(inbox);
 const query=(S.pq||'').trim().toLowerCase();
 shared.content.querySelectorAll('[data-rs-open]').forEach(card=>{
  const record=RS.data.shared.find(x=>x.id===card.dataset.rsOpen);
  if(!record||ownIds.has(record.projectId))return;
  // Ownership is independent of whether the project has been shared.
  if(record.owner==='me'&&DB.projects.some(p=>p.id===record.projectId&&(p.ownerId||'me')==='me'))return;
  if(query&&!(record.name+' '+(record.goal||'')+' '+card.textContent).toLowerCase().includes(query))return;
  card.querySelectorAll('[data-project-shared]').forEach(b=>b.remove());
  navigationProjectSharedLabel(card,true);
  card.querySelector('.pcard-f')?.insertAdjacentHTML('beforebegin',navigationProjectProgress(rsProject(record.projectId),record));
  const wrap=document.createElement('div');wrap.className='project-card-wrap';wrap.appendChild(card);wrap.insertAdjacentHTML('beforeend',navigationProjectTeam(rsProject(record.projectId),record));grid.appendChild(wrap);
 });
 grid.querySelectorAll('.project-card-wrap').forEach(wrap=>{
  const stats=wrap.querySelector('.pcard-f'),team=wrap.querySelector('.project-team-row');
  const update=wrap.querySelector('.project-update');if(update)wrap.querySelector('.pcard')?.after(update);
  if(stats&&team){const footer=document.createElement('div');footer.className='project-card-footer';stats.before(footer);wrap.appendChild(footer);footer.append(stats,team);}
 });
 const count=grid.children.length;
 template.content.querySelector('.sec-h')?.remove();
 if(!count)grid.insertAdjacentHTML('afterend','<div class="empty">没有匹配的项目，请换个关键词试试。</div>');
 return template.innerHTML;
};
// Keep old shared links usable while showing the unified project list.
V.shared=()=>V.projects();
function settingsLayout(current,content){
 const items=[['settings','常规设置'],['set','模型接入']];
 return `<div class="settings-layout">
  <nav class="settings-menu" aria-label="设置分类">
   ${items.map(([route,name])=>`<a href="#${route}" data-go="${route}"${route===current?' aria-current="page"':''}>${name}</a>`).join('')}
  </nav>
  ${content}
 </div>`;
}
const navigationGeneralSettings=V.me;
V.me=V.settings=()=>{
 const template=document.createElement('template');template.innerHTML=navigationGeneralSettings();
 const heading=template.content.querySelector('h1');
 heading.classList.remove('sr');
 heading.textContent='设置';
 return settingsLayout('settings',template.innerHTML);
};
const navigationModelSettings=V.set;
V.set=()=>settingsLayout('set',navigationModelSettings());
// One fixed tooltip escapes the sidebar scroll container, including short window heights.
const navigationTip=document.createElement('div');navigationTip.id='navigation-tooltip';navigationTip.className='navigation-tooltip';navigationTip.setAttribute('role','tooltip');navigationTip.hidden=true;document.body.appendChild(navigationTip);
function navigationHideTip(){navigationTip.hidden=true;document.querySelectorAll('[aria-describedby="navigation-tooltip"]').forEach(b=>b.removeAttribute('aria-describedby'));}
function navigationShowTip(button){
 navigationHideTip();if(!S.collapsed||matchMedia('(max-width:860px)').matches)return;
 const rect=button.getBoundingClientRect();navigationTip.textContent=button.getAttribute('aria-label')||button.textContent.trim();
 navigationTip.hidden=false;navigationTip.style.left=(rect.right+12)+'px';navigationTip.style.top=Math.max(8,Math.min(innerHeight-navigationTip.offsetHeight-8,rect.top+(rect.height-navigationTip.offsetHeight)/2))+'px';button.setAttribute('aria-describedby','navigation-tooltip');
}
const navigationOriginalPaint=paintNav;
paintNav=function(force){
 navigationHideTip();navigationOriginalPaint(force);
 document.querySelectorAll('#side .nav[data-navid]').forEach(b=>{
  const label=b.querySelector('.nav-tx')?.textContent||b.textContent.trim();b.setAttribute('aria-label',label);b.title=S.collapsed?'':label;
  if(b.dataset.navigationBound)return;b.dataset.navigationBound='1';
  b.addEventListener('mouseenter',()=>navigationShowTip(b));b.addEventListener('mouseleave',navigationHideTip);
  b.addEventListener('focus',()=>navigationShowTip(b));b.addEventListener('blur',navigationHideTip);b.addEventListener('click',navigationHideTip);
 });
};
document.getElementById('side').addEventListener('scroll',navigationHideTip);
window.addEventListener('resize',navigationHideTip);
document.addEventListener('keydown',e=>{if(e.key==='Escape')navigationHideTip();});

function navigationProjectTeam(p,s){
 const members=s?s.members.filter(m=>m.status==='active'):[{name:'我'}];
 const role=s?.members.find(m=>m.id==='me'&&m.status==='active')?.role;
 const manage=s?['owner','admin'].includes(role):can('edit')&&(p?.ownerId||'me')==='me';
 const add=manage?'<span class="project-team-add" aria-hidden="true">＋</span>':'';
 const avatars=members.slice(0,3).map(m=>'<span class="project-team-avatar" title="'+esc(m.name)+'">'+esc(m.name.slice(0,1))+'</span>').join('');
 return '<div class="project-team-row"><button class="project-team-avatars" type="button" data-project-members="'+esc(s?.id||'')+'" data-project-members-pid="'+esc(p?.id||'')+'" aria-label="查看成员：'+esc(s?.name||p?.name||'课题')+'" title="'+members.length+' 位成员">'+avatars+add+'</button></div>';
}
function navigationTeamOpen(s,invite){
 RS.sharedPick=s.id;LS.set('rs_shared_pick',s.id);RS.actor='me';
 if(!rsCan(s,'read'))throw new Error('当前账号没有成员访问权限');
 if(invite&&rsCan(s,'manage'))rsInviteDialog();else rsMembersDialog();
}
function navigationJoinDialog(){
 if(!RS.ready||RS.error){toast(RS.error||'课题数据仍在加载，请稍后重试');return;}
 modal('申请加入课题','<label class="rs-field"><span>课题编号 *</span><input class="input" id="project-join-code" placeholder="请输入课题创建者提供的共享课题编号" maxlength="100"></label><label class="rs-field"><span>申请说明</span><textarea class="input" id="project-join-reason" maxlength="500" rows="3" placeholder="介绍研究方向与协作目的"></textarea></label><p class="rs-help">申请通过后加入课题；当前申请仅保存在本机工作空间。</p>','提交申请',()=>rsModalSave(async()=>{
 const code=document.getElementById('project-join-code').value.trim(),reason=document.getElementById('project-join-reason').value.trim();
 if(!code)throw new Error('请填写课题编号');
 const shared=RS.data.shared.find(s=>s.id===code);
 if(!shared)throw new Error('未找到该课题，请核对共享课题编号');
 if(shared.members.some(m=>m.id==='me'&&m.status==='active'))throw new Error('你已加入该课题');
 if((shared.joinRequests||[]).some(r=>r.actor==='me'&&r.state==='pending'))throw new Error('已有待审批申请，请等待创建者处理');
 const next=rsClone(RS.data),target=next.shared.find(s=>s.id===code);
 (target.joinRequests||(target.joinRequests=[])).push({id:rsId('join'),actor:'me',name:'我',reason,state:'pending',at:nowStamp()});await rsSave(next);toast('加入申请已保存，等待审批');
 }));
}
const navigationMembersDialog=rsMembersDialog;
rsMembersDialog=function(){
 navigationMembersDialog();const s=rsShared(),d=document.getElementById('dlg');if(!s||!d.open)return;
 const body=d.querySelector('.card-b');body.insertAdjacentHTML('afterbegin','<p class="rs-help">共享课题编号：<code>'+esc(s.id)+'</code></p>');
 if(!rsCan(s,'manage'))return;
 const requests=(s.joinRequests||[]).filter(r=>r.state==='pending');
 if(requests.length)body.insertAdjacentHTML('beforeend','<h3>加入申请</h3>'+requests.map(r=>'<div class="rs-member"><div><strong>'+esc(r.name)+'</strong><p>'+esc(r.reason||'未填写申请说明')+'</p></div><button class="btn" type="button" data-project-review="'+esc(r.id)+'" data-decision="rejected">拒绝</button><button class="btn btn-pri" type="button" data-project-review="'+esc(r.id)+'" data-decision="approved">同意加入</button></div>').join(''));
 body.querySelectorAll('[data-project-review]').forEach(button=>button.onclick=()=>{const sid=s.id;rsModalSave(async()=>{const live=RS.data.shared.find(x=>x.id===sid);if(!rsCan(live,'manage'))throw new Error('没有成员管理权限');const next=rsClone(RS.data),target=next.shared.find(x=>x.id===sid),request=target.joinRequests.find(r=>r.id===button.dataset.projectReview&&r.state==='pending');if(!request)throw new Error('该申请已处理');request.state=button.dataset.decision;request.reviewAt=nowStamp();if(request.state==='approved'){let member=target.members.find(m=>m.id===request.actor);if(member&&member.status==='active')throw new Error('该成员已加入');if(member)Object.assign(member,{status:'active',role:'viewer'});else target.members.push({id:request.actor,name:request.name,email:'',role:'viewer',status:'active',at:nowStamp()});}await rsSave(next);toast(request.state==='approved'?'已同意加入，默认仅查看':'已拒绝加入申请');});});
};
const navigationTeamBind=wbBind;
wbBind=function(root){
 navigationTeamBind(root);
 root.querySelectorAll('[data-project-progress-pending]').forEach(button=>button.onclick=()=>{
 const pid=button.dataset.projectProgressPending;
 const tasks=(workbenchData({pid}).tasks||[]).filter(t=>t.pid===pid&&t.isTask!==false&&(t.needsAction||t.status==='failed'));
 modal('待我处理','<div class="rs-dialog-scroll">'+tasks.map(t=>'<div class="rs-request"><strong>'+esc(t.name||t.id)+'</strong><p class="rs-help">'+esc(t.detail||t.label||'请查看并处理')+'</p><button class="btn" type="button" data-project-pending-task="'+esc(t.key)+'">查看并处理</button></div>').join('')+'</div>','完成',()=>{});
 document.querySelectorAll('#dlg [data-project-pending-task]').forEach(item=>item.onclick=()=>{document.getElementById('dlg').close();workbenchOpenTask(item.dataset.projectPendingTask);});
 });
 root.querySelectorAll('[data-project-progress-task]').forEach(button=>button.onclick=()=>workbenchOpenTask(button.dataset.projectProgressTask));
 root.querySelectorAll('[data-project-progress-pid]').forEach(button=>button.onclick=()=>{S.pid=button.dataset.projectProgressPid;go('project');});
 root.querySelectorAll('[data-project-progress-shared]').forEach(button=>button.onclick=()=>{RS.sharedPick=button.dataset.projectProgressShared;RS.actor='me';go('shareddetail');});
 root.querySelectorAll('[data-project-join]').forEach(button=>button.onclick=()=>navigationJoinDialog());
 root.querySelectorAll('[data-project-members]').forEach(button=>button.onclick=e=>{e.stopPropagation();const s=RS.data.shared.find(x=>x.id===button.dataset.projectMembers);if(s){try{navigationTeamOpen(s,false);}catch(error){toast(error.message);}}else {const pid=button.dataset.projectMembersPid;modal('团队成员','<div class="rs-member"><span class="rs-avatar">我</span><div><strong>我</strong><small>研究院未填写</small></div><span class="rs-tag">创建者</span></div>'+(can('edit')?'<button class="btn btn-pri" type="button" id="project-team-start">增加协作者</button>':''),'完成',()=>{});const start=document.getElementById('project-team-start');if(start)start.onclick=async()=>{start.disabled=true;try{const shared=await rsShareProject(pid);document.getElementById('dlg').close();go('projects');navigationTeamOpen(shared,true);}catch(error){toast(error.message);start.disabled=false;}};}});
};
