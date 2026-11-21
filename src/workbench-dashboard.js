/* Research workbench: one quiet idea banner, progress on the left, papers on the right. */
WB.taskRowsByProject={};WB.newsPage=0;WB.newsPageSize=2;
function dashboardProjectSlots(){
 const grid=view.querySelector('.wb-dashboard .wb-project-grid');
 const content=Math.max(280,view.clientWidth-(innerWidth<=600?32:72));
 const width=grid?.clientWidth||(innerWidth<=900?content:(content-16)*.64);
 return width>=920?3:width>=580?2:1;
}
iterationProjectSlots=dashboardProjectSlots;
function dashboardTaskSize(pid,kind){return WB.taskRowsByProject[pid]?.[kind]||1;}
function dashboardDescription(t){
 const clean=s=>iterationHumanText(s||'').replace(/\s+/g,' ').trim();
 if(t.kind==='experiment'){
  const b=BATCHES.find(b=>b.id===t.id&&b.pid===t.pid),s=b&&labSummary(b);
  return {description:clean(s?.status==='exception'?s.detail:s?.status==='conclusion'?b.workflow?.conclusion?.text:s?.current||t.detail),meta:[b?.n?b.n+' 个样本':'',s?.total?'已完成 '+s.done+'/'+s.total+' 环节':''].filter(Boolean).join(' · ')};
 }
 if(t.kind==='train'||t.kind==='eval'){
  const m=rsProject(t.pid)?.models?.find(m=>m.id===t.id),d=m?.ds&&dsFind(m.ds)?.d;
  return {description:clean(t.status==='failed'?m?.why||t.detail:t.status==='active'?m?.stage||m?.desc||t.detail:m?.desc||(m?.target?'对候选的 '+tgtName(m.target)+' 进行评分':t.detail)),meta:[t.kind==='eval'?'模型评测':'模型训练',typeof t.progress==='number'&&t.status==='active'?t.progress+'%':m?.target?'预测 '+tgtName(m.target):d?.name||''].filter(Boolean).join(' · ')};
 }
 return {description:clean(t.failedCount?'有 '+t.failedCount+' 行处理失败，可继续处理未完成记录。':t.modelName?'使用 '+t.modelName+' 处理候选数据':t.detail),meta:[t.type==='online'?'在线推理':'批量推理',t.itemCount?(t.succeeded||0)+'/'+t.itemCount+' 行成功':t.progressLabel||''].filter(Boolean).join(' · ')};
}
const dashboardMinimalTask=iterationCompactTask;
iterationCompactTask=function(t){
 const html=dashboardMinimalTask(t),copy=dashboardDescription(t),kind={experiment:'实验',train:'模型训练',eval:'模型评测',infer:'模型推理'}[t.kind]||'任务';
 const path={train:'M5 18h14M7 15V9M12 15V5M17 15v-4M4 7l4-3 5 2 6-3',eval:'M8 3h8v3h3v15H5V6h3V3zM8 6h8M8 11l2 2 4-4M8 17h8',infer:'M4 5h7v6H4zM13 13h7v6h-7zM15 5h5v5M20 5l-7 7M4 15v4h5'}[t.kind];
 const icon=path?'<svg class="wb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>':wbViewIcon('flask');
 return html.replace(/<span class="wb-task-symbol[^>]*>[\s\S]*?<\/span>/,'<span class="wb-task-symbol is-'+esc(t.kind)+'" title="'+kind+'">'+icon+'</span>').replace('</strong></span>','</strong><span class="wb-task-description" title="'+esc(copy.description)+'">'+esc(copy.description)+'</span><span class="wb-task-context">'+esc(copy.meta)+'</span></span>');
};
function dashboardSummary(data){
 const failed=data.experiments.filter(t=>t.status==='failed'),active=data.experiments.filter(t=>t.status==='active'),ready=wbAttentionTasks(data.experiments).filter(t=>t.status==='done');
 if(failed.length){const groups=new Set(failed.map(t=>t.pid));return '有 '+failed.length+' 项实验异常，分布在 '+groups.size+' 个课题；建议先查看异常环节。';}
 if(active.length)return '有 '+active.length+' 项实验正在进行，可以查看各环节的最新记录。';
 if(ready.length)return '有 '+ready.length+' 项实验已有结论，等待你查看。';
 return '当前没有需要关注的实验，可以继续推进模型任务或探索新的研究问题。';
}
function dashboardRefreshIdea(){
 const data=iterationPrepareWorkbench(),pool=WB.ideas.filter(x=>data.projects.some(p=>p.id===x.pid)),previous=WB.dailyIdea;
 const index=pool.findIndex(x=>x.pid===previous?.pid&&x.question===previous?.question);
 const alternatives=pool.filter(x=>x.question!==previous?.question);if(!alternatives.length){wbPrepare();return;}
 let next=pool[(index+1+pool.length)%pool.length];if(next.question===previous?.question)next=alternatives[0];
 WB.dailyDate=wbToday();WB.dailyIdea={...next};LS.set('wb_daily_idea_v1',{date:WB.dailyDate,idea:WB.dailyIdea});render();view.querySelector('[data-wb-refresh-idea]')?.focus({preventScroll:true});
}
function dashboardPapers(projects){
 const valid=new Set(projects.map(p=>p.id));
 return WB.papers.filter(p=>wbViewHref(p.url)&&(p.pids||[p.pid]).some(id=>valid.has(id)));
}
function dashboardNewsControls(page,pages){
 return '<div class="wb-news-controls" role="group" aria-label="切换学术资讯"><button class="btn wb-project-step" type="button" data-wb-news-page="-1" aria-label="上一页论文" '+(!page?'disabled':'')+'>'+wbViewIcon('left')+'</button><span class="wb-project-range">'+(pages?page+1:0)+' / '+pages+'</span><button class="btn wb-project-step" type="button" data-wb-news-page="1" aria-label="下一页论文" '+(!pages||page>=pages-1?'disabled':'')+'>'+wbViewIcon('right')+'</button></div>';
}
function dashboardPaper(p,projects){
 const href=wbViewHref(p.url),title=p.title||p.shortTitle||'未命名论文',description=p.description||WB_PAPERS.find(x=>x.id===p.id)?.summary||p.relevance||'打开论文查看研究内容。',pids=p.pids||[p.pid];
 return '<li class="wb-paper-card" data-paper-id="'+esc(p.id||p.url)+'"><div class="wb-paper-copy"><h3 class="wb-paper-title" title="'+esc(title)+'">'+esc(title)+'</h3><p class="wb-paper-description">'+esc(description)+'</p></div><div class="wb-paper-foot"><div class="wb-paper-topics">'+projects.filter(x=>pids.includes(x.id)).map(x=>'<span class="wb-paper-topic" title="相关课题：'+esc(x.name)+'">'+esc(x.name)+'</span>').join('')+'</div><a class="wb-paper-open" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" aria-label="打开论文：'+esc(title)+'" title="打开论文">'+wbViewIcon('external')+'</a></div></li>';
}
V.workbench=()=>{
 const d=wbPrepare(),ps=d.projects||[];if(!ps.some(p=>p.id===WB.progressProject))WB.progressProject=ps[0]?.id||'';
 const window=iterationProjectWindow(ps),idea=WB.ideas[0],papers=dashboardPapers(ps),pageSize=WB.newsPageSize||2,pages=Math.ceil(papers.length/pageSize);WB.newsPage=Math.max(0,Math.min(Math.max(0,pages-1),WB.newsPage||0));
 const date=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Shanghai'});
 return '<div class="page wb wb-dashboard"><header class="wb-header"><div class="wb-header-copy"><span class="wb-kicker">工作台</span><h1>'+wbViewGreeting()+'，ZHANG</h1></div><span class="wb-date">'+esc(date)+'</span></header><div class="wb-layout">'+
 '<section class="wb-panel wb-inspiration" aria-labelledby="wb-ideas-title"><div class="wb-idea-banner-head"><h2 id="wb-ideas-title" class="wb-inspiration-label">'+wbViewIcon('spark')+'今日灵感</h2><button class="wb-icon-button wb-refresh-idea" type="button" data-wb-refresh-idea aria-label="刷新今日灵感" title="换个问题" '+(!idea?'disabled':'')+'>'+wbViewIcon('refresh')+'</button></div>'+(idea?'<div class="wb-idea-banner-body"><p class="wb-question" aria-live="polite">'+esc(idea.question)+'</p><button type="button" class="btn btn-pri wb-idea-explore" data-wb-prompt="'+esc(idea.question)+'" data-wb-pid="'+esc(idea.pid)+'" aria-label="去探索，关联课题：'+esc(ps.find(p=>p.id===idea.pid)?.name||idea.project||'')+'">去探索 '+wbViewIcon('arrow')+'</button></div>':'<div class="wb-empty-idea">为课题补充研究目标，开始探索新问题。</div>')+'</section>'+
 '<section class="wb-panel wb-tasks" aria-labelledby="wb-tasks-title" aria-roledescription="轮播"><div class="wb-panel-heading"><div class="wb-progress-heading"><h2 id="wb-tasks-title">实验进展</h2>'+iterationProjectControls(window,ps.length)+'</div><div class="wb-agent-summary" aria-live="polite">'+wbViewIcon('spark')+'<p>'+esc(dashboardSummary(d))+'</p></div></div>'+(window.items.length?'<div class="wb-project-grid" style="--wb-project-slots:'+window.slots+'">'+window.items.map(p=>{const scope=workbenchData({pid:p.id});return '<article class="wb-project-card" data-wb-project-id="'+esc(p.id)+'" aria-label="课题：'+esc(p.name)+'"><header class="wb-project-card-head"><h3><button class="wb-project-title" type="button" data-wb-project="'+esc(p.id)+'" aria-label="进入课题：'+esc(p.name)+'"><span>'+esc(p.name)+'</span>'+wbViewIcon('arrow')+'</button></h3></header>'+iterationTaskSection('experiment',scope.experiments||[],p.id)+iterationTaskSection('model',scope.modelTasks||[],p.id)+'</article>'}).join('')+'</div>':'<div class="wb-empty"><strong>还没有课题</strong><button class="btn btn-pri" type="button" data-wb-create-project>新建项目</button></div>')+'</section>'+
 '<section class="wb-panel wb-news" aria-labelledby="wb-news-title"><div class="wb-panel-heading"><div class="wb-progress-heading"><div class="wb-panel-label">'+wbViewIcon('paper')+'<h2 id="wb-news-title">学术资讯</h2></div>'+dashboardNewsControls(WB.newsPage,pages)+'</div><p class="wb-news-agent">'+'我为你找到可能相关的最新论文'+'</p>'+(papers.length&&WB.papersError?'<p class="wb-news-state" role="status">暂未获取新结果，保留现有论文。</p>':'')+'</div><ul class="wb-paper-stack">'+papers.slice(WB.newsPage*pageSize,(WB.newsPage+1)*pageSize).map(p=>dashboardPaper(p,ps)).join('')+'</ul>'+(!papers.length?'<div class="wb-empty-news"><p>'+(WB.papersBusy?'正在查找可能相关的最新论文':WB.papersError?'暂时无法获取论文，请稍后重试。':'暂无匹配论文，为课题补充关键词。')+'</p></div>':'')+'</section></div></div>';
};
function dashboardFit(root){
 let changed=false;
 root.querySelectorAll('.wb-project-card .wb-task-list').forEach(list=>{
  const pid=list.closest('[data-wb-project-id]').dataset.wbProjectId,kind=list.closest('[data-task-kind]').dataset.taskKind,style=getComputedStyle(list),min=parseFloat(style.getPropertyValue('--wb-task-min-row'))||60,gap=parseFloat(style.rowGap)||4;
  const size=Math.max(1,Math.min(3,Math.floor((list.clientHeight+gap)/(min+gap))));
  const old=dashboardTaskSize(pid,kind);if(size!==old){WB.taskRowsByProject[pid]||={};WB.taskRowsByProject[pid][kind]=size;if(WB.pagesByProject[pid])WB.pagesByProject[pid][kind]=Math.floor(WB.pagesByProject[pid][kind]*old/size);changed=true;}
 });
 const stack=root.querySelector('.wb-paper-stack');if(stack?.clientHeight){const min=parseFloat(getComputedStyle(stack).getPropertyValue('--wb-paper-min-row'))||178,size=Math.max(1,Math.min(3,Math.floor((stack.clientHeight+10)/(min+10))));if(size!==WB.newsPageSize){WB.newsPage=Math.floor(WB.newsPage*(WB.newsPageSize||2)/size);WB.newsPageSize=size;changed=true;}}
 return changed;
}
const dashboardOriginalBind=wbBind;
wbBind=function(root){
 dashboardOriginalBind(root);if(S.route!=='workbench')return;wbLayoutObserver?.disconnect();
 root.querySelector('[data-wb-refresh-idea]')?.addEventListener('click',dashboardRefreshIdea);
 root.querySelectorAll('[data-wb-news-page]').forEach(b=>b.addEventListener('click',()=>{WB.newsPage+=Number(b.dataset.wbNewsPage);render();(view.querySelector('[data-wb-news-page="'+b.dataset.wbNewsPage+'"]:not(:disabled)')||view.querySelector('[data-wb-news-page]:not(:disabled)'))?.focus({preventScroll:true});}));
 let scheduled=false;const fit=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(S.route!=='workbench')return;const slots=dashboardProjectSlots();if(slots!==WB.projectSlots||dashboardFit(view)){render();return;}WB.projectViewport=view.clientWidth+':'+innerHeight;});};
 wbLayoutObserver=new ResizeObserver(fit);root.querySelectorAll('.wb-project-grid,.wb-task-list,.wb-paper-stack').forEach(e=>wbLayoutObserver.observe(e));fit();
};
