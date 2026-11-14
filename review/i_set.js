/* 设置页专项：两种模式各自的渲染、切换、密钥存删（不落盘到任何文件）、
   模型选择、连通性测试的失败路径。 */
const {chromium}=require('../test-browser.cjs');
const F='file://'+require('path').resolve(process.argv[2]||'index.html');
(async()=>{
  const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1440,height:900}});
  const bad=[];pg.on('pageerror',e=>bad.push('JS: '+e.message));
  const directRequests=[];
  // Deterministic credential rejection: no fake credential leaves this browser test.
  await pg.route('https://api.deepseek.com/chat/completions',async route=>{
    const request=route.request();
    directRequests.push({method:request.method(),auth:!!request.headers().authorization});
    await route.fulfill({status:401,contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':'*'},
      body:JSON.stringify({error:{message:'Test credential rejected'}})});
  });
  const reqs=[];pg.on('request',r=>{const u=r.url();
    if(!/^file:/.test(u)||/\/x\/model|chat\/completions|api\/model/.test(u))reqs.push(r.method()+' '+u)});
  pg.on('requestfailed',r=>{const u=r.url();
    if(/\/x\/model|chat\/completions|api\/model/.test(u))reqs.push('FAIL '+u)});
  await pg.goto(F);await pg.waitForTimeout(400);

  // 1. 侧栏入口存在且能到
  const navSet=await pg.$('.nav[data-navid="set"]');
  if(!navSet)bad.push('侧栏没有「模型接入」入口');
  else{await navSet.click();await pg.waitForTimeout(300);
    const h=await pg.textContent('h1').catch(()=>'');
    if(!/模型接入/.test(h))bad.push('点了入口没到设置页，h1='+h);}

  const txt=()=>pg.textContent('#view');

  // 2. 默认代理模式：有代理地址，没有 API Key 字段
  if(await pg.$('#mkey'))bad.push('默认（代理）模式下出现了 API Key 字段');
  if(!await pg.$('#mep'))bad.push('代理模式下没有代理地址字段');
  const ep=await pg.inputValue('#mep').catch(()=>'');
  const defaultEp=await pg.evaluate(()=>MC.ENDPOINT);
  if(ep!==defaultEp)bad.push('代理地址没有使用站点配置: '+ep);
  if(defaultEp&&!/^https:\/\//.test(defaultEp))bad.push('线上默认代理地址不是 HTTPS');
  if(!defaultEp){
    await pg.click('[data-act="mtest"]');
    await pg.waitForFunction(()=>document.querySelector('#mout')?.textContent.includes('未连通'));
    if(!/代理尚未配置/.test(await pg.textContent('#mout')))bad.push('未配置代理时没有明确提示');
  }

  // 3. 切直连
  await pg.click('[data-mmode="direct"]');await pg.waitForTimeout(250);
  if(!await pg.$('#mkey'))bad.push('直连模式下没有 API Key 字段');
  if(await pg.$('#mep'))bad.push('直连模式下还留着代理地址字段');
  const t=await pg.getAttribute('#mkey','type');
  if(t!=='password')bad.push('API Key 不是 password 输入框，type='+t);
  if(await pg.$('[data-act="mkeyclr"]'))bad.push('还没存密钥就出现了删除按钮');

  // 4. 空值保存：不动已有的
  await pg.click('[data-act="mkeysave"]');await pg.waitForTimeout(200);

  // 5. 存一把假的（只进 localStorage）
  await pg.fill('#mkey','TESTKEY-not-a-real-credential');
  await pg.click('[data-act="mkeysave"]');await pg.waitForTimeout(300);
  const left=await pg.inputValue('#mkey').catch(()=>'x');
  if(left!=='')bad.push('保存之后密钥还留在输入框里: '+left);
  const stored=await pg.evaluate(()=>localStorage.getItem('dy_life_ds_key'));
  if(stored!=='TESTKEY-not-a-real-credential')bad.push('密钥没进 localStorage: '+stored);
  const inDom=await pg.evaluate(()=>document.documentElement.innerHTML.indexOf('TESTKEY-not-a-real')>=0);
  if(inDom)bad.push('密钥出现在了 DOM 里');
  if(!await pg.$('[data-act="mkeyclr"]'))bad.push('存了密钥但没有删除按钮');

  // 6. 直连测试：必须打到 api.deepseek.com 且带 Bearer
  await pg.click('[data-act="mtest"]');
  await pg.waitForFunction(()=>document.querySelector('#mout')?.textContent.includes('未连通'));
  const o1=await pg.textContent('#mout').catch(()=>'');
  if(!/未连通|连通/.test(o1))bad.push('直连测试没有给出结论: '+o1.slice(0,80));
  if(!reqs.some(r=>/api\.deepseek\.com\/chat\/completions/.test(r)))
    bad.push('直连模式没有请求 api.deepseek.com，实际: '+JSON.stringify(reqs));
  if(!directRequests.some(r=>r.method==='POST'&&r.auth))bad.push('直连请求没有带 Bearer 凭据');

  // 7. 删密钥
  await pg.click('[data-act="mkeyclr"]');await pg.waitForTimeout(300);
  const after=await pg.evaluate(()=>localStorage.getItem('dy_life_ds_key'));
  if(after)bad.push('点了删除，localStorage 里还有: '+after);

  // 8. 没密钥的直连测试 → 必须说缺密钥，不能发请求
  reqs.length=0;
  await pg.click('[data-act="mtest"]');await pg.waitForTimeout(900);
  const o2=await pg.textContent('#mout').catch(()=>'');
  if(!/API Key/.test(o2))bad.push('没密钥时没提示去填: '+o2.slice(0,90));
  if(reqs.length)bad.push('没密钥却发了请求: '+JSON.stringify(reqs));

  // 9. 换模型
  await pg.click('[data-mmode="proxy"]');await pg.waitForTimeout(220);
  await pg.selectOption('#mn','deepseek-v4-pro');await pg.waitForTimeout(300);
  const s9=await txt();
  if(!/DeepSeek-V4-Pro-0813/.test(s9))bad.push('换了模型，版本号没跟着换');
  if(!/\$1\.32/.test(s9))bad.push('v4-pro 的价目没显示');
  const nm=await pg.evaluate(()=>JSON.parse(localStorage.getItem('dy_life_modelName')));
  if(nm!=='deepseek-v4-pro')bad.push('模型没存进 localStorage: '+nm);

  // 10. 代理地址 / 直连地址 / Bearer 头：直接把 fetch 换掉，看 MC 到底往哪儿发、带了什么
  await pg.fill('#mep','https://proxy.example/api/model/chat');await pg.dispatchEvent('#mep','change');await pg.waitForTimeout(300);
  const call=await pg.evaluate(async()=>{
    const log=[];const real=window.fetch;
    window.fetch=(u,o)=>{log.push({u:String(u),h:Object.keys((o&&o.headers)||{}),
      auth:!!((o&&o.headers||{})['Authorization']),body:(o&&o.body)||''});
      return Promise.reject(new TypeError('stubbed'))};
    const out={};
    try{await MC.chat([{role:'user',content:'x'}])}catch(e){out.proxyErr=e.message}
    out.proxy=log[log.length-1]||null;
    MC.save({mode:'direct'});MC.setKey('TESTKEY-not-a-real-credential');
    try{await MC.chat([{role:'user',content:'x'}])}catch(e){out.directErr=e.message}
    out.direct=log[log.length-1]||null;
    MC.setKey('');
    try{await MC.chat([{role:'user',content:'x'}])}catch(e){out.nokey=e.message}
    out.afterNokey=log.length;
    window.fetch=real;MC.save({mode:'proxy'});
    return out;
  });
  if(!call.proxy||call.proxy.u!=='https://proxy.example/api/model/chat')
    bad.push('代理模式没有打到改过的地址: '+JSON.stringify(call.proxy));
  if(call.proxy&&call.proxy.auth)bad.push('代理模式居然带了 Authorization 头——页面不该持有凭据');
  if(!call.direct||!/^https:\/\/api\.deepseek\.com\/chat\/completions$/.test(call.direct.u))
    bad.push('直连没有打到 api.deepseek.com/chat/completions: '+JSON.stringify(call.direct&&call.direct.u));
  if(call.direct&&!call.direct.auth)bad.push('直连没有带 Authorization 头');
  if(call.nokey!=='NOKEY')bad.push('没密钥时 MC.chat 没抛 NOKEY: '+call.nokey);
  if(call.afterNokey!==2)bad.push('没密钥时还是调了 fetch，次数='+call.afterNokey);
  const b10=call.direct&&JSON.parse(call.direct.body||'{}');
  if(b10&&b10.model!=='deepseek-v4-pro')bad.push('请求体里的模型名不对: '+(b10&&b10.model));
  if(b10&&b10.stream!==false)bad.push('请求体 stream 不是 false');
  const proxyBody=call.proxy&&JSON.parse(call.proxy.body||'{}');
  for(const body of [proxyBody,b10])
    if(!body||body.thinking?.type!=='disabled')bad.push('短回答请求没有关闭思考模式');

  // Successful HTTP with empty text is not proof of a working model connection.
  const responseCheck=await pg.evaluate(async()=>{
    const real=window.fetch;const out={};
    try{
      window.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:'收到'}}]})});
      out.text=(await MC.chat([{role:'user',content:'x'}])).text;
      window.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:'  '}}]})});
      try{await MC.chat([{role:'user',content:'x'}]);out.emptyAccepted=true}
      catch(e){out.emptyError=e.message}
    }finally{window.fetch=real}
    return out;
  });
  if(responseCheck.text!=='收到')bad.push('有效的模型回复没有返回');
  if(responseCheck.emptyAccepted||!responseCheck.emptyError)bad.push('空回复被误判为连通');

  // 11. 窄屏不横向滚
  await pg.setViewportSize({width:400,height:900});await pg.waitForTimeout(300);
  const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  if(ov>1)bad.push('400 宽横向溢出 '+ov+'px');

  console.log(bad.length?'❌\n'+bad.join('\n'):'✅ i_set 全过');
  await b.close();process.exit(bad.length?1:0);
})();
