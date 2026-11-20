const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('../test-browser.cjs');
const url='file://'+path.resolve(process.argv[2]||'index.html'),out=path.resolve('work/qa/research-workspace');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(7000);
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:\/\//,r=>r.abort('blockedbyclient'));
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)};
 const go=route=>page.evaluate(route=>go(route),route);
 const asActor=id=>page.evaluate(id=>{iterationCloseDrawer(false);RS.actor=id;render();},id);
 await page.addInitScript(()=>localStorage.setItem('dy_examples_disabled','true'));
 await page.goto(url+'#shared');await page.waitForFunction(()=>RS.ready);assert.equal(await page.evaluate(()=>RS.error),'');
 let sharedId,memberId,targetId,assetId,requestId,toolId,databaseId,originalFile;
 await check('shared navigation and conversion keep real project and fixed asset versions',async()=>{
  assert(await page.locator('[data-navid="shared"]').isVisible());await page.locator('[data-rs-new-shared]').first().click();
  await page.locator('[data-shared-all]').click();await page.locator('[data-rs-create-shared]').click();await page.waitForFunction(()=>RS.data.shared.length===1);sharedId=await page.evaluate(()=>RS.sharedPick);
  const s=await page.evaluate(()=>rsShared());assert.equal(s.projectId,'p1');assert(s.assets.length>0);assert(!s.assets.some(a=>a.kind==='model'&&/^\d+$/.test(a.name)));
  assert(!s.assets.some(a=>a.kind==='dataset'&&a.snapshot.st!=='pub'));assert(s.assets.filter(a=>a.kind==='evaluation').every(e=>s.assets.some(a=>a.id===e.snapshot.modelAssetId&&a.kind==='model')));assert(s.assets.filter(a=>a.kind==='conclusion').every(c=>s.assets.some(a=>a.id===c.snapshot.experimentAssetId&&a.kind==='experiment')));assetId=s.assets.find(a=>a.kind==='model').id;
  assert.match(await page.evaluate(async()=>{try{await rsCreateShared({mode:'existing',pid:'p1',name:'Duplicate shared',goal:'',assets:[]});return '';}catch(e){return e.message}}),/已开启共享/);
  await page.locator('[data-rs-tab="workflow"]').click();assert(await page.locator('.rs-node').count()>=4);assert(await page.locator('.rs-node:disabled').count()>0);
  await page.screenshot({path:path.join(out,'shared-model-pipelines.png')});
  await page.locator('[data-rs-flow="experiment"]').click();assert.match(await page.locator('.rs-canvas').innerText(),/实验结论/);
 });
 await check('multiple shared projects, blank creation and retained selection on reload',async()=>{
  await go('shared');await page.locator('[data-rs-new-shared]').first().click();await page.locator('[data-rs-shared-mode="blank"]').check();
  await page.locator('#rs-shared-name').fill('空白协作课题');await page.locator('[data-rs-create-shared]').click();await page.waitForFunction(()=>RS.data.shared.length===2);
  await page.reload();await page.waitForFunction(()=>RS.ready);assert.match(await page.locator('h1').innerText(),/空白协作课题/);
  await go('shared');assert.equal(await page.locator('.rs-project-card').count(),2);await page.locator('[data-rs-open="'+sharedId+'"]').click();
 });
 await check('invite, simulated acceptance and role controls enforce actual local operations',async()=>{
  await page.locator('[data-rs-members]').click();await page.locator('#rs-invite-open').click();
  await page.locator('#rs-invite-email').fill('researcher@example.test');await page.locator('#rs-invite-name').fill('李研究员');await page.locator('#rs-invite-role').selectOption('viewer');await page.locator('#dlg [value="ok"]').click();
  await page.waitForFunction(()=>rsShared().members.length===2);memberId=await page.evaluate(()=>rsShared().members[1].id);
  assert.equal(await page.evaluate(()=>rsShared().members[1].status),'invited');
  await page.locator('[data-rs-members]').click();await page.locator('[data-rs-accept]').click();await page.waitForFunction(()=>rsShared().members[1].status==='active');await page.locator('#dlg [value="ok"]').click();
  await asActor(memberId);assert.equal(await page.locator('[data-rs-publish]').count(),0);
  assert.match(await page.evaluate(async sid=>{try{await rsInvite(sid,'another@example.test','Other','editor');return '';}catch(e){return e.message}},sharedId),/没有/);
 });
 await check('viewer request, separate approval and import into a personal project',async()=>{
  await page.evaluate(id=>rsAssetDialog(id),assetId);assert.match(await page.locator('.asset-drawer').innerText(),/申请通过后/);assert.equal(await page.locator('.asset-drawer .asset-table,.asset-drawer .rs-code').count(),0);await page.locator('.asset-drawer [data-iteration-acquire]').click();await page.locator('#rs-target-create').click();
  await page.locator('#rs-personal-name').fill('李的个人研究');await page.locator('#dlg [value="ok"]').click();await page.waitForSelector('#rs-request-reason');
  targetId=await page.locator('#rs-target').inputValue();assert(targetId);await page.locator('#rs-request-reason').fill('复用固定版本作独立分析');await page.locator('#dlg [value="ok"]').click();
  await page.waitForFunction(()=>rsShared().requests.length===1);requestId=await page.evaluate(()=>rsShared().requests[0].id);
  assert.equal(await page.evaluate(()=>rsShared().requests[0].state),'pending');assert.equal(await page.evaluate(id=>PMODELS(id).length,targetId),0);
  assert.match(await page.evaluate(async({sid,rid})=>{try{await rsImport(sid,rid);return '';}catch(e){return e.message}},{sid:sharedId,rid:requestId}),/尚未获批/);
  await asActor('me');await page.locator('[data-rs-requests]').click();await page.locator('[data-request-approve]').click();await page.waitForFunction(()=>rsShared().requests[0].state==='approved');await page.locator('.asset-drawer-close').click();
  await asActor(memberId);await page.locator('[data-rs-requests]').click();await page.locator('[data-iteration-import]').click();await page.waitForFunction(()=>rsShared().requests[0].state==='imported');await page.locator('.asset-drawer-close').click();
  const model=await page.evaluate(id=>PMODELS(id)[0],targetId);assert(model.imported);assert.equal(model.ds,null);assert.equal(model.importMeta.sourceProject,'p1');assert.notEqual(model.id,assetId);
 });
 await check('new versions never overwrite an approved source snapshot and removal retains prior copies',async()=>{
  await asActor('me');
  const version=await page.evaluate(async sid=>{const s=rsShared(),a=s.assets.find(a=>a.kind==='model'),m=PMODELS(s.projectId).find(m=>m.id===a.sourceId),before=JSON.stringify(a.snapshot),name=m.name;m.name='更新的模型版本';const newer=rsCandidates(s.projectId).find(x=>x.kind==='model'&&x.sourceId===m.id);await rsPublishAssets(sid,[newer.id]);m.name=name;return {before,after:JSON.stringify(rsShared().assets.find(x=>x.id===a.id).snapshot),versions:rsShared().assets.filter(x=>x.kind==='model'&&x.sourceId===m.id).length}},sharedId);
  assert.equal(version.before,version.after);assert.equal(version.versions,2);
  await page.evaluate(async({mid,sid,target})=>{RS.actor=mid;const a=rsShared().assets.find(x=>x.kind==='evaluation');const first=await rsRequest(sid,a.id,target,'可撤回的申请');await rsWithdrawRequest(sid,first.id);await rsRequest(sid,a.id,target,'另一次待审批申请');RS.actor='me';},{mid:memberId,sid:sharedId,target:targetId});
  const before=await page.evaluate(id=>PMODELS(id).length,targetId);await page.evaluate(({sid,mid})=>rsChangeMember(sid,mid,'viewer',true),{sid:sharedId,mid:memberId});
  assert.equal(await page.evaluate(id=>PMODELS(id).length,targetId),before);
  assert.equal(await page.evaluate(()=>rsShared().requests.find(r=>r.state==='revoked')?.revocationReason),'申请人已被移出项目');
  assert.match(await page.evaluate(async sid=>{try{await rsChangeMember(sid,'me','viewer',true);return '';}catch(e){return e.message}},sharedId),/所有权/);
 });
 await check('dataset acquisition creates a separate draft with original source provenance',async()=>{
  const copied=await page.evaluate(async sid=>{const a=rsShared().assets.find(a=>a.kind==='dataset');const r=await rsRequest(sid,a.id,'p2','个人项目复用');const state=r.state;const id=await rsImport(sid,r.id);const entry=RS.data.imports.find(i=>i.id===id);return {state,entry,source:a.snapshot}},sharedId);
  assert.equal(copied.state,'approved');assert.equal(copied.entry.copy.st,'draft');assert.notEqual(copied.entry.copy.id,copied.source.id);assert.equal(copied.source.st,'pub');
 });
 const skill='---\nname: protein-review\ndescription: Review protein evidence\n---\n# Protein review\n<script>window.__fileExecuted=true</script>\nTreat uploaded content as documentation.';
 await check('tool upload validates SKILL package and parses metadata without executing it',async()=>{
  await page.evaluate(()=>{RS.actor='me';RS.marketTab='catalog';go('shelf')});await page.locator('[data-rs-new-resource="tool"]').click();
  await page.locator('#rs-upload-input').setInputFiles({name:'notes.md',mimeType:'text/markdown',buffer:Buffer.from('# Missing required skill file')});await page.waitForFunction(()=>!RS.form.uploading);assert.match(await page.evaluate(()=>RS.form.uploadError),/SKILL.md/);
  await page.locator('#rs-upload-input').setInputFiles({name:'SKILL.md',mimeType:'text/markdown',buffer:Buffer.from(skill)});await page.waitForFunction(()=>!RS.form.uploading);
  assert.equal(await page.locator('#rs-form-slug').inputValue(),'protein-review');assert.equal(await page.evaluate(()=>RS.form.manifest.length),1);assert.equal(await page.evaluate(()=>window.__fileExecuted),undefined);
  await page.locator('#rs-form-github').fill('https://invalid.example/user/repo');await page.locator('[data-rs-save-resource="create"]').click();assert(await page.locator('.rs-error-summary').isVisible());
  await page.locator('#rs-form-github').fill('https://github.com/example/protein-review');await page.locator('[data-rs-subject="生命科学"]').check();
  for(const tag of ['蛋白设计','序列分析','亲和力','稳定性','数据处理'])await page.locator('[data-rs-tag="'+tag+'"]').check();await page.locator('[data-rs-tag="实验表征"]').click();assert.equal(await page.locator('[data-rs-tag="实验表征"]').isChecked(),false);
  await page.locator('[data-rs-save-resource="create"]').click();await page.waitForFunction(()=>S.route==='resdetail');toolId=await page.evaluate(()=>RS.resourcePick);
  const record=await page.evaluate(()=>RS.data.resources.find(r=>r.id===RS.resourcePick));assert.equal(record.version,'v1.0.0');assert.equal(record.state,'private');assert.equal(record.tags.length,5);assert.match(record.manifest[0].checksum,/^sha256:[a-f0-9]{64}$/);
  assert.equal(await page.evaluate(async id=>(await rsFile(id)).blob.text(),record.manifest[0].id),skill);assert.equal(await page.evaluate(id=>rsPublishedResource(RS.data.resources.find(r=>r.id===id)),toolId),null);
  await page.screenshot({path:path.join(out,'tool-created.png')});
 });
 await check('tool directory and drag upload retain nested paths and file bytes',async()=>{
  const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'duanyan-skill-audit-')),root=path.join(dir,'protein-package');
  try{fs.mkdirSync(path.join(root,'scripts'),{recursive:true});fs.writeFileSync(path.join(root,'SKILL.md'),skill);fs.writeFileSync(path.join(root,'scripts','helper.py'),'print("not executed")');
   await page.evaluate(()=>rsStartResource('tool'));assert(await page.locator('#rs-folder-input').getAttribute('webkitdirectory')!==null);await page.locator('#rs-folder-input').setInputFiles(root);await page.waitForFunction(()=>!RS.form.uploading&&RS.form.manifest.length===2);
   const files=await page.evaluate(()=>RS.form.manifest.map(m=>m.path));assert(files.includes('protein-package/SKILL.md'));assert(files.includes('protein-package/scripts/helper.py'));
   await page.evaluate(text=>{const dt=new DataTransfer();dt.items.add(new File([text],'SKILL.md',{type:'text/markdown'}));document.querySelector('[data-rs-drop]').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));},skill);await page.waitForFunction(()=>!RS.form.uploading&&RS.form.manifest.length===1&&RS.form.manifest[0].path==='SKILL.md');assert.equal(await page.evaluate(()=>RS.form.preview.type),'skill');assert.equal(await page.evaluate(()=>window.__fileExecuted),undefined);
   const tree=await page.evaluate(async()=>{const fileEntry=(name,text)=>({isFile:true,isDirectory:false,file:ok=>ok(new File([text],name))});const folder=(name,children)=>({isFile:false,isDirectory:true,name,createReader(){let read=false;return {readEntries(ok){ok(read?[]:children);read=true;}}}});const entry=folder('dropped',[fileEntry('SKILL.md','---\nname: dropped-skill\n---\n# Safe documentation'),folder('references',[fileEntry('note.md','# Reference')])]);const files=await rsReadDropped({items:[{webkitGetAsEntry:()=>entry}]});await rsUpload(files);return RS.form.manifest.map(m=>m.path)});assert.deepEqual(tree,['dropped/SKILL.md','dropped/references/note.md']);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
 await check('database parses actual rows and public submission stays out of catalog until review',async()=>{
  await page.evaluate(()=>{RS.marketTab='catalog';go('data')});await page.locator('[data-rs-new-resource="database"]').click();
  await page.locator('#rs-upload-input').setInputFiles({name:'measurements.csv',mimeType:'text/csv',buffer:Buffer.from('sample_id,kd\nS1,2.5\nS2,4.0\n')});await page.waitForFunction(()=>!RS.form.uploading);
  assert.deepEqual(await page.evaluate(()=>[RS.form.preview.rows,RS.form.preview.cols.length]),[2,2]);await page.locator('#rs-form-slug').fill('protein-measurements');await page.locator('#rs-form-name').fill('蛋白表征记录');await page.locator('#rs-form-description').fill('包含样本编号和测量值的测试数据。');await page.locator('[data-rs-subject="生命科学"]').check();
  await page.locator('[data-rs-visibility="public"]').check();await page.locator('[data-rs-save-resource="create"]').click();await page.waitForFunction(()=>S.route==='resdetail');databaseId=await page.evaluate(()=>RS.resourcePick);
  assert.equal(await page.evaluate(id=>RS.data.resources.find(r=>r.id===id).state,databaseId),'pending');assert.equal(await page.evaluate(id=>rsPublishedResource(RS.data.resources.find(r=>r.id===id)),databaseId),null);
  originalFile=await page.evaluate(id=>RS.data.resources.find(r=>r.id===id).manifest[0].id,databaseId);
  await page.locator('[data-rs-review]').click();await page.locator('#rs-review-reason').fill('本机流程验证');await page.locator('#dlg [value="ok"]').click();await page.waitForFunction(()=>RS.data.resources.find(r=>r.id===RS.resourcePick).state==='published');
  await page.locator('[data-rs-back-resource-market]').click();await page.locator('[data-rs-market-tab="catalog"]').click();
  await page.locator('#dq').fill('蛋白表征记录');assert.equal(await page.locator('.rs-created-catalog [data-rs-resource="'+databaseId+'"]').count(),1);assert.equal(await page.locator('.empty').count(),0);
 });
 await check('published version remains available while an update is pending or rejected',async()=>{
  await page.locator('[data-rs-resource="'+databaseId+'"]').click();await page.locator('[data-rs-edit-resource]').click();assert.equal(await page.evaluate(()=>RS.form.version),'v1.0.1');
  await page.locator('#rs-upload-input').setInputFiles({name:'measurements.csv',mimeType:'text/csv',buffer:Buffer.from('sample_id,kd\nS3,7.1\n')});await page.waitForFunction(()=>!RS.form.uploading);await page.locator('[data-rs-save-resource="create"]').click();await page.waitForFunction(()=>S.route==='resdetail');
  const versions=await page.evaluate(id=>{const r=RS.data.resources.find(r=>r.id===id);return {latest:r.version,state:r.state,publicVersion:rsPublishedResource(r).version,file:r.manifest[0].id,history:r.history.length}},databaseId);
  assert.equal(versions.latest,'v1.0.1');assert.equal(versions.state,'pending');assert.equal(versions.publicVersion,'v1.0.0');assert.notEqual(versions.file,originalFile);assert.equal(versions.history,1);
  assert.match(await page.evaluate(async id=>(await rsFile(id)).blob.text(),originalFile),/S1,2.5/);
  await page.evaluate(id=>rsReviewResource(id,false,'缺少新增样本来源说明'),databaseId);assert.equal(await page.evaluate(id=>rsPublishedResource(RS.data.resources.find(r=>r.id===id)).version,databaseId),'v1.0.0');
  await page.evaluate(id=>rsStartResource('database',id),databaseId);await page.locator('[data-rs-save-resource="create"]').click();await page.waitForFunction(()=>S.route==='resdetail');await page.locator('[data-rs-withdraw]').click();await page.waitForFunction(()=>RS.data.resources.find(r=>r.id===RS.resourcePick).state==='draft');
 });
 await check('external database registration validates URL and never pretends to be connected',async()=>{
  await page.evaluate(()=>rsStartResource('database'));await page.locator('[data-rs-source-kind="external"]').check();await page.locator('#rs-form-slug').fill('external-protein-db');await page.locator('#rs-form-name').fill('外部蛋白数据库');await page.locator('#rs-form-sourceUrl').fill('not-a-url');await page.locator('[data-rs-subject="生命科学"]').check();
  await page.locator('[data-rs-save-resource="create"]').click();assert.match(await page.locator('.rs-error-summary').innerText(),/HTTPS/);await page.locator('#rs-form-sourceUrl').fill('https://example.org/protein');await page.locator('[data-rs-save-resource="create"]').click();await page.waitForFunction(()=>S.route==='resdetail');
  const r=await page.evaluate(()=>RS.data.resources.find(r=>r.id===RS.resourcePick));assert.equal(r.sourceKind,'external');assert.equal(r.manifest.length,0);assert.equal(r.state,'private');assert.equal(r.sourceUrl,'https://example.org/protein');
 });
 await check('optimistic storage conflict rejects a stale transaction without losing records',async()=>{
  const result=await page.evaluate(async()=>{const before=JSON.stringify(RS.data),revision=RS.revision;RS.revision--;let error='';try{await rsSave(rsClone(RS.data));}catch(e){error=e.message;}RS.revision=revision;return {error,same:before===JSON.stringify(RS.data),busy:RS.busy}});assert.match(result.error,/其他窗口/);assert(result.same);assert.equal(result.busy,false);
 });
 await check('reload retains uploaded bytes, shared members and imported personal model',async()=>{
  await page.reload();await page.waitForFunction(()=>RS.ready);assert.equal(await page.evaluate(()=>RS.error),'');
  assert.equal(await page.evaluate(()=>RS.data.shared.length),2);assert.equal(await page.evaluate(id=>rsProject(id).ownerId,targetId),memberId);assert.equal(await page.evaluate(id=>PMODELS(id).filter(m=>m.imported).length,targetId),1);assert.match(await page.evaluate(async id=>(await rsFile(id)).blob.text(),originalFile),/S1,2.5/);
 });
 await check('project sharing action converts once, retains the source and persists visible shared badges',async()=>{
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{S.as=0;S.pid='p3';S.collapsed=0;RS.actor='me';go('project')});
  const before=await page.evaluate(()=>({count:RS.data.shared.length,id:PRJ().id,name:PRJ().name,kb:JSON.stringify(PRJ().kb),assets:rsCandidates(PRJ().id).length}));
  assert.equal(await page.locator('.pjx-top [data-project-shared]').count(),0);assert.equal(await page.locator('[data-rs-share-project="p3"]').innerText(),'分享');
  await page.screenshot({path:path.join(out,'project-share-button.png')});
  await page.evaluate(()=>{S.as=3;render()});assert(await page.locator('[data-rs-share-project="p3"]').isDisabled());
  assert.match(await page.evaluate(async()=>{try{await rsShareProject('p3');return '';}catch(e){return e.message}}),/没有编辑权限/);
  await page.evaluate(()=>{S.as=0;render()});await page.locator('[data-rs-share-project="p3"]').click();await page.waitForSelector('#dlg[open]');
  const shared=await page.evaluate(()=>rsProjectShared('p3'));assert.equal(shared.projectId,before.id);assert.equal(shared.name,before.name);assert.equal(shared.assets.length,before.assets);assert.equal(shared.members.length,1);
  assert(!shared.assets.some(a=>a.kind==='conversation'));assert.equal(await page.evaluate(()=>JSON.stringify(rsProject('p3').kb)),before.kb);
  assert.match(await page.locator('#dlg').innerText(),/成员与邀请/);await page.locator('#dlg [value="ok"]').click();
  await go('projects');assert.equal(await page.locator('[data-proj="p3"] [data-project-shared]').innerText(),'共享项目');assert.equal(await page.locator('[data-proj="p2"] [data-project-shared]').count(),0);
  await page.screenshot({path:path.join(out,'projects-shared-badge.png')});
  await page.locator('[data-proj="p3"]').click();assert.equal(await page.locator('.pjx-top [data-project-shared]').innerText(),'共享项目');assert.equal(await page.locator('[data-rs-share-project]').count(),0);
  assert.equal(await page.locator('[data-rs-manage-project]').innerText(),'管理共享');await page.locator('[data-rs-manage-project]').click();await page.waitForSelector('#dlg[open]');await page.locator('#dlg [value="ok"]').click();
  assert.equal(await page.evaluate(()=>RS.data.shared.length),before.count+1);
  await page.evaluate(()=>{S.pid='p3';go('project')});
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(100);const bounds=await page.locator('.pjx-top').evaluate(el=>({right:el.scrollWidth,width:el.clientWidth,buttons:[...el.querySelectorAll('button')].map(b=>({left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right}))}));assert(bounds.right<=bounds.width+1,'project header overflow '+width);assert(bounds.buttons.every(b=>b.left>=0&&b.right<=width+1),'clipped project action '+width);}
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(out,'project-shared-header.png')});
  await go('projects');await page.reload();await page.waitForFunction(()=>RS.ready);assert.equal(await page.locator('[data-proj="p3"] [data-project-shared]').innerText(),'共享项目');assert.equal(await page.evaluate(()=>RS.data.shared.length),before.count+1);
 });
 let projectCopyId;
 await check('project copy creates independent personal assets without duplicating collaboration, chats or running work',async()=>{
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{S.as=0;RS.actor='me';S.pq='';const p=rsProject('p1');p.arch=[{id:'copy-fixture',name:'已归档证据.md',body:'# Frozen evidence',mime:'text/markdown',hash:'fixture',bytes:17,from:{task:'source-task'}}];CONV[pjSid(p.id)]=[{role:'me',text:'private source conversation',cards:[]}];go('projects')});
  const before=await page.evaluate(()=>({count:DB.projects.length,shared:RS.data.shared.length,tasks:TASKS.length,batches:BATCHES.length,kb:rsClone(rsProject('p1').kb),datasets:rsClone(rsProject('p1').dsets),models:rsCopyableModels('p1').map(x=>({id:x.model.id,ds:x.model.ds}))}));
  await page.locator('[data-rs-copy-project="p1"]').click();assert.equal(await page.evaluate(()=>S.route),'projects');assert.equal(await page.locator('#rs-copy-name').inputValue(),await page.evaluate(()=>rsCopyProjectName(rsProject('p1'))));
  await page.screenshot({path:path.join(out,'copy-project-dialog.png')});await page.locator('#dlg [value="cancel"]').click();assert.equal(await page.evaluate(()=>DB.projects.length),before.count);
  await page.locator('[data-rs-copy-project="p1"]').click();await page.locator('#rs-copy-name').fill(await page.evaluate(()=>rsProject('p1').name));await page.locator('#dlg [value="ok"]').click();assert.match(await page.locator('#rs-copy-name-error').innerText(),/同名/);assert(await page.locator('#dlg').evaluate(el=>el.open));
  await page.locator('#rs-copy-name').fill('独立项目副本');await page.locator('#rs-copy-tools').uncheck();await page.locator('#dlg [value="ok"]').click();await page.waitForFunction(()=>S.route==='project'&&PRJ().copyOrigin?.sourceProject==='p1');projectCopyId=await page.evaluate(()=>S.pid);
  const copied=await page.evaluate(()=>rsClone(PRJ()));assert.notEqual(copied.id,'p1');assert.equal(copied.name,'独立项目副本');assert.equal(copied.ownerId,'me');assert.equal(copied.rounds.length,1);assert.equal(copied.variants,0);assert.deepEqual(copied.kb,before.kb);assert.deepEqual(copied.tools,[]);assert.equal(copied.docs?.length||0,0);assert.equal(copied.arch[0].body,'# Frozen evidence');assert.notEqual(copied.arch[0].id,'copy-fixture');
  assert.equal(copied.dsets.length,before.datasets.length);for(const d of copied.dsets){assert.equal(d.pid,copied.id);assert.equal(d.st,'draft');assert(!before.datasets.some(x=>x.id===d.id));assert(before.datasets.some(x=>x.id===d.copyOrigin.sourceAsset));}
  assert.equal(copied.models.length,before.models.length);for(const m of copied.models){assert(m.imported);assert(m.lib);assert.notEqual(m.id,m.copyOrigin.sourceAsset);const source=before.models.find(x=>x.id===m.copyOrigin.sourceAsset);assert.equal(m.ds,copied.dsets.find(d=>d.copyOrigin.sourceAsset===source.ds)?.id||null);}
  const after=await page.evaluate(()=>({count:DB.projects.length,shared:RS.data.shared.length,tasks:TASKS.length,batches:BATCHES.length,conv:convOf(pjSid(S.pid)).length,sourceConv:convOf(pjSid('p1')).length,sameArray:PRJ().kb===rsProject('p1').kb,wt:PRJ_WT[S.pid]===PRJ_WT.p1,sharedCopy:!!rsProjectShared(S.pid)}));
  assert.equal(after.count,before.count+1);assert.equal(after.shared,before.shared);assert.equal(after.tasks,before.tasks);assert.equal(after.batches,before.batches);assert.equal(after.conv,0);assert.equal(after.sourceConv,1);assert.equal(after.sameArray,false);assert(after.wt);assert.equal(after.sharedCopy,false);
 });
 await check('copy scopes, owner permissions, fixed dialog and saved copies survive reload',async()=>{
  await page.locator('.pjx-actions [data-rs-copy-project]').click();for(const q of ['#rs-copy-knowledge','#rs-copy-tools','#rs-copy-assets'])await page.locator(q).uncheck();await page.locator('#rs-copy-name').fill('只复制项目设置');await page.locator('#dlg [value="ok"]').click();await page.waitForFunction(()=>PRJ().name==='只复制项目设置');const empty=await page.evaluate(()=>rsClone(PRJ()));assert.deepEqual(empty.kb,[]);assert.deepEqual(empty.tools,[]);assert.deepEqual(empty.dsets,[]);assert.deepEqual(empty.models,[]);assert.equal(empty.copyOrigin.sourceProject,projectCopyId);
  const denied=await page.evaluate(async()=>{S.as=3;try{await rsCopyProject('p1',{name:'Denied copy'});return '';}catch(e){return e.message;}finally{S.as=0;}});assert.match(denied,/没有创建权限/);
  const deniedShared=await page.evaluate(async()=>{const s=rsProjectShared('p1'),old=s.owner;s.owner='another-owner';try{await rsCopyProject('p1',{name:'Denied shared copy'});return '';}catch(e){return e.message;}finally{s.owner=old;}});assert.match(deniedShared,/共享项目所有者/);
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:700});await page.locator('.pjx-actions [data-rs-copy-project]').click();await page.waitForTimeout(50);const box=await page.locator('#dlg').evaluate(d=>{const r=d.getBoundingClientRect(),body=d.querySelector('.card-b').getBoundingClientRect(),foot=d.querySelector('form>.card-h:last-child').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,bodyBottom:body.bottom,footTop:foot.top}});assert(box.left>=0&&box.right<=width+1&&box.top>=0&&box.bottom<=701);assert(box.bodyBottom<=box.footTop+1);await page.locator('#dlg [value="cancel"]').click();await go('projects');assert.equal(await page.locator('.pcard button').count(),0);const overflow=await page.evaluate(()=>view.scrollWidth>view.clientWidth+1);assert.equal(overflow,false,'project copy cards overflow '+width);await page.locator('[data-proj="'+projectCopyId+'"]').click();}
  await page.reload();await page.waitForFunction(()=>RS.ready);const retained=await page.evaluate(id=>({project:rsProject(id),sequence:PRJ_WT[id],shared:rsProjectShared(id)}),projectCopyId);assert.equal(retained.project.name,'独立项目副本');assert.equal(retained.project.arch[0].body,'# Frozen evidence');assert(retained.sequence);assert.equal(retained.shared,undefined);
  await go('projects');await page.setViewportSize({width:1440,height:900});await page.screenshot({path:path.join(out,'projects-copy-action.png')});
 });
 await check('fixed form frame keeps actions clear and preserves dependent field scroll position',async()=>{
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>rsStartResource('tool'));
   const subject=page.locator('[data-rs-subject="生命科学"]');await subject.scrollIntoViewIfNeeded();
   const before=await subject.evaluate(el=>el.getBoundingClientRect().top);await subject.check();
   const after=await subject.evaluate(el=>el.getBoundingClientRect().top);assert(Math.abs(after-before)<4,'dependent fields moved the controlling field');
   const bounds=await page.evaluate(()=>{const body=document.querySelector('.rs-form-scroll').getBoundingClientRect(),footer=document.querySelector('.rs-form-footer').getBoundingClientRect(),head=document.querySelector('.rs-head').getBoundingClientRect();return {bodyBottom:body.bottom,footerTop:footer.top,footerBottom:footer.bottom,headTop:head.top,viewScroll:view.scrollTop}});
   assert(bounds.bodyBottom<=bounds.footerTop+1,'footer overlaps fields');assert(bounds.footerBottom<=900,'footer is outside viewport');assert(bounds.headTop>=0);assert.equal(bounds.viewScroll,0);
  }
 });
 await check('responsive forms, canvas, read-only guards and source-safe content',async()=>{
  const guarded=await page.evaluate(async()=>{S.as=3;RS.form=rsNewResource('tool');let error='';try{await rsSaveResource(false);}catch(e){error=e.message;}S.as=0;return error});assert.match(guarded,/没有创建权限/);
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});for(const route of ['shared','toolnew','databasenew']){await go(route);const overflow=await page.evaluate(()=>{const v=document.getElementById('view');return v.scrollWidth>v.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1});assert.equal(overflow,false,route+' overflow '+width);}}
  assert.equal(await page.evaluate(()=>window.__fileExecuted),undefined);assert.deepEqual(errors,[]);
 });
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));await browser.close();console.log('Research workspace: '+checks.length+' groups passed. No real invitations or public publishing.');
})().catch(e=>{console.error(e);process.exit(1)});
