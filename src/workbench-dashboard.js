/* Research workbench: one quiet idea banner, progress on the left, papers on the right. */
WB.newsPage=0;WB.newsPageSize=4;
/* 课题标识：所有课题用同一个干色标记，身份靠名字，不靠颜色。 */
function wbProjectMark(p){
  /* 标记里放的是「课题」这个图标，不是课题名的首字：两个课题都叫 Barstar 开头时，
     首字只会让两张卡看起来一样。身份交给颜色，图标只说这是一个课题。 */
  return '<span class="wb-project-mark" aria-hidden="true">'+ddIc('proj')+'</span>'}
function dashboardProjectSlots(){
 const grid=view.querySelector('.wb-dashboard .wb-project-grid');
 const content=Math.max(280,view.clientWidth-(innerWidth<=600?32:72));
 const width=grid?.clientWidth||(innerWidth<=900?content:(content-16)*.64);
 return width>=920?3:width>=580?2:1;
}
iterationProjectSlots=dashboardProjectSlots;
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
 const descriptionId='wb-description-'+encodeURIComponent(t.key),html=dashboardMinimalTask(t),copy=dashboardDescription(t),kind={experiment:'实验',train:'模型训练',eval:'模型评测',infer:'模型推理'}[t.kind]||'任务';
 const path={train:'m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9',eval:'M8 3h8v3h3v15H5V6h3V3zM8 6h8M8 11l2 2 4-4M8 17h8',infer:'M3 4h7v6H3zM14 14h7v6h-7zM6.5 10v7H14M10 7h7.5v7'}[t.kind];
 const icon=path?'<svg class="wb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>':wbViewIcon('flask');
 let rendered=html.replace(/<span class="wb-task-symbol[^>]*>[\s\S]*?<\/span>/,'<span class="wb-task-symbol is-'+esc(t.kind)+'" title="'+kind+'">'+icon+'</span>').replace('</strong></span>',()=>'</strong><span id="'+esc(descriptionId)+'" class="wb-task-description" title="'+esc(copy.description)+'">'+esc(copy.description)+'</span></span>');
 const progress=dashboardTaskProgress(t);
 rendered=rendered.replace('<button ', '<button aria-describedby="'+esc(descriptionId)+'" ');
 return rendered.replace(/(<span class="wb-status[^"]*")>([^<]*)<\/span>/,(_,open,label)=>open+' title="'+esc(copy.meta)+'">'+label+(progress?'<span class="wb-tag-detail">'+esc(progress)+'</span>':'')+'</span>');
};
function dashboardTaskProgress(t){
 if(t.kind==='experiment'){const b=BATCHES.find(b=>b.id===t.id&&b.pid===t.pid),s=b&&labSummary(b);return s?.total?s.done+'/'+s.total+' 环节':'';}
 if(t.kind==='infer'&&t.itemCount)return(t.succeeded||0)+'/'+t.itemCount+' 行';
 if(typeof t.progress==='number')return t.progress+'%';
 return t.status==='done'?'100%':'';
}
function dashboardPapers(projects){
 const valid=new Set(projects.map(p=>p.id));
 return WB.papers.filter(p=>wbViewHref(p.url)&&(p.pids||[p.pid]).some(id=>valid.has(id)));
}
