/* Attention queue acceptance: use actual result drawers; never call a model. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const {chromium}=require('../test-browser.cjs');
const url=process.env.DUANYAN_TEST_URL||'file://'+path.resolve(process.argv[2]||'index.html');
(async()=>{
 const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route(/^https?:\/\//,r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.request().url().includes('api.crossref.org')?r.fulfill({contentType:'application/json',body:JSON.stringify({message:{items:[]}})}):r.abort());
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
 const home=()=>page.evaluate(()=>{WB.progressProject='p1';go('workbench')});
 const has=key=>page.evaluate(key=>{const d=workbenchData();return wbAttentionTasks(d.tasks).some(t=>t.key===key)},key);
 async function clickCard(kind,key){
  await home();await page.evaluate(kind=>{WB.pagesByProject.p1[kind]=0;render()},kind);
  for(let i=0;i<100;i++){
   const card=page.locator('[data-wb-task-open="'+key+'"]');if(await card.count()){await card.click();return;}
   const next=page.locator('[data-wb-section-page="'+kind+'"][data-delta="1"]');assert(await next.count()&&!await next.isDisabled(),'missing '+key);await next.click();
  }throw new Error('pagination did not end');
 }
 const response=await page.goto(url+'#workbench');
 if(url.startsWith('https:')){assert.equal(response.status(),200);const hash=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(hash(await response.body()),hash(fs.readFileSync(path.resolve(__dirname,'../docs/index.html'))));}
 await page.waitForFunction(()=>RS.seedReady);
 const rows=await page.evaluate(()=>workbenchData({pid:'p1'}));
 const exp=rows.experiments.find(t=>t.status==='done'),train=rows.modelTasks.find(t=>t.kind==='train'&&t.status==='done'&&t.isTask),batch=rows.modelTasks.find(t=>t.type==='batch'&&t.status==='done');
 assert(exp&&train&&batch,'fixture coverage');
 await check('attention eligibility excludes drafts canceled assets sessions and derived metrics',async()=>{
  const actual=await page.evaluate(()=>{const data=workbenchData(),eligible=wbAttentionTasks(data.tasks);return {all:data.tasks,eligible}});
  assert(actual.all.some(t=>t.status==='draft'));
  assert(actual.all.some(t=>t.kind==='eval'&&!t.isTask));
  assert(actual.eligible.some(t=>t.kind==='experiment'&&t.status==='active'));
  assert(actual.eligible.some(t=>t.kind==='train'&&t.status==='active'));
  assert(actual.eligible.some(t=>t.status==='done'));
  assert(actual.eligible.some(t=>t.status==='failed'));
  assert(actual.eligible.every(t=>t.isTask&&['active','failed','done'].includes(t.status)));
  assert.deepEqual(await page.evaluate(()=>wbAttentionTasks([{key:'canceled',isTask:true,status:'canceled'},{key:'unknown',isTask:true,status:'unknown'},{key:'interrupted',isTask:true,status:'unknown',needsAction:true}]).map(t=>t.key)),['interrupted']);
 });
 await check('opening a completed experiment removes only that result and preserves full history',async()=>{
  await clickCard('experiment',exp.key);assert.deepEqual(await page.evaluate(()=>[S.route,S.labPick]),['labdet',exp.id]);
  assert(await page.locator('.lv-conclusion').isVisible());await home();assert.equal(await has(exp.key),false);
  assert(await page.evaluate(id=>workbenchData({pid:'p1'}).experiments.some(t=>t.id===id),exp.id));
  assert.equal(await page.locator('[data-task-kind="experiment"] h3 small').innerText(),String(rows.experiments.filter(t=>['active','failed','done'].includes(t.status)).length-1));
  await page.locator('[data-wb-list="experiment"]').click();assert(await page.locator('[data-labgo="'+exp.id+'"]').isVisible());
  assert(await page.evaluate(id=>BATCHES.some(b=>b.id===id),exp.id));
 });
 await check('experiment archive views consume unread conclusions but lists alone do not',async()=>{
  const other=rows.experiments.find(t=>t.status==='done'&&t.key!==exp.key);assert(other);
  await home();await page.locator('[data-wb-list="experiment"]').click();assert.equal(await has(other.key),true);
  await page.locator('[data-labgo="'+other.id+'"]').click();await home();assert.equal(await has(other.key),false);
  await page.evaluate(id=>{BATCHES.find(b=>b.id===id).workflow.conclusion.text+=' 补充一次独立复核。';render()},other.id);
  assert.equal(await has(other.key),true);
 });
 await check('result views from full training and inference lists also consume unread cards',async()=>{
  await page.evaluate(()=>go('mdl',{mtab:'job',mdlProj:'p1',jobPick:null,bDrawer:null}));
  await page.locator('[data-jobpick="'+train.id+'"]').first().click();assert(await page.locator('.dw [data-dwclose="jobclose"]').isVisible());
  await home();assert.equal(await has(train.key),false);
  await page.evaluate(()=>go('mdl',{mtab:'batch',mdlProj:'p1',jobPick:null,bDrawer:null}));
  await page.locator('[data-bjob="'+batch.id+'"]').first().click();assert(await page.locator('.dw [data-dwclose="bdrawerx"]').isVisible());
  await home();assert.equal(await has(batch.key),false);
 });
 await check('read results stay hidden after reloading while archives and assets remain complete',async()=>{
  const before=await page.evaluate(()=>{const d=workbenchData({pid:'p1'});return [d.experiments.length,d.modelTasks.length,rsCandidates('p1').length]});
  await page.reload();await page.waitForFunction(()=>RS.seedReady);await home();
  for(const key of [exp.key,train.key,batch.key])assert.equal(await has(key),false,key);
  assert.deepEqual(await page.evaluate(()=>{const d=workbenchData({pid:'p1'});return[d.experiments.length,d.modelTasks.length,rsCandidates('p1').length]}),before);
 });
 await check('viewing a running task does not consume its future result including identical reruns',async()=>{
  await page.evaluate(id=>{DB.projects.find(p=>p.id==='p1').models.find(m=>m.id===id).st='running';render()},train.id);
  await clickCard('model',train.key);assert.equal(await page.evaluate(key=>Object.hasOwn(wbReadReceipts(),key),train.key),false);
  await home();assert.equal(await has(train.key),true);
  await page.evaluate(id=>{DB.projects.find(p=>p.id==='p1').models.find(m=>m.id===id).st='done';render()},train.id);
  assert.equal(await has(train.key),true);await clickCard('model',train.key);await home();assert.equal(await has(train.key),false);
 });
 await check('a new result version reappears without clearing other project read receipts',async()=>{
  const other=await page.evaluate(()=>workbenchData({pid:'p2'}).modelTasks.find(t=>t.kind==='train'&&t.status==='done'&&t.isTask));
  await page.evaluate(key=>workbenchOpenTask(key),other.key);await home();assert.equal(await has(other.key),false);
  await page.evaluate(id=>{const m=DB.projects.find(p=>p.id==='p1').models.find(m=>m.id===id);m.rho+=.001;render()},train.id);
  assert.equal(await has(train.key),true);assert.equal(await has(other.key),false);
  await clickCard('model',train.key);await home();assert.equal(await has(train.key),false);
 });
 await check('exceptions remain visible after details and reading cannot resolve a failed task',async()=>{
  const failed=rows.experiments.find(t=>t.status==='failed');assert(failed);await clickCard('experiment',failed.key);await home();assert.equal(await has(failed.key),true);
  assert.equal(await page.evaluate(key=>workbenchData().tasks.find(t=>t.key===key).status,failed.key),'failed');
 });
 await check('background rendering does not mark a result read until its details are visible',async()=>{
  await page.evaluate(id=>{const m=rsProject('p1').models.find(m=>m.id===id);m.rho+=.001;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true})},train.id);
  await page.evaluate(key=>workbenchOpenTask(key),train.key);assert.equal(await has(train.key),true);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});
  await home();assert.equal(await has(train.key),false);
 });
 await check('an actual synchronous scoring rerun reappears even with identical predictions and survives reload',async()=>{
  const local=await page.evaluate(()=>workbenchData({pid:'p1'}).modelTasks.find(t=>t.type==='batch'&&bFind(t.id)?.sid==='local-scoring'));assert(local);
  await page.evaluate(key=>workbenchOpenTask(key),local.key);await home();assert.equal(await has(local.key),false);
  const before=await page.evaluate(key=>{const t=workbenchData().tasks.find(t=>t.key===key);return {version:wbResultVersion(t),out:bFind(t.id).out}},local.key);
  await page.evaluate(async id=>{go('mdl',{mtab:'batch',bDrawer:null,jobPick:null});await bRun(id)},local.id);
  assert.equal(await has(local.key),true);
  assert.deepEqual(await page.evaluate(id=>bFind(id).out,local.id),before.out);
  assert.notEqual(await page.evaluate(key=>wbResultVersion(workbenchData().tasks.find(t=>t.key===key)),local.key),before.version);
  await page.reload();await page.waitForFunction(()=>RS.seedReady);await home();assert.equal(await has(local.key),true);
  await clickCard('model',local.key);await home();assert.equal(await has(local.key),false);
 });
 await check('empty attention sections clamp pagination and retain full list access',async()=>{
  await page.evaluate(()=>{
   const p=rsProject('p1');p.models=p.models.filter(m=>!['running','queued','failed'].includes(m.st));
   for(let i=BATCHES.length-1;i>=0;i--)if(BATCHES[i].pid==='p1'&&['normal','exception'].includes(labSummary(BATCHES[i]).status))BATCHES.splice(i,1);
   for(const j of BJ())if(bDs(j)?.pid==='p1'&&['part','fail','run'].includes(j.st))j.st='stop';
   for(const t of workbenchData({pid:'p1'}).tasks)if(t.status==='done'&&t.isTask)workbenchOpenTask(t.key);
   WB.progressProject='p1';WB.pagesByProject.p1={model:999,experiment:999};go('workbench');
  });
  assert.deepEqual(await page.locator('.wb-task-section-head small').allTextContents(),['0','0']);
  assert.equal(await page.locator('.wb-empty-tasks').count(),2);assert.match(await page.locator('.wb-empty-tasks').first().innerText(),/暂无需要关注/);
  assert.deepEqual(await page.evaluate(()=>WB.pagesByProject.p1),{model:0,experiment:0});
  assert(await page.locator('[data-wb-list="experiment"]').isVisible());assert(await page.locator('[data-wb-list-select]').count());
  await page.locator('[data-wb-list="experiment"]').click();assert(await page.locator('.lv-exp').count()>0);
 });
 await check('another open tab updates when a result is read',async()=>{
  const tab=await context.newPage();await tab.goto(url+'#workbench');await tab.waitForFunction(()=>RS.seedReady);
  const key=await tab.evaluate(()=>{WB.progressProject='p3';render();return workbenchData({pid:'p3'}).experiments.find(t=>t.status==='done').key});
  const count=await tab.locator('[data-task-kind="experiment"] h3 small').innerText();assert(await tab.locator('[data-wb-task-open="'+key+'"]').isVisible());
  await page.evaluate(key=>workbenchOpenTask(key),key);
  await tab.waitForFunction(key=>!document.querySelector('[data-wb-task-open="'+key+'"]'),key);
  assert.equal(await tab.locator('[data-task-kind="experiment"] h3 small').innerText(),String(+count-1));await tab.close();
 });
 await check('a stale running tab cannot erase a newer result read in another tab',async()=>{
  const tab=await context.newPage();await tab.goto(url+'#workbench');await tab.waitForFunction(()=>RS.seedReady);
  const task=await tab.evaluate(()=>workbenchData({pid:'p2'}).modelTasks.find(t=>t.kind==='train'&&t.isTask&&t.status==='done'));assert(task);
  await tab.evaluate(id=>{rsProject('p2').models.find(m=>m.id===id).st='running';render()},task.id);
  await page.evaluate(t=>{const m=rsProject(t.pid).models.find(m=>m.id===t.id);m.resultVersion='cross-tab-v2';workbenchOpenTask(t.key)},task);
  // A second tab may still hold an older running snapshot after the new result is read.
  await tab.evaluate(()=>render());await home();assert.equal(await has(task.key),false);
  await tab.close();
 });
 await check('viewing an older completed version cannot overwrite a newer read receipt',async()=>{
  const tab=await context.newPage();await tab.goto(url+'#workbench');await tab.waitForFunction(()=>RS.seedReady);
  const task=await tab.evaluate(()=>workbenchData({pid:'p3'}).modelTasks.find(t=>t.kind==='train'&&t.isTask&&t.status==='done'));assert(task);
  await page.evaluate(t=>{rsProject(t.pid).models.find(m=>m.id===t.id).resultVersion='newest-result-v3';workbenchOpenTask(t.key)},task);
  await tab.evaluate(key=>workbenchOpenTask(key),task.key);await home();assert.equal(await has(task.key),false);
  await tab.close();
 });
 assert.deepEqual(errors,[]);await browser.close();const upgrade=await require('./workbench-upgrade.cjs').run();console.log('Workbench attention: '+(checks.length+upgrade.length)+' groups passed.');
})().catch(e=>{console.error(e);process.exit(1)});
