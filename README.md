# 端砚 · 生命科学

在线页面：https://okrabing.github.io/duanyan-life-sciences/

基于提供的单文件 HTML 发布的生命科学工作台原型。保留原页面的产品功能和演示数据；演示数据及模型回答不代表真实实验结果。

## 发布结构

- `src/index.html`：页面源码。
- `index.html`：构建产物，供本地运行和浏览器检查。
- `docs/index.html`：GitHub Pages 页面，由构建步骤同步。
- `site-config.js`：公开的代理地址配置，构建时复制到 `docs/site-config.js`，绝不能填写 API Key。
- `proxy/sites/`：实际部署的统一代理源码快照，由 Sites 托管，含 D1 限流与测试。
- `proxy/worker.mjs`：保留的 Cloudflare Workers 独立部署示例。GitHub Pages 不会运行任何后端代码。
- `model-proxy.mjs`：本机代理，只监听 `127.0.0.1`，密钥从环境变量读取。
- `review/`、`qa/`：随更新包导入的浏览器评审和定点探针，已适配当前配置。

对话意图判断和上下文问答统一通过 `MC.chat` 调用 DeepSeek。默认后端代理模式，支持 `deepseek-flash` 和 `deepseek-v4-pro`；短回答关闭思考模式，空回答不会被标记为连通。页面存储使用独立前缀，避免和同一 GitHub Pages 域名下的其他原型互相覆盖。

## 当前模型接入状态

**统一代理已部署，公开页面固定使用它，访客无需提供 Key。服务端尚缺 DeepSeek 密钥，真实模型回答尚未验证。**

代理地址：`https://duanyan-deepseek-proxy.badbotai.chatgpt.site/api/model/chat`。已从 GitHub Pages 的浏览器环境验证：健康检查返回 200，数据库就绪，跨域调用到达代理；无密钥时聊天接口如实返回 503，不会伪装成功。

`site-config.js` 设置 `managedProxy: true`。它固定对话请求的去向，忽略浏览器里以前保存的直连模式或代理地址；访客仍可选择模型。最后需在 Sites 的服务端 Secret 中设置 `DEEPSEEK_API_KEY` 并重新发布代理版本，然后通过「模型接入 → 测一次」及真实对话确认。

统一代理限制每 IP 每分钟 10 次、全站每分钟 60 次和每天 1000 次，单次输出最多 900 token。数据库只保存限流计数和每日变化的 IP 哈希标识，不保存对话。详见 [代理说明](proxy/sites/README.md)。

密钥保存在代理服务端，不能提交到仓库、写入 HTML 或 `site-config.js`。公开页面不显示密钥字段、直连开关或可编辑代理地址，也不会读取已存的浏览器密钥来发送请求；已有本机密钥不会被删除。本机代理返回 `managedProxy: false`，保留原有自行配置与浏览器直连选项。

## 验证

- 页面内联 JavaScript 语法检查通过。
- Chrome 本地检查：页面渲染、模型接入页面、未配置状态、代理请求格式、不发送客户端密钥、拒绝空回复、独立浏览器存储，均通过。
- `node --test proxy/worker.test.mjs`：11 项代理测试通过（模拟上游，不等于真实模型调用）。
- Sites 代理的 14 项 SQLite/接口测试，以及补充后的 3 项健康检查测试通过；真实浏览器确认托管数据库迁移已生效。
- 本次更新：10 个浏览器评审脚本全部通过，覆盖 69 个渲染状态、98 个宽度与视图组合、157 次点击及 20 条对话/项目流程。全量定点探针未在本次重复运行。
- 文件上传卡片的显示/元信息/移除，以及本机代理的页面/配置/异常请求已检查；没有以测试密钥调用真实 DeepSeek。
- 统一代理界面调整后，模型接入与对话专项再次通过，验证没有 Key/地址输入框，旧直连配置不生效，请求不带浏览器密钥。

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

原压缩包中的“访客自填 Key”方式仅在本机非统一代理模式中保留；公开页面按本次任务要求使用站点统一代理。外部字体、3Dmol 和科研接口保持原页面设置，没有新增统计脚本或前端 SDK。
