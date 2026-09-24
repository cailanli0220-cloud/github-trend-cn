# GitHub 热门趋势 · 中文开源日报

每天发现正在升温的开源项目，手机优先，静态网页，无前端 API Key。

目标网址：https://cailanli0220-cloud.github.io/github-trend-cn/

## 功能

- 每日约 16 个项目，展示中文说明、关注理由、语言、Topics、总 Star、可用的增长数据。
- 搜索、分类、编程语言筛选，综合热度/当日增长/总 Star/新增优先排序。
- GitHub Trending 日榜 + 最近 60 天新仓库 + AI、Agent、开发工具和自动化搜索 + 持续历史跟踪。
- 综合短期增长、相对增长、新仓库积累速度和主题；对最近反复入选项目降权，为新发现预留位置。
- 无 DeepSeek Key 可运行。DeepSeek 超时、限额或输出无效时自动使用基础说明。
- 上游全部失败时保留上次成功数据及其真实时间，不把旧数据假装成今日数据。

## 自动更新

`.github/workflows/daily.yml` 在 UTC 01:00（北京时间 09:00）运行，GitHub 定时任务可能排队延迟。
也可在 **Actions → 每日趋势扫描与部署 → Run workflow → main → Run workflow** 手动运行。
向 main 推送程序改动会运行扫描并部署；数据提交不会造成循环运行。
公开仓库长期无人活动时，GitHub 可能停用定时工作流，届时需要在 Actions 页面重新启用。

首次部署需要把 **Settings → Pages → Build and deployment → Source** 设置为 **GitHub Actions**。
项目包附带的一键部署脚本会尝试自动完成此设置。

## 可选：更具体的中文整理

在 **Settings → Secrets and variables → Actions → New repository secret** 添加：

- Name: `DEEPSEEK_API_KEY`
- Secret: 你自己的 DeepSeek Key（只填在 GitHub，不发送到聊天）

Python 只在扫描步骤通过 `os.getenv('DEEPSEEK_API_KEY')` 读取 Key。
程序要求 `GITHUB_ACTIONS=true` 才会调用 DeepSeek；正常本地运行始终使用基础说明。
默认模型 `deepseek-chat`；可用仓库 Variable `DEEPSEEK_MODEL` 覆盖为你的账号支持的模型。
只发送公开仓库 description、Topics 和截断后的 README，不发送其他环境变量或凭据。
中文内容只影响说明，不允许模型修改 Star、排名或增长理由。

没有 Key 时展示按标签归类的保守中文说明，同时保留原文。页面明确标注“基础中文说明”，不会声称已逐项人工审阅。

## 数据口径

- `stars_today`：GitHub Trending 页面显示的 `stars today`，缺失为 `null`，绝不猜测。
- `snapshot_delta` / `snapshot_hours`：两次真实 Star 快照的净差与小时数；优先接近 24 小时的有效快照（18～168 小时）。
- 新仓库的“累计 Star / 创建天数”只用于辅助排序，不展示为当日增长。
- “今日新增”是首次入选本看板；同一天重新扫描仍保留标记。
- 热度不等于质量保证。主题搜索本身不是增长证据；不足 10 个有信号项目时会明确标注补充候选。
- 有限候选池不是全 GitHub 普查；无 Token 的本机运行受公开 API 额度限制，Actions 使用自动提供的 `GITHUB_TOKEN`。
- `data/history.json` 保存近期快照和入选记录，随数据提交以便下次运行计算；网页只发布 `trending.json`。

## 本地运行与测试

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python scripts/scan.py
python -m http.server 8000
```

打开 http://localhost:8000 。不要直接双击 HTML（浏览器通常会阻止 file:// 加载 JSON）。

## 安全与部署

Secrets 不会写入 HTML、JS、JSON 或日志。扫描脚本不打印外部 API 的错误响应或请求头。
模型输出和公开文本使用凭据过滤，前端通过 `textContent` 渲染外部内容，仓库链接只接受合法的 owner/repo。
部署只上传明确列出的静态文件，不上传整个工作目录、Python 脚本或环境文件。
扫描 job 只有 contents 写权限；部署 job 只有 Pages 写权限和 OIDC 权限。仅运行 main，不监听不可信 PR。
数据提交使用普通 fast-forward push，冲突时失败而不强推；修复后手动重跑。

技术参考：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[DeepSeek JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)。
