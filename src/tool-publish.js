/* 用户工具发布沿用公共目录的版本与审核流程。 */
function toolPublishActions(r){
 if(r.owner!=='me')return '';
 const disabled=can('edit')?'':' disabled';
 if(r.state==='pending')return '<button class="rs-link" type="button" data-rs-resource="'+esc(r.id)+'">查看发布进度</button>';
 if(r.state==='published')return '<button class="rs-link" type="button" data-tool-market="'+esc(r.id)+'">查看市场</button>';
 return '<button class="btn" type="button" data-tool-publish="'+esc(r.id)+'"'+disabled+'>'+(r.state==='rejected'?'重新发布':'发布')+'</button>';
}
function toolPublishForm(r){return Object.assign(rsNewResource('tool'),rsClone(r),{editId:r.id,files:[],uploading:false,uploadError:''});}
async function toolSubmitPublication(id){
 if(!can('edit'))throw new Error('当前身份没有发布权限');
 const next=rsClone(RS.data),r=next.resources.find(r=>r.id===id&&r.kind==='tool'&&r.owner==='me');
 if(!r||['pending','published'].includes(r.state))throw new Error('工具状态已变化，请刷新后重试');
 const errors=rsResourceErrors(toolPublishForm(r));if(Object.keys(errors).length)throw new Error(Object.values(errors).join('；'));
 r.visibility='public';r.state='pending';delete r.review;r.events=(r.events||[]).concat([{at:nowStamp(),text:'提交工具发布审核 · '+r.version}]);await rsSave(next);toast('已提交发布审核');
}
function toolPublishDialog(id){
 const r=RS.data.resources.find(r=>r.id===id&&r.kind==='tool'&&r.owner==='me');if(!r||!can('edit'))return;
 const errors=rsResourceErrors(toolPublishForm(r));
 if(Object.keys(errors).length){modal('完善工具后发布','<p>请先完成以下内容：</p><ul>'+Object.values(errors).map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>','去完善',()=>{rsStartResource('tool',id);RS.form.errors=errors;RS.form.wizardStep=Object.keys(errors).some(k=>['slug','name','description','github','tags'].includes(k))?1:2;render();});return;}
 modal('发布工具','<dl class="rs-details"><dt>工具名称</dt><dd>'+esc(r.name)+'</dd><dt>类型</dt><dd>'+toolListType(r.toolMode||'skill')+'</dd><dt>发布版本</dt><dd>'+esc(r.version)+'</dd><dt>发布位置</dt><dd>市场 · 科研工具</dd></dl><p>提交审核后，通过的版本将出现在科研工具目录中。个人工具列表继续保留此工具，后续修改以新版本发布。</p><p class="rs-help">当前为本机发布流程演示，尚未同步到服务器；发布不会自动执行代码或调用接口。</p>','提交发布审核',()=>rsModalSave(()=>toolSubmitPublication(id)));
}
const toolPublishDetail=V.resdetail;V.resdetail=()=>{const html=toolPublishDetail(),r=RS.data.resources.find(r=>r.id===RS.resourcePick);if(!r||r.kind!=='tool'||(RS.resourceVersion&&RS.resourceVersion!==r.version))return html;const t=document.createElement('template');t.innerHTML=html;const actions=t.content.querySelector('.rs-head .rs-actions');if(actions){const slot=document.createElement('span');slot.className='tool-publish-actions';slot.innerHTML=toolPublishActions(r);actions.append(slot);}return t.innerHTML;};
const toolPublishBind=rsBind;rsBind=function(root){toolPublishBind(root);
 root.querySelectorAll('[data-tool-publish]').forEach(el=>el.onclick=()=>toolPublishDialog(el.dataset.toolPublish));
 root.querySelectorAll('[data-tool-market]').forEach(el=>el.onclick=()=>{const r=RS.data.resources.find(r=>r.id===el.dataset.toolMarket);RS.marketTab='catalog';S.use='全部';S.shcap='全部';S.tq=r?.name||'';go('shelf');});
};
