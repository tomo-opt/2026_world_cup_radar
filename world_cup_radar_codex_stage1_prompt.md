# Codex Stage 1 Prompt — World Cup Hotspot Radar MVP

你现在在本地项目目录工作：

`C:\Users\14916\Desktop\2026_world_cup_radar`

项目目标：开发一个免费、轻量、可部署到 Cloudflare Pages 的 2026 世界杯热点雷达 MVP。它不是普通热榜，而是以比赛、球队、球员、区域和平台为中心，把公开外国来源中的世界杯热点整理为 topic cards，并提供信源证据链。

## 重要约束

1. 不使用任何付费 API。
2. 不绕过 paywall。对 Guardian、The Athletic 类可能付费的内容，只抓公开标题、摘要、URL、发布时间等元数据。
3. 不做中文平台抓取，不接微博、抖音、小红书等。
4. 第一阶段只做静态前端 + 本地/定时脚本生成 JSON。
5. 数据输出到 `public/data/*.json`，前端只读取 JSON，不依赖后端数据库。
6. 目标部署：Cloudflare Pages。后续通过 GitHub Actions 定时运行抓取脚本。
7. 如果某个源抓取失败，不要让整个构建失败；保留 previous cache，并在 `source_status.json` 里记录失败。

## 已有输入文件

请使用以下文件作为输入：

1. `new_world_cup_hotspot_sources_completed_utf8.csv`  
   完整候选源池，约 102 条。

2. `world_cup_radar_mvp_source_whitelist_utf8.csv`  
   第一版 MVP 白名单，18 条源。优先使用这个文件。

3. `world_cup_radar_mvp_sources_config.json`  
   白名单 JSON 配置。可以直接被 Node 脚本读取。

4. `world_cup_radar_mvp_data_structure_plan.md`  
   数据结构与 MVP 方案说明。

5. `world_cup_radar_page_design_brief.md`  
   页面设计说明。

## 推荐技术栈

使用：

- Vite
- React
- TypeScript
- Tailwind CSS
- Node.js scripts
- `rss-parser` 用于 RSS
- `cheerio` 用于简单 HTML 列表解析
- `papaparse` 或 Node CSV parser 用于 CSV
- 不使用数据库

如果项目已经初始化，请在现有项目基础上修改；如果没有初始化，请创建 Vite React TypeScript 项目。

## 目录建议

请创建或整理为：

```text
2026_world_cup_radar/
  data/
    sources/
      new_world_cup_hotspot_sources_completed_utf8.csv
      world_cup_radar_mvp_source_whitelist_utf8.csv
      world_cup_radar_mvp_sources_config.json
    seeds/
      matches_seed.json
      entities_seed.json
      topic_rules.json
  scripts/
    build-sources.ts
    fetch-rss.ts
    fetch-html-list.ts
    normalize-items.ts
    match-entities.ts
    cluster-topics.ts
    build-data.ts
  public/
    data/
      sources.json
      matches.json
      entities.json
      raw_items.json
      normalized_items.json
      topic_cards.json
      source_status.json
  src/
    components/
      AppHeader.tsx
      MatchTimeline.tsx
      FilterBar.tsx
      TopicCardGrid.tsx
      TopicCard.tsx
      EvidencePanel.tsx
      KeywordTagFlow.tsx
      SourceStatusBar.tsx
    lib/
      types.ts
      data.ts
      filters.ts
      scoring.ts
    App.tsx
    main.tsx
```

## Stage 1 任务

请完成以下任务。

### 1. 初始化前端页面

实现页面结构：

```text
顶部比赛时间轴 + 中部热点 topic card 矩阵 + 右侧/下方信源证据链 + 关键词标签流
```

注意：主体是 topic card，不是关键词榜。

页面需要支持：

- 按 region 筛选
- 按 source_type/platform 筛选
- 按 match 筛选
- 按 time window 筛选
- 点击 topic card 展示 evidence panel

### 2. 定义 TypeScript 类型

在 `src/lib/types.ts` 中定义：

```ts
SourceConfig
Match
TeamEntity
RawItem
NormalizedItem
TopicCard
SourceStatus
```

字段请参考 `world_cup_radar_mvp_data_structure_plan.md`。

### 3. 生成基础 JSON

创建脚本 `scripts/build-sources.ts`：

- 读取 `data/sources/world_cup_radar_mvp_sources_config.json`
- 输出 `public/data/sources.json`

创建 seed 文件：

- `data/seeds/matches_seed.json`
- `data/seeds/entities_seed.json`
- `data/seeds/topic_rules.json`

第一阶段可以先放少量示例数据，但结构必须完整。

### 4. 实现抓取脚本骨架

创建：

- `scripts/fetch-rss.ts`
- `scripts/fetch-html-list.ts`
- `scripts/build-data.ts`

第一阶段要求：

- RSS 源优先跑通。
- HTML 源可以先实现通用标题列表解析，不必保证所有源都成功。
- Google Trends 源先列入 `source_status.json`，可以标记为 `test_pending`，不要阻断构建。
- 官方赛程源先使用 seed，再保留解析接口。

### 5. 实现标准化和聚类骨架

创建：

- `scripts/normalize-items.ts`
- `scripts/match-entities.ts`
- `scripts/cluster-topics.ts`

第一阶段规则：

- 国家/球队名不能单独构成热点。
- 必须结合来源类型、体育语境词、比赛/球队/球员实体。
- 泛词如 football、soccer、match、team、World Cup 不应作为 topic title。
- topic title 应尽量基于标题短语或规则生成，例如：
  - Messi fitness concern
  - England lineup debate
  - Brazil injury update
  - VAR controversy
  - Opening match buildup

### 6. 热度分

在 `src/lib/scoring.ts` 和脚本中实现简单公式：

```text
heat_score =
  40% source_weight
+ 25% source_count_score
+ 20% recency_score
+ 10% entity_match_score
+  5% trend_bonus
```

第一阶段可以写成函数并使用 mock/seed 数据验证。

### 7. Package scripts

在 `package.json` 中增加：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:data": "tsx scripts/build-data.ts",
    "build:sources": "tsx scripts/build-sources.ts",
    "fetch:rss": "tsx scripts/fetch-rss.ts",
    "fetch:html": "tsx scripts/fetch-html-list.ts"
  }
}
```

如需安装依赖，请使用免费开源包：

```bash
npm install rss-parser cheerio papaparse date-fns clsx
npm install -D typescript tsx @types/node
```

### 8. GitHub Actions 草案

创建 `.github/workflows/update-data.yml`，先作为草案：

- 每 30 分钟运行一次。
- 重点比赛 10 分钟更新后续再加。
- 执行 `npm run build:data`。
- 如 public/data 有变化，则 commit 回仓库。

如果 workflow 太复杂，先写 README 说明，不必一次性完全实现。

## 验收标准

完成后请确保：

1. `npm run dev` 可以启动页面。
2. `npm run build` 可以通过。
3. `npm run build:data` 可以生成：
   - `public/data/sources.json`
   - `public/data/matches.json`
   - `public/data/entities.json`
   - `public/data/raw_items.json`
   - `public/data/normalized_items.json`
   - `public/data/topic_cards.json`
   - `public/data/source_status.json`
4. 页面即使没有真实抓取数据，也能使用 seed/mock 数据展示完整布局。
5. 抓取失败不会导致构建失败。
6. 页面中每个 topic card 都有 evidence/source links。
7. 不使用付费 API，不绕过 paywall。
8. 所有的文档都可以正常访问，不乱码

## 开发顺序

请按以下顺序执行：

1. 检查当前目录是否已有项目。
2. 初始化或修复 Vite React TypeScript 项目。
3. 复制/整理数据源文件到 `data/sources/`。
4. 创建类型定义。
5. 创建 data build 脚本和 seed JSON。
6. 创建页面组件和静态展示。
7. 接入 sources/status/topic_cards JSON。
8. 实现 RSS 抓取骨架。
9. 实现 HTML 抓取骨架。
10. 实现 normalize/entity match/topic cluster 骨架。
11. 运行 build，修复错误。
12. 输出最终变更摘要。

请优先保证项目能跑通，而不是追求一次性抓取所有网站。
