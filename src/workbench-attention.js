/* Workbench is an attention queue, not a second task archive.
   Read receipts apply to one result version in this browser, never to task status. */
function wbReadReceipts(){
 const saved=LS.get('wb_result_reads_v1',{});
 return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
}
function wbResultVersion(task){
 if(task.status!=='done')return '';
 let result;
 if(task.kind==='experiment'){
  const b=BATCHES.find(b=>b.id===task.id&&b.pid===task.pid);
  if(!b)return '';
  result=b.workflow?{resultVersion:b.resultVersion,resultRows:b.resultRows,conclusion:b.workflow.conclusion,steps:b.workflow.steps.map(s=>({id:s.id,state:s.state,attempt:s.attempt,result:s.result,evidence:s.evidence}))}
   :{results:b.results,log:b.log,at:b.at};
 }else if(task.kind==='train'||task.kind==='eval'){
  const m=DB.projects.find(p=>p.id===task.pid)?.models?.find(m=>m.id===task.id);
  if(!m)return '';
  result=Object.fromEntries(['at','completedAt','runId','resultVersion','ds','target','w','mu','sd','lam','rho','rmse','nTrain','nTest','prosp','bl'].map(k=>[k,m[k]]));
 }else if(task.type==='batch'){
  const j=bFind(task.id);if(!j)return '';
  result={at:j.at,completedAt:j.completedAt,runId:j.runId,resultVersion:j.resultVersion||0,ds:j.ds,modelId:j.modelId||null,out:j.out};
 }else return '';
 const value=JSON.stringify(result);
 return fp32(value)+':'+value.length;
}
function wbAttentionTasks(tasks){
 const read=wbReadReceipts();
 return tasks.filter(t=>{
  // Imported assets, derived evaluation metrics and chat sessions have their own libraries.
  if(t.isTask===false)return false;
  if(t.status==='active'||t.status==='failed'||(t.status==='unknown'&&t.needsAction))return true;
  if(t.status!=='done')return false;
  const version=wbResultVersion(t);
  return !!version&&read[t.key]!==version;
 });
}
function wbRecordVisibleResults(root){
 const data=WB_DATA.read(),receipts=wbReadReceipts();let changed=false;
 const selected=new Set();
 // Check rendered content as well as state: stale drawer IDs must not consume results.
 if(!document.hidden&&S.route==='labdet'&&root.querySelector('[data-lv-export],[data-expdl]')){
  data.experiments.filter(t=>t.id===S.labPick).forEach(t=>selected.add(t.key));
 }
 if(!document.hidden&&root.querySelector('.dw [data-dwclose="jobclose"]')){
  const m=mdlFind(S.jobPick),pid=m?._pid||m?.pid;
  data.modelTasks.filter(t=>t.id===S.jobPick&&t.pid===pid&&['train','eval'].includes(t.kind)).forEach(t=>selected.add(t.key));
 }
 if(!document.hidden&&root.querySelector('.dw [data-dwclose="bdrawerx"]')){
  data.modelTasks.filter(t=>t.type==='batch'&&t.id===S.bDrawer).forEach(t=>selected.add(t.key));
 }
 // Only the full experiment detail contains the workflow conclusion; the legacy
 // project summary drawer intentionally does not mark it as read.
 data.tasks.forEach(t=>{
  if(t.status!=='done'){
   // A rerun is a new result even if it later reproduces identical numbers.
   if(Object.hasOwn(receipts,t.key)){delete receipts[t.key];changed=true;}
  }else if(selected.has(t.key)){
   const version=wbResultVersion(t);
   if(version&&receipts[t.key]!==version){receipts[t.key]=version;changed=true;}
  }
 });
 if(changed)LS.set('wb_result_reads_v1',receipts);
}
const wbRenderWithAttention=render;
render=function(){const result=wbRenderWithAttention();wbRecordVisibleResults(view);return result;};
window.addEventListener('storage',event=>{
 if(event.key==='dy_wb_result_reads_v1'&&S.route==='workbench')render();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)wbRecordVisibleResults(view);});
