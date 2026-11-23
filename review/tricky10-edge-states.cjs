/* Fresh negative paths: visible copy, empty targets and cancelled async uploads. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('../test-browser.cjs');
const out=path.resolve(process.env.DUANYAN_EDGE_OUT||'work/qa/tricky10/edge-states');fs.mkdirSync(out,{recursive:true});
const cases=[],errors=[];let browser;
async function test(id,name,fn,options={}){
 const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce',...options}),page=await context.newPage();page.setDefaultTimeout(6500);page.on('pageerror',e=>errors.push(e.message));
 await context.route(/^https?:/,r=>r.request().url().includes('api.crossref.org')?r.fulfill({contentType:'application/json',body:JSON.stringify({message:{items:[]}})}):r.abort());
 try{await page.goto('file://'+path.resolve('index.html')+'#workbench');await page.waitForFunction(()=>RS.seedReady);await fn(page);cases.push({id,name,status:'passed'});console.log('PASS '+id+' '+name);}catch(e){cases.push({id,name,status:'failed',error:e.stack});console.error('FAIL '+id+' '+name+'\n'+e.stack);await page.screenshot({path:path.join(out,id+'-failure.png')});}finally{await context.close();}
}
(async()=>{browser=await chromium.launch();
await test('E01','没有我的课题时，权限申请可创建目标项目并保留资产与版本',async p=>{
 // Ownership is fixture setup; creation and submission use visible controls.
 await p.evaluate(()=>{DB.projects.forEach(p=>p.ownerId='other');RS.sharedPick='example-shared-joined';go('shareddetail')});
 await p.locator('[data-iteration-acquire]').first().click();const before=await p.evaluate(()=>({count:RS.data.projects.length,requests:rsShared().requests.length}));
 assert(!/演示|本机原型/.test(await p.locator('#dlg').innerText()));assert.match(await p.locator('#dlg').innerText(),/还没有我的课题/);assert(await p.locator('#dlg [value=ok]').isDisabled());
 await p.locator('#rs-target-create').click();await p.locator('#dlg [value=ok]').click();assert.equal(await p.evaluate(()=>RS.data.projects.length),before.count);
 await p.locator('#rs-personal-name').fill('候选蛋白交叉验证');await p.locator('#dlg [value=ok]').click();await p.locator('#rs-target').waitFor();const target=await p.locator('#rs-target').inputValue();assert(target);
 await p.locator('#rs-request-reason').fill('用于独立复核');await p.locator('#dlg [value=ok]').click();await p.waitForFunction(n=>rsShared().requests.length===n+1,before.requests);
 const request=await p.evaluate(()=>rsShared().requests[0]);assert.equal(request.target,target);assert.equal(request.state,'pending');assert.equal(request.reason,'用于独立复核');assert(await p.evaluate(r=>rsShared().assets.some(a=>a.id===r.assetId&&a.version===r.version&&a.fingerprint===r.fingerprint),request));
});
await test('E02','超限上传只提示文件限制，重传可恢复且不生成资源',async p=>{
 await p.evaluate(()=>{RS.form=rsNewResource('database');go('databasenew')});const count=await p.evaluate(()=>RS.data.resources.length);
 const file=path.join(out,'oversize.csv');fs.writeFileSync(file,Buffer.alloc(25*1024*1024+1,97));await p.locator('#rs-upload-input').setInputFiles(file);await p.waitForFunction(()=>!RS.form.uploading);
 assert.equal(await p.locator('.rs-inline-error').first().innerText(),'文件总大小不能超过 25 MB');assert.equal(await p.evaluate(()=>RS.form.manifest.length),0);
 await p.locator('#rs-upload-input').setInputFiles({name:'valid.csv',mimeType:'text/csv',buffer:Buffer.from('variant,kd\nV1,1.2\nV2,1.4\n')});await p.waitForFunction(()=>!!RS.form.preview&&!RS.form.uploading);assert.equal(await p.locator('.rs-inline-error').first().innerText(),'');assert.equal(await p.evaluate(()=>RS.data.resources.length),count);
});
await test('E03','成员缺少邮箱时显示明确空值，不暴露内部账号类型',async p=>{
 await p.evaluate(()=>{RS.sharedPick='example-shared-owned';rsShared().members.find(m=>m.id==='me').email='';go('shareddetail')});await p.locator('[data-rs-members]').click();const copy=await p.locator('#dlg').innerText();assert(!/本机账号|演示成员/.test(copy));assert.match(copy,/未设置邮箱/);assert.match(copy,/所有者/);await p.locator('#dlg [value=ok]').click();
});
await test('E04','移除上传会丢弃尚未结束的解析结果，不恢复已删除文件',async p=>{
 await p.evaluate(()=>{RS.form=rsNewResource('database');go('databasenew')});const input=p.locator('#rs-upload-input');await input.setInputFiles({name:'first.csv',mimeType:'text/csv',buffer:Buffer.from('variant,kd\nV1,1\n')});await p.waitForFunction(()=>!!RS.form.preview);
 await p.evaluate(()=>{const read=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(){await new Promise(r=>setTimeout(r,350));return read.call(this)}});
 await input.setInputFiles({name:'late.csv',mimeType:'text/csv',buffer:Buffer.from('variant,kd\nV2,2\n')});await p.waitForFunction(()=>RS.form.uploading);await p.locator('[data-rs-clear-files]').click();await p.waitForTimeout(500);
 assert.deepEqual(await p.evaluate(()=>({uploading:RS.form.uploading,files:RS.form.files.length,manifest:RS.form.manifest.length,preview:RS.form.preview,error:RS.form.uploadError})),{uploading:false,files:0,manifest:0,preview:null,error:''});assert.equal(await p.locator('.rs-file-summary').count(),0);
});
await test('E05','新建接收项目的取消和返回保留原申请理由，创建后自动选中新项目',async p=>{
 await p.evaluate(()=>{DB.projects.forEach(p=>p.ownerId='other');RS.sharedPick='example-shared-joined';go('shareddetail')});await p.locator('[data-iteration-acquire]').first().click();const reason='交叉验证 $& <对照>，保留原申请';await p.locator('#rs-request-reason').fill(reason);
 await p.locator('#rs-target-create').click();await p.locator('#rs-personal-name').fill('取消的项目');await p.locator('#dlg [value=cancel]').click();await p.locator('#rs-request-reason').waitFor({state:'visible'});assert.equal(await p.locator('#rs-request-reason').inputValue(),reason);assert.equal(await p.evaluate(()=>rsPersonalProjects().length),0);
 await p.locator('#rs-target-create').click();await p.locator('#rs-personal-name').waitFor({state:'visible'});await p.keyboard.press('Escape');await p.locator('#rs-request-reason').waitFor({state:'visible'});assert.equal(await p.locator('#rs-request-reason').inputValue(),reason);
 await p.locator('#rs-target-create').click();await p.locator('#rs-personal-name').fill('接收候选模型');await p.locator('#dlg [value=ok]').click();await p.locator('#rs-target').waitFor({state:'attached'});assert.equal(await p.locator('#rs-request-reason').inputValue(),reason);assert.equal(await p.locator('#rs-target option:checked').innerText(),'接收候选模型');assert(await p.locator('#dlg [value=ok]').isEnabled());
 await p.locator('#dlg [value=cancel]').click();assert.equal(await p.locator('#dlg[open]').count(),0);await p.keyboard.press('Escape');assert.equal(await p.locator('#dlg[open]').count(),0);
});
await test('E06','沿用最新视觉，灵感操作同排、翻页统一容器且课题入口没有伪按钮',async p=>{
 assert.equal(await p.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),'19px');assert.equal(await p.locator('.wb-idea-actions button').count(),2);
 const actions=await p.locator('.wb-idea-actions button').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return{y:b.y,h:b.height}}));assert.equal(actions[0].y,actions[1].y);assert.equal(actions[0].h,actions[1].h);assert.equal(await p.locator('.wb-idea-explore svg').count(),0);
 for(const selector of ['.wb-project-controls','.wb-news-controls']){assert.equal(await p.locator(selector).evaluate(e=>getComputedStyle(e).borderTopWidth),'1px');for(const b of await p.locator(selector+' button').all())assert.equal(await b.evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');}
 assert.equal(await p.locator('.wb-project-title>.wb-icon').first().evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');
 await p.locator('[data-wb-project-window="1"]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>WB.projectStart),1);await p.locator('[data-wb-project-window="-1"]').click();assert.equal(await p.evaluate(()=>WB.projectStart),0);
 await p.locator('[data-wb-refresh-idea]').click();assert(await p.locator('[data-wb-refresh-idea]').evaluate(e=>e===document.activeElement));assert.equal(await p.locator('.wb-paper-card').count(),4);await p.screenshot({path:path.join(out,'workbench-controls.png')});
});
await test('E07','触屏操作保持四十四像素命中区，窄屏不遮挡或横向溢出',async p=>{
 assert(await p.locator('#view').evaluate(e=>e.scrollWidth<=e.clientWidth+1));for(const selector of ['.wb-refresh-idea','.wb-idea-explore','.wb-project-step'])for(const e of await p.locator(selector).all()){const b=await e.boundingBox();assert(b.height>=44,selector);assert(b.width>=44,selector);}
 const b=await p.locator('.wb-idea-actions').boundingBox(),panel=await p.locator('.wb-inspiration').boundingBox();assert(b.x>=panel.x&&b.x+b.width<=panel.x+panel.width+1);await p.screenshot({path:path.join(out,'workbench-controls-mobile.png'),fullPage:true});
},{viewport:{width:390,height:844},hasTouch:true,isMobile:true});
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({generatedAt:new Date().toISOString(),cases,errors},null,2));await browser.close();if(cases.some(c=>c.status==='failed')||errors.length)process.exitCode=1;
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
