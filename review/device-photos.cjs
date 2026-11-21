/* Browser acceptance of locally hosted equipment photos, without vendor hotlinks. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {chromium}=require('../test-browser.cjs');
const source=JSON.parse(fs.readFileSync('assets/device-photos/sources.json','utf8'));
const target=process.env.DUANYAN_PHOTO_URL||'file://'+path.resolve(process.argv[2]||'index.html');
const output=path.resolve(process.env.DUANYAN_PHOTO_OUTPUT||'work/qa/device-photos');fs.mkdirSync(output,{recursive:true});
const checks=[],errors=[],requests=[];let browser;
(async()=>{
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 const ownHost=target.startsWith('http')?new URL(target).host:null;
 await context.route(/^https?:\/\//,r=>{const u=new URL(r.request().url());if(u.host===ownHost)return r.continue();requests.push(u.href);return r.abort();});
 await page.goto(target.split('#')[0]+'#devices');await page.waitForFunction(()=>RS.seedReady);
 const go=async route=>page.evaluate(r=>go(r),route);
 assert.equal(await page.locator('.device-card').count(),12);assert.equal(await page.locator('.device-card .device-photo').count(),12);assert.equal(await page.locator('.device-card .device-art svg').count(),0);
 for(const entry of source){
  const card=page.locator('[data-lv-device="'+entry.id+'"]'),img=card.locator('img');await card.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());
  const data=await img.evaluate(e=>({width:e.naturalWidth,height:e.naturalHeight,fit:getComputedStyle(e).objectFit,filter:getComputedStyle(e).filter,src:e.getAttribute('src')}));
  assert(data.width>100&&data.height>100,entry.id+' decode');assert.equal(data.fit,'contain');assert.equal(data.filter,'none');assert.equal(data.src,'assets/device-photos/'+entry.file);assert.equal(await img.getAttribute('alt'),entry.alt);
  await card.focus();await page.keyboard.press('Enter');await page.locator('.device-detail .device-photo').evaluate(e=>e.decode());assert.equal(await page.locator('.device-detail .device-photo').getAttribute('src'),data.src);await page.locator('[data-go="devices"]').click();
 }
 checks.push('12 个设备的列表与详情产品图均成功解码、型号映射一致、使用完整比例显示');
 await page.locator('[data-lv-type="亲和力表征"]').click();assert.equal(await page.locator('.device-card').count(),2);await page.locator('[data-lv-search]').fill('Octet');assert.equal(await page.locator('.device-card').count(),1);await page.locator('.device-card').click();assert.match(await page.locator('.device-detail h1').innerText(),/生物层干涉/);await page.locator('[data-go="devices"]').click();await page.locator('[data-lv-search]').fill('');await page.locator('[data-lv-type="全部"]').click();
 await page.locator('[data-device-apply="flex"]').click();assert(await page.locator('#device-request-note').isVisible());assert.equal(await page.locator('.device-detail').count(),0);await page.keyboard.press('Escape');assert.equal(await page.locator('.device-card').count(),12);checks.push('图片区域可进入详情，键盘、搜索、筛选、独立申请按钮及取消均正常');
 for(const theme of ['light','dark']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.setViewportSize({width:1440,height:900});await go('devices');await page.locator('.device-card').first().scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.device-art').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  await page.screenshot({path:path.join(output,'devices-'+theme+'.png'),fullPage:true});
 }
 await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.setViewportSize({width:390,height:844});await go('devices');
 assert(await page.locator('#view').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 assert(await page.locator('.device-card').evaluateAll(cards=>cards.every(card=>{
  const button=card.querySelector('.device-connect');if(!button)return true;const b=button.getBoundingClientRect();if(getComputedStyle(button).position!=='absolute')return false;
  return [...card.querySelectorAll('h2,p,.device-model')].every(text=>{const range=document.createRange();range.selectNodeContents(text);return [...range.getClientRects()].every(r=>r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom);});
 })), 'mobile action must not overlap text');
 for(const card of await page.locator('.device-card').all())assert((await card.boundingBox()).width<=390);
 await page.screenshot({path:path.join(output,'devices-mobile.png'),fullPage:true});await page.locator('[data-lv-device="flex"]').click();assert(await page.locator('#view').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:path.join(output,'detail-mobile.png'),fullPage:true});
 checks.push('桌面、移动端及深色主题保持留白和完整机身，无横向溢出');
 for(const file of new Set(source.map(e=>e.file))){
  const expected=fs.readFileSync('assets/device-photos/'+file),published=fs.readFileSync('docs/assets/device-photos/'+file);assert(expected.equals(published),file+' build copy');
  if(ownHost){const actual=await page.evaluate(async url=>{const response=await fetch(url);const hash=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());return{status:response.status,hash:[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')};},new URL('assets/device-photos/'+file,target).href);assert.equal(actual.status,200);assert.equal(actual.hash,crypto.createHash('sha256').update(expected).digest('hex'),file+' HTTPS bytes');}
 }
 checks.push('11 份真实设备图片与 Pages 发布资源字节一致，ÄKTA 两型号复用厂商系列图');assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({target,checks,errors,images:source.map(e=>({id:e.id,file:e.file,sha256:crypto.createHash('sha256').update(fs.readFileSync('assets/device-photos/'+e.file)).digest('hex')})),externalRequestsBlocked:requests.length},null,2));
 await browser.close();console.log(JSON.stringify({target,checks,errors},null,2));
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
