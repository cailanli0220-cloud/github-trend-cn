# GitHub AI 趋势日报

网站：https://cailanli0220-cloud.github.io/github-trend-cn/

每天目标约 20 个项目：15 个 AI 优先名额与 5 个全 GitHub 爆发名额（全站名额也可包含 AI）。候选不足时少发，不用没有变化的重复项目凑数。卡片提供中文用途、原始简介、语言、Star、近期热度、关注理由及 GitHub 链接。

## 发现与历史

覆盖 Agent、Coding Agent、MCP、本地模型、语音/视频、RAG/Memory、AI 应用，有合格候选时优先覆盖每类。搜索近 7 天新建项目、活跃 AI 主题小项目、全站活跃项目，结合 Trending 与历史跟踪。对首次发现 1–7 天且低于 10000 Star 的项目加权。

保存 14 天每日候选快照，包括 Star、热度及来源、候选排名；保留 30 天仓库跟踪状态。同一天重跑替换当天样本，只与此前日期比较，不伪造历史。近 7 天变化按可用样本实际间隔显示。

- 🆕 今日新出现：首次被扫描发现，不代表当天创建。
- 🔥 突然加速：同来源热度达到上一有效日样本的 1.8 倍，至少 10 且增加至少 5。
- 📈 持续升温：近 7 天连续三次有效每日样本热度递增。
- 近 7 天精选过的项目，只有加速或持续升温才重复推荐。

热度优先取 Trending 今日新增 Star，否则使用 18–168 小时实际间隔的 Star 净变化折算每日增长。未知值不当零，来源不同不判定加速。排名是当日候选池综合得分排名，候选池变化也会影响排名。历史不足明确标注；无合格项目可发布空榜，上游全部失败则保留上次数据和时间并标注过期。

## 中文与安全

Actions 后端可用 secret DEEPSEEK_API_KEY 依据公开 README 整理中文用途。缺少 Key 或服务失败时使用明确标注的分类基础说明与原始简介。本地不调用 DeepSeek。可用仓库变量 DEEPSEEK_MODEL 选择模型。

凭据仅用于请求头，不进入提示词、网页、JSON 或日志。文本与 JSON 保存过滤运行时凭据；异常不打印请求头、响应或异常正文。网页以 textContent 展示外部内容。部署包仅包含静态页面和公开日报 JSON。

## 自动化与验证

保留每天 UTC 01:00（北京时间约 09:00）的 schedule 和 workflow_dispatch。GitHub 调度可能延迟。代码推送 main 自动执行测试、扫描、数据保存与 Pages 部署；自动数据提交不触发循环。推送不强制覆盖。

本地验证：

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
node --check app.js
python scripts/scan.py
python -m http.server 8000
```

原 data/guides.json 和实用指南辅助函数保留，每日趋势榜已不受指南库限制。
