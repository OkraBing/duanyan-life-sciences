const fs=require('node:fs');
function inPage(){
 const full=new Set(['workbench','devices','devicedetail','lab','labnew','labdet','shared','sharednew','shareddetail','toolnew','databasenew','resdetail']);
 const finite=new Set(['data-go','data-act','data-wb-progress-dot','data-wb-idea-dot','data-wb-news-dot','data-wb-section-page','data-wb-list','data-lv-type','data-lv-filter','data-lv-save','data-composer-node','data-composer-step','data-rs-tab','data-shared-asset-tab','data-rs-flow','data-iteration-zoom','data-rs-new-resource','data-rs-market-tab','data-rs-save-resource','data-rs-back-resource-market']);
 const state={seen:{},enabled:{},clicks:{},disabled:{},lastChoice:''};window.__review20=state;
 function identify(e){
  const route=typeof S==='object'?S.route:'boot',dialog=e.closest('#dlg'),drawer=e.closest('.asset-drawer');
  const special=e.matches('[data-rs-copy-project],[data-rs-share-project],[data-rs-manage-project],[data-rs-new-resource],[data-rs-market-tab],[data-rs-resource],[data-rs-back-resource-market]');
  if(!full.has(route)&&!special&&!(dialog&&['projects','project'].includes(route)))return null;
  if(e.closest('#side')){if(!e.matches('[data-navid=workbench],[data-navid=devices],[data-navid=shared]'))return null;return {key:'navigation|'+e.dataset.navid,route:'navigation',section:'navigation',action:e.dataset.navid,label:e.textContent.trim(),disabled:false};}
  let section=route+(dialog?'/dialog':drawer?'/drawer':''),action='';
  if(e.matches('.ctl-dd')){const sel=e.nextElementSibling;action='select:'+(sel?.id||sel?.dataset.lvField||sel?.dataset.lvDeviceSelect||sel?.dataset.rsResourceField||sel?.getAttribute('aria-label')||e.getAttribute('aria-label'));}
  else if(e.matches('[data-pick]'))action='option:'+state.lastChoice;
  else if(e.matches('.asset-drawer-close'))action='drawer-close';
  else if(e.matches('[value=ok],[value=cancel]'))action=e.getAttribute('value')+':'+e.textContent.trim();
  else{const at=[...e.attributes].find(a=>a.name.startsWith('data-')&&!['data-node-id','data-dressed','data-as','data-cover','data-delta'].includes(a.name));
   if(at){action=at.name+(finite.has(at.name)?'='+at.value:'');
    if(at.name==='data-lv-device')action+='='+at.value;
    if(at.name==='data-wb-task-open')action+='='+at.value.split(':')[0];
    if(at.name==='data-wb-section-page')action+=':'+e.dataset.delta;
    if(['data-rs-asset','data-shared-asset-select','data-iteration-acquire'].includes(at.name))action+=':'+(typeof rsShared==='function'?rsShared()?.assets.find(a=>a.id===at.value)?.kind:'asset');
   }else action=e.id||e.getAttribute('aria-label')||e.textContent.trim().replace(/\s+/g,' ').slice(0,45);
  }
  return {key:section+'|'+action,route,section,action,label:(e.getAttribute('aria-label')||e.textContent.trim()).replace(/\s+/g,' ').slice(0,100),disabled:!!(e.disabled||e.getAttribute('aria-disabled')==='true')};
 }
 function snapshot(){document.querySelectorAll('#view button,#view [role=button],#dlg[open] button,.asset-drawer button,#menu [data-pick],#side [data-navid]').forEach(e=>{const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;const item=identify(e);if(!item)return;state.seen[item.key]=item;if(item.disabled)state.disabled[item.key]=item;else state.enabled[item.key]=item;});}
 window.__review20Snapshot=snapshot;
 document.addEventListener('click',ev=>{const e=ev.target.closest('button,[role=button]');if(!e)return;const item=identify(e);if(!item)return;if(e.matches('.ctl-dd'))state.lastChoice=item.action.slice(7);state.seen[item.key]=item;state.enabled[item.key]=item;state.clicks[item.key]=(state.clicks[item.key]||0)+1;},true);
 let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;snapshot();});}).observe(document,{subtree:true,childList:true});
}
function install(browser,file){
 let contextId=0;
 const flush=async(page,meta)=>{try{const data=await page.evaluate(()=>{window.__review20Snapshot?.();return window.__review20});if(data)fs.appendFileSync(file,JSON.stringify({...meta,url:page.url(),...data})+'\n');}catch{}};
 const originalContext=browser.newContext.bind(browser);
 browser.newContext=async(...args)=>{const context=await originalContext(...args),meta={round:process.env.DUANYAN_REVIEW_ROUND||'child',context:++contextId};await context.addInitScript(inPage);context.on('page',page=>{for(const method of ['goto','reload']){const original=page[method].bind(page);page[method]=async(...args)=>{await flush(page,meta);return original(...args)};}const close=page.close.bind(page);page.close=async(...args)=>{await flush(page,meta);return close(...args)};});const close=context.close.bind(context);context.close=async(...args)=>{for(const p of context.pages())await flush(p,meta);return close(...args)};return context;};
 const close=browser.close.bind(browser);browser.close=async(...args)=>{for(const c of browser.contexts())for(const p of c.pages())await flush(p,{round:process.env.DUANYAN_REVIEW_ROUND||'child'});return close(...args)};
 return browser;
}
module.exports={install};
