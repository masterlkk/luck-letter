# 部署说明

## 接入 AI

网站通过独立的 HTTPS 后端调用阿里云百炼。现有代码已经支持通义千问 `qwen-plus`。本机可在项目目录运行 `npm run dev`，再访问 [本机预览](http://127.0.0.1:4173/)。

1. 在阿里云百炼创建按量付费的 API Key，并复制同一业务空间的 OpenAI 兼容 Base URL。曾在聊天中发送的密钥请在百炼控制台撤销并换新。 [百炼 Base URL 文档](https://help.aliyun.com/zh/model-studio/base-url)
2. 将本项目后端部署到目标用户能访问的 HTTPS 地址。本仓库提供下文的 Worker 部署方式。将新密钥配置在后端的 `DASHSCOPE_API_KEY`，专属地址配置在 `AI_BASE_URL`，模型使用 `AI_MODEL=qwen-plus`。将 `ALLOWED_ORIGINS` 设为 `https://masterlkk.github.io`。本机测试时这些值填在项目的 `.env`，密钥只保存在服务端。
3. 打开 [仓库 Actions Variables](https://github.com/masterlkk/luck-letter/settings/variables/actions)，设置 `PUBLIC_API_BASE` 为后端 HTTPS 地址，只填域名和协议，例如 `https://api.example.com`。然后重新运行 [Pages 发布工作流](https://github.com/masterlkk/luck-letter/actions/workflows/pages.yml)。
4. 用实际访问网站的网络打开后端的 `/api/status`。看到 `aiConfigured: true` 表示服务可达且有配置。再从网站答完六题、同意数据使用并提交，看到「AI 深度来信」才算验收完成。

若目标网络访问 `/api/status` 返回 403，而 GitHub 的部署检测通过，应先处理后端域名的访问拦截，或换一个目标用户能访问的后端地址。

## 1. GitHub Pages 前端

仓库：`masterlkk/luck-letter`。

1. 在仓库的 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. `.github/workflows/pages.yml` 在推送 `main` 后运行测试、构建静态前端并发布。
3. 在 **Actions → Test and deploy GitHub Pages** 检查 `deploy` 成功，并以工作流输出的 URL 为准。

预期的默认地址为 `https://masterlkk.github.io/luck-letter/`；只有部署成功并检查返回内容后，才能视为已上线。

没有后端时页面会使用基础体验版。真实 AI 和公开评价需要下面的服务端。

## 2. Cloudflare Worker + D1

需要你自己的 Cloudflare 账户。可在 Cloudflare 控制台创建 D1 数据库 `luck-letter`，复制数据库 ID。

本机部署步骤（在项目目录执行）：

```sh
npm run build
npx --yes wrangler@4 login
```

将 `wrangler.jsonc` 中 `REPLACE_WITH_D1_DATABASE_ID` 替换为 D1 数据库 ID，并把 `AI_BASE_URL` 换成与密钥对应的业务空间地址。然后执行以下命令。

```sh
npx --yes wrangler@4 d1 migrations apply luck-letter --remote
npx --yes wrangler@4 secret put DASHSCOPE_API_KEY
npx --yes wrangler@4 secret put RATE_LIMIT_SALT
npx --yes wrangler@4 deploy
```

`secret put` 会以交互方式接收密钥，避免写入命令参数和仓库。`RATE_LIMIT_SALT` 使用一段足够长的随机字符。`DASHSCOPE_API_KEY` 从你自己的 阿里云百炼 开放平台获取。

部署成功后，Worker 同时可以提供整站页面、`/api/status`、`/api/analyze`、`/api/reviews`，并在 D1 保存公开评价与限流计数。默认允许的外部前端来源为 `https://masterlkk.github.io`；如果使用自定义域名，更新 `ALLOWED_ORIGINS`（多个来源以逗号分隔）。

## 3. 把 GitHub Pages 接到后端

在 GitHub 仓库的 **Settings → Secrets and variables → Actions → Variables** 添加：

```text
PUBLIC_API_BASE=https://你的-worker-地址.workers.dev
```

这个值只是公开的 API 服务地址，不能填写 API Key。重新运行 Pages 工作流，让前端构建携带新的后端地址。

检查后端 `/api/status` 返回 `aiConfigured: true` 和 `reviewsAvailable: true`。完成测评后，用户会看到 AI 解读同意选项。需要使用真实密钥进行一次端到端联调；本地测试使用的模拟响应不代表真实模型调用已经成功。

## 4. 可选：通过 GitHub Actions 更新后端

先完成 Cloudflare D1 创建和 Worker secret 配置，再设置仓库 Actions Secrets：

- `CLOUDFLARE_API_TOKEN`：对目标账户的 Worker 与 D1 有必要部署权限。
- `CLOUDFLARE_ACCOUNT_ID`：对应 Cloudflare 账户 ID。

设置仓库 Actions Variable：

- `D1_DATABASE_ID`：D1 数据库 ID。

随后手动运行 **Deploy AI backend to Cloudflare**。此流程不会读取或复制模型密钥；Worker 的 `DASHSCOPE_API_KEY` 保留在 Cloudflare Secret 中。

## 5. 运行边界

- 首版的 Cloudflare 模型接口限制为每个访问标识每小时最多 6 次，全站每天最多 200 次；修改 `server/api.mjs` 可调整。
- Cloudflare 的计数持久保存在 D1；本机 Node 服务的计数保存在进程内，重启会重置。
- 本机 Node 的评价写入 `data/reviews.json`，仅供本机开发；线上 Worker 使用 D1。
- 页面展示最近 24 条评价，总评分与星级分布包含全部公开评价。
- 公开页面上线前使用你自己的模型账户与运行账户进行验收，按实际模型响应和访问量调整服务限额。

## 当前线上后端

当前前端默认连接 Sites 托管的独立 API，地址记录在 `site.config.json` 中。`PUBLIC_API_BASE` 仓库变量仍可覆盖这个默认值。Sites 通过原生 Secret 保存 `DASHSCOPE_API_KEY` 与专属 `AI_BASE_URL`，D1 保存公开评价和调用计数。通义千问默认模型为 `qwen-plus`。现有 Cloudflare 自部署配置保留为替代部署方式。
