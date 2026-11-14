# 端砚 · 生命科学

在线页面：https://okrabing.github.io/duanyan-life-sciences/

基于提供的单文件 HTML 发布的生命科学工作台原型。保留原页面的产品功能和演示数据；演示数据及模型回答不代表真实实验结果。

## 发布结构

- `docs/index.html`：GitHub Pages 页面。
- `docs/site-config.js`：公开的代理地址配置，绝不能填写 API Key。
- `proxy/`：独立部署到 Cloudflare Workers 的 DeepSeek 代理。GitHub Pages 不会运行后端代码。

对话意图判断和上下文问答统一通过 `MC.chat` 调用 DeepSeek。默认后端代理模式，支持 `deepseek-flash` 和 `deepseek-v4-pro`；短回答关闭思考模式，空回答不会被标记为连通。页面存储使用独立前缀，避免和同一 GitHub Pages 域名下的其他原型互相覆盖。

## 当前模型接入状态

**代理代码已准备，尚未部署和配置密钥，真实 DeepSeek 对话尚未验证。**

先按 [代理部署说明](proxy/README.md) 部署服务、设置 `DEEPSEEK_API_KEY` Secret；再把服务的完整 HTTPS `/api/model/chat` 地址填入 `docs/site-config.js` 的 `proxyEndpoint` 并发布。最后在页面的「模型接入 → 测一次」确认真实回复，再测试对话。

密钥保存在代理服务端，不能提交到仓库、写入 HTML 或 `site-config.js`。原页面保留的可选浏览器直连模式使用用户自行输入的密钥，与部署代理的密钥无关。

## 验证

- 页面内联 JavaScript 语法检查通过。
- Chrome 本地检查：页面渲染、模型接入页面、未配置状态、代理请求格式、不发送客户端密钥、拒绝空回复、独立浏览器存储，均通过。
- `node --test proxy/worker.test.mjs`：11 项代理测试通过（模拟上游，不等于真实模型调用）。

## 外部依赖

页面使用可选的 Google Fonts 与 3Dmol CDN。默认模型名称和关闭思考模式参数参考 [DeepSeek 模型文档](https://api-docs.deepseek.com/quick_start/pricing/) 与 [思考模式文档](https://api-docs.deepseek.com/guides/thinking_mode/)。
