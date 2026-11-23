function toolWizardLabel(f){return f.toolMode==='api'?'配置 API':f.toolMode==='skill'?'上传 Skill':'编写代码';}
function toolWizardNav(f){const step=f.wizardStep===2?2:1;return '<nav class="tool-wizard-nav" aria-label="工具创建步骤">'+[[1,'基本信息','填写名称与用途，选择创建方式'],[2,toolWizardLabel(f),'编辑并完善工具内容']].map(([n,name,desc])=>'<button type="button" data-tool-wizard-step="'+n+'" class="'+(step===n?'current':step>n?'complete':'')+'" '+(step===n?'aria-current="step"':'')+'><span class="tool-step-number">'+(step>n?'✓':n)+'</span><span><strong>'+name+'</strong><small>'+desc+'</small></span></button>').join('')+'</nav>';}
const toolWizardBind=rsBind;rsBind=function(root){toolWizardBind(root);if(S.route!=='toolnew')return;
 root.querySelectorAll('[data-tool-wizard-step]').forEach(button=>button.onclick=()=>{const f=RS.form,target=Number(button.dataset.toolWizardStep);if(target===2){const errors=rsResourceErrors(f,true);delete errors.upload;f.errors=errors;if(Object.keys(errors).length){f.wizardStep=1;f.scrollTop=0;render();requestAnimationFrame(()=>root.querySelector('[aria-invalid="true"]')?.focus());return;}}
 f.wizardStep=target;f.scrollTop=0;f.errors={};f.ideFullscreen=false;render();requestAnimationFrame(()=>{const heading=root.querySelector('[data-tool-step-panel="'+target+'"] h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}});
 });
};
