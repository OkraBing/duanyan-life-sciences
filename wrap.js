// 把 artifact 正文包成和发布后完全一致的文档：doctype + charset + viewport + 同一份 reset。
// 测试必须跑这个产物，否则测的是 quirks 模式、没有声明编码的另一个环境。
const fs=require('fs');
const src=process.argv[2], out=process.argv[3];
const path=require('node:path');
const body=fs.readFileSync(src,'utf8').replace(/\/\* @include ([a-zA-Z0-9./_-]+) \*\//g,(_,name)=>{
  const file=path.resolve(path.dirname(src),name);
  if(!file.startsWith(path.dirname(path.resolve(src))+path.sep))throw new Error('Invalid source include');
  return fs.readFileSync(file,'utf8');
});
const html=`<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;
fs.writeFileSync(out,html);
console.log('已生成',out,Math.round(html.length/1024)+'KB');
