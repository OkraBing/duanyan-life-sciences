const DEPLOY_UI={form:null,services:null,revision:0,loading:false,error:'',selected:null,inlineTab:null,token:'',working:false};
const DEPLOY_API=window.DUANYAN_CONFIG?.deploymentApi||'';
const deployAuthLabel=auth=>auth==='token'?'API 令牌':'仅本机（无需令牌）';
const deployStateLabel=state=>state==='running'?'运行中':'已停止';
const DEPLOY_SID='deployment:';
const deployBatchId=sid=>sid?.startsWith(DEPLOY_SID)?sid.slice(DEPLOY_SID.length):'';

function deployBatchChoices(){
  if(DEPLOY_API&&!DEPLOY_UI.services&&!DEPLOY_UI.loading&&!DEPLOY_UI.error)queueMicrotask(deployLoad);
  return (DEPLOY_UI.services||[]).filter(s=>s.state==='running').map(service=>({
    sid:DEPLOY_SID+service.id,name:service.model.name,label:service.name+' · '+service.model.id,service
  }));
}

function deploySupported(m){
  return m?.kind==='ds'&&!['queued','running','canceled','failed'].includes(m.st)&&canScore(m);
}
function deployStatusByModel(){
  if(DEPLOY_API&&!DEPLOY_UI.services&&!DEPLOY_UI.loading&&!DEPLOY_UI.error)queueMicrotask(deployLoad);
  const byModel=new Map();
  for(const service of DEPLOY_UI.services||[]){
    const previous=byModel.get(service.model.id);
    if(!previous||previous.state!=='running'&&service.state==='running')byModel.set(service.model.id,service);
  }
  return modelId=>{
    const service=byModel.get(modelId);
    if(!DEPLOY_API||DEPLOY_UI.error)return {label:'—',serviceId:service?.id,title:DEPLOY_UI.error||'当前预览未连接在线部署后端'};
    if(!DEPLOY_UI.services)return {label:'查询中'};
    if(!service)return {label:'未部署'};
    return {label:service.state==='running'?'已部署':'已停止',active:service.state==='running',serviceId:service.id};
  };
}

async function deployRequest(path='',options={}){
  if(!DEPLOY_API)throw new Error('当前预览未连接在线部署后端');
  const response=await fetch(DEPLOY_API+path,options);
  const data=await response.json();
  if(!response.ok)throw Object.assign(new Error(data.error||'请求失败（'+response.status+'）'),{status:response.status});
  return data;
}

function deployJson(method,body){
  return {method,headers:{'content-type':'application/json'},body:JSON.stringify(body)};
}

async function deployLoad(){
  if(!DEPLOY_API||DEPLOY_UI.loading)return;
  const revision=DEPLOY_UI.revision;
  DEPLOY_UI.loading=true;
  DEPLOY_UI.error='';
  try{
    const data=await deployRequest();
    if(DEPLOY_UI.revision===revision)DEPLOY_UI.services=data.services;
  }catch(error){
    if(DEPLOY_UI.revision===revision)DEPLOY_UI.error=error.message;
  }finally{
    DEPLOY_UI.loading=false;
    if((S.route==='mdl'&&!['batch','infer'].includes(S.mtab))||S.route==='bnew')render();
  }
}

function deployOpen(id){
  const m=mdlFind(id);
  if(!inLib(m)||DEPLOY_UI.working)return;
  DEPLOY_UI.selected=null;DEPLOY_UI.inlineTab=null;DEPLOY_UI.token='';
  const prefix=m.id.toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'model';
  const existing=new Set((DEPLOY_UI.services||[]).map(service=>service.id));
  const base=prefix+'-svc';
  let serviceId=base;
  for(let n=2;existing.has(serviceId);n++)serviceId=base+'-'+n;
  DEPLOY_UI.form={modelId:id,name:((m.name||m.id)+'在线服务').slice(0,60),id:serviceId,auth:'local',maxRows:'100',error:''};
  render();
}

function deployEntry(m){
  if(!inLib(m)||['queued','running','canceled','failed'].includes(m.st))return '';
  const on=mdlOn(m.id);
  const {serviceId}=deployStatusByModel()(m.id);
  return `<div class="row wrap" style="gap:var(--s3);align-items:center">
    ${serviceId?`<button class="btn btn-pri" type="button" data-deploy-service="${esc(serviceId)}">查看服务</button>`
      :`<button class="btn btn-pri" type="button" data-deploy-model="${esc(m.id)}">部署为在线服务</button>`}
    <button class="btn" type="button" data-go="services">查看在线服务</button>
    ${on||canScore(m)?`<button class="btn" type="button" data-mdlen="${esc(m.id)}"${on?'':' title="启用后可用于科研对话和候选排序"'}>${on?'停用本机调用':'启用本机调用'}</button>`:''}
  </div>`;
}

function deploymentForm(m){
  const form=DEPLOY_UI.form;
  const supported=deploySupported(m);
  const locked=DEPLOY_UI.working||!DEPLOY_API||!supported?' disabled':'';
  return drawer({title:'部署为在线服务',close:'deployformclose',
    body:`<form id="deployment-form" class="col" style="gap:var(--s5)">
      ${DEPLOY_API?'':'<p class="hint" style="margin:0">当前为静态预览。请通过本机 Demo 后端打开页面以发布服务。</p>'}
      ${supported?'':'<p class="hint" style="margin:0">本机在线运行时支持已完成且有完整权重的表格打分模型。此版本暂不可在线部署。</p>'}
      <div class="col" style="gap:var(--s2)">
        <strong>模型版本</strong>
        <div class="krow"><span class="mut2">绑定版本</span><strong>${esc(m.name||m.id)} · ${esc(m.id)}</strong></div>
        <div class="krow"><span class="mut2">预测目标</span><span>${esc(tgtName(m.target))}</span></div>
        ${m.featK?.length?`<div class="krow"><span class="mut2">输入特征</span><span>${esc(m.featK.join('、'))}</span></div>`:''}
      </div>
      <div class="field"><label class="label" for="deploy-name">服务名称 <span class="c-err">*</span></label>
        <input class="input" id="deploy-name" data-deploy-field="name" value="${esc(form.name)}" maxlength="60" required></div>
      <div class="field"><label class="label" for="deploy-id">服务标识 <span class="c-err">*</span></label>
        <input class="input num" id="deploy-id" data-deploy-field="id" value="${esc(form.id)}" maxlength="48" required spellcheck="false">
        <span class="t-xs mut2">2–48 位小写字母、数字或连字符，用于生成调用路径。</span>
        <code id="deploy-path" class="t-xs">${esc((DEPLOY_API||'/api/deployments')+'/'+form.id+'/predict')}</code></div>
      <div class="field"><label class="label" for="deploy-runtime">运行环境</label>
        <input class="input" id="deploy-runtime" value="本机 CPU" readonly></div>
      <div class="field"><label class="label" for="deploy-access">访问范围</label>
        <input class="input" id="deploy-access" value="仅本机" readonly></div>
      <div class="field"><label class="label" for="deploy-auth">调用鉴权</label>
        <select class="input" id="deploy-auth" data-deploy-field="auth" style="width:100%">
          <option value="local"${form.auth==='local'?' selected':''}>本机调用 · 无需令牌</option>
          <option value="token"${form.auth==='token'?' selected':''}>API 令牌 · 部署成功后生成</option>
        </select>
      </div>
      <div class="field"><label class="label" for="deploy-limit">单请求最大行数</label>
        <input class="input num" id="deploy-limit" data-deploy-field="maxRows" type="number" min="1" max="1000" step="1" value="${esc(form.maxRows)}" required>
        <span class="t-xs mut2">每次请求允许提交 1–1000 行数值特征。</span></div>
      ${form.error?`<p class="c-err t-sm" role="alert" style="margin:0">${esc(form.error)}</p>`:''}
    </form>`,
    footer:`<div class="row" style="justify-content:flex-end;gap:var(--s3)">
      <button class="btn" type="button" data-act="deployformclose"${DEPLOY_UI.working?' disabled':''}>取消</button>
      <button class="btn btn-pri" type="submit" form="deployment-form"${locked}>${DEPLOY_UI.working?'部署中…':'确认部署'}</button>
    </div>`});
}

async function deploySubmit(){
  if(DEPLOY_UI.working||!DEPLOY_UI.form)return;
  const form=DEPLOY_UI.form;
  const m=mdlFind(form.modelId);
  if(!deploySupported(m))return;
  const originTab=S.mtab;
  DEPLOY_UI.working=true;
  form.error='';
  render();
  try{
    const data=await deployRequest('',deployJson('POST',{
      id:form.id.trim(),name:form.name.trim(),auth:form.auth,maxRows:Number(form.maxRows),runtime:'cpu',
      model:{kind:m.kind,id:m.id,name:m.name||m.id,target:tgtName(m.target),features:m.featK,
        weights:m.w,mean:m.mu,scale:m.sg}
    }));
    DEPLOY_UI.revision++;
    DEPLOY_UI.services=[data.service,...(DEPLOY_UI.services||[]).filter(s=>s.id!==data.service.id)];
    DEPLOY_UI.selected=data.service.id;
    DEPLOY_UI.inlineTab=originTab;
    DEPLOY_UI.token=data.token||'';
    DEPLOY_UI.form=null;
    DEPLOY_UI.working=false;
    render();
    deployLoad();
    toast('在线服务已部署');
  }catch(error){
    DEPLOY_UI.working=false;
    form.error=error.message;
    render();
    document.querySelector('.dw-b [role="alert"]')?.scrollIntoView({block:'nearest'});
  }
}

function deployServices(){
  if(DEPLOY_API&&!DEPLOY_UI.services&&!DEPLOY_UI.loading&&!DEPLOY_UI.error)queueMicrotask(deployLoad);
  const rows=DEPLOY_UI.services||[];
  const empty=!DEPLOY_API?'请通过本机 Demo 后端打开页面以管理在线服务。'
    :DEPLOY_UI.error?DEPLOY_UI.error:DEPLOY_UI.loading||!DEPLOY_UI.services?'正在加载在线服务…'
    :'暂无在线服务。可从模型库的版本详情部署。';
  return `<div class="col" style="gap:var(--s4)">
    <div class="row wrap" style="gap:var(--s3)">
      <strong class="grow">在线服务</strong>
      <button class="btn" type="button" data-mtab="cur">打开模型库</button>
      <button class="btn" type="button" data-go="batch">返回推理任务</button>
      ${DEPLOY_API?'<button class="btn" type="button" data-act="deployrefresh">刷新</button>':''}
    </div>
    ${DEPLOY_UI.error&&rows.length?`<p class="t-sm c-err" role="alert">${esc(DEPLOY_UI.error)}</p>`:''}
    <div class="card">
      ${rows.length?`<div class="tbl-wrap is-list"><table aria-label="在线服务">
        <thead><tr><th scope="col">服务名称 / 标识</th><th scope="col">模型版本</th>
          <th scope="col">运行环境</th><th scope="col">状态</th><th scope="col">鉴权</th><th scope="col">操作</th></tr></thead>
        <tbody>${rows.map(s=>`<tr>${nmCell(s.name,s.id)}<td>${esc(s.model.name)} · ${esc(s.model.id)}</td>
          <td>本机 CPU</td><td><span class="chip ${s.state==='running'?'c-ok':'c-mut'}">${deployStateLabel(s.state)}</span></td>
          <td>${deployAuthLabel(s.auth)}</td><td><button class="lnk" type="button" data-deploy-service="${esc(s.id)}">详情</button></td></tr>`).join('')}</tbody>
      </table></div>`:`<div class="empty">${esc(empty)}</div>`}
    </div>
  </div>`;
}

function deployServiceDrawer(){
  const service=(DEPLOY_UI.services||[]).find(s=>s.id===DEPLOY_UI.selected);
  if(!service)return '';
  const endpoint=location.origin+service.endpoint;
  const example=JSON.stringify({rows:[Object.fromEntries(service.model.features.map(key=>[key,0]))]},null,2);
  return drawer({title:service.name,close:'deployserviceclose',
    chip:`<span class="chip ${service.state==='running'?'c-ok':'c-mut'}">${deployStateLabel(service.state)}</span>`,
    body:`<div class="col" style="gap:var(--s4)">
      <div class="krow"><span class="mut2">模型版本</span><strong>${esc(service.model.name)} · ${esc(service.model.id)}</strong></div>
      <div class="krow"><span class="mut2">运行环境</span><span>本机 CPU</span></div>
      <div class="krow"><span class="mut2">调用鉴权</span><span>${deployAuthLabel(service.auth)}</span></div>
      <div class="krow"><span class="mut2">单请求最大行数</span><span>${service.maxRows}</span></div>
      <div class="field"><label class="label" for="deploy-endpoint">调用地址 · POST</label>
        <input class="input num" id="deploy-endpoint" value="${esc(endpoint)}" readonly></div>
      ${DEPLOY_UI.token?`<div class="field"><label class="label" for="deploy-token">调用令牌</label>
        <input class="input num" id="deploy-token" value="${esc(DEPLOY_UI.token)}" readonly>
        <span class="t-xs mut2">令牌只在本次部署成功时显示。请求头使用 Authorization: Bearer &lt;令牌&gt;。</span></div>`:''}
      <div class="field"><label class="label" for="deploy-test-body">请求示例与试跑</label>
        <textarea class="input num" id="deploy-test-body" rows="6" spellcheck="false">${esc(example)}</textarea>
        ${service.auth==='token'&&!DEPLOY_UI.token?'<label class="label" for="deploy-test-token">调用令牌</label><input class="input" id="deploy-test-token" type="password" autocomplete="off">':''}
        <div><button class="btn" type="button" data-act="deploytest"${service.state==='running'?'':' disabled'}>发送测试请求</button></div>
        <pre class="kbpre num" id="deploy-test-result" role="status" hidden></pre>
      </div>
    </div>`,
    footer:`<div class="row" style="justify-content:flex-end;gap:var(--s3)">
      <button class="btn" type="button" data-act="deploytoggle"${DEPLOY_UI.working?' disabled':''}>${service.state==='running'?'停止服务':'启动服务'}</button>
    </div>`});
}

async function deployToggle(){
  const service=(DEPLOY_UI.services||[]).find(s=>s.id===DEPLOY_UI.selected);
  if(!service||DEPLOY_UI.working)return;
  DEPLOY_UI.working=true;
  render();
  try{
    const state=service.state==='running'?'stopped':'running';
    const data=await deployRequest('/'+service.id,deployJson('PATCH',{state}));
    DEPLOY_UI.revision++;
    DEPLOY_UI.services=DEPLOY_UI.services.map(s=>s.id===service.id?data.service:s);
    toast(state==='running'?'服务已启动':'服务已停止');
  }catch(error){toast(error.message)}
  finally{DEPLOY_UI.working=false;render()}
}

async function deployTest(btn){
  const service=(DEPLOY_UI.services||[]).find(s=>s.id===DEPLOY_UI.selected);
  const input=document.getElementById('deploy-test-body');
  const out=document.getElementById('deploy-test-result');
  if(!service||!input||!out)return;
  const token=DEPLOY_UI.token||document.getElementById('deploy-test-token')?.value.trim();
  btn.disabled=true;
  out.hidden=false;
  out.textContent='正在调用…';
  try{
    const payload=deployJson('POST',JSON.parse(input.value));
    if(token)payload.headers.Authorization='Bearer '+token;
    out.textContent=JSON.stringify(await deployRequest('/'+service.id+'/predict',payload),null,2);
  }catch(error){out.textContent=error.message}
  finally{btn.disabled=false}
}

function deployBind(root){
  root.querySelectorAll('[data-deploy-model]').forEach(button=>button.onclick=()=>deployOpen(button.dataset.deployModel));
  root.querySelectorAll('[data-deploy-service]').forEach(button=>button.onclick=()=>{
    DEPLOY_UI.selected=button.dataset.deployService;
    DEPLOY_UI.inlineTab=S.mtab==='services'?null:S.mtab;
    DEPLOY_UI.token='';
    render();
  });
  root.querySelectorAll('[data-deploy-field]').forEach(input=>input.addEventListener('input',()=>{
    if(!DEPLOY_UI.form)return;
    DEPLOY_UI.form[input.dataset.deployField]=input.value;
    if(DEPLOY_UI.form.error){
      DEPLOY_UI.form.error='';
      root.querySelector('#deployment-form [role="alert"]')?.remove();
    }
    if(input.dataset.deployField==='id'){
      document.getElementById('deploy-path').textContent=(DEPLOY_API||'/api/deployments')+'/'+input.value+'/predict';
    }
  }));
  const auth=root.querySelector('#deploy-auth');
  if(auth)auth.onchange=()=>{if(DEPLOY_UI.form)DEPLOY_UI.form.auth=auth.value};
  const form=root.querySelector('#deployment-form');
  if(form)form.onsubmit=event=>{event.preventDefault();deploySubmit()};
}

function deployAction(action,button){
  if(action==='deployformclose'){
    if(!DEPLOY_UI.working){DEPLOY_UI.form=null;render()}
  }else if(action==='deployserviceclose'){
    DEPLOY_UI.selected=null;DEPLOY_UI.inlineTab=null;DEPLOY_UI.token='';render();
  }else if(action==='deployrefresh'){
    deployLoad();
  }else if(action==='deploytoggle'){
    deployToggle();
  }else if(action==='deploytest'){
    deployTest(button);
  }else return false;
  return true;
}
