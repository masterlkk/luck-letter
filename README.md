# 好运来信

回答六个问题，收到一封关于近期状态的私人来信。奶油纸色、深绿色和来信式排版，配有五维解读、七日行动建议和可导出的签语卡。

## 已实现

- 六题测评、上一步、会话内进度保存和可选心事补充。
- 私人来信、五维状态指数、回答依据、条件式提醒和七日行动计划。
- 签语来信 / 好运票根两款分享卡，可选签语、昵称与是否展示分数。
- 1080 × 1440 PNG 导出，支持系统分享的设备可直接分享图片。
- 本机保存与重读来信、清除本机记录。
- 自愿授权的星级评价、建议有用性反馈、评价附图、完整星级分布。
- 阿里云百炼 Qwen-Plus 服务端接入，含请求校验、超时、响应结构检查和调用频次限制。
- GitHub Pages 前端发布、Cloudflare Worker + D1 后端发布配置。



## 本机启动

需要 Node.js 22 或更新版本（推荐 Node.js 24），应用本身没有 npm 运行依赖。

```sh
npm start
```

打开 `http://127.0.0.1:4173/`。`/#sample` 可直接查看示例结果页。

如需测试真实 AI，将 `.env.example` 复制为 `.env`，只在本机文件中配置：

```dotenv
DASHSCOPE_API_KEY=在这里填写你自己的密钥
AI_MODEL=qwen-plus
AI_BASE_URL=复制百炼业务空间的专属 Base URL
```

`.env`、本机评价数据和构建产物已加入 Git 忽略规则。不要把密钥放进 `public/`、`docs/`、`config.js` 或仓库变量 `PUBLIC_API_BASE`。

## 验证与构建

```sh
npm test
npm run build
```

测试覆盖 4096 种答题组合、分数一致性、模型结果校验、授权、CORS、限流以及低分和高分评价的统计。`dist/` 是可直接托管的静态前端。

## 发布

完整步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

- GitHub Pages 只发布静态文件，模型密钥始终保留在独立后端。
- 未接后端时，Pages 可以完整体验答题、结果页、保存记录和图片导出。
- 接上 Cloudflare Worker + D1 后，再启用 AI 深度解读与服务端评价。
- 默认模型为 `qwen-plus`。模型名称可通过服务端环境变量调整，接口以 [阿里云百炼 官方文档](https://api-docs.deepseek.com/api/create-chat-completion/) 为准。

## 目录

```text
public/                 前端、问卷与固定规则
server/api.mjs          平台无关的 API 和模型适配
server.mjs              本机 HTTP 服务与本地评价存储
worker/                 Cloudflare 入口与 D1 迁移
scripts/                静态构建和发布配置生成
tests/                  Node.js 测试
.github/workflows/      前端与后端发布流程
```

## 数据处理

基础体验在浏览器中生成。AI 模式只有在用户明确勾选同意后，才发送六个回答与选填补充给 阿里云百炼；应用不在服务端保存问卷内容。公开评价有单独的授权选项，签语图片不含原始回答或补充心事。

状态指数是基于问卷的娱乐表达，未来七日内容是行动安排，不是事件概率、医疗诊断或投资意见。首次真实模型联调与生产后端配置需使用站点所有者自己的 API Key 和 Cloudflare 账户。


## 当前 AI 服务

网站采用阿里云百炼 `qwen-plus`。独立 API 地址由 `site.config.json` 管理，Sites 托管的 Cloudflare Worker 保存模型密钥并连接 D1 评价数据库。密钥和业务空间专属地址保存在托管平台的 Secret 中，不进入 GitHub 或浏览器配置。原有 Cloudflare 自部署脚本仍可使用，部署说明见 DEPLOYMENT.md。
