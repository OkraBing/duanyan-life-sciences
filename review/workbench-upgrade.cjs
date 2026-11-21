/* Upgrade checks use a previously published HTML, not a reimplementation of it. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('../test-browser.cjs');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:18843';
const legacy=execFileSync('git',['show','2da26a893588cbe9d4f1311bb50dd0a360d73086:docs/index.html'],{cwd:root,maxBuffer:5e6}).toString();
async function run(){
 const browser=await chromium.launch(),checks=[],errors=[];
 async function scenario(name,fn){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin===origin&&['/legacy','/current'].includes(u.pathname)&&r.request().isNavigationRequest())return r.fulfill({contentType:'text/html',body:u.pathname==='/legacy'?legacy:fs.readFileSync(path.join(root,'index.html'),'utf8')});if(u.hostname==='api.crossref.org')return r.fulfill({contentType:'application/json',body:JSON.stringify({message:{items:[]}})});return r.abort();});
  const open=async(name,instant)=>{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));if(instant)await page.clock.setFixedTime(new Date(instant));await page.goto(origin+'/'+name+'#workbench');await page.waitForFunction(()=>RS.seedReady);return page;};
  try{await fn({context,open});checks.push(name);console.log('PASS '+name);}finally{await context.close();}
 }
 try{
  await scenario('legacy string read receipts migrate without resurfacing completed tasks',async({open})=>{
   const old=await open('legacy','2026-11-21T10:00:00+08:00');const task=await old.evaluate(()=>workbenchData({pid:'p1'}).modelTasks.find(t=>t.id==='M-P1-001'&&t.kind==='train'&&t.isTask&&t.status==='done'));assert(task,'persisted fixture model');
   await old.evaluate(key=>workbenchOpenTask(key),task.key);assert.equal(typeof await old.evaluate(key=>LS.get('wb_result_reads_v1',{})[key],task.key),'string');await old.close();
   const current=await open('current','2026-11-22T11:05:00+08:00');assert.equal(await current.evaluate(key=>wbAttentionTasks(workbenchData().tasks).some(t=>t.key===key),task.key),false);
  });
  await scenario('a cached legacy running page cannot erase a current result read',async({open})=>{
   const old=await open('legacy'),task=await old.evaluate(()=>workbenchData({pid:'p1'}).modelTasks.find(t=>t.kind==='train'&&t.isTask&&t.status==='done'));
   await old.evaluate(t=>{rsProject(t.pid).models.find(m=>m.id===t.id).st='running';render()},task);
   const current=await open('current');await current.evaluate(t=>{const m=rsProject(t.pid).models.find(m=>m.id===t.id);m.st='done';m.resultVersion='upgraded-result-v2';workbenchOpenTask(t.key)},task);
   await old.evaluate(()=>render());await current.evaluate(()=>go('workbench'));
   assert.equal(await current.evaluate(key=>wbAttentionTasks(workbenchData().tasks).some(t=>t.key===key),task.key),false);
  });
  await scenario('a cached legacy result page cannot replace a current version receipt',async({open})=>{
   const old=await open('legacy'),task=await old.evaluate(()=>workbenchData({pid:'p2'}).modelTasks.find(t=>t.kind==='train'&&t.isTask&&t.status==='done'));
   const current=await open('current');await current.evaluate(t=>{rsProject(t.pid).models.find(m=>m.id===t.id).resultVersion='new-version-after-upgrade';workbenchOpenTask(t.key)},task);
   await old.evaluate(key=>workbenchOpenTask(key),task.key);await current.evaluate(()=>go('workbench'));
   assert.equal(await current.evaluate(key=>wbAttentionTasks(workbenchData().tasks).some(t=>t.key===key),task.key),false);
  });
  await scenario('renaming a reviewed model keeps it read while changed results reappear',async({open})=>{
   const p=await open('current'),task=await p.evaluate(()=>workbenchData({pid:'p3'}).modelTasks.find(t=>t.kind==='train'&&t.isTask&&t.status==='done'));
   await p.evaluate(key=>workbenchOpenTask(key),task.key);await p.evaluate(t=>{go('workbench');rsProject(t.pid).models.find(m=>m.id===t.id).name+=' · 已重命名';render()},task);
   assert.equal(await p.evaluate(key=>wbAttentionTasks(workbenchData().tasks).some(t=>t.key===key),task.key),false);
   await p.evaluate(t=>{rsProject(t.pid).models.find(m=>m.id===t.id).rho+=.002;render()},task);
   assert.equal(await p.evaluate(key=>wbAttentionTasks(workbenchData().tasks).some(t=>t.key===key),task.key),true);
  });
  await scenario('invalid saved read metadata recovers without hiding actual unread tasks',async({open})=>{
   const p=await open('current');await p.evaluate(()=>{LS.set('wb_result_reads_v1','invalid');localStorage.removeItem('dy_wb_result_reads_v2');go('workbench')});
   assert(await p.evaluate(()=>wbAttentionTasks(workbenchData().tasks).some(t=>t.status==='done')));
   assert.equal(await p.locator('.wb-panel').count(),3);assert.deepEqual(errors,[]);
  });
  await scenario('reconstructed bootstrap results retain their identity across minutes days and tabs',async({open})=>{
   const p=await open('current','2026-11-21T10:00:00+08:00');
   const snapshot=page=>page.evaluate(()=>workbenchData().modelTasks.filter(t=>t.kind==='train'&&t.isTask&&t.status==='done'&&/^M-\d+$/.test(t.id)).map(t=>({key:t.key,version:wbResultVersion(t),at:rsProject(t.pid).models.find(m=>m.id===t.id).at})));
   const initial=await snapshot(p);assert(initial.length>=4,'bootstrap coverage across projects');
   await p.evaluate(keys=>{for(const key of keys)workbenchOpenTask(key);go('workbench')},initial.map(t=>t.key));
   for(const instant of ['2026-11-21T10:02:00+08:00','2026-11-22T11:05:00+08:00']){
    await p.clock.setFixedTime(new Date(instant));await p.reload();await p.waitForFunction(()=>RS.seedReady);
    assert.deepEqual(await snapshot(p),initial,'reloading cannot create new result versions');
    assert.deepEqual(await p.evaluate(keys=>wbAttentionTasks(workbenchData().tasks).filter(t=>keys.includes(t.key)).map(t=>t.key),initial.map(t=>t.key)),[]);
   }
   const tab=await open('current','2026-11-23T15:00:00+08:00');assert.deepEqual(await snapshot(tab),initial);
   assert.deepEqual(await tab.evaluate(keys=>wbAttentionTasks(workbenchData().tasks).filter(t=>keys.includes(t.key)).map(t=>t.key),initial.map(t=>t.key)),[]);
   await p.evaluate(key=>{const t=workbenchData().tasks.find(t=>t.key===key);rsProject(t.pid).models.find(m=>m.id===t.id).rho+=.002;render()},initial[0].key);
   assert.equal(await p.evaluate(key=>wbAttentionTasks(workbenchData().tasks).some(t=>t.key===key),initial[0].key),true,'actual result revisions still resurface');
  });
  assert.deepEqual(errors,[]);return checks;
 }finally{await browser.close();}
}
module.exports={run};
if(require.main===module)run().then(c=>console.log('Workbench upgrade: '+c.length+' groups passed.')).catch(e=>{console.error(e);process.exitCode=1;});
