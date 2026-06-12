# Codex Stage 4 Prompt — 前台信息精简、话题合并与全量信源抓取排查

你现在继续在本地项目目录工作：

`C:\Users\14916\Desktop\2026_world_cup_radar`

当前项目已经可以展示中文页面、最新版赛程、海外话题线索、信源链详情和热点短语流，但用户预览后认为距离理想状态仍有明显差距。请不要重写整个项目，而是在当前项目基础上进行第四轮排查与修正。

本轮重点不是视觉大改，而是：

1. 前台去掉过多内部字段；
2. 话题线索要真正合并同类信源；
3. 信源链要完整、干净、面向用户；
4. 尽可能识别并接入完整候选源池中的真实有效信源；
5. 热点短语流要更克制、更准确；
6. 赛程状态逻辑要明确。

---

## 0. 重要输入文件

请重点检查：

- `data/sources/new_world_cup_hotspot_sources_completed_utf8.csv`
- `data/sources/world_cup_radar_mvp_source_whitelist_utf8.csv`
- `data/sources/world_cup_radar_mvp_sources_config.json`
- `data/seeds/world_cup_2026_latest_image_schedule_utf8.csv`
- `public/data/sources.json`
- `public/data/source_status.json`
- `public/data/raw_items.json`
- `public/data/normalized_items.json`
- `public/data/topic_cards.json`

用户完整候选源表为：

`C:\Users\14916\Desktop\2026_world_cup_radar\new_world_cup_hotspot_sources_completed_utf8.csv`

该源池约 `102` 条。请不要只依赖 18 个 MVP 白名单源。如果项目中该 CSV 不在 `data/sources/`，请复制过去并使用它。

当前源池类型概况供参考：

`trends: 48, media: 39, open_social: 5, official: 4, forum: 3, media_fixture: 2, media_reference: 1`

---

## 一、先排查，不要立即改代码

请先检查并在回复中说明：

1. 当前真正参与抓取的是哪个源配置文件？
   - 是 `world_cup_radar_mvp_sources_config.json`？
   - 还是完整 `new_world_cup_hotspot_sources_completed_utf8.csv`？
   - 是否仍然只用了少数白名单源？
2. 当前有多少 source 被 enabled？
3. 当前成功抓到 raw item 的源有多少？
4. 当前每个源最多抓几条？是否有硬编码限制，例如每源只取 3–5 条？
5. 当前 HTML 抓取是否只抓了首页少量链接？有没有分页、专题页、RSS URL、canonical URL 的处理？
6. 当前 topic clustering 是否把相同议题合并？为什么现在出现多个“赛事组织与场外事件”卡片？
7. 当前 evidence panel 是否限制只显示部分字段？哪些字段是用户可见，哪些字段是内部调试字段？
8. 当前比赛状态 `未开赛` 是如何判断的？是根据北京时间，还是根据实时比分/比赛 API？

完成排查后再修改。

---

## 二、首页头部精简

当前顶部不要显示：

- `2026 世界杯海外热点观察 MVP`
- `接入信源`
- `有效信源`

请改为：

主标题：

> 世界杯海外热点雷达

副标题：

> 聚合海外体育媒体、论坛讨论与趋势信号，按赛程、球队和球员整理世界杯相关话题，帮助你快速了解不同地区正在关注什么。

统计区只保留：

- `最近更新`
- `当前话题`

如果用户界面空间允许，可以保留一个轻量说明：

> 海外公开信源观察中

但不要显示“接入信源/有效信源”这种工程指标。它们只进入内部调试页或数据源报告。

---

## 三、赛程状态逻辑必须明确

用户问：重点赛程时间轴里的 `未开赛`，开赛时和开赛后是否会自动变成 `进行中`、`已结束`？触发标准是什么？

请实现并说明以下逻辑：

### 1. 当前无实时比分 API 时的状态判断

在没有实时比分 API 的情况下，比赛状态只能基于 `kickoff_beijing` / `kickoff_utc` 和当前时间估算：

- 当前时间 < 开球时间：`未开赛`
- 开球时间 <= 当前时间 < 开球时间 + 2小时15分钟：`进行中（按时间估算）`
- 当前时间 >= 开球时间 + 2小时15分钟：`已结束（按时间估算）`

注意：

- 淘汰赛可能有加时和点球，2小时15分钟只是展示估算。
- 不要伪装成官方实时赛况。
- 页面上可以在状态旁边或 tooltip 显示：
  > 状态按北京时间估算，非实时比分。

### 2. 未来可扩展实时赛况

在代码里预留字段：

- `status_source`: `time_estimated` / `live_api` / `manual`
- `live_status`: `scheduled` / `live` / `finished`
- `score_home`
- `score_away`

但当前页面只使用 `time_estimated`。

### 3. 状态中文显示

- `scheduled` → `未开赛`
- `live_time_estimated` → `进行中`
- `finished_time_estimated` → `已结束`
- `unknown` → `状态待确认`

---

## 四、话题线索卡片：去掉内部字段

用户要求：`话题线索` 卡片中不要展示以下条目：

- `相关比赛`
- `识别把握`

请调整卡片展示字段。

### 卡片保留字段

每张话题卡只展示：

- 话题标题
- 代表性原始标题/摘要一行
- 简短中文说明
- 标签短语
- 线索强度
- 来源数量
- 覆盖区域
- 最近更新时间

推荐展示格式：

```text
话题线索
美国队首发与阵容选择

USMNT notebook: Reyna, Freese fight for starting XI roles

共有 3 个海外来源提到该话题，主要围绕美国队首发、轮换或阵容选择。

标签：首发阵容
线索强度 77 · 3 个来源 · 全球/英语圈
最近更新：6月10日 11:46 北京时间
```

### 不要在卡片上展示

- 相关比赛列表
- 识别把握
- 线索构成
- 匹配实体
- 数据说明
- 内部 source id
- match id

这些放入内部 debug 或完全隐藏。

---

## 五、同类话题必须合并，不要拆成多个重复卡片

当前出现多个标题相同或类别相同的卡片，例如多个“赛事组织与场外事件”，说明聚类合并逻辑不够好。

请重构 `cluster-topics.ts`：

### 1. 聚类 key 不能只用 source item

应生成稳定 topic key：

```text
topic_key = normalized_issue_type + primary_entity_group + event_context
```

示例：

- `event_organization::stadium_labor::sofi`
- `usmnt_lineup::usa::starting_xi`
- `referee_entry_issue::world_cup::usa_entry`
- `stadium_ready::atlanta::mercedes_benz`

### 2. 合并规则

同类合并条件：

- issue_type 相同；
- 主实体相同或高度相近；
- 关键词 overlap 达到阈值；
- 标题相似度达到阈值；
- 来源时间窗口相近；
- 都属于同一大事件或同一场馆/球队/球员。

### 3. 不要把所有“赛事组织”都合成一个

“赛事组织与场外事件”只是大类，不能直接作为 topic title。必须进一步细分（下面只是示例，请不要直接复制粘贴到实际显示中，而是要根据原文内容来概括）：

- `SoFi Stadium 劳工罢工风险`
- `亚特兰大球场世界杯准备`
- `裁判入境受阻事件`
- `票务与观赛安排`
- `安保与交通组织`

每一个都必须细分，但不要堆出多个同名卡片。

### 4. 合并后 evidence 数量应增加

合并后的 topic card 应聚合所有相关来源：

- `evidence_count`
- `sources[]`
- `source_names[]`
- `regions[]`

---

## 六、信源链详情：去掉内部字段，只展示用户需要的信息

用户要求：“信源链详情”中的以下字段不对外展示：

- 识别依据
- 识别把握
- 相关比赛
- 相关球队/球员
- 线索构成

请修改 Evidence Panel。

### 信源链详情顶部只保留

- 话题标题
- 代表性原始标题
- 简短中文说明
- 线索强度
- 来源数量
- 覆盖区域
- 最近更新时间

### 每条信源只展示

- 原始标题
- 原始摘要/description，如果有
- 来源名称
- 来源类型，例如 `体育媒体`、`论坛讨论`、`趋势信号`
- 区域
- 发布时间
- `查看原文` 按钮

### 不要展示

- 匹配实体
- 数据说明
- 识别依据
- 识别把握
- source id
- match id
- 内部 slug
- 抓取错误码

如果需要保留，请放入开发调试页面 `/debug/sources` 或 `docs/debug-notes.md`，不要展示给普通用户。

---

## 七、全量信源识别与扩源：用完整源池，不要只用少量白名单

用户明确要求：让 `new_world_cup_hotspot_sources_completed_utf8.csv` 中所有真实有效的信源都尽可能被正确识别和抓取。现在信源太少，不能只抓 9 个有效源。

请执行：

### 1. 使用完整源池

从完整 CSV 读取全部 source，而不是只读 MVP whitelist。

但不要让所有源失败时阻断构建。每个源必须独立容错。

我必须要每一个平台里面的每一个有效资源都要被抓取到。

### 2. 增加 enabled 策略

给每个 source 生成运行状态：

- `enabled`: true / false
- `batch`: `core` / `expanded` / `trends_test` / `defer`
- `crawl_mode`: `rss` / `html_list` / `html_article_links` / `trend_test` / `fixture` / `manual_reference`
- `max_items_per_source`

默认策略：

- `feasibility_grade = A`：enabled true
- `feasibility_grade = B`：enabled true
- `feasibility_grade = C`：enabled true for test, but failure tolerated
- `feasibility_grade = D`：enabled false unless official/reference needed
- `mvp_status = include/test`：优先 enabled
- `source_type = trends`：enabled as `trends_test`，失败不影响构建

### 3. 提升抓取能力

对每类源采用不同抓取策略：

#### RSS

- 读取 RSS URL；
- 保留 title、link、contentSnippet、summary、isoDate；
- 每源至少尝试 20 条，先不要只抓 2–3 条。

#### HTML 专题页 / 新闻列表页

使用 `cheerio` 尝试多种 selector：

- `article a`
- `h1 a, h2 a, h3 a`
- `[class*=card] a`
- `[class*=story] a`
- `[class*=article] a`
- `[class*=headline] a`
- `a[href*=world-cup]`
- `a[href*=soccer]`
- `a[href*=football]`
- canonical/absolute URL 规范化

每源至少收集 20–40 个候选链接，再去重、过滤。

#### HTML article page

如果合法公开可访问，可以抓取：

- title
- meta description
- og:title
- og:description
- article text 前 800–1500 字符

不要绕过 paywall；如果正文无法公开获取，就只使用公开标题和摘要。

#### Google Trends Sports

- 作为 `trends_test`；
- 如果自动抓取不稳定，标记 `manual_export_supported`；
- 不使用付费 API；
- 不生成虚假趋势 topic。

#### 也要注意每一个信源中网站的各模块的识别，以及加入翻页抓取策略（可以先构建常用的翻页抓取策略，再按照不同页面去分别尝试）

### 4. 输出扩源报告

每次 `build:data` 后生成：

- `public/data/source_status.json`
- `public/data/source_coverage_report.json`
- `docs/source-coverage-report.md`

报告包括：

- 总源数
- enabled 源数
- 成功源数
- 失败源数
- 每源抓取条数
- 每源失败原因
- 每源 crawl_mode
- 是否被纳入前台

这个报告不要默认展示在首页。

---

## 八、热点短语流要更克制

当前热点短语流虽然改成中文，但可能仍然泛滥或不完整。

请修改规则：

### 只展示满足以下条件的短语

- 至少来自 2 条 evidence；或
- 来自 1 条高优先级 source 且 confidence >= medium；或
- 与明确 issue_type 相关。

### 不展示

- 单独国家名
- 单独球队名
- 单独球员名
- 大类词：`赛事组织`、`赛前看点`
- 过泛词：`伤病情况` 如果无具体球队/球员或上下文
- 重复近义短语

### 推荐显示格式

短语可以更具体：

- `美国队首发竞争`
- `SoFi 球场罢工风险`
- `亚特兰大球场准备`
- `裁判入境受阻`
- `巴西伤病情况`
- `阿根廷首发选择`

如果没有足够高质量短语，显示：

> 暂无足够稳定的海外热点短语，等待更多信源汇聚。

---

## 九、底部文案进一步压缩

当前底部只保留一句对外表达：

> 本站整理海外公开体育媒体、论坛讨论与趋势信号，帮助球迷从不同地区视角观察世界杯话题。赛程时间以北京时间显示，正式赛程请以 FIFA 官方发布为准。

不要在首页底部展示：

- 不使用付费 API
- 不绕过付费墙
- 人工转录稿
- 内部数据说明

这些放入折叠的“数据来源说明”或 README。

---

## 十、最终验收标准

完成后运行：

```bash
npm run build:data
npm run build
```

最后请给我网页预览

然后回复用户：

1. 当前使用的是完整源池还是 MVP 白名单？
2. 完整源池中总源数、enabled 源数、成功抓取源数分别是多少？
3. 每源最多抓取多少条？是否取消了过低限制？
4. 话题合并逻辑如何改进？是否解决多个同名“赛事组织与场外事件”卡片？
5. 前台是否移除了：
   - 相关比赛
   - 识别把握
   - 匹配实体
   - 数据说明
   - 线索构成
6. 信源链是否可以展开全部？
7. 比赛状态是按时间估算还是实时赛况？是否有明确说明？
8. 热点短语流是否过滤泛词和大类词？
9. Google Trends Sports 是什么状态？
10. 是否仍然保证抓取失败不阻断构建？