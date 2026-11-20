/* Approved product iteration. No device execution, model calls or external writes. */
WB.progressAuto=WB.auto=WB.newsAuto=true;
WB.pagesByProject={};
function iterationIcon(name){return wbViewIcon(name);}
function iterationControls(kind,index,total){
 if(total<2)return '';
 const noun=kind==='progress'?'课题':kind==='idea'?'灵感':'资讯';
 return '<div class="wb-carousel-dots" role="group" aria-label="选择'+noun+'">'+Array.from({length:total},(_,i)=>'<button class="wb-carousel-dot" type="button" data-wb-'+kind+'-dot="'+i+'" aria-label="查看第 '+(i+1)+' 个'+noun+'" aria-current="'+(i===index?'true':'false')+'" tabindex="'+(i===index?'0':'-1')+'"><span aria-hidden="true"></span></button>').join('')+'</div>';
}
function iterationSelectSlide(kind,index){
 const projects=workbenchData().projects;
 if(kind==='idea'){if(WB.ideas[index])wbPickIdea(index);return;}
 const p=projects[index];if(!p)return;
 if(kind==='progress')WB.progressProject=p.id;else WB.newsProject=p.id;
}
function iterationStepProject(delta){
 const ps=workbenchData().projects;if(!ps.length)return;
 const i=Math.max(0,ps.findIndex(p=>p.id===WB.progressProject));WB.progressProject=ps[(i+delta+ps.length)%ps.length].id;
}
function iterationStepIdea(delta){
 if(!WB.ideas.length)return;
 wbPickIdea(((WB.idea||0)+delta+WB.ideas.length)%WB.ideas.length);
}
function iterationTaskSection(kind,tasks,pid){
 const model=kind==='model',rank={failed:0,active:1,draft:2,unknown:3,done:4,canceled:5};
 const sorted=tasks.slice().sort((a,b)=>(rank[a.status]??3)-(rank[b.status]??3));
 const size=innerHeight<730?1:innerHeight>=1000?3:2;
 const state=WB.pagesByProject[pid]||(WB.pagesByProject[pid]={experiment:0,model:0});
 const pages=Math.max(1,Math.ceil(sorted.length/size));state[kind]=Math.max(0,Math.min(pages-1,state[kind]||0));
 const rows=sorted.slice(state[kind]*size,(state[kind]+1)*size);
 const foot=pages>1?'<div class="wb-pagination"><button type="button" class="wb-icon-button" data-wb-section-page="'+kind+'" data-delta="-1" aria-label="上一页'+(model?'模型':'实验')+'任务" '+(!state[kind]?'disabled':'')+'>'+wbViewIcon('left')+'</button><span>'+ (state[kind]+1)+' / '+pages+'</span><button type="button" class="wb-icon-button" data-wb-section-page="'+kind+'" data-delta="1" aria-label="下一页'+(model?'模型':'实验')+'任务" '+(state[kind]+1===pages?'disabled':'')+'>'+wbViewIcon('right')+'</button></div>':'<span>'+tasks.length+' 项</span>';
 const destination=model?'<select data-wb-list-select aria-label="前往模型任务列表"><option value="">查看全部</option><option value="train">模型训练</option><option value="eval">模型评测</option><option value="batch">批量推理</option><option value="online">在线推理</option></select>':'<button type="button" class="wb-list-link" data-wb-list="experiment">查看全部 '+wbViewIcon('right')+'</button>';
 return '<section class="wb-task-section" data-task-kind="'+kind+'"><div class="wb-task-section-head"><h3>'+(model?'模型任务':'实验任务')+'<small>'+tasks.length+'</small></h3></div>'+(rows.length?'<ul class="wb-task-list">'+rows.map(wbViewTask).join('')+'</ul>':'<div class="wb-empty-tasks">暂无'+(model?'模型':'实验')+'任务</div>')+'<div class="wb-task-section-foot">'+foot+destination+'</div></section>';
}
V.workbench=()=>{
 const d=wbPrepare(),ps=d.projects||[];
 if(!ps.some(p=>p.id===WB.progressProject))WB.progressProject=ps[0]?.id||'';
 const p=ps.find(p=>p.id===WB.progressProject),scope=workbenchData({pid:p?.id}),pi=Math.max(0,ps.findIndex(x=>x.id===p?.id));
 const idea=WB.ideas[WB.idea||0],ip=ps.find(p=>p.id===idea?.pid);
 const np=ps.find(p=>p.id===WB.newsProject)||ps[0],ni=Math.max(0,ps.findIndex(p=>p.id===np?.id));
 const papers=WB.papers.filter(p=>np&&(p.pids||[p.pid]).includes(np.id)),newsState=wbNewsState(WB,np?.id);
 const ref=wbViewHref(idea?.sourceURL);
 const date=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Shanghai'});
 return '<div class="page wb"><header class="wb-header"><div class="wb-header-copy"><span class="wb-kicker">工作台</span><h1>'+wbViewGreeting()+'，ZHANG</h1></div><span class="wb-date">'+esc(date)+'</span></header><div class="wb-layout">'+
 '<section class="wb-panel wb-tasks" aria-labelledby="wb-tasks-title" aria-roledescription="轮播"><div class="wb-panel-heading"><h2 id="wb-tasks-title">课题进展</h2>'+iterationControls('progress',pi,ps.length)+'</div>'+
 (p?'<div class="wb-progress-project"><div><h3 title="'+esc(p.name)+'">'+esc(p.name)+'</h3><p>'+esc(goalText(DB.projects.find(x=>x.id===p.id))||p.stateText||'')+'</p></div><button class="wb-list-link" type="button" data-wb-project="'+esc(p.id)+'">进入课题 '+wbViewIcon('arrow')+'</button></div><div class="wb-task-columns">'+iterationTaskSection('experiment',scope.experiments||[],p.id)+iterationTaskSection('model',scope.modelTasks||[],p.id)+'</div>':'<div class="wb-empty"><strong>还没有课题</strong><button class="wb-button wb-button-primary" type="button" data-wb-create-project>新建项目</button></div>')+'</section>'+
 '<section class="wb-panel wb-inspiration" aria-labelledby="wb-ideas-title" aria-roledescription="轮播"><div class="wb-panel-heading"><div class="wb-panel-label">'+wbViewIcon('spark')+'<h2 id="wb-ideas-title">今日灵感</h2></div>'+iterationControls('idea',WB.idea||0,WB.ideas.length)+'</div>'+
 (idea?'<div class="wb-idea-topic"><span title="'+esc(ip?.name||idea.project)+'">'+esc(ip?.name||idea.project)+'</span></div><div class="wb-idea-stage"><button type="button" class="wb-question" data-wb-idea-detail="'+WB.idea+'" aria-label="查看完整问题：'+esc(idea.question)+'">'+esc(idea.question)+'</button><div class="wb-idea-bottom">'+(ref?'<a class="wb-reference-tag" href="'+esc(ref)+'" target="_blank" rel="noopener noreferrer" title="'+esc(idea.sourceTitle||'参考论文')+'">'+wbViewIcon('paper')+'参考论文 '+wbViewIcon('external')+'</a>':'')+'<button type="button" class="wb-button wb-button-primary" data-wb-prompt="'+esc(idea.question)+'" data-wb-pid="'+esc(idea.pid)+'">去探索 '+wbViewIcon('arrow')+'</button></div></div>':'<div class="wb-empty"><strong>暂无灵感问题</strong><p>为课题补充研究目标。</p></div>')+'</section>'+
 '<section class="wb-panel wb-news" aria-labelledby="wb-news-title" aria-roledescription="轮播"><div class="wb-panel-heading"><div class="wb-panel-label">'+wbViewIcon('paper')+'<h2 id="wb-news-title">学术资讯</h2></div>'+iterationControls('news',ni,ps.length)+'</div>'+
 (np?'<div class="wb-news-context"><span title="'+esc(np.name)+'">'+esc(np.name)+'</span></div>':'')+
 (papers.length?'<ul class="wb-papers">'+papers.slice(0,1).map(wbViewPaper).join('')+'</ul>':'<div class="wb-empty wb-empty-news" role="status"><strong>'+(newsState==='loading'?'正在查找相关论文':newsState==='error'?'暂时无法获取论文':'暂无匹配论文')+'</strong><p>'+(newsState==='error'?'稍后重新进入工作台可重试。':'')+'</p></div>')+
 (newsState==='error'&&papers.length?'<p class="wb-news-state" role="status">暂未获取新结果，保留已保存论文。</p>':'')+'</section></div></div>';
};
wbBind=function(root){
 clearInterval(WB.timer);WB.timer=0;if(wbLayoutObserver)wbLayoutObserver.disconnect();
 if(S.route!=='workbench'){WB.onPage=false;return;}
 const entering=!WB.onPage;WB.onPage=true;
 const on=(s,event,fn)=>root.querySelectorAll(s).forEach(e=>e.addEventListener(event,ev=>fn(e,ev)));
 for(const kind of ['progress','idea','news']){
  const selector='[data-wb-'+kind+'-dot]',key='wb'+kind[0].toUpperCase()+kind.slice(1)+'Dot';
  on(selector,'click',e=>{iterationSelectSlide(kind,+e.dataset[key]);render();});
  on(selector,'keydown',(e,ev)=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;
   const count=root.querySelectorAll(selector).length,i=+e.dataset[key];
   const next=ev.key==='Home'?0:ev.key==='End'?count-1:(i+(ev.key==='ArrowRight'?1:-1)+count)%count;
   ev.preventDefault();iterationSelectSlide(kind,next);render();
   view.querySelector(selector.slice(0,-1)+'="'+next+'"]')?.focus({preventScroll:true});
  });
 }
 const alignIndicators=()=>root.querySelectorAll('.wb-carousel-dots [aria-current="true"]').forEach(e=>{if(e.isConnected){const track=e.parentElement;track.scrollLeft=Math.max(0,e.offsetLeft-(track.clientWidth-e.offsetWidth)/2);}});
 requestAnimationFrame(alignIndicators);
 wbLayoutObserver=new ResizeObserver(alignIndicators);root.querySelectorAll('.wb-carousel-dots').forEach(e=>wbLayoutObserver.observe(e));
 on('[data-wb-section-page]','click',e=>{const state=WB.pagesByProject[WB.progressProject];if(state)state[e.dataset.wbSectionPage]+=+e.dataset.delta;render();});
 on('[data-wb-prompt]','click',e=>wbAsk(e.dataset.wbPid,e.dataset.wbPrompt));
 on('[data-wb-idea-detail]','click',e=>wbReadIdea(+e.dataset.wbIdeaDetail));
 on('[data-wb-project]','click',e=>workbenchOpenProject(e.dataset.wbProject));
 on('[data-wb-create-project]','click',e=>{go('projects');act('newproj',e);});
 on('[data-wb-task-open]','click',e=>workbenchOpenTask(e.dataset.wbTaskOpen));
 on('[data-wb-list]','click',e=>workbenchOpenList(e.dataset.wbList,'all',WB.progressProject));
 on('[data-wb-list-select]','change',e=>{if(e.value)workbenchOpenList(e.value,'all',WB.progressProject);});
 WB.tick=()=>{
  if(S.route!=='workbench'||document.hidden||document.querySelector('dialog[open],.asset-drawer')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const paused=selector=>{const e=root.querySelector(selector);return e&&(e.matches(':hover')||e.contains(document.activeElement));};let changed=false;
  if(WB.progressAuto&&workbenchData().projects.length>1&&!paused('.wb-tasks')){iterationStepProject(1);changed=true;}
  if(WB.auto&&WB.ideas.length>1&&!paused('.wb-inspiration')){iterationStepIdea(1);changed=true;}
  if(WB.newsAuto&&workbenchData().projects.length>1&&!paused('.wb-news')){wbStepNews(1);changed=true;}
  if(changed)render();
 };
 WB.timer=setInterval(WB.tick,7000);
 const subs=wbSubscriptions(),signature=JSON.stringify(subs);
 if(entering||!WB.didLoad||signature!==WB.querySignature){
  WB.didLoad=true;WB.querySignature=signature;
  const cache=LS.get('wb_papers_v1',{})||{},stale=subs.some(x=>{const at=cache.fetchedAtByProject?.[x.pid]||cache.fetchedAt||0;return !at||Date.now()-at>12*60*60*1000||cache.queries?.[x.pid]!==x.query;});
  if(stale&&subs.length)setTimeout(()=>{if(S.route==='workbench')wbLoadPapers('all');},250);
 }
};
/* Equipment connection records are explicit user registrations; never timer successes. */
const DEVICE_CONNECTIONS=LS.get('device_connections_v1',{})||{};
function iterationDeviceStatus(id){return DEVICE_CONNECTIONS[id]?.state||'available';}
function iterationPersistConnections(){try{localStorage.setItem('dy_device_connections_v1',JSON.stringify(DEVICE_CONNECTIONS));return true;}catch(e){return false;}}
function iterationConnectionTag(id){
 const state=iterationDeviceStatus(id);
 return state==='available'?'<button class="btn device-connect" type="button" data-device-apply="'+esc(id)+'" '+(!can('edit')?'disabled':'')+'>申请接入</button>':'<span class="device-connect device-state '+state+'">'+(state==='pending'?'申请中':'已接入')+'</span>';
}
function iterationEquipmentArt(d){
 const tube='<path d="M33 15h22v8l-3 3v32c0 15-16 15-16 0V26l-3-3zM36 41h16"/>';
 const chassis='<path d="M14 20h59v62H14zM14 39h59M20 26h12M58 27h9M20 72h47M22 82v5M65 82v5"/><path d="M24 45h39v22H24z"/>';
 const shaker='<path d="M12 24h64v58H12zM17 30h54v34H17zM18 72h17M61 72h8M24 51l6-16 6 16zM44 51l6-16 6 16zM18 82v4M68 82v4"/>';
 const centrifuge='<path d="M13 39h61v43H13zM13 39l9-22h46l6 22M20 66h25M58 63h9M21 82v5M66 82v5"/><ellipse cx="44" cy="35" rx="22" ry="7"/><path d="M35 35h17M44 29v12"/>';
 return '<svg viewBox="0 0 88 100" aria-hidden="true" stroke-linejoin="round" stroke-linecap="round">'+(d.type==='表达培养'?shaker:d.id==='centrifuge'?centrifuge:d.id==='q700'?tube:chassis)+'</svg>';
}
V.devices=()=>{
 const types=['全部',...new Set(LAB_DEVICES.map(d=>d.type))],q=LABUI.search.toLowerCase();
 const rows=LAB_DEVICES.filter(d=>(LABUI.type==='全部'||d.type===LABUI.type)&&[d.name,d.model,d.brand,d.desc,...d.stages.map(k=>labStage(k).title)].join(' ').toLowerCase().includes(q));
 return '<div class="page lv iteration-page"><header class="iteration-head"><div><h1>设备管理</h1></div><button class="btn btn-pri" data-act="labnew" type="button">发起实验</button></header><div class="lv-toolbar"><input class="input" id="lv-equipment-search" data-lv-search aria-label="搜索设备名称、型号或能力" placeholder="搜索设备名称、型号或能力" value="'+esc(LABUI.search)+'"></div><div class="lv-filters" role="group" aria-label="设备类别">'+types.map(t=>'<button class="lv-filter'+(LABUI.type===t?' is-on':'')+'" type="button" data-lv-type="'+esc(t)+'" aria-pressed="'+(LABUI.type===t)+'">'+esc(t)+'</button>').join('')+'</div><div class="device-catalog">'+rows.map(d=>'<article class="lv-device device-card" role="button" tabindex="0" data-lv-device="'+d.id+'" aria-label="查看设备详情：'+esc(d.name)+' '+esc(d.model)+'"><div class="device-art">'+iterationEquipmentArt(d)+'</div><div class="device-copy"><h2>'+esc(d.name)+'</h2><div class="device-model">'+esc(d.model)+'　|　'+esc(d.brand)+'</div><p>'+esc(d.desc)+'</p><div class="lv-tags">'+d.stages.map(k=>'<span class="lv-tag">'+esc(labStage(k).title)+'</span>').join('')+'</div></div>'+iterationConnectionTag(d.id)+'</article>').join('')+'</div>'+(!rows.length?'<p class="lv-empty">没有匹配设备</p>':'')+'</div>';
};
function iterationApplyDevice(id){
 const d=labDevice(id);if(!d||!can('edit')||iterationDeviceStatus(id)!=='available')return;
 modal('申请接入 · '+d.name,'<label class="rs-field"><span>设备实例编号 <b>*</b></span><input class="input" id="device-instance" maxlength="80" placeholder="例如 LAB-001"></label><label class="rs-field"><span>设备位置</span><input class="input" id="device-location" maxlength="120"></label><p class="rs-inline-error" id="device-apply-error" role="alert"></p>','提交申请',()=>{
  const resource=document.getElementById('device-instance').value.trim();if(!resource){document.getElementById('device-apply-error').textContent='填写设备实例编号';return false;}
  const previous=DEVICE_CONNECTIONS[id];DEVICE_CONNECTIONS[id]={state:'pending',resource,location:document.getElementById('device-location').value.trim(),at:nowStamp()};
  if(!iterationPersistConnections()){if(previous)DEVICE_CONNECTIONS[id]=previous;else delete DEVICE_CONNECTIONS[id];document.getElementById('device-apply-error').textContent='申请未保存，请检查存储空间';return false;}
  render();
 });
}
function iterationConfirmDevice(id){
 if(S.as!==0||!can('edit')||iterationDeviceStatus(id)!=='pending')return;
 modal('确认设备接入','<p class="rs-help">设备实例 '+esc(DEVICE_CONNECTIONS[id].resource)+'</p><label class="rs-choice"><input type="checkbox" id="device-verified">接入信息已由设备负责人核对</label><p class="rs-inline-error" id="device-confirm-error"></p>','确认接入',()=>{
  if(!document.getElementById('device-verified').checked){document.getElementById('device-confirm-error').textContent='请先核对设备接入信息';return false;}
  const before=rsClone(DEVICE_CONNECTIONS[id]);Object.assign(DEVICE_CONNECTIONS[id],{state:'connected',confirmedAt:nowStamp()});
  if(!iterationPersistConnections()){DEVICE_CONNECTIONS[id]=before;return false;}render();
 });
}
NAV_PARENT.devicedetail='devices';
V.devicedetail=()=>{
 const d=labDevice(LABUI.devicePick);if(!d)return '<div class="page iteration-page"><header class="iteration-head"><div><h1>设备不存在</h1><p>该设备可能已移除，或尚未选择设备型号。</p></div></header><button class="btn" type="button" data-go="devices">返回设备列表</button></div>';
 const c=DEVICE_CONNECTIONS[d.id],state=iterationDeviceStatus(d.id);
 return '<div class="page iteration-page device-detail"><button class="rs-link" type="button" data-go="devices">← 设备管理</button><header class="iteration-head"><div><h1>'+esc(d.name)+'</h1><p>'+esc(d.model)+' · '+esc(d.brand)+'</p></div><div class="rs-actions"><button type="button" class="btn" data-device-use="'+d.id+'">加入实验方案</button>'+(state==='available'?'<button type="button" class="btn btn-pri" data-device-apply="'+d.id+'">申请接入</button>':'<span class="device-state '+state+'">'+(state==='pending'?'申请中':'已接入')+'</span>')+'</div></header><div class="device-capability"><div class="device-art">'+iterationEquipmentArt(d)+'</div><div><p>'+esc(d.desc)+'</p><div class="lv-tags">'+d.stages.map(k=>'<span class="lv-tag">'+esc(labStage(k).title)+'</span>').join('')+'</div></div></div><div class="device-detail-layout"><div>'+d.stages.map(k=>'<section class="device-section"><h2>'+esc(labStage(k).title)+'</h2>'+labIO(k)+'</section>').join('')+'</div><aside><section class="device-section"><h2>方法条件</h2><p>'+esc(d.why)+'</p><h3>数据交接</h3><p>'+esc(d.native)+'</p><a class="rs-link" href="'+esc(d.url)+'" target="_blank" rel="noopener noreferrer">厂商资料 '+wbViewIcon('external')+'</a></section>'+(c?'<section class="device-section"><h2>接入记录</h2><dl class="asset-key-values"><dt>设备实例</dt><dd>'+esc(c.resource)+'</dd><dt>设备位置</dt><dd>'+esc(c.location||'未登记')+'</dd><dt>申请时间</dt><dd>'+esc(c.at)+'</dd></dl>'+(state==='pending'&&S.as===0&&can('edit')?'<button class="btn" type="button" data-device-confirm="'+d.id+'">确认接入</button>':'')+'</section>':'')+'</aside></div></div>';
};
labDeviceDialog=function(id){LABUI.devicePick=id;go('devicedetail');};
function iterationUseDevice(id){
 const d=labDevice(id);if(!d||!can('edit'))return;
 const f=labForm(),stage=d.stages[0];
 if(['affinity','stability','activity'].includes(stage)&&!f.assays.includes(stage)){f.assays.push(stage);f.steps=labPlan(f.template,f.mode,f.assays,f.steps);}
 else if(!f.steps.some(s=>s.stage===stage)){f.template='full';f.steps=labPlan('full',f.mode,f.assays,f.steps);}
 f.steps.filter(s=>s.stage===stage).forEach(s=>{s.deviceId=id;if(DEVICE_CONNECTIONS[id]?.state==='connected')s.resource=DEVICE_CONNECTIONS[id].resource;});
 LABUI.selected=stage;go('labnew');
}
const iterationOriginalValidate=labValidate;
labValidate=function(f,draft=false){
 const errors=iterationOriginalValidate(f,draft);
 if(!draft)f.steps.filter(s=>s.stage!=='review').forEach(s=>{if(!s.resource.trim())errors['resource_'+s.id]='填写设备实例编号';if(!s.sop.trim())errors['sop_'+s.id]='填写 SOP／方法版本';});
 return errors;
};
function iterationMissingStep(f,s){
 const errors=labValidate(f,false);
 if(s.stage==='review')return false;
 return !!(errors['device_'+s.id]||errors['resource_'+s.id]||errors['sop_'+s.id]);
}
function iterationComposerNode(f,s){
 return '<button class="composer-plan-node'+(LABUI.selected===s.id?' is-selected':'')+'" type="button" data-composer-node="'+esc(s.id)+'" aria-pressed="'+(LABUI.selected===s.id)+'" aria-label="编辑'+esc(s.title)+(iterationMissingStep(f,s)?'，有必填项待补全':'')+'"><strong>'+esc(s.title)+'</strong><small>'+esc(s.stage==='review'?'人工复核':labDevice(s.deviceId)?.model||'选择设备')+'</small>'+(iterationMissingStep(f,s)?'<i class="required-dot" aria-label="必填项待补全"></i>':'')+'</button>';
}
function iterationComposerGraph(f){
 const pre=f.steps.filter(s=>!f.assays.includes(s.stage)&&s.stage!=='review'),branches=f.steps.filter(s=>f.assays.includes(s.stage)),review=f.steps.find(s=>s.stage==='review'),arrow='<div class="flow-arrow" aria-hidden="true">↓</div>';
 return '<div class="composer-flow">'+pre.map(s=>iterationComposerNode(f,s)).join(arrow)+arrow+(f.mode==='parallel'&&branches.length>1?'<div class="composer-branches" style="grid-template-columns:repeat('+branches.length+',minmax(0,1fr))" aria-label="并行表征">'+branches.map(s=>iterationComposerNode(f,s)).join('')+'</div>':branches.map(s=>iterationComposerNode(f,s)).join(arrow))+(review?arrow+iterationComposerNode(f,review):'')+'</div>';
}
V.labnew=()=>{
 const f=labForm();if(LABUI.selected!=='setup'&&!f.steps.some(s=>s.id===LABUI.selected))LABUI.selected='setup';
 const s=f.steps.find(s=>s.id===LABUI.selected),errors=LABUI.errors||{},missing=Object.keys(labValidate(f,false)).length;
 const field=(key,label,control)=>'<label class="lv-field wide"><span>'+label+'</span>'+control+labError(key)+'</label>';
 const text=(key,placeholder='')=>'<input class="input" data-lv-field="'+key+'" value="'+esc(f[key]||'')+'" placeholder="'+esc(placeholder)+'" '+labInvalid(key)+'>';
 const setup='<h2>实验设置与样本</h2>'+field('pid','关联课题 *','<select class="input" data-lv-field="pid">'+DB.projects.filter(p=>(p.ownerId||'me')==='me').map(p=>'<option value="'+esc(p.id)+'" '+(f.pid===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select>')+
 field('name','实验名称 *',text('name','蛋白亲和力与稳定性表征'))+field('template','实验模板','<select class="input" data-lv-field="template">'+Object.entries(LAB_TEMPLATES).map(([k,t])=>'<option value="'+k+'" '+(f.template===k?'selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select>')+
 field('desc','研究目标','<textarea class="input" data-lv-field="desc" rows="2">'+esc(f.desc)+'</textarea>')+
 field('samples','样本编号清单 *','<textarea class="input" data-lv-field="samples" placeholder="每行一个样本编号" '+labInvalid('samples')+'>'+esc(f.samples)+'</textarea>')+
 field('sourceRef','样本来源／数据版本 *',text('sourceRef','样本交接清单或项目数据集版本'))+
 '<div class="lv-field"><span>表征目标</span><div class="lv-choices">'+['affinity','stability','activity'].map(k=>'<label class="lv-choice"><input type="checkbox" data-lv-assay="'+k+'" '+(f.assays.includes(k)?'checked':'')+'>'+esc(labStage(k).title)+'</label>').join('')+'</div>'+labError('assays')+'</div><div class="lv-field"><span>执行关系</span><div class="lv-choices">'+[['parallel','并行表征'],['serial','依次表征']].map(([k,n])=>'<label class="lv-choice"><input type="radio" name="lv-mode" data-lv-mode="'+k+'" '+(f.mode===k?'checked':'')+'>'+n+'</label>').join('')+'</div></div>'+
 (f.mode==='parallel'&&f.assays.length>1?field('aliquot','独立分样与交接安排 *','<textarea class="input" data-lv-field="aliquot" placeholder="各表征分支的样品、板位和交接安排" '+labInvalid('aliquot')+'>'+esc(f.aliquot)+'</textarea>'):'');
 let operation='';
 if(s){const devices=LAB_DEVICES.filter(d=>d.stages.includes(s.stage));operation='<h2>'+esc(s.title)+'</h2><p class="lv-small">输入来源：'+s.inputFrom.map(k=>k==='source'?'样本清单':esc(labStage(k).title)).join('、')+'</p>'+(s.stage!=='review'?
 field('device_'+s.id,'设备型号 *','<select class="input" data-lv-device-select="'+s.id+'" '+labInvalid('device_'+s.id)+'><option value="">选择设备型号</option>'+devices.map((d,i)=>'<option value="'+d.id+'" '+(s.deviceId===d.id?'selected':'')+'>'+esc(d.model)+(i===0?' · 推荐':'')+'</option>').join('')+'</select>')+
 field('resource_'+s.id,'设备实例编号 *','<input class="input" data-lv-resource="'+s.id+'" value="'+esc(s.resource)+'" placeholder="例如 LAB-001" '+labInvalid('resource_'+s.id)+'>')+
 field('sop_'+s.id,'SOP／方法版本 *','<input class="input" data-lv-sop="'+s.id+'" value="'+esc(s.sop)+'" placeholder="已确认的方法版本" '+labInvalid('sop_'+s.id)+'>'):'<p class="lv-small">各实验分支完成后复核数据与证据，发布实验结论。</p>')+labIO(s.stage);}
 return '<div class="page lv experiment-composer"><header class="iteration-head"><div><button class="rs-link" type="button" data-go="lab">← 实验管理</button><h1>'+(f.editing?'编辑实验草稿':'发起实验')+'</h1></div><div class="rs-actions"><span class="composer-save-state" data-composer-missing>'+ (missing?missing+' 项待补全':'')+'</span><button class="btn" type="button" data-lv-save="draft">保存草稿</button><button class="btn btn-pri" type="button" data-lv-save="ready">创建实验</button></div></header><div class="composer-layout"><section class="composer-editor" aria-label="实验操作编辑"><div class="composer-editor-scroll">'+(Object.keys(errors).length?'<div class="lv-error-summary composer-global-error" role="alert">请补全 '+Object.keys(errors).length+' 项信息。</div>':'')+(s?operation:setup)+'</div></section><section class="composer-map" aria-label="实验编排定位图"><div class="composer-map-head"><span>实验编排</span><button class="btn composer-setup" type="button" data-composer-node="setup">实验设置与样本</button></div><div class="composer-graph">'+iterationComposerGraph(f)+'</div></section></div></div>';
};
function iterationRefreshComposer(){
 if(S.route!=='labnew')return;const f=labForm();
 const missingCount=Object.keys(labValidate(f,false)).length;view.querySelector('[data-composer-missing]').textContent=missingCount?missingCount+' 项待补全':'';
 view.querySelectorAll('[data-composer-node]').forEach(node=>{
  const s=f.steps.find(s=>s.id===node.dataset.composerNode),missing=s?iterationMissingStep(f,s):['name','samples','sourceRef','aliquot'].some(k=>labValidate(f,false)[k]);
  let dot=node.querySelector('.required-dot');if(missing&&!dot){dot=document.createElement('i');dot.className='required-dot';dot.setAttribute('aria-label','必填项待补全');node.append(dot);}else if(!missing&&dot)dot.remove();
 });
}
const iterationLabBind=labV2Bind;
labV2Bind=function(root){
 iterationLabBind(root);
 root.querySelectorAll('[data-device-apply]').forEach(e=>e.onclick=ev=>{ev.stopPropagation();iterationApplyDevice(e.dataset.deviceApply);});
 root.querySelectorAll('[data-device-confirm]').forEach(e=>e.onclick=()=>iterationConfirmDevice(e.dataset.deviceConfirm));
 root.querySelectorAll('[data-device-use]').forEach(e=>e.onclick=()=>iterationUseDevice(e.dataset.deviceUse));
 root.querySelectorAll('[data-composer-node]').forEach(e=>e.onclick=()=>{LABUI.selected=e.dataset.composerNode;render();view.querySelector('.composer-editor-scroll')?.scrollTo(0,0);});
 root.querySelectorAll('[data-lv-field],[data-lv-resource],[data-lv-sop]').forEach(e=>e.addEventListener('input',iterationRefreshComposer));
};
/* Collaboration examples are additive, versioned and idempotent. Existing assets stay immutable. */
async function iterationSeedWorkspace(){
 if(RS.data.iterationSeed||LS.get('examples_disabled',false))return;
 const next=rsClone(RS.data),li='example-li',at=nowStamp();
 const target=(id,name,owner)=>{let p=next.projects.find(p=>p.id===id);if(!p){p=rsBlankProject(name,'独立复核已获授权的课题资产',owner);p.id=id;next.projects.push(p);}return p;};
 const mine=target('example-personal-review','蛋白候选复核','me'),theirs=target('example-li-review','稳定性复核',li);
 let own=next.shared.find(s=>s.projectId==='p1'&&s.owner==='me'),fresh=!own;
 if(!own){const p=rsProject('p1');own={id:'example-shared-owned',projectId:p.id,name:p.name,goal:'提高热稳定性，维持结合亲和力。',owner:'me',members:[{id:'me',name:'ZHANG',email:'',role:'owner',status:'active',at}],assets:rsCandidates(p.id),requests:[],events:[],at,projectSummary:{state:p.state,domain:'蛋白'}};next.shared.push(own);}
 if(!own.members.some(m=>m.id===li))own.members.push({id:li,name:'李研究员',email:'',role:'viewer',status:'active',at});
 own.inputLinks=own.inputLinks||{};
 const experiments=own.assets.filter(a=>a.kind==='experiment'),b11=experiments.find(a=>a.sourceId==='B-2411'),b12=experiments.find(a=>a.sourceId==='B-2412');
 if(b11&&b12){
  const sample=own.assets.find(a=>a.kind==='sampleSheet'&&a.snapshot.experimentAssetId===b11.id);
  if(sample){
   let common=own.assets.find(a=>a.sourceId==='round4-shared-samples');
   if(!common){common=rsClone(sample);common.sourceId='round4-shared-samples';common.name='第4轮候选样本清单';common.snapshot={name:common.name,sampleIds:Array.from({length:96},(_,i)=>'R4-S'+String(i+1).padStart(3,'0')),source:'第4轮候选样本清单 v1',aliquot:'每项实验使用独立分样',example:true};common.fingerprint=fp32(JSON.stringify(common.snapshot));common.id='a-'+fp32(own.id+'|round4|'+common.fingerprint);common.description='第4轮样本与来源登记';if(fresh)own.assets[own.assets.indexOf(sample)]=common;else own.assets.push(common);}
   own.inputLinks[b11.id]=common.id;own.inputLinks[b12.id]=common.id;
  }
 }
 function request(s,aid,id,actor,targetId,state,reason){
  if(!aid||s.requests.some(r=>r.id===id))return;const a=s.assets.find(a=>a.id===aid);if(!a)return;
  s.requests.push({id,actor,assetId:aid,target:targetId,state,reason,version:a.version,fingerprint:a.fingerprint,at,...(state!=='pending'?{reviewBy:s.owner,reviewAt:at,reviewReason:'同意独立复核'}:{})});
 }
 request(own,own.assets.find(a=>a.kind==='model')?.id,'example-incoming-model',li,theirs.id,'pending','与实测亲和力对照，复核候选排序。');
 request(own,own.assets.find(a=>a.kind==='dataset')?.id,'example-incoming-data',li,theirs.id,'pending','用于独立复核亲和力与稳定性结果。');
 const report=own.assets.find(a=>a.kind==='evaluation'&&a.name.includes('ΔTm'));
 request(own,report?.id,'example-incoming-history',li,theirs.id,'imported','复核模型评测');
 if(report&&!next.imports.some(x=>x.id==='example-imported-report')){next.imports.push({id:'example-imported-report',kind:report.kind,name:report.name,target:theirs.id,actor:li,copy:rsClone(report.snapshot),sourceShared:own.id,sourceProject:report.sourceProject,sourceAsset:report.id,version:report.version,fingerprint:report.fingerprint,at});const r=own.requests.find(r=>r.id==='example-incoming-history');if(r){r.importId='example-imported-report';r.importedAt=at;}}
 if(!next.shared.some(s=>s.id==='example-shared-joined')){
  const p=rsProject('p2'),original=rsCandidates('p2'),ids=new Map(original.map(a=>[a.id,'other-'+a.id]));
  const assets=original.map(a=>{const x=rsClone(a);x.id=ids.get(a.id);x.sourceProject='example-li-barstar';x.contributor=li;if(x.snapshot.pid)x.snapshot.pid=x.sourceProject;if(x.snapshot.modelAssetId)x.snapshot.modelAssetId=ids.get(x.snapshot.modelAssetId)||x.snapshot.modelAssetId;if(x.snapshot.experimentAssetId)x.snapshot.experimentAssetId=ids.get(x.snapshot.experimentAssetId)||x.snapshot.experimentAssetId;x.fingerprint=fp32(JSON.stringify(x.snapshot));if(x.kind==='sampleSheet')x.name='表征实验样本清单';if(x.kind==='experiment')x.name='蛋白纯化后表征';return x;});
  const other={id:'example-shared-joined',projectId:'example-li-barstar',name:p.name,goal:'筛选并验证亲和力优化候选。',owner:li,members:[{id:li,name:'李研究员',email:'',role:'owner',status:'active',at},{id:'me',name:'ZHANG',email:'',role:'viewer',status:'active',at}],assets,requests:[],events:[],at,projectSummary:{state:p.state,domain:'蛋白'}};
  request(other,assets.find(a=>a.kind==='model')?.id,'example-outgoing-model','me',mine.id,'pending','使用已训练模型评估我的候选序列。');
  request(other,assets.find(a=>a.kind==='dataset')?.id,'example-outgoing-data','me',mine.id,'approved','复核候选变体数据。');
  next.shared.push(other);
 }
 next.iterationSeed=1;await rsSave(next);
 if(!DEVICE_CONNECTIONS.star){DEVICE_CONNECTIONS.star={state:'pending',resource:'LAB-STAR-01',location:'样品制备区',at,example:true};}
 if(!DEVICE_CONNECTIONS.innova){DEVICE_CONNECTIONS.innova={state:'connected',resource:'LAB-SHAKER-01',location:'培养区',at,example:true};}
 if(!DEVICE_CONNECTIONS.centrifuge){DEVICE_CONNECTIONS.centrifuge={state:'connected',resource:'LAB-CENTRIFUGE-01',location:'样品处理区',at,example:true};}
 iterationPersistConnections();
}
const iterationPersonalList=PLIST;
PLIST=()=>iterationPersonalList().filter(p=>(p.ownerId||'me')==='me');
const iterationOriginalWorkbenchData=workbenchData;
workbenchData=function(options){const d=iterationOriginalWorkbenchData(options);d.projects=d.projects.filter(p=>(rsProject(p.id)?.ownerId||'me')==='me');for(const key of ['experiments','modelTasks'])d[key]=(d[key]||[]).map(t=>({...t,name:iterationHumanText(t.name),detail:iterationHumanText(t.detail)}));return d;};
const iterationOriginalSubscriptions=wbSubscriptions;
wbSubscriptions=()=>iterationOriginalSubscriptions().filter(p=>(rsProject(p.pid)?.ownerId||'me')==='me');
RS.assetTab='kb';RS.assetPick='';RS.flowSelected='';RS.flowPositions={};RS.drawer=null;
const iterationRole=s=>s.members.find(m=>m.id==='me'&&m.status==='active');
function iterationRequestCounts(s){
 const mine=s.requests.filter(r=>r.actor===RS.actor);
 return {incoming:rsCan(s,'approve')?s.requests.filter(r=>r.state==='pending').length:0,pending:mine.filter(r=>r.state==='pending').length,approved:mine.filter(r=>r.state==='approved').length};
}
V.shared=()=>{
 const gate=rsGate();if(gate)return gate;
 const projects=RS.data.shared.filter(iterationRole);
 return '<div class="page rs iteration-page"><header class="iteration-head"><div><h1>共享项目</h1></div><button class="btn btn-pri" type="button" data-rs-new-shared>新建共享项目</button></header><strong class="t-sm">全部 '+projects.length+' 个</strong>'+
 (projects.length?'<div class="shared-project-grid">'+projects.map(s=>{
  const member=iterationRole(s),owner=s.members.find(m=>m.id===s.owner),counts=iterationRequestCounts(s),source=rsProject(s.projectId),summary=s.projectSummary||{},state=source?.state||summary.state;
  const status=state?stateOf(state):null;
  const attention=rsCan(s,'approve')?(counts.incoming?counts.incoming+' 项待我审批':'暂无待审批申请'):[counts.pending?counts.pending+' 项申请中':'',counts.approved?counts.approved+' 项待导入':''].filter(Boolean).join(' · ')||'暂无进行中的申请';
  return '<article class="rs-project-card shared-project-card pcard '+(status?.[1]||'')+(state==='sent'?' is-sent':'')+'" role="button" tabindex="0" data-rs-open="'+esc(s.id)+'" aria-label="查看共享项目：'+esc(s.name)+'"><div class="pcard-t"><strong>'+esc(s.name)+'</strong>'+(status?'<span class="pcard-st">'+esc(status[0])+'</span>':'')+'</div><div class="pcard-labels"><span class="tag">'+esc(source?domOf(source).n:summary.domain||'科研')+'</span>'+rsProjectSharedBadge()+'<span class="rs-tag">'+esc(rsRoleNames[member.role])+'</span></div><p class="pcard-g"><span>'+esc(s.goal||'')+'</span><span>创建者 '+esc(owner?.name||'项目成员')+'</span></p><div class="pcard-f"><span>'+s.members.filter(m=>m.status==='active').length+' 位成员 · '+s.assets.length+' 项资产</span><span class="'+(counts.incoming?'request-attention':'request-mine')+'">'+esc(attention)+'</span></div></article>';
 }).join('')+'</div>':'<div class="rs-empty"><h2>暂无共享项目</h2><button class="btn btn-pri" type="button" data-rs-new-shared>新建共享项目</button></div>')+'</div>';
};
function iterationAssetGroups(s){
 return RS.assetTab==='tool'?[['工具',s.assets.filter(a=>a.kind==='tool')]]:
 RS.assetTab==='exp'?[['模型训练',s.assets.filter(a=>a.kind==='model')],['实验任务',s.assets.filter(a=>a.kind==='experiment')]]:
 [['全部文件',s.assets.filter(a=>!['tool','model','experiment'].includes(a.kind))]];
}
function iterationAssetFile(a){
 if(a.kind==='knowledge')return fileSq(a.name);
 const label={dataset:'CSV',sampleSheet:'CSV',evaluation:'JSON',conclusion:'报告',inference:'JSON',model:'模型',tool:'工具'}[a.kind]||'资料';
 return '<span class="fsq '+(['dataset','sampleSheet'].includes(a.kind)?'is-wet':'')+'">'+label+'</span>';
}
function iterationAssetSource(s,a){
 const who=s.members.find(m=>m.id===a.contributor)?.name||'项目成员';
 return who+' 共享 · '+(a.kind==='knowledge'?'资料引用':rsAssetLabel(a.kind));
}
function iterationAuthorized(s,a){return rsCan(s,'approve')||s.requests.some(r=>r.actor===RS.actor&&r.assetId===a.id&&['approved','imported'].includes(r.state));}
function iterationAssetRequest(s,a){return s.requests.find(r=>r.actor===RS.actor&&r.assetId===a.id&&['pending','approved','imported'].includes(r.state));}
function iterationAcquire(s,a){
 const r=iterationAssetRequest(s,a);
 if(r?.state==='pending')return '<span class="request-status pending">申请中</span><button class="btn" type="button" data-rs-requests>查看申请</button>';
 if(r?.state==='approved')return '<span class="request-status approved">待导入</span><button class="btn btn-pri" type="button" data-iteration-import="'+esc(r.id)+'">确认导入</button>';
 if(r?.state==='imported')return '<span class="request-status imported">已导入</span>';
 return '<button class="btn btn-pri" type="button" data-iteration-acquire="'+esc(a.id)+'">'+(rsCan(s,'approve')?'获取到项目':'申请获取')+'</button>';
}
function iterationPairs(pairs){return '<dl class="asset-key-values">'+pairs.filter(x=>x[1]!=null&&x[1]!=='').map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(String(v))+'</dd>').join('')+'</dl>';}
function iterationHumanText(value){return String(value||'').replace(/^演示[：:]\s*/,'').replace(/演示：/g,'').replace(/\s*[·・]\s*演示流程/g,'').replace(/\s*[·・]\s*异常示例/g,'');}
function iterationAssetBody(s,a){
 const authorized=iterationAuthorized(s,a),snapshot=a.snapshot||{},who=s.members.find(m=>m.id===a.contributor)?.name||'项目成员';
 let html=iterationPairs([['提供者',who],['来源课题',s.name],['共享版本',a.version],['共享时间',a.at]]);
 if(!authorized)return html+'<section class="asset-section"><h3>资产摘要</h3><p>'+esc(iterationHumanText(a.description))+'</p><p class="asset-access-state">申请通过后可查看完整内容。</p></section>';
 const section=(title,body)=>'<section class="asset-section"><h3>'+title+'</h3>'+body+'</section>';
 if(a.kind==='knowledge')return html+section('资料引用','<p>'+esc(a.name)+'</p><p>此条目为资料引用，未附原始文件。</p>');
 if(a.kind==='dataset'){
  const rows=Array.isArray(snapshot.rows)?snapshot.rows:[],cols=Object.keys(rows[0]||{});
  const labels={variant:'变体编号',muts:'突变位点',round:'轮次',batch:'实验批次',disposition:'变体状态',iptm:'ipTM',rmsd:'RMSD','dTm_℃':'ΔTm（℃）',kd_pM:'KD（pM）'};
  return html+section('数据字段','<p>'+rows.length+' 条记录 · '+cols.length+' 个字段</p><table class="asset-table"><thead><tr><th>字段</th><th>含义</th></tr></thead><tbody>'+cols.map(k=>'<tr><td><code>'+esc(k)+'</code></td><td>'+esc(labels[k]||k)+'</td></tr>').join('')+'</tbody></table>');
 }
 if(a.kind==='experiment'){
  const w=snapshot.workflow,summary=labSummary(snapshot),steps=w?.steps||[];
  html=iterationPairs([['提供者',who],['共享版本',a.version],['实验方式',w?.mode==='parallel'?'并行表征':'依次表征']]);
  html+=section('环节进展','<p>'+summary.done+'/'+summary.total+' 已完成</p><ol class="asset-timeline">'+steps.map(st=>'<li class="is-'+esc(st.state)+'"><div class="timeline-title"><span>'+esc(st.title)+(w.mode==='parallel'&&w.assays.includes(st.stage)?' <span class="asset-parallel-label">并行</span>':'')+'</span><span class="lv-state is-'+esc(st.state==='exception'?'exception':st.state==='done'?'conclusion':st.state)+'">'+esc(labStepLabels[st.state]||st.state)+'</span></div><small>'+esc(st.stage==='review'?'人工复核':st.deviceSnapshot?.model||labDevice(st.deviceId)?.model||'未登记设备')+'</small>'+(st.state==='exception'?'<p>'+esc(iterationHumanText(st.result||'异常原因待登记'))+'</p>':'')+'</li>').join('')+'</ol>');
  const active=steps.filter(st=>st.state==='running'||st.state==='exception');
  const contracts=(active.length?active:steps.filter(st=>st.stage!=='review').slice(0,1)).map(st=>st.contract||labStage(st.stage));
  html+=section('输入与输出',contracts.map(c=>'<p><strong>'+esc(c.title||'当前环节')+'</strong></p>'+iterationPairs([['输入要求',c.input],['输入数据',c.data],['输出要求',c.output]])).join(''));
  return html+section('实验结论',w?.conclusion?.published?'<p><strong>'+esc(w.conclusion.verdict)+'</strong></p><p>'+esc(iterationHumanText(w.conclusion.text))+'</p><p>'+esc(w.conclusion.evidence||'')+'</p>':'<p>'+ (summary.ready?'待复核':'表征完成后复核')+'</p>');
 }
 if(a.kind==='sampleSheet')return html+section('样本与来源',iterationPairs([['来源',iterationHumanText(snapshot.source)],['分样安排',iterationHumanText(snapshot.aliquot)]])+'<table class="asset-table"><thead><tr><th>样本编号</th></tr></thead><tbody>'+(snapshot.sampleIds||[]).slice(0,100).map(id=>'<tr><td>'+esc(id)+'</td></tr>').join('')+'</tbody></table>');
 if(a.kind==='conclusion')return html+section('实验结论',iterationPairs([['判定',snapshot.verdict],['结论',iterationHumanText(snapshot.text)],['证据',snapshot.evidence],['复核人',snapshot.by]]));
 if(a.kind==='model'||a.kind==='evaluation')return html+section(a.kind==='model'?'模型信息':'评测结果',iterationPairs([['模型',a.kind==='model'?a.name:snapshot.modelId],['留出 ρ',Number.isFinite(snapshot.rho)?snapshot.rho.toFixed(3):null],['RMSE',Number.isFinite(snapshot.rmse)?snapshot.rmse:null],['测试样本',snapshot.nTest],['训练数据',snapshot.ds?s.assets.find(x=>x.kind==='dataset'&&x.sourceId===snapshot.ds)?.name||snapshot.ds:null]])+'<p>'+esc(a.kind==='model'?'已共享的模型版本':'已保存的评测记录')+'</p>');
 if(a.kind==='tool'){const t=ALL_TOOLS().find(t=>t.n===a.name);return html+section('工具信息',iterationPairs([['能力',t?.s],['输入',t?.i],['输出',t?.o],['来源',t?.org],['许可',t?.lic]]));}
 return html+section('任务记录',iterationPairs([['名称',a.name],['状态',snapshot.statusText||snapshot.status],['详情',snapshot.detail||a.description]]));
}
function iterationAssetPreview(s,a){
 if(!a)return '<div class="asset-preview-empty">选择左侧资产查看详情</div>';
 return '<div class="asset-preview-head">'+iterationAssetFile(a)+'<div><h2>'+esc(a.name)+'</h2><small>'+esc(rsAssetLabel(a.kind))+' · '+esc(a.version)+'</small></div><div class="rs-actions">'+iterationAcquire(s,a)+'</div></div>'+iterationAssetBody(s,a);
}
function iterationSharedHeader(s,member){
 const counts=iterationRequestCounts(s);
 return '<div class="shared-breadcrumb"><button class="rs-link" type="button" data-go="shared">共享项目</button><span>/</span><span>项目详情</span></div><header class="iteration-head"><div><h1>'+esc(s.name)+' <span class="rs-tag">'+esc(rsRoleNames[member.role])+'</span></h1><p title="'+esc(s.goal||'')+'">'+esc(s.goal||'')+'</p></div><div class="rs-actions"><button class="btn" type="button" data-rs-members>成员 '+s.members.filter(m=>m.status==='active').length+'</button><button class="btn" type="button" data-rs-requests>'+(rsCan(s,'approve')?'获取申请'+(counts.incoming?' '+counts.incoming:''):'我的申请'+(counts.pending+counts.approved?' '+(counts.pending+counts.approved):''))+'</button>'+(rsCan(s,'publish')?'<button class="btn btn-pri" type="button" data-rs-publish>共享资产</button>':'')+'</div></header><div class="rs-tabs" role="group" aria-label="共享项目内容">'+[['assets','项目资产'],['workflow','项目工作流']].map(([k,n])=>'<button type="button" data-rs-tab="'+k+'" class="'+(RS.tab===k?'is-on':'')+'" aria-pressed="'+(RS.tab===k)+'">'+n+'</button>').join('')+'</div>';
}
const iterationPipelines=rsPipelines;
rsPipelines=function(s){
 const flows=iterationPipelines(s);
 if(RS.flow==='experiment')flows.forEach(f=>{const input=s.assets.find(a=>a.id===s.inputLinks?.[f.id]);if(input)f.nodes[0]=rsPipelineNode('实验数据集',input.name,input.description,input);});
 return flows;
};
function iterationWorkflowGraph(s){
 const flows=rsPipelines(s),nodes=[],edges=[],byId=new Map(),width=RS.flow==='model'?1300:1010;
 const cols=RS.flow==='model'?4:3,nodeWidth=230,rowGap=190;
 flows.sort((a,b)=>String(a.nodes[0].assetId||a.id).localeCompare(String(b.nodes[0].assetId||b.id)));
 flows.forEach((flow,row)=>flow.nodes.forEach((n,col)=>{
  const id=n.assetId||flow.id+'-missing-'+col;
  let node=byId.get(id);
  if(!node){node={id,assetId:n.assetId,kind:n.kind,title:n.title,description:n.description,status:n.status,col,x:45+col*315,y:45+row*rowGap,ys:[],outgoing:0};byId.set(id,node);nodes.push(node);}
  node.ys.push(45+row*rowGap);
  if(col){const previous=flow.nodes[col-1],from=previous.assetId||flow.id+'-missing-'+(col-1);if(!edges.some(e=>e.from===from&&e.to===id))edges.push({from,to:id});}
 }));
 nodes.forEach(n=>{n.y=n.ys.reduce((a,b)=>a+b,0)/n.ys.length;n.outgoing=edges.filter(e=>e.from===n.id).length;});
 return {nodes,edges,width:Math.max(width,cols*315+45),height:Math.max(420,flows.length*rowGap+55),nodeWidth};
}
function iterationWorkflowHTML(s){
 const g=iterationWorkflowGraph(s),selected=RS.flowSelected;
 const linked=new Set([selected]);g.edges.forEach(e=>{if(e.from===selected||e.to===selected){linked.add(e.from);linked.add(e.to);}});
 const svg='<svg class="shared-flow-lines" width="'+g.width+'" height="'+g.height+'" aria-hidden="true"><defs><marker id="flow-arrow-gray" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M1 1l5 2.5L1 6" style="stroke:var(--ink-4)"/></marker><marker id="flow-arrow-blue" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M1 1l5 2.5L1 6" style="stroke:var(--dry)"/></marker></defs>'+g.edges.map(e=>{const a=g.nodes.find(n=>n.id===e.from),b=g.nodes.find(n=>n.id===e.to),x=a.x+230,y=a.y+67,xx=b.x,yy=b.y+67,m=(x+xx)/2;const hi=selected&&(e.from===selected||e.to===selected);return '<path data-flow-from="'+esc(e.from)+'" data-flow-to="'+esc(e.to)+'" class="'+(hi?'is-highlighted':'')+'" d="M'+x+' '+y+'H'+m+'V'+yy+'H'+xx+'" marker-end="url(#flow-arrow-'+(hi?'blue':'gray')+')"/>';}).join('')+'</svg>';
 const body=g.nodes.map(n=>{
  const a=s.assets.find(a=>a.id===n.assetId),st=a?.kind==='experiment'?labSummary(a.snapshot):null;
  return '<button class="shared-flow-node rs-node'+(selected===n.id?' is-selected':'')+'" type="button" style="left:'+n.x+'px;top:'+n.y+'px" data-node-id="'+esc(n.id)+'" '+(a?'data-rs-asset="'+esc(a.id)+'"':'disabled')+' aria-label="'+esc(n.kind+'：'+n.title)+'">'+iterationIcon(a?.kind==='experiment'?'flask':a?.kind==='dataset'||a?.kind==='sampleSheet'?'model':'paper')+'<span><small>'+esc(n.kind)+'</small><strong>'+esc(n.title)+'</strong>'+(st?'<span class="lv-state is-'+esc(st.status)+'">'+esc(st.label)+'</span>':a?.kind==='conclusion'?'<span class="lv-state is-conclusion">已发布</span>':'')+'<span class="shared-flow-description">'+esc(iterationHumanText(n.description||a?.description||''))+'</span>'+(n.outgoing>1?'<span class="flow-reuse">'+esc(a?.version||'')+' · '+n.outgoing+' 项任务复用</span>':'')+'</span></button>';
 }).join('');
 return '<div class="shared-flow-surface" style="width:'+g.width+'px;height:'+g.height+'px;zoom:'+(RS.zoom||1)+'">'+svg+body+'</div>';
}
V.shareddetail=()=>{
 const gate=rsGate();if(gate)return gate;const s=rsShared(),member=rsMember(s);if(!s||!member)return '<div class="page rs"><h1>找不到可访问的共享项目</h1><button class="btn" data-go="shared">返回共享项目</button></div>';
 const header=iterationSharedHeader(s,member);
 if(RS.tab==='workflow')return '<div class="page rs shared-detail">'+header+'<section class="shared-workflow"><div class="shared-flow-toolbar"><div class="rs-actions">'+[['model','模型训练'],['experiment','实验验证']].map(([k,n])=>'<button class="btn '+(RS.flow===k?'btn-pri':'')+'" type="button" data-rs-flow="'+k+'">'+n+'</button>').join('')+'</div><div class="rs-actions"><button class="btn" type="button" data-iteration-zoom="-1" aria-label="缩小画布">−</button><span class="rs-help">'+Math.round((RS.zoom||1)*100)+'%</span><button class="btn" type="button" data-iteration-zoom="1" aria-label="放大画布">+</button><button class="btn" type="button" data-iteration-fit>适应画布</button></div></div><div class="shared-flow-viewport rs-canvas" tabindex="0" aria-label="项目工作流画布，可拖动平移">'+(rsPipelines(s).length?iterationWorkflowHTML(s):'<p class="rs-empty">暂无已共享的这类任务</p>')+'</div></section></div>';
 const groups=iterationAssetGroups(s),all=groups.flatMap(g=>g[1]);if(!all.some(a=>a.id===RS.assetPick))RS.assetPick=all[0]?.id||'';
 const selected=all.find(a=>a.id===RS.assetPick);
 return '<div class="page rs shared-detail">'+header+'<div class="shared-asset-workspace"><aside class="shared-asset-list" aria-label="项目资产"><div class="pjx-tabs">'+[['kb','知识库'],['tool','工具'],['exp','实验']].map(([k,n])=>'<button class="pjx-tab'+(RS.assetTab===k?' is-on':'')+'" type="button" data-shared-asset-tab="'+k+'" aria-current="'+(RS.assetTab===k?'page':'false')+'">'+n+'</button>').join('')+'</div><div class="pjx-side-h"><span class="lbl">'+(RS.assetTab==='kb'?'全部文件':RS.assetTab==='tool'?'已共享工具':'已共享任务')+'</span><span class="grow"></span><span class="t-xs mut2">'+all.length+'</span></div><div class="pjx-side-b">'+groups.map(([title,items])=>(groups.length>1?'<div class="pjx-sec"><span class="lbl">'+title+'</span><small>'+items.length+'</small></div>':'')+items.map(a=>'<button class="pjx-f'+(RS.assetPick===a.id?' is-on':'')+'" type="button" data-shared-asset-select="'+esc(a.id)+'" aria-pressed="'+(RS.assetPick===a.id)+'">'+iterationAssetFile(a)+'<span class="col grow" style="min-width:0;gap:3px"><span class="pjx-f-n">'+esc(a.name)+'</span><span class="t-xs mut2">'+esc(iterationAssetSource(s,a))+'</span></span></button>').join('')).join('')+(!all.length?'<p class="rs-help">暂无已共享内容</p>':'')+'</div></aside><section class="shared-asset-preview" aria-label="选中资产详情">'+iterationAssetPreview(s,selected)+'</section></div></div>';
};
function iterationCloseDrawer(returnFocus=true){
 const state=RS.drawer;document.querySelector('.asset-drawer')?.remove();RS.drawer=null;
 if(returnFocus&&state?.trigger){let e=state.trigger;if(!e.isConnected&&state.assetId)e=view.querySelector('[data-rs-asset="'+CSS.escape(state.assetId)+'"]');e?.focus({preventScroll:true});}
}
function iterationMountDrawer(title,body,footer,state={}){
 const previous=RS.drawer,scroll=document.querySelector('.asset-drawer-body')?.scrollTop||0;
 document.querySelector('.asset-drawer')?.remove();
 const panel=document.createElement('section');panel.className='asset-drawer';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','asset-drawer-title');
 panel.innerHTML='<header class="asset-drawer-head"><div><h2 id="asset-drawer-title" tabindex="-1">'+esc(title)+'</h2></div><button class="asset-drawer-close" type="button" aria-label="关闭详情">×</button></header><div class="asset-drawer-body">'+body+'</div>'+(footer?'<footer class="asset-drawer-footer">'+footer+'</footer>':'');
 document.body.append(panel);RS.drawer={...state,trigger:state.trigger||previous?.trigger};panel.querySelector('.asset-drawer-close').onclick=()=>iterationCloseDrawer();
 iterationBindAcquisitions(panel);
 if(previous?.kind===state.kind&&previous?.assetId===state.assetId)panel.querySelector('.asset-drawer-body').scrollTop=scroll;else panel.querySelector('#asset-drawer-title').focus({preventScroll:true});
 return panel;
}
rsAssetDialog=function(id){
 const s=rsShared(),a=s?.assets.find(a=>a.id===id);if(!a||!rsCan(s,'read'))return;
 const trigger=document.activeElement;RS.flowSelected=a.id;
 view.querySelectorAll('[data-node-id]').forEach(e=>e.classList.toggle('is-selected',e.dataset.nodeId===a.id));
 view.querySelectorAll('[data-flow-from]').forEach(e=>{const selected=e.dataset.flowFrom===a.id||e.dataset.flowTo===a.id;e.classList.toggle('is-highlighted',selected);e.setAttribute('marker-end','url(#flow-arrow-'+(selected?'blue':'gray')+')');});
 const summary=a.kind==='experiment'?labSummary(a.snapshot):null;
 iterationMountDrawer(a.name,'<p class="rs-help">'+esc(rsAssetLabel(a.kind))+' · '+esc(s.name)+'</p>'+(summary?'<p>'+labBadge(summary.status)+'</p>':'')+iterationAssetBody(s,a),iterationAcquire(s,a),{kind:'asset',assetId:id,sharedId:s.id,trigger});
};
rsRequestsDialog=function(){
 const s=rsShared();if(!s||!rsCan(s,'read'))return;
 const owner=rsCan(s,'approve'),rows=s.requests.filter(r=>owner||r.actor===RS.actor),pending=rows.filter(r=>r.state==='pending'),history=rows.filter(r=>r.state!=='pending');
 const labels={pending:owner?'待审批':'申请中',approved:'待导入',imported:'已导入',rejected:'已拒绝',revoked:'已撤回'};
 const block=r=>{const a=s.assets.find(a=>a.id===r.assetId),person=s.members.find(m=>m.id===r.actor)?.name||'项目成员',reviewer=s.members.find(m=>m.id===r.reviewBy)?.name||s.members.find(m=>m.id===s.owner)?.name||'项目负责人';
  return '<section class="request-block"><div class="rs-card-top"><h3>'+esc(a?.name||'来源资产不可用')+'</h3><span class="request-status '+r.state+'">'+labels[r.state]+'</span></div><small>'+esc(rsAssetLabel(a?.kind))+' · '+esc(r.version)+'</small>'+iterationPairs([[owner?'申请人':r.state==='approved'?'批准人':'审批人',owner?person:reviewer],['目标项目',rsProject(r.target)?.name||r.target],['申请理由',r.reason],['审核意见',r.reviewReason],['撤回原因',r.revocationReason]])+'<div class="rs-actions">'+(owner&&r.state==='pending'?'<button class="btn btn-pri" type="button" data-request-approve="'+esc(r.id)+'">批准</button><button class="btn" type="button" data-request-reject="'+esc(r.id)+'">拒绝</button>':'')+(r.actor===RS.actor&&r.state==='pending'?'<button class="btn" type="button" data-request-withdraw="'+esc(r.id)+'">撤回申请</button>':'')+(r.actor===RS.actor&&r.state==='approved'?'<button class="btn btn-pri" type="button" data-iteration-import="'+esc(r.id)+'">确认导入</button>':'')+'</div></section>';
 };
 const panel=iterationMountDrawer(owner?'获取申请':'我的申请',(pending.length?'<h3 class="request-group-title">'+(owner?'待我审批':'申请中')+' '+pending.length+'</h3>'+pending.map(block).join(''):'')+(history.length?'<h3 class="asset-drawer-history">'+(owner?'已处理':'其他申请')+' '+history.length+'</h3>'+history.map(block).join(''):'')+(!rows.length?'<p class="rs-help">暂无获取申请</p>':''),'',{kind:'requests',sharedId:s.id,trigger:document.activeElement});
 panel.querySelectorAll('[data-request-approve]').forEach(e=>e.onclick=()=>iterationMutation(()=>rsDecide(s.id,e.dataset.requestApprove,true,'同意在目标项目复用')));
 panel.querySelectorAll('[data-request-withdraw]').forEach(e=>e.onclick=()=>iterationMutation(()=>rsWithdrawRequest(s.id,e.dataset.requestWithdraw)));
 panel.querySelectorAll('[data-request-reject]').forEach(e=>e.onclick=()=>modal('拒绝获取申请','<label class="rs-field"><span>拒绝原因</span><textarea class="input" id="request-reject-reason"></textarea></label>','拒绝申请',()=>rsModalSave(()=>rsDecide(s.id,e.dataset.requestReject,false,document.getElementById('request-reject-reason').value))));
};
function iterationMutation(fn){Promise.resolve().then(fn).then(()=>{render();}).catch(e=>toast(e.message||'操作失败'));}
function iterationBindAcquisitions(root){
 root.querySelectorAll('[data-iteration-acquire]').forEach(e=>e.onclick=()=>rsRequestDialog(e.dataset.iterationAcquire));
 root.querySelectorAll('[data-iteration-import]').forEach(e=>e.onclick=()=>iterationMutation(()=>rsImport(rsShared().id,e.dataset.iterationImport)));
 if(root!==view)root.querySelectorAll('[data-rs-requests]').forEach(e=>e.onclick=()=>rsRequestsDialog());
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&RS.drawer&&!document.querySelector('dialog[open]')){e.preventDefault();iterationCloseDrawer();}});
const iterationBind=rsBind;
rsBind=function(root){
 iterationBind(root);iterationBindAcquisitions(root);
 root.querySelectorAll('[data-dataset-train]').forEach(e=>e.onclick=()=>{const found=dsFind(e.dataset.datasetTrain);if(!found||found.d.st!=='pub'||!can('edit'))return;S.pid=found.pid;trReset();NEWTR.ds=found.d.id;NEWTR.name=(found.d.name+' · 训练').slice(0,50);go('trainnew');});
 if(S.route!=='shareddetail'){if(RS.drawer)iterationCloseDrawer(false);return;}
 const s=rsShared();if(!s||!rsMember(s)){iterationCloseDrawer(false);return;}
 root.querySelectorAll('[data-shared-asset-tab]').forEach(e=>e.onclick=()=>{RS.assetTab=e.dataset.sharedAssetTab;RS.assetPick='';render();});
 root.querySelectorAll('[data-shared-asset-select]').forEach(e=>e.onclick=()=>{
  RS.assetPick=e.dataset.sharedAssetSelect;root.querySelectorAll('[data-shared-asset-select]').forEach(b=>{b.classList.toggle('is-on',b===e);b.setAttribute('aria-pressed',String(b===e));});
  const preview=root.querySelector('.shared-asset-preview');preview.innerHTML=iterationAssetPreview(s,s.assets.find(a=>a.id===RS.assetPick));preview.scrollTop=0;iterationBindAcquisitions(preview);
 });
 root.querySelectorAll('[data-rs-tab],[data-rs-flow]').forEach(e=>e.addEventListener('click',()=>iterationCloseDrawer(false),true));
 root.querySelectorAll('[data-iteration-zoom]').forEach(e=>e.onclick=()=>{iterationSaveFlowPosition();RS.zoom=Math.max(.35,Math.min(1.6,(RS.zoom||1)+Number(e.dataset.iterationZoom)*.1));render();});
 root.querySelectorAll('[data-iteration-fit]').forEach(e=>e.onclick=()=>{const c=root.querySelector('.shared-flow-viewport'),g=iterationWorkflowGraph(s);RS.zoom=Math.max(.35,Math.min(1,(c.clientWidth-30)/g.width,(c.clientHeight-20)/g.height));RS.flowPositions[s.id+'|'+RS.flow]={x:0,y:0};render();});
 const canvas=root.querySelector('.shared-flow-viewport');
 if(canvas){
  const position=RS.flowPositions[s.id+'|'+RS.flow];if(position){canvas.scrollLeft=position.x;canvas.scrollTop=position.y;}
  canvas.addEventListener('scroll',iterationSaveFlowPosition,{passive:true});
  let drag=null,moved=false;canvas.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,left:canvas.scrollLeft,top:canvas.scrollTop};moved=false;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;moved=moved||Math.abs(e.clientX-drag.x)>3||Math.abs(e.clientY-drag.y)>3;canvas.scrollLeft=drag.left-(e.clientX-drag.x);canvas.scrollTop=drag.top-(e.clientY-drag.y);});
  canvas.addEventListener('pointerup',()=>{drag=null;iterationSaveFlowPosition();});canvas.addEventListener('pointercancel',()=>{drag=null;});
 }
 if(RS.drawer?.sharedId===s.id){if(RS.drawer.kind==='requests')rsRequestsDialog();else if(RS.drawer.kind==='asset')rsAssetDialog(RS.drawer.assetId);}else if(RS.drawer)iterationCloseDrawer(false);
};
function iterationSaveFlowPosition(){const c=view.querySelector('.shared-flow-viewport');if(c&&rsShared())RS.flowPositions[rsShared().id+'|'+RS.flow]={x:c.scrollLeft,y:c.scrollTop};}
/* Compact creation form follows the confirmed shared-content selection design. */
V.sharednew=()=>{
 const gate=rsGate();if(gate)return gate;
 const f=RS.sharedForm||{mode:'existing',pid:rsPersonalProjects('me')[0]?.id||'',name:'',goal:'',assets:null};RS.sharedForm=f;
 const source=rsProject(f.pid);if(!f.initialized){f.name=f.mode==='existing'?source?.name||'':'';f.goal=f.mode==='existing'?source?.desc||'':'';f.initialized=true;}
 const candidates=f.mode==='existing'?rsCandidates(f.pid):[];if(f.assets===null)f.assets=candidates.filter(a=>a.kind==='knowledge').map(a=>a.id);
 const groups=[['知识库',['knowledge']],['工具与模型',['tool','model']],['数据与报告',['dataset','sampleSheet','evaluation','conclusion','inference']],['实验',['experiment']]];
 return '<div class="page rs rs-framed-form"><header class="iteration-head"><div><h1>新建共享项目</h1></div><button class="btn" type="button" data-go="shared">返回共享项目</button></header><div class="rs-form-layout rs-form-layout-single"><div class="rs-form-card"><div class="rs-form-scroll" data-rs-form-scroll="shared"><div class="rs-choice-row">'+[['existing','已有项目'],['blank','空白项目']].map(([v,n])=>'<label class="rs-choice"><input type="radio" name="sharedmode" data-rs-shared-mode="'+v+'" '+(f.mode===v?'checked':'')+'>'+n+'</label>').join('')+'</div><div class="rs-fields-grid">'+(f.mode==='existing'?'<label class="rs-field"><span>来源项目</span><select class="input" data-rs-shared-source aria-label="来源项目">'+rsPersonalProjects('me').map(p=>'<option value="'+esc(p.id)+'" '+(p.id===f.pid?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label>':'')+'<label class="rs-field"><span>共享项目名称 <b>*</b></span><input class="input" id="rs-shared-name" data-rs-shared-field="name" value="'+esc(f.name)+'" maxlength="50"></label></div><label class="rs-field"><span>研究目标 <small>选填</small></span><textarea class="input" data-rs-shared-field="goal" rows="2" maxlength="500">'+esc(f.goal)+'</textarea></label><div class="rs-card-top"><h2>共享内容</h2><span class="rs-help" data-shared-selection-count>已选 '+f.assets.length+' 项</span><button class="rs-link" type="button" data-shared-all>全选</button></div><p class="rs-help">仅共享所选内容，科研对话不共享。</p>'+groups.map(([name,kinds],i)=>{const items=candidates.filter(a=>kinds.includes(a.kind));if(!items.length)return '';return '<details class="shared-select-group" '+(!i?'open':'')+'><summary><strong>'+name+'</strong><span>'+items.length+' 项</span></summary><div>'+items.map(a=>'<label class="rs-select-asset"><input type="checkbox" data-rs-publish-pick="'+esc(a.id)+'" '+(f.assets.includes(a.id)?'checked':'')+'>'+iterationAssetFile(a)+'<span><strong>'+esc(a.name)+'</strong><small>'+esc(a.kind==='knowledge'?'资料引用':rsAssetLabel(a.kind))+'</small></span></label>').join('')+'</div></details>';}).join('')+(!candidates.length?'<p class="rs-help">创建后可共享资产并邀请成员。</p>':'')+'</div><div class="rs-form-footer"><p class="rs-dialog-error" id="rs-create-error" role="alert"></p><button class="btn" type="button" data-go="shared">取消</button><button class="btn btn-pri" type="button" data-rs-create-shared>创建共享项目</button></div></div></div></div>';
};
const iterationSharedFormBind=rsBind;
rsBind=function(root){
 iterationSharedFormBind(root);
 root.querySelectorAll('[data-rs-publish-pick]').forEach(e=>e.addEventListener('change',()=>{const el=root.querySelector('[data-shared-selection-count]');if(el)el.textContent='已选 '+RS.sharedForm.assets.length+' 项';}));
 root.querySelectorAll('[data-shared-all]').forEach(e=>e.onclick=()=>{const f=RS.sharedForm;f.assets=rsCandidates(f.pid).map(a=>a.id);root.querySelectorAll('[data-rs-publish-pick]').forEach(x=>x.checked=true);root.querySelector('[data-shared-selection-count]').textContent='已选 '+f.assets.length+' 项';});
};
/* Keep progress cards direct and concise; original data and export provenance are preserved. */
labCardV2=function(b){
 const s=labSummary(b),w=b.workflow,title=(b.name||b.ctx?.assay?.join(' / ')+' · 第 '+b.round+' 轮').replace(' · 异常示例','');
 return '<article class="lv-exp is-'+s.status+'" role="button" tabindex="0" data-labgo="'+esc(b.id)+'" aria-label="查看实验进展与结论：'+esc(title)+'"><div class="row" style="justify-content:space-between;gap:10px">'+labBadge(s.status)+'<span class="lv-small">'+esc(b.id.includes('DEMO')?'':b.id)+'</span></div><h2 class="lv-exp-title">'+esc(title)+'</h2><p class="lv-small">'+esc(pnOf(b.pid))+' · '+b.n+' 个样本</p><div class="lv-exp-progress"><div class="lv-bar" aria-hidden="true">'+(w?.steps.map(st=>'<i class="'+esc(st.state)+'"></i>').join('')||'<i></i>')+'</div><span class="lv-small">'+(s.total?s.done+'/'+s.total+' 环节':'未记录环节')+'</span></div><div class="lv-current"><strong>'+esc(s.current)+'</strong><br>'+esc(iterationHumanText(s.detail))+'</div></article>';
};
V.lab=()=>{
 const f=LABUI.filter==='all'&&S.lflt==='run'?'normal':LABUI.filter==='all'&&S.lflt==='past'?'conclusion':LABUI.filter,pid=DB.projects.some(p=>p.id===S.labProject)?S.labProject:'all',rank={exception:0,normal:1,draft:2,conclusion:3,unknown:4};
 const rows=BATCHES.filter(b=>(pid==='all'||b.pid===pid)&&(f==='all'||labSummary(b).status===f)).sort((a,b)=>rank[labSummary(a).status]-rank[labSummary(b).status]);
 return '<div class="page lv iteration-page"><header class="iteration-head"><div><h1>实验管理</h1><p>查看实验进展与结论</p></div><div class="rs-actions"><button class="btn" data-go="devices" type="button">查看设备列表</button><button class="btn btn-pri" data-act="labnew" type="button">发起实验</button></div></header><div class="lv-toolbar"><select class="input" style="max-width:250px" data-lv-project-filter aria-label="按课题筛选实验"><option value="all" '+(pid==='all'?'selected':'')+'>全部课题</option>'+DB.projects.filter(p=>(p.ownerId||'me')==='me').map(p=>'<option value="'+esc(p.id)+'" '+(p.id===pid?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select><div class="lv-filters" role="group" aria-label="实验状态">'+[['all','全部实验'],['normal','正常进行中'],['exception','异常'],['conclusion','有结论'],['draft','草稿']].map(([k,n])=>'<button class="lv-filter'+(f===k?' is-on':'')+'" type="button" data-lv-filter="'+k+'" aria-pressed="'+(f===k)+'">'+n+'</button>').join('')+'</div><span class="lv-small">'+rows.length+' 项实验</span></div><div class="lv-cards">'+rows.map(labCardV2).join('')+'</div>'+(!rows.length?'<p class="lv-empty">当前筛选下暂无实验</p>':'')+'</div>';
};
const iterationLabDetail=V.labdet;
V.labdet=()=>iterationLabDetail().replace(/<div class="lv-note">[\s\S]*?<\/div>/,'').replace(/演示：/g,'').replace(/ · 演示流程/g,'').replace('演示流程尚无人工操作记录','暂无操作记录');
const iterationSaveExperiment=labSave;
labSave=function(draft){
 if(!draft){const f=labForm(),errors=labValidate(f,false);if(Object.keys(errors).length){const key=Object.keys(errors)[0],step=f.steps.find(s=>['device_','resource_','sop_'].some(prefix=>key===prefix+s.id));LABUI.selected=step?.id||'setup';}}
 return iterationSaveExperiment(draft);
};
const iterationNewExperiment=labV2Act;
labV2Act=function(action){if(action==='labnew')LABUI.selected='setup';return iterationNewExperiment(action);};
