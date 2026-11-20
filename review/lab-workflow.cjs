/* Protein lab integration: no live service, instrument or model calls. */
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require('../test-browser.cjs');
const url='file://'+path.resolve(process.argv[2]||'index.html');
const output=path.resolve('work/qa/lab-workflow');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.setDefaultTimeout(6000);const errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:\/\//,r=>r.abort('blockedbyclient'));
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)};
 const go=async(route)=>{await page.evaluate(r=>go(r),route);await page.waitForTimeout(120)};
 await page.addInitScript(()=>localStorage.setItem('dy_examples_disabled','true'));
 await page.goto(url+'#devices');await page.waitForFunction(()=>RS.seedReady);
 await check('catalog filters, keyboard search, device contracts and official links',async()=>{
   assert.equal(await page.locator('.lv-device').count(),12);
   await page.locator('[data-lv-type="亲和力表征"]').click();assert.equal(await page.locator('.lv-device').count(),2);
   await page.locator('[data-lv-search]').pressSequentially('Octet');assert.equal(await page.locator('.lv-device').count(),1);
   assert.equal(await page.locator('[data-lv-search]').inputValue(),'Octet');
   await page.locator('[data-lv-device="octet"]').click();
   assert.match(await page.locator('#view').innerText(),/输入要求.*实体与数据/s);
   assert.match(await page.locator('.device-section a').getAttribute('href'),/^https:\/\/www.sartorius.com/);
   await page.locator('[data-go="devices"]').click();
   await page.locator('[data-lv-search]').fill('');await page.locator('[data-lv-type="全部"]').click();
   await page.screenshot({path:path.join(output,'devices-desktop.png'),fullPage:true});
 });
 await check('three coherent statuses and explicit parallel progress',async()=>{
   assert(await page.evaluate(()=>BATCHES.filter(b=>b.workflow?.source==='demo').every(b=>b.n===b.workflow.sampleIds.length)));assert.deepEqual(await page.evaluate(()=>BATCHES.find(b=>b.id==='B-2411').workflow.sampleIds),await page.evaluate(()=>BATCHES.find(b=>b.id==='B-2412').workflow.sampleIds));
   await go('lab');assert.equal(await page.locator('.lv-exp').count(),4);
   assert.deepEqual(await page.evaluate(()=>labCounts()),{normal:1,exception:1,conclusion:2,draft:0});
   await page.locator('.lv-filter[data-lv-filter="exception"]').click();assert.equal(await page.locator('.lv-exp').count(),1);
   await page.locator('[data-labgo="B-DEMO-EX"]').click();assert.match(await page.locator('[data-lv-stage="qc"] .lv-stage-result').innerText(),/样品浓度/);
   await page.evaluate(()=>go('labdet',{labPick:'B-2412'}));
   assert.equal(await page.locator('[data-lv-stage="affinity"] .lv-state').innerText(),'进行中');assert.equal(await page.locator('[data-lv-stage="stability"] .lv-state').innerText(),'进行中');
   await page.screenshot({path:path.join(output,'experiment-detail.png'),fullPage:true});
 });
 await check('template, schedule dependencies and independent physical inputs',async()=>{
   await page.evaluate(()=>act('labnew'));
   await page.locator('[data-lv-field="name"]').fill('R5 蛋白表征验证');
   await page.locator('[data-lv-field="template"]').selectOption('full');
   assert.equal(await page.locator('[data-lv-field="name"]').inputValue(),'R5 蛋白表征验证');
   assert(await page.evaluate(()=>labForm().steps.some(s=>s.id==='harvest')));
   await page.locator('[data-lv-mode="serial"]').check();
   assert.deepEqual(await page.evaluate(()=>{const s=labForm().steps.find(s=>s.id==='stability');return [s.after,s.inputFrom]}),[['affinity'],['qc']]);
   await page.locator('[data-lv-mode="parallel"]').check();
   assert.deepEqual(await page.evaluate(()=>labForm().steps.find(s=>s.id==='stability').after),['qc']);
   await page.locator('[data-lv-field="template"]').selectOption('characterize');
 });
 await check('validation catches missing samples, incompatible devices, cycles and resource collision',async()=>{
   await page.locator('[data-lv-save="ready"]').click();assert(await page.locator('.lv-error-summary').isVisible());
   const validation=await page.evaluate(()=>{
     const f=labCopy(labForm());Object.assign(f,{samples:'S1',sourceRef:'交接清单 v1',aliquot:'独立分样'});
     f.steps.find(s=>s.id==='affinity').deviceId='nanodrop';const badDevice=labValidate(f);
     f.steps.find(s=>s.id==='affinity').deviceId='octet';
     f.steps.find(s=>s.id==='prep').after=['review'];const cycle=labValidate(f);
     f.steps.find(s=>s.id==='prep').after=[];
     f.steps.find(s=>s.id==='affinity').resource='LAB-01';f.steps.find(s=>s.id==='stability').resource='lab-01';const collision=labValidate(f);
     f.mode='serial';const serial=labValidate(f);
     return [badDevice.device_affinity,cycle.graph,collision.resource_stability,serial.resource_stability];
   });
   assert(validation[0]);assert.match(validation[1],/循环/);assert.match(validation[2],/同一个设备/);assert.equal(validation[3],undefined);
 });
 let batchId;
 await check('draft edit, valid creation, deduplicated sample IDs and frozen plan',async()=>{
   await page.locator('[data-lv-save="draft"]').click();batchId=await page.evaluate(()=>S.labPick);
   assert.equal(await page.evaluate(()=>BATCHES.find(b=>b.id===S.labPick).workflow.phase),'draft');
   await page.locator('[data-lv-edit]').click();
   await page.locator('[data-lv-field="samples"]').fill('S1\nS2\nS1');
   await page.locator('[data-lv-field="sourceRef"]').fill('样本交接清单 v2，ELN-001');
   await page.locator('[data-lv-field="aliquot"]').fill('S1/S2 各分出 A、B 两份，分别交接至 BLI 和稳定性检测；余量由负责人确认。');
   for(const id of ['prep','qc','affinity','stability']){await page.locator('[data-composer-node="'+id+'"]').click();await page.locator('[data-lv-resource="'+id+'"]').fill('LAB-'+id);await page.locator('[data-lv-sop="'+id+'"]').fill('SOP-v1');}
   await page.locator('[data-lv-save="ready"]').click();
   assert.equal(await page.evaluate(()=>S.labPick),batchId);
   const record=await page.evaluate(()=>{const b=BATCHES.find(b=>b.id===S.labPick);return {n:b.n,states:b.workflow.steps.map(s=>s.state),source:b.workflow.source,phase:b.workflow.phase,instances:BATCHES.filter(x=>x.id===b.id).length}});
   assert.equal(record.n,2);assert(record.states.every(s=>s==='pending'));assert.equal(record.source,'manual');assert.equal(record.instances,1);assert.equal(record.phase,'ready');
   assert(await page.evaluate(()=>{const s=BATCHES.find(b=>b.id===S.labPick).workflow.steps[0],model=LAB_DEVICES[0].model,output=LAB_STAGES.prep.output;LAB_DEVICES[0].model='Changed reference';LAB_STAGES.prep.output='Changed contract';const frozen=s.deviceSnapshot.model===model&&s.contract.output===output;LAB_DEVICES[0].model=model;LAB_STAGES.prep.output=output;return frozen}));
 });
 await check('stage prerequisites, result evidence and manual UI recording',async()=>{
   assert.match(await page.evaluate(()=>labPublish(BATCHES.find(b=>b.id===S.labPick),'支持假设','尚无证据','ELN')),/先完成/);
   assert.match(await page.evaluate(()=>labRecord(BATCHES.find(b=>b.id===S.labPick),'affinity','running','','')),/前置/);
   await page.locator('[data-lv-record="prep"]').click();
   await page.locator('#lv-record-state').selectOption('done');
   await page.locator('#dlg [value="ok"]').click();assert(await page.locator('#lv-record-error').innerText());
   await page.locator('#lv-record-result').fill('样本编号、分样与板图核对完成，已交接。');
   await page.locator('#lv-record-evidence').fill('ELN-001 / sample-map-v2.csv');
   await page.locator('#dlg [value="ok"]').click();assert.equal(await page.locator('#dlg').isVisible(),false);
   assert.equal(await page.evaluate(()=>labRecord(BATCHES.find(b=>b.id===S.labPick),'qc','done','质控接受标准经人工复核，样本已放行','ELN-QC-001')),'');
   await page.evaluate(()=>render());
 });
 await check('exception, retry lineage and unaffected parallel branch',async()=>{
   const results=await page.evaluate(()=>{const b=BATCHES.find(b=>b.id===S.labPick);return [labRecord(b,'affinity','exception','参考通道异常，需重新确认传感器与样本','ELN-ERR'),labRecord(b,'stability','done','稳定性曲线与重复已复核','ELN-DSF-001'),labSummary(b).status]});
   assert.deepEqual(results,['','','exception']);await page.evaluate(()=>render());
   await page.locator('[data-lv-retry="affinity"]').click();await page.locator('#dlg [value="ok"]').click();
   const after=await page.evaluate(()=>{const w=BATCHES.find(b=>b.id===S.labPick).workflow;return {affinity:w.steps.find(s=>s.id==='affinity'),stability:w.steps.find(s=>s.id==='stability'),review:w.steps.find(s=>s.id==='review')}});
   assert.equal(after.affinity.state,'pending');assert.equal(after.affinity.attempt,2);assert(after.affinity.history.some(h=>h.state==='invalidated'));assert.equal(after.stability.state,'done');assert.equal(after.review.state,'pending');
   assert.equal(await page.evaluate(()=>labRecord(BATCHES.find(b=>b.id===S.labPick),'affinity','done','曲线、对照及拟合已复核；结果未达到项目判据','ELN-BLI-002')),'');await page.evaluate(()=>render());
 });
 await check('negative conclusion, persistence, workbench data and deep links',async()=>{
   await page.locator('[data-lv-publish]').click();await page.locator('#lv-verdict').selectOption('不支持假设');
   await page.locator('#lv-conclusion-text').fill('所测条件下，候选未同时达到亲和力和稳定性判据。');await page.locator('#lv-conclusion-evidence').fill('ELN-BLI-002 + ELN-DSF-001 / review-v1');await page.locator('#dlg [value="ok"]').click();
   assert.equal(await page.evaluate(()=>labSummary(BATCHES.find(b=>b.id===S.labPick)).status),'conclusion');
   assert.equal(await page.evaluate(()=>BATCHES.find(b=>b.id===S.labPick).status),'done');
   assert.match(await page.evaluate(()=>labPublish(BATCHES.find(b=>b.id===S.labPick),'支持假设','试图直接改写','新引用')),/已发布/);
   await page.reload();await page.evaluate(id=>go('labdet',{labPick:id}),batchId);
   assert.match(await page.locator('.lv-conclusion').innerText(),/不支持假设/);
   await go('workbench');await page.evaluate(()=>{WB.progressProject='p2';render()});
   await page.locator('[data-task-kind="experiment"] [data-wb-task-open]').first().click();assert.equal(await page.evaluate(()=>S.labPick),'B-DEMO-EX');
   const row=await page.evaluate(id=>workbenchData().experiments.find(t=>t.id===id),batchId);assert.equal(row.status,'done');assert.equal(row.label,'有结论');assert.match(row.detail,/不支持假设/);
 });
 await check('upstream retry invalidates descendants and archives published conclusion',async()=>{
   const result=await page.evaluate(id=>{const b=BATCHES.find(b=>b.id===id);labRetry(b,'qc');return {summary:labSummary(b),conclusion:b.workflow.conclusion,states:Object.fromEntries(b.workflow.steps.map(s=>[s.id,s.state])),archived:b.workflow.events.some(e=>e.text.startsWith('原结论归档'))}},batchId);
   assert.equal(result.states.prep,'done');assert.equal(result.states.qc,'pending');assert.equal(result.states.affinity,'pending');assert.equal(result.states.stability,'pending');assert.equal(result.states.review,'pending');assert.equal(result.conclusion,null);assert.equal(result.archived,true);assert.equal(result.summary.status,'normal');
 });
 await check('read-only guards, responsive pages, dark mode and no runtime errors',async()=>{
   assert(await page.evaluate(id=>{S.as=3;const b=BATCHES.find(b=>b.id===id),n=b.workflow.events.length;const err=labRecord(b,'qc','running','','');const retry=labRetry(b,'prep');S.as=0;return !!err&&!retry&&b.workflow.events.length===n},batchId));
   assert(await page.evaluate(id=>{const b=BATCHES.find(b=>b.id===id),before=JSON.stringify(b),set=Storage.prototype.setItem;let err;try{Storage.prototype.setItem=()=>{throw new DOMException('Quota exceeded','QuotaExceededError')};err=labRecord(b,'qc','running','正在复核','ELN-QC')}finally{Storage.prototype.setItem=set}return !!err&&JSON.stringify(b)===before},batchId));
   for(const width of [390,768,1440]){
     await page.setViewportSize({width,height:900});
     for(const route of ['devices','lab','labnew','labdet','workbench']){
       await page.evaluate(({route,batchId})=>{if(route==='labdet')S.labPick=batchId;go(route)},{route,batchId});
       const overflow=await page.evaluate(()=>{const v=document.getElementById('view');return document.documentElement.scrollWidth>innerWidth+1||v.scrollWidth>v.clientWidth+1});assert.equal(overflow,false,route+' overflow '+width);
     }
   }
   await page.setViewportSize({width:390,height:844});await go('lab');await page.screenshot({path:path.join(output,'experiments-mobile.png'),fullPage:true});
   await page.emulateMedia({colorScheme:'dark'});await go('devices');await page.screenshot({path:path.join(output,'devices-dark-mobile.png'),fullPage:true});
   assert.deepEqual(errors,[]);
 });
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2));
 await browser.close();console.log('Lab workflow: '+checks.length+' integration groups passed. No live device calls.');
})().catch(e=>{console.error(e);process.exit(1)});
