# 端砚 · 生命科学

在线页面：https://okrabing.github.io/duanyan-life-sciences/

基于提供的单文件 HTML 发布的生命科学工作台原型。保留原页面的产品功能和演示数据；演示数据及模型回答不代表真实实验结果。

## 发布结构

- `src/index.html`：页面源码。
- `index.html`：构建产物，供本地运行和浏览器检查。
- `docs/index.html`：GitHub Pages 页面，由构建步骤同步。
- `site-config.js`：公开的代理地址配置，构建时复制到 `docs/site-config.js`，绝不能填写 API Key。
- `proxy/`：独立部署到 Cloudflare Workers 的 DeepSeek 代理。GitHub Pages 不会运行后端代码。
- `model-proxy.mjs`：本机代理，只监听 `127.0.0.1`，密钥从环境变量读取。
- `review/`、`qa/`：随更新包导入的浏览器评审和定点探针，已适配当前配置。

对话意图判断和上下文问答统一通过 `MC.chat` 调用 DeepSeek。默认后端代理模式，支持 `deepseek-flash` 和 `deepseek-v4-pro`；短回答关闭思考模式，空回答不会被标记为连通。页面存储使用独立前缀，避免和同一 GitHub Pages 域名下的其他原型互相覆盖。

## 当前模型接入状态

**代理代码已准备，尚未部署和配置密钥，真实 DeepSeek 对话尚未验证。**

先按 [代理部署说明](proxy/README.md) 部署服务、设置 `DEEPSEEK_API_KEY` Secret；再把服务的完整 HTTPS `/api/model/chat` 地址填入 `site-config.js` 的 `proxyEndpoint`，执行 `npm run build` 后发布。最后在页面的「模型接入 → 测一次」确认真实回复，再测试对话。

密钥保存在代理服务端，不能提交到仓库、写入 HTML 或 `site-config.js`。原页面保留的可选浏览器直连模式使用用户自行输入的密钥，与部署代理的密钥无关。

## 验证

- 页面内联 JavaScript 语法检查通过。
- Chrome 本地检查：页面渲染、模型接入页面、未配置状态、代理请求格式、不发送客户端密钥、拒绝空回复、独立浏览器存储，均通过。
- `node --test proxy/worker.test.mjs`：11 项代理测试通过（模拟上游，不等于真实模型调用）。
- 本次更新：10 个浏览器评审脚本全部通过，覆盖 69 个渲染状态、98 个宽度与视图组合、157 次点击及 20 条对话/项目流程。全量定点探针未在本次重复运行。
- 文件上传卡片的显示/元信息/移除，以及本机代理的页面/配置/异常请求已检查；没有以测试密钥调用真实 DeepSeek。

## 外部依赖

页面使用可选的 Google Fonts 与 3Dmol CDN。默认模型名称和关闭思考模式参数参考 [DeepSeek 模型文档](https://api-docs.deepseek.com/quick_start/pricing/) 与 [思考模式文档](https://api-docs.deepseek.com/guides/thinking_mode/)。

## 更新源码与本地运行

这次更新包含压缩包中的文件选择卡片改进：通用上传字段、实验配方和数据集上传统一呈现文件名与元信息。

```bash
npm ci
npm run build       # src → index.html → docs/index.html
npm run test:quick  # 10 个浏览器评审脚本
npm test            # 全量评审与探针
npm run proxy       # 先在当前终端设置 DEEPSEEK_API_KEY 环境变量
```

打开本机代理的 `http://127.0.0.1:8787`，页面会使用同源 `/api/model/chat`。这不代表公开网页也已具备后端。macOS 测试优先使用安装的 Chrome；其他系统可先执行 `npx playwright install chromium`，或通过 `DUANYAN_TEST_BROWSER` 指定浏览器路径。

原压缩包中的“访客自填 Key”方式保留在「浏览器直连」选项中；当前发布默认仍按本次任务要求使用后端代理。外部字体、3Dmol 和科研接口保持原页面设置，没有新增统计脚本或前端 SDK。
