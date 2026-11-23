/* 个人工具与市场科研目录分开：这里只管理用户创建的工具。 */
const toolListState={query:'',type:'all'};
function toolListEntries(){
 const own=RS.data.resources.filter(r=>r.kind==='tool'&&r.owner==='me').map(r=>({id:r.id,name:r.name,description:r.description,type:r.toolMode||'skill',tags:r.tags||[],input:r.toolMode==='api'?'JSON 请求参数':r.toolMode==='code'?'JSON 参数':'按 Skill 说明输入',output:r.toolMode==='api'?'JSON 响应':r.toolMode==='code'?'函数返回结果':'按 Skill 说明输出',status:rsResourceStates[r.state],version:r.version,record:r}));
 return own;
}
const toolListType=t=>({code:'代码工具',api:'API 接口',skill:'Skill'})[t]||'Skill';
V.tools=()=>{
 const gate=rsGate();if(gate)return gate;
 const all=toolListEntries(),q=toolListState.query.trim().toLowerCase(),rows=all.filter(t=>(toolListState.type==='all'||t.type===toolListState.type)&&(!q||[t.name,t.description,...t.tags].join(' ').toLowerCase().includes(q)));
 return '<div class="page rs tool-list-page">'+rsHeader('工具','管理自己编写的代码工具、接入的 API 和上传的 Skill，随时编辑配置。','<button class="btn btn-pri" data-rs-new-resource="tool" type="button">＋ 新建工具</button>')+
 '<div class="tl-toolbar"><div class="tl-filters" role="group" aria-label="工具类型">'+[['all','全部工具'],['code','代码工具'],['api','API 接口'],['skill','Skill']].map(([k,n])=>'<button type="button" class="pill '+(toolListState.type===k?'on':'')+'" data-tl-type="'+k+'" aria-pressed="'+(toolListState.type===k)+'">'+n+' <small>'+all.filter(t=>k==='all'||t.type===k).length+'</small></button>').join('')+'</div><input class="input tl-search" id="tl-search" type="search" aria-label="搜索工具" placeholder="搜索名称、用途或标签" value="'+esc(toolListState.query)+'"></div>'+
 '<p class="rs-help" role="status">共 '+rows.length+' 个工具 · 自建工具 '+all.filter(t=>!t.record.isExample).length+' 个 · 示例 '+all.filter(t=>t.record.isExample).length+' 个</p>'+
 (rows.length?'<div class="tl-grid">'+rows.map(t=>'<article class="tl-card"><div class="tl-card-head"><span class="tl-icon">'+wbViewIcon(t.type==='code'?'paper':'model')+'</span><div class="rs-tags">'+(t.record.isExample?'<span class="rs-tag">示例 · 可编辑</span>':'')+'<span class="rs-tag">'+esc(t.status)+'</span></div></div><h2>'+esc(t.name)+'</h2><div class="tl-meta">'+toolListType(t.type)+' · '+esc(t.version)+'</div><p class="tl-description">'+esc(t.description||'暂无描述')+'</p><div class="rs-tags">'+t.tags.map(tag=>'<span class="rs-tag">'+esc(tag)+'</span>').join('')+'</div><dl class="tl-io"><dt>输入</dt><dd>'+esc(t.input||'详见工具说明')+'</dd><dt>输出</dt><dd>'+esc(t.output||'详见工具说明')+'</dd></dl><footer><span class="rs-help">'+(t.record.isExample?'示例配置 · 未执行':'我的工具 · 配置已保存')+'</span><div class="tl-actions"><button class="rs-link" type="button" data-rs-resource="'+esc(t.id)+'">详情</button><button class="btn" type="button" data-tl-edit="'+esc(t.id)+'" '+(!can('edit')?'disabled':'')+'>'+ (t.record.state==='pending'?'撤回并编辑':'编辑')+'</button>'+toolPublishActions(t.record)+'</div></footer></article>').join('')+'</div>':'<div class="rs-empty"><h2>'+(q?'没有匹配的工具':'还没有'+(toolListState.type==='all'?'工具':toolListType(toolListState.type)))+'</h2><p>'+(q?'尝试其他关键词，或清除筛选。':'编写代码、配置接口或上传 Skill，创建自己的工具。')+'</p><button class="btn" type="button" data-tl-reset>查看全部工具</button><button class="btn btn-pri" type="button" data-rs-new-resource="tool">新建工具</button></div>')+'</div>';
};
const toolListBind=rsBind;rsBind=function(root){toolListBind(root);
 root.querySelectorAll('[data-tl-type]').forEach(el=>el.onclick=()=>{toolListState.type=el.dataset.tlType;render();});
 root.querySelector('[data-tl-reset]')?.addEventListener('click',()=>{toolListState.type='all';toolListState.query='';render();});
 root.querySelector('#tl-search')?.addEventListener('input',e=>{const field=e.target,pos=field.selectionStart;toolListState.query=field.value;render();const next=root.querySelector('#tl-search');next?.focus();if(next&&next.type!=='search')next.setSelectionRange(pos,pos);});
 root.querySelectorAll('[data-tl-edit]').forEach(el=>el.onclick=async()=>{if(!can('edit'))return;const r=RS.data.resources.find(r=>r.id===el.dataset.tlEdit&&r.owner==='me');if(!r)return;try{if(r.state==='pending')await rsWithdrawResource(r.id);rsStartResource('tool',r.id);}catch(e){toast(e.message);}});
};

/* 首次提供可编辑的个人配置示例，已有记录与修改内容保持原样。 */
async function seedPersonalToolExamples(){
 if(LS.get('examples_disabled',false))return;
 const examples=[{
 id:'example-personal-code',slug:'example-sequence-stats',name:'蛋白序列统计',toolMode:'code',language:'python',cap:'seq',tags:['序列分析','数据处理'],
 description:'代码示例：输入一条蛋白序列，清理空白并统计序列长度及各氨基酸数量。可编辑 main 函数，扩展自己的分析逻辑。',
 code:`def main(params):
    sequence = "".join(str(params.get("sequence", "")).split()).upper()
    if not sequence:
        raise ValueError("请提供非空的 sequence")
    allowed = set("ACDEFGHIKLMNPQRSTVWY")
    invalid = sorted(set(sequence) - allowed)
    if invalid:
        raise ValueError("包含不支持的字符：" + ", ".join(invalid))
    counts = {aa: sequence.count(aa) for aa in sorted(set(sequence))}
    return {"length": len(sequence), "counts": counts}`,
 requestExample:JSON.stringify({sequence:'ACDEAC'},null,2),responseExample:JSON.stringify({length:6,counts:{A:2,C:2,D:1,E:1}},null,2)
 },{
 id:'example-personal-api',slug:'example-prediction-api',name:'自定义预测接口',toolMode:'api',cap:'func',tags:['功能预测'],method:'POST',auth:'bearer',credentialRef:'PREDICTION_API_TOKEN',endpoint:'https://api.example.com/v1/predict',
 description:'API 配置示例：将序列提交给你已有的预测服务。接口地址是示例，请替换成你自己的地址，并配置对应凭据引用；当前不会发起请求。',
 requestExample:JSON.stringify({sequence:'ACDEAC'},null,2),responseExample:JSON.stringify({prediction:0.82,model_version:'v1'},null,2)
 }];
 const next=rsClone(RS.data);let changed=false;
 for(const sample of examples){if(next.resources.some(r=>r.id===sample.id||r.slug===sample.slug))continue;
 const base=rsNewResource('tool');for(const k of ['editId','files','manual','errors','uploadError','uploading','generation'])delete base[k];
 next.resources.push({...base,...sample,owner:'me',isExample:true,subjects:['生命科学'],sourceKind:sample.toolMode,state:'private',history:[],at:nowStamp(),events:[{at:nowStamp(),text:'添加个人工具示例'}]});changed=true;
 }
 if(changed)await rsSave(next);
}
const toolExamplesSeed=iterationSeedWorkspace;
iterationSeedWorkspace=async function(){await toolExamplesSeed();await seedPersonalToolExamples();};
