/* Deliberately fictional UI examples. Never persisted as actual task runs. */
const ST_SAMPLES=[
 {title:'每日文献追踪 · 研究线索摘要',summary:'示例检索范围：蛋白质稳定性、局部柔性与活性保持。演示筛选 18 条线索，去重后保留 3 条供研究员阅读。',columns:['参考条目','关注主题','阅读重点'],rows:[['条目 A（虚构）','稳定性与局部柔性','核对柔性变化的测量方法及与稳定性表征的对应关系。'],['条目 B（虚构）','突变组合与活性保持','关注单点与组合突变对照，以及活性与稳定性是否同时测量。'],['条目 C（虚构）','结构预测与实验验证','区分计算线索与实验证据，记录仍需验证的假设。']],next:['优先阅读条目 A、B，整理方法与对照设计。','将可验证的问题加入关联课题，暂不据此下实验结论。'],note:'条目名称与数量均为演示，不对应真实论文；接入检索后应提供可核验的标题、DOI 和原文链接。'},
 {title:'实验数据周报 · 本周检测汇总',summary:'示例批次 DEMO-W03：共 12 个样品，10 个完成质控，2 个需要复测。本周待办为核对异常原因与补齐原始记录。',columns:['检测环节','示例结果','待处理事项'],rows:[['热稳定性表征','10 / 12 样品质控通过','2 个样品基线异常，复核温控与原始曲线。'],['亲和力验证','6 / 6 条曲线完成采集','补充拟合残差及阴性对照记录。'],['数据归档','3 份文件待复核','核对样品编号、设备记录与文件版本。']],next:['为 2 个异常样品安排复测，保留原始记录。','完成负责人复核后，再将结果纳入课题报告。'],note:'样品编号、数量与检测状态均为示例，不代表设备已执行或真实实验结果。'},
 {title:'候选序列评分 · 排序结果',summary:'示例输入：24 条候选序列。演示保留 6 条进入人工复核，下面展示排名前 3 条；其余候选仍保留在完整结果中。',columns:['候选编号','示例模型分数','复核建议'],rows:[['DEMO-SEQ-007','0.91','检查序列完整性与关键位点变更。'],['DEMO-SEQ-014','0.87','核对与基线的差异，并检查结构局部环境。'],['DEMO-SEQ-003','0.84','与前两条一起评估候选多样性。']],next:['确认模型版本、输入数据版本和评分目标。','研究员复核后再决定实验候选，不自动送检。'],note:'分数为虚构排序示例，不是成功概率，也不能代替实验验证；本页未实际运行模型。'},
 {title:'课题进展汇总 · 下一步研究安排',summary:'示例周期：第 3 周。共 4 项工作：2 项完成、1 项进行中、1 项待处理；当前优先解决样品质控问题。',columns:['研究工作','示例状态','下一步'],rows:[['文献方法整理','已完成','研究员复核检索范围与关键线索。'],['候选序列排序','已完成','复核输入与模型版本，确定实验候选。'],['亲和力数据分析','进行中','补齐对照与拟合记录。'],['异常样品复测','待处理','确认异常原因、样品余量及复测安排。']],next:['优先处理异常样品复测，记录责任人与计划日期。','完成证据复核后更新课题结论与下一轮研究问题。'],note:'本摘要是独立演示，不表示关联课题的实际进度发生变化。'}
];
function stSampleHTML(sample){
 return '<article class="st-sample"><div class="st-sample-label">示例数据 · 非真实运行结果</div><h4>'+esc(sample.title)+'</h4><p>'+esc(sample.summary)+'</p><div class="st-sample-table" role="region" aria-label="示例结果表格" tabindex="0"><table><thead><tr>'+sample.columns.map(c=>'<th scope="col">'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+sample.rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><h5>建议下一步</h5><ul>'+sample.next.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul><p class="st-sample-note">'+esc(sample.note)+'</p></article>';
}
function stSampleOutput(task){
 const match=/^schedule-example-([0-3])$/.exec(task.id);
 if(task.example&&match)return stSampleHTML(ST_SAMPLES[Number(match[1])]);
 return '<div class="st-output-empty"><img class="st-icon" src="assets/tasks/clock.svg" alt=""><h4>暂无输出内容</h4><p>任务执行后的结果会显示在这里。<br>当前后台调度还没接入，还没有运行记录。</p></div><details class="st-sample-library"><summary>查看输出样例</summary><p class="st-note">以下样例仅用于预览，不会作为该任务的运行记录保存。</p>'+ST_SAMPLES.map(sample=>'<details class="st-sample-option"><summary>'+esc(sample.title)+'</summary>'+stSampleHTML(sample)+'</details>').join('')+'</details>';
}
