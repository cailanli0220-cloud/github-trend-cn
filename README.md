# 开源工具实用指南

网站：https://cailanli0220-cloud.github.io/github-trend-cn/

按“我想做什么”找工具。每日最多五个精选，覆盖办公自动化、内容创作和编程开发；可以切换全部工具指南、搜索用途、筛选安装即用或编程语言。

## 每张卡片

具体任务、中文用途、适合谁、上手门槛、费用、API Key、平台与硬件说明、三步上手路径、预期结果、使用限制、官方入口、资料来源和查阅日期。GitHub 热度折叠为辅助信息。

文档整理不等于安装实测。未确认的信息明确标注，不承诺运行时间、压缩率或收益，不伪造在线演示。

## 数据与每日精选

- `data/guides.json`：人工整理的官方资料指南，目前覆盖七个实用工具。新增/修订时填写来源和实际查阅日期。
- `scripts/scan.py`：每天获取 Trending、新仓库、主题搜索与工具库仓库元数据；跳过归档仓库。
- 只有具备具体任务、受众、成本与步骤的指南才能进入精选，不用泛泛介绍凑数量。
- 排名优先考虑上手门槛，近期反复入选降权，短期热度影响有上限；尽量覆盖三种任务。
- `data/trending.json`：今日精选 `projects` 与完整可用指南 `library`。
- `data/history.json`：Star 快照、精选日期与已保存的 AI 指南。
- 无 DeepSeek Key 时仍有具体中文指南，每天更新仓库状态并从工具库重选；不是每天自动新增五个全新软件。工具库需要继续补充和维护。
- 配置 DeepSeek 后，Actions 从最多八个新候选 README 整理额外指南。未满足完整性校验的输出丢弃，AI 整理明确标注。生成内容不代表人工事实复核，费用等不明确时要求标为未知。
- 文档查阅日期不会被日常元数据扫描自动刷新。旧指南可能需要随软件版本变化再次核对。
- 上游全部失败保留上次成功数据和原始时间。没有可用指南时不发布空列表。

## 自动化

`.github/workflows/daily.yml` 每天 UTC 01:00 / 北京时间 09:00 运行（GitHub 可能延迟）。支持 Actions → 每日趋势扫描与部署 → Run workflow。代码或指南更新会触发扫描并部署；自动数据提交不触发循环。

Pages 使用 GitHub Actions 发布。公开仓库长期无人活动时，GitHub 可能停用定时工作流，可在 Actions 重新启用。

## 可选 DeepSeek

Settings → Secrets and variables → Actions 添加 `DEEPSEEK_API_KEY`。可用仓库变量 `DEEPSEEK_MODEL` 覆盖默认 `deepseek-chat`。

只有 `GITHUB_ACTIONS=true` 的后端扫描读取和使用 Key。本地运行不调用 DeepSeek。只将公开 README 和 description 发给服务，Key 不进入 HTML、JavaScript、JSON 或日志。服务失败保留已有指南。

## 本地检查

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python scripts/scan.py
python -m http.server 8000
```

浏览 http://localhost:8000，不直接使用 file:// 打开 HTML。

外部内容使用 textContent 渲染；入口链接仅允许 HTTPS。发布包只含 HTML、CSS、JS、图标与公开 JSON；不上传凭据或整个工作目录。数据 push 不强推，冲突时工作流失败而不覆盖。
