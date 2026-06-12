# World Cup Hotspot Radar 页面设计提示词结构

## 目标

设计一个轻量、直观、移动端友好的世界杯热点雷达页面。它不是普通热榜，不按平台简单罗列信息，而是以比赛、球队、球员和区域舆论为中心，将多源信息整理为可阅读的 topic card。

## 页面主结构

```text
Header
  - 项目名：World Cup Hotspot Radar / 世界杯热点雷达
  - 更新时间
  - 数据源状态小徽章

Top Match Timeline
  - 日期切换：Today / Tomorrow / Matchday / All
  - 比赛卡片：球队、时间、阶段、热度摘要
  - 重点比赛标记

Filter Bar
  - Region: Global / US / UK / Brazil / Argentina / Spain
  - Platform: Official / Media / Forum / Trends
  - Match: All / selected match
  - Time window: Last 1h / 6h / 24h / Match window

Main Hotspot Matrix
  - 主体为 topic cards
  - 每张卡片展示：topic title、heat score、related match、teams、source count、regions、keywords、last updated
  - 支持按 heat_score 排序

Evidence Panel
  - 点击 topic card 后显示信源证据链
  - 每条证据包含 source_name、title、url、published_at、language、region
  - paywall source 只展示公开标题和摘要，不抓全文

Keyword Tag Flow
  - 辅助区域
  - 展示当前筛选条件下的高频实体词、事件词
  - 不把 Argentina、football、match 等泛词作为核心热点

Footer
  - 数据声明：public sources only; no paid APIs; no paywall bypass
  - GitHub / source status
```

## 视觉原则

- 主视觉：深色或浅色均可，但应有赛事科技感。
- 布局：PC 端双栏，移动端单栏。
- 信息密度：高但不拥挤。
- 卡片：圆角、轻阴影、清晰分组。
- 热度：使用数字、进度条或小型 badge，但不要做复杂图表。
- 信源：必须清楚可点击，避免“AI 总结无来源”的感觉。

## 组件清单

```text
AppHeader
MatchTimeline
FilterBar
TopicCardGrid
TopicCard
EvidenceDrawer 或 EvidencePanel
KeywordTagFlow
SourceStatusBar
LastUpdatedBadge
EmptyState
ErrorState
```

## 重点交互

1. 点击比赛卡片 → 热点矩阵只显示该比赛相关 topic。
2. 点击 region → topic cards 和关键词流同步变化。
3. 点击 topic card → 打开证据链。
4. 点击平台筛选 → 查看某平台或某类来源贡献的热点。
5. 数据源失败 → 页面仍显示旧缓存，并在状态条提示。
