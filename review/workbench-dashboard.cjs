/* Current workbench layout and interactions, in isolated storage with offline paper responses. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('../test-browser.cjs');
const out=path.resolve('work/qa/dashboard-v2');fs.mkdirSync(out,{recursive:true});
const url=process.env.DUANYAN_TEST_URL||'file://'+path.resolve('index.html');
const checks=[],errors=[];let browser;
async function settle(p){await p.waitForTimeout(180);}
async function fresh(){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(6500);p.on('pageerror',e=>errors.push(e.message));
 await context.route(/^https?:/,r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.request().url().includes('api.crossref.org')?r.fulfill({contentType:'application/json',body:JSON.stringify({message:{items:[]}})}):r.abort());
 await p.goto(url+'#workbench',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>RS.seedReady);await p.waitForTimeout(550);return{context,p};
}
async function check(name,fn){const{context,p}=await fresh();try{await fn(p);checks.push(name);console.log('PASS '+name);}finally{await context.close();}}
function contrast(a,b){const lum=c=>c.slice(0,3).map(v=>(v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0),x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
(async()=>{
 browser=await chromium.launch();
 await check('01 compact idea above progress, full-height papers to the right',async p=>{
  const r=await p.evaluate(()=>{const box=s=>{const b=document.querySelector(s).getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,height:b.height}};return{idea:box('.wb-inspiration'),progress:box('.wb-tasks'),news:box('.wb-news')}});
  assert.equal(r.idea.x,r.progress.x);assert(r.idea.bottom<r.progress.y);assert(r.news.x>r.progress.right);assert.equal(r.news.y,r.idea.y);assert(Math.abs(r.news.bottom-r.progress.bottom)<1);assert(r.idea.height<r.progress.height*.3);
  for(const name of ['今日灵感','课题进展','学术资讯'])assert(await p.getByRole('heading',{name,exact:true}).isVisible());
  await p.screenshot({path:path.join(out,'desktop.png')});
 });
 await check('02 inspiration is plain selectable text and uses a native dark primary action',async p=>{
  assert.equal(await p.locator('.wb-question').evaluate(e=>e.tagName),'P');assert.equal(await p.locator('.wb-inspiration a,.wb-question button,[data-wb-idea-detail],.wb-reference-tag,.wb-idea-topic').count(),0);
  const question=await p.locator('.wb-question').innerText();await p.locator('.wb-question').click();assert.equal(await p.evaluate(()=>S.route),'workbench');assert.equal(await p.locator('#dlg[open]').count(),0);assert.equal(await p.locator('.wb-question').innerText(),question);
  assert.match(await p.locator('.wb-inspiration').evaluate(e=>getComputedStyle(e).backgroundImage),/linear-gradient/);assert.equal(await p.locator('.wb-idea-explore.btn-pri').count(),1);
  const idea=await p.locator('.wb-idea-explore').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));await p.evaluate(()=>go('projects'));const native=await p.locator('#view .btn-pri').first().evaluate(e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));assert.deepEqual(idea,native);
 });
 await check('03 manual idea refresh changes one question and persists on reload',async p=>{
  const old=await p.locator('.wb-question').innerText();await p.getByRole('button',{name:'刷新今日灵感',exact:true}).click();await settle(p);const next=await p.locator('.wb-question').innerText();assert.notEqual(next,old);assert.equal(await p.locator('.wb-question').count(),1);assert(await p.locator('[data-wb-refresh-idea]').evaluate(e=>e===document.activeElement));
  await p.reload();await p.waitForFunction(()=>RS.seedReady);await settle(p);assert.equal(await p.locator('.wb-question').innerText(),next);
  await p.getByRole('button',{name:'刷新今日灵感',exact:true}).click();assert.notEqual(await p.locator('.wb-question').innerText(),next);
 });
 await check('04 exploration carries the refreshed query and project without sending',async p=>{
  await p.locator('[data-wb-refresh-idea]').click();const expected=await p.locator('[data-wb-prompt]').evaluate(e=>({pid:e.dataset.wbPid,q:e.dataset.wbPrompt}));await p.locator('.wb-idea-explore').click();assert.deepEqual(await p.evaluate(()=>[S.route,S.bind,convOf().length]),['chat',expected.pid,0]);assert.equal(await p.locator('#ask').inputValue(),expected.q);await p.locator('#ask').fill(expected.q+' 请比较两种方法。');assert.equal(await p.evaluate(()=>convOf().length),0);
 });
 await check('05 paper feed shows multiple structured cards and safe external icon links',async p=>{
  // 这句旁白已经删掉：下面就是论文列表，它不带任何新信息。现在断言它不再出现。
  assert.equal(await p.locator('.wb-news-agent').count(),0);assert.equal(await p.locator('.wb-paper-card').count(),4);
  for(const card of await p.locator('.wb-paper-card').all()){assert(await card.locator('h3').innerText());assert((await card.locator('.wb-paper-description').innerText()).length>20);assert(await card.locator('.wb-paper-topic').count());const a=card.locator('.wb-paper-open');assert.match(await a.getAttribute('href'),/^https:/);assert.equal(await a.getAttribute('target'),'_blank');assert.match(await a.getAttribute('rel'),/noopener/);assert.match(await a.getAttribute('aria-label'),/打开论文/);assert.equal(await a.locator('svg').count(),1);}
  assert.equal(await p.locator('.wb-paper-card a').count(),await p.locator('.wb-paper-card').count());
 });
 await check('06 paper arrows reach every paper with bounded navigation and keyboard focus',async p=>{
  const expected=await p.evaluate(()=>dashboardPapers(workbenchData().projects).map(x=>x.id)),seen=new Set();assert(await p.locator('[data-wb-news-page="-1"]').isDisabled());
  for(let i=0;i<30;i++){for(const id of await p.locator('[data-paper-id]').evaluateAll(es=>es.map(e=>e.dataset.paperId)))seen.add(id);const next=p.locator('[data-wb-news-page="1"]');if(await next.isDisabled())break;await next.focus();await p.keyboard.press('Enter');}
  assert.deepEqual(seen,new Set(expected));assert(await p.locator('[data-wb-news-page="1"]').isDisabled());assert(await p.locator('[data-wb-news-page="-1"]').evaluate(e=>e===document.activeElement));await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>WB.newsPage),0);
  assert.equal(await p.locator('[data-wb-news-dot],.wb-carousel-dots').count(),0);
 });
 await check('07 project windows keep every project reachable and independent',async p=>{
  const expected=await p.evaluate(()=>workbenchData().projects.map(x=>x.id)),seen=new Set();for(let i=0;i<20;i++){for(const id of await p.locator('[data-wb-project-id]').evaluateAll(es=>es.map(e=>e.dataset.wbProjectId)))seen.add(id);const next=p.locator('[data-wb-project-window="1"]');if(await next.isDisabled())break;await next.click();await settle(p);}assert.deepEqual(seen,new Set(expected));assert(await p.locator('[data-wb-project-window="1"]').isDisabled());
  const card=p.locator('.wb-project-card').last(),pid=await card.getAttribute('data-wb-project-id');await card.locator('.wb-project-title').click();assert.equal(await p.evaluate(()=>S.pid),pid);assert.equal(await p.evaluate(()=>S.route),'project');
 });
 await check('08 tasks show type icons, real descriptions and compact progress context',async p=>{
  const types=new Set();for(const row of await p.locator('[data-wb-task-open]').all()){const data=await p.evaluate(key=>{const t=workbenchData().tasks.find(x=>x.key===key);return{t,copy:dashboardDescription(t)}},await row.getAttribute('data-wb-task-open'));types.add(data.t.kind);assert.equal(await row.locator('strong').innerText(),data.t.name);assert.equal(await row.locator('.wb-task-description').innerText(),data.copy.description);assert(data.copy.description);assert.equal(await row.locator('.wb-task-symbol svg').count(),1);assert(await row.locator('.wb-status').innerText());assert(await row.locator('.wb-tag-detail').innerText());assert(await row.getAttribute('aria-describedby'));}assert(types.has('experiment')&&types.has('train'));
 });
 await check('09 each group shows at most three tasks without pagination and full lists retain project scope',async p=>{
  const projects=await p.evaluate(()=>workbenchData().projects.map(p=>p.id));
  for(const pid of projects){
   for(const kind of ['experiment','model']){
    await p.evaluate(pid=>{WB.progressProject=pid;go('workbench')},pid);await settle(p);
    const expected=await p.evaluate(({pid,kind})=>{const d=workbenchData({pid}),rank={failed:0,active:1,unknown:2,done:3};return wbAttentionTasks(kind==='experiment'?d.experiments:d.modelTasks).sort((a,b)=>(rank[a.status]??4)-(rank[b.status]??4)).map(t=>({key:t.key,id:t.id,kind:t.kind,type:t.type}))},{pid,kind});
    const section=p.locator('[data-wb-project-id="'+pid+'"] [data-task-kind="'+kind+'"]');
    assert.deepEqual(await section.locator('[data-wb-task-open]').evaluateAll(es=>es.map(e=>e.dataset.wbTaskOpen)),expected.slice(0,3).map(t=>t.key));
    assert.equal(await section.locator('[data-wb-section-page],.wb-pagination,select').count(),0);
    if(expected.length>3)assert.match(await section.locator('.wb-task-more-count').innerText(),new RegExp(String(expected.length-3)));
    else assert.equal(await section.locator('.wb-task-more-count').count(),0);
    await section.getByRole('button',{name:/查看全部/}).click();
    if(kind==='experiment'){assert.deepEqual(await p.evaluate(()=>[S.route,S.labProject]),['lab',pid]);for(const t of expected)assert(await p.locator('[data-labgo="'+t.id+'"]').count());}
    else {assert.deepEqual(await p.evaluate(()=>[S.route,S.mtab,S.mdlProj]),['mdl','job',pid]);for(const t of expected){if(t.type==='batch')continue;assert(await p.locator('[data-jobpick="'+t.id+'"]').count(),t.key);}await p.locator('[data-mtab="batch"]').click();for(const t of expected.filter(t=>t.type==='batch'))assert(await p.locator('[data-bjob="'+t.id+'"]').count(),t.key);}
   }
  }
 });
 await check('10 agent summary counts current exceptions and follows state changes',async p=>{
  const counts=await p.evaluate(()=>{const failed=workbenchData().experiments.filter(t=>t.status==='failed');return{n:failed.length,ps:new Set(failed.map(t=>t.pid)).size}});assert.match(await p.locator('.wb-agent-summary').innerText(),new RegExp(counts.n+' 项实验异常.*'+counts.ps+' 个课题'));
  await p.evaluate(()=>{BATCHES.filter(b=>labSummary(b).status==='exception').forEach(b=>{b.workflow.steps.forEach(s=>{if(s.state==='exception')s.state='running'})});render()});assert(!/实验异常/.test(await p.locator('.wb-agent-summary').innerText()));
 });
 await check('11 manual navigation never changes on a timer',async p=>{
  const before=await p.evaluate(()=>[WB.projectStart,WB.newsPage,WB.ideas[0]?.question]);await p.clock.install();await p.clock.runFor(60000);assert.deepEqual(await p.evaluate(()=>[WB.projectStart,WB.newsPage,WB.ideas[0]?.question]),before);assert.equal(await p.locator('[data-wb-progress-auto],[data-wb-idea-auto],[data-wb-news-auto],.wb-topic-select,.wb-task-tabs').count(),0);
 });
 await check('12 desktop rows fit without overlap, mobile reflows without horizontal scroll',async p=>{
  for(const [width,height]of [[1920,1080],[1440,900],[1366,768],[1280,720],[1122,607],[768,900],[390,844]]){await p.setViewportSize({width,height});await settle(p);const fit=await p.evaluate(()=>({horizontal:view.scrollWidth-view.clientWidth,vertical:view.scrollHeight-view.clientHeight,rows:[...document.querySelectorAll('.wb-task-row')].map(e=>e.scrollHeight-e.clientHeight),overlap:[...document.querySelectorAll('.wb-task-row')].some(e=>e.getBoundingClientRect().bottom>e.closest('.wb-task-section').querySelector('.wb-task-section-foot').getBoundingClientRect().top+1),overflow:[...document.querySelectorAll('.wb-paper-foot')].some(e=>e.getBoundingClientRect().bottom>e.parentElement.getBoundingClientRect().bottom+1)}));assert(fit.horizontal<=1,JSON.stringify({width,fit}));assert(fit.rows.every(x=>x<=1),JSON.stringify({width,fit}));assert(!fit.overflow);assert(!fit.overlap,JSON.stringify({width,fit}));if(width>=1280)assert(fit.vertical<=1,JSON.stringify({width,fit}));if(width===390)await p.screenshot({path:path.join(out,'mobile.png')});}
 });
 await check('13 empty loading and failed papers remain distinct, cached papers stay available',async p=>{
  await p.evaluate(()=>{WB.papers=[];WB.didLoad=true;WB.querySignature=JSON.stringify(wbSubscriptions());WB.papersBusy=true;const original=wbCurated;wbCurated=()=>[];window.dashboardTestCurated=original;render()});assert.match(await p.locator('.wb-empty-news').innerText(),/正在查找/);
  await p.evaluate(()=>{WB.papersBusy=false;WB.papersError='offline';render()});assert.match(await p.locator('.wb-empty-news').innerText(),/暂时无法获取/);await p.evaluate(()=>{WB.papersError='';render()});assert.match(await p.locator('.wb-empty-news').innerText(),/暂无匹配/);
  await p.evaluate(()=>{wbCurated=window.dashboardTestCurated;WB.papers=wbCurated();WB.papersError='offline';render()});assert(await p.locator('.wb-paper-open').count());assert.match(await p.locator('.wb-news-state').innerText(),/保留/);
 });
 await check('14 light dark contrast and keyboard focus remain clear',async p=>{
  for(const theme of ['light','dark']){await p.evaluate(t=>{document.documentElement.dataset.theme=t;render()},theme);for(const selector of ['.wb-question','.wb-idea-explore','.wb-paper-title','.wb-paper-description','.wb-task-description','.wb-tag-detail']){const c=await p.locator(selector).first().evaluate(e=>{const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);let n=e,bg;while(n){bg=rgb(getComputedStyle(n).backgroundColor);if(bg.length===3||bg[3]===1)break;n=n.parentElement;}return{fg:rgb(getComputedStyle(e).color),bg}});assert(contrast(c.fg,c.bg)>=4.5,theme+' '+selector);}
   await p.locator('[data-wb-refresh-idea]').focus();assert.equal(await p.locator('[data-wb-refresh-idea]').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');if(theme==='dark')await p.screenshot({path:path.join(out,'dark.png')});}
 });
 await check('15 long questions stay fully readable and an empty workspace offers creation',async p=>{
  const text='是否可以比较候选的亲和力、稳定性和可开发性？'.repeat(16);await p.evaluate(text=>{WB.dailyDate=wbToday();WB.dailyIdea={...WB.ideas[0],question:text};render()},text);assert.equal(await p.locator('.wb-question').innerText(),text);assert(await p.locator('.wb-question').evaluate(e=>e.clientHeight>=e.scrollHeight));assert.equal(await p.locator('[data-wb-idea-detail]').count(),0);
  await p.evaluate(()=>{DB.projects=[];WB.dailyIdea=null;WB.papers=[];WB.papersBusy=false;WB.papersError='';WB.querySignature='[]';render()});assert.equal(await p.locator('[data-wb-create-project]').count(),1);assert.equal(await p.locator('[data-wb-prompt]').count(),0);assert(await p.locator('.wb-empty-idea').isVisible());await p.locator('[data-wb-create-project]').click();assert.equal(await p.evaluate(()=>S.route),'projects');assert(await p.locator('#dlg[open]').isVisible());
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({generatedAt:new Date().toISOString(),checks,errors,scope:'Isolated UI verification; no real model or device requests.'},null,2));await browser.close();console.log('Dashboard: '+checks.length+' groups passed.');
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,error:e.stack},null,2));await browser?.close();process.exitCode=1;});
