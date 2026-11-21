/* Synthetic exception scenarios; only recognizable, untouched examples are upgraded. */
const LAB_EXCEPTION_EXAMPLES={
 'B-P1-002':{stage:'affinity',name:'亲和力测定 · 基线复核',done:['stability'],reason:'BLI 参考孔基线持续漂移，当前结合曲线暂不纳入 KD 拟合；更换参考孔后重新采集。',event:'亲和力表征发现参考基线漂移；稳定性表征已完成，等待补采结合曲线。'},
 'B-DEMO-EX':{stage:'purify',name:'蛋白纯化与表征 · 流路检查',reason:'纯化过程中柱压升高、流速下降，已暂停纯化；检查流路与滤膜后再恢复运行。',event:'蛋白纯化因流路异常暂停，后续质控和表征尚未开始。'},
 'B-P3-002':{stage:'activity',name:'酶活测定 · 空白对照复核',running:['stability'],reason:'酶活空白孔背景信号偏高，当前批次暂不参与 kcat 拟合；检查底物和缓冲液后重测空白对照。',event:'酶活表征的空白对照异常；独立分样的稳定性表征继续采集曲线。'},
 'B-P4-002':{stage:'qc',name:'候选表征 · 浓度复测',reason:'同一样本的两次浓度读数差异较大，已暂停后续表征，待重新混匀后复测。',event:'样品质控发现重复浓度读数不一致，等待复测后再分样。'}
};
function labIsUntouchedExceptionExample(b){
 const w=b?.workflow,scenario=LAB_EXCEPTION_EXAMPLES[b?.id];
 if(!scenario||!w||w.exceptionExampleVersion>=2||w.source!=='demo'||w.phase!=='ready'||w.mode!=='parallel'||w.conclusion)return false;
 const qc=w.steps.findIndex(s=>s.stage==='qc'),legacy=b.id==='B-DEMO-EX';
 const originalNames=legacy?['蛋白纯化后表征 · 异常示例','蛋白纯化与表征 · 流路检查']:[b.id==='B-P3-002'?'酶活与稳定性表征 · 质控复核':'亲和力与稳定性表征 · 质控复核'];
 if(!originalNames.includes(b.name))return false;
 const expected=legacy?'演示：样品浓度记录与交接清单不一致，暂停后续表征并核对样本。':'样本浓度与交接清单不一致，已暂停后续表征，等待补测浓度。';
 if(qc<0||w.steps[qc].result!==expected||!w.steps.some(s=>s.stage===scenario.stage))return false;
 if((w.events||[]).some(e=>e.text!=='质控异常，等待样本浓度复核'||e.by!=='ZHANG'))return false;
 return w.steps.every((s,i)=>!s.at&&!(s.history||[]).length&&(s.attempt||1)===1&&s.state===(i<qc?'done':i===qc?'exception':'pending')&&(i===qc||s.result===(i<qc?(legacy?'演示：环节完成':'样本与质控记录已复核，输入输出交接完整。'):'')));
}
function labApplyExceptionExample(b){
 const scenario=LAB_EXCEPTION_EXAMPLES[b?.id],w=b?.workflow;if(!scenario||!w)return b;
 const failed=w.steps.find(s=>s.stage===scenario.stage);if(!failed)return b;
 const done=new Set(scenario.done||[]);
 const before=id=>{const step=w.steps.find(s=>s.id===id);for(const dependency of step?.after||[]){if(!done.has(dependency)){done.add(dependency);before(dependency);}}};before(failed.id);
 w.steps.forEach(s=>{
  s.state=s.id===failed.id?'exception':done.has(s.id)?'done':(scenario.running||[]).includes(s.stage)?'running':'pending';
  s.result=s.state==='exception'?scenario.reason:s.state==='running'?'独立分样的稳定性表征正在采集曲线。':s.state==='done'?(s.stage==='qc'?'浓度与样品检查已通过，满足后续表征的输入要求。':s.stage==='stability'?'热转变曲线与重复样本已复核，稳定性结果已记录。':'该环节已完成，样本与操作记录交接完整。'):'';
  s.evidence=['done','exception'].includes(s.state)?'ELN/'+b.id+'/'+s.id+'/v1':'';
 });
 b.name=scenario.name;w.exceptionExampleVersion=2;
 w.events=[{at:w.events?.[0]?.at||nowStamp(),by:'ZHANG',text:scenario.event}];return b;
}
