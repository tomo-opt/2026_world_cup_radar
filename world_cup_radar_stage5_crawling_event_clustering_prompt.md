# Codex Stage 5 Prompt — 抓取成功率提升与事件级话题归并重构

你现在继续在本地项目目录工作：

`C:\Users\14916\Desktop\2026_world_cup_radar`

当前项目已经完成：

- 使用完整源池 `new_world_cup_hotspot_sources_completed_utf8.csv`
- 102 个源 enabled
- 成功抓取源 23 个
- 前台话题数 47
- 默认首页不再展示 Source Status
- 话题合并 key 已改为 `issue_type::primary_entity_group::event_context`
- 信源链可以展开

但用户反馈：当前版本仍然不够好。核心问题是：

1. 102 个源中只有 23 个成功抓取，成功率太低。需要尽可能提升到 60% 以上，即至少约 61 个源能抓到有效条目，或者给出每个失败源的不可抓取原因和替代方案。
2. 话题线索标题仍然太泛，例如“墨西哥队赛前看点”。标题必须变成能代表新闻事件的完整短句。
3. 同一热点事件仍然被拆成多个话题卡，没有合并；但同一场比赛中的不同事件又要能拆开。
4. 不能只靠粗糙规则和几个示例。需要建立更精细的“事件级归纳 + 跨源合并”策略。

本轮不要重写整个网站视觉。重点是：

- 抓取覆盖率提升；
- 原文信息抽取能力提升；
- 事件级 topic title 生成；
- 同事件合并、不同事件拆分；
- 输出抓取诊断报告和不可抓取源清单。

---

## 一、先排查，不要立即改代码

请先检查这些文件并总结当前问题：

- `data/sources/new_world_cup_hotspot_sources_completed_utf8.csv`
- `scripts/utils.ts`
- `scripts/fetch-rss.ts`
- `scripts/fetch-html-list.ts`
- `scripts/normalize-items.ts`
- `scripts/match-entities.ts`
- `scripts/cluster-topics.ts`
- `scripts/build-data.ts`
- `public/data/source_coverage_report.json`
- `public/data/raw_items.json`
- `public/data/normalized_items.json`
- `public/data/topic_cards.json`

请先回答：

1. 当前 102 个源中，成功的 23 个分别是什么？失败的 79 个分别是什么？
2. 失败原因如何分类？
   - timeout
   - DNS / TLS / 连接失败
   - 403 / 401 / 429
   - HTML 结构解析不到标题
   - 动态渲染
   - RSS URL 无效
   - 无 World Cup 内容
   - robots / paywall / 登录限制
   - 其他
3. 当前每个 HTML 源用了哪些 selector？
4. 当前有没有从 homepage_url 自动发现 RSS / JSON-LD / sitemap / AMP / canonical？
5. 当前有没有尝试解析 `script[type="application/ld+json"]` 中的 `NewsArticle` / `ItemList` / `BreadcrumbList`？
6. 当前有没有尝试 sitemap：
   - `/sitemap.xml`
   - `/news-sitemap.xml`
   - `/sitemap_index.xml`
   - WordPress REST API `/wp-json/wp/v2/posts`
7. 当前 topic title 是如何生成的？为什么仍然出现“XX赛前看点”这种泛标题？
8. 当前 topic 合并为什么仍然会把同事件拆成多个卡片？是不是因为 key 里含 source-specific 信息，或者没有做标题相似度/事件指纹？

排查后再修改。

---

## 二、抓取成功率目标：至少 60% 源成功，或给出明确不可抓原因

用户要求：完整源池中所有真实有效信源都尽可能正确识别。当前 23/102 太少，不能接受。

### 1. 成功率目标

请将目标写入代码和报告：

- 总源数：102
- 目标成功源数：至少 61
- 当前成功源数：构建后自动统计
- 成功率：`success_sources / enabled_sources`

如果无法达到 60%，必须在回复中说明：

- 哪些源因为技术限制不可抓；
- 哪些源需要人工 RSS / selector 配置；
- 哪些源实际没有新闻列表；
- 哪些源需要后续 Playwright 或第三方服务，但本项目暂不使用付费 API。

### 2. 成功定义

一个源成功抓取，至少应满足：

- 获取到 >= 1 条有效 item；
- item 有 title；
- item 有 URL；
- title 不是导航项、广告、空标题或明显无关内容；
- item 可以进入 raw_items 或 coverage report 中的 `valid_items_count`。

如果一个源只返回首页导航链接，不算成功。

---

## 三、为每个源执行多阶段抓取策略

不要只用一种 RSS 或一种 HTML selector。请为每个源建立 fallback chain。

### Strategy 0：源字段清洗

对每个 source：

- 使用 `homepage_url`
- 使用 `rss_url`
- 如果有 World Cup topic page，优先用 topic page；
- 如果 URL 为空或明显不合法，标记为 `invalid_url`；
- 统一绝对 URL；
- 去掉追踪参数；
- 标准化 host。

### Strategy 1：RSS 直接抓取

如果 `rss_url` 非空：

- 先抓 RSS；
- 每源至少尝试 30 条；
- 保留 title、link、contentSnippet、summary、isoDate、creator、categories；
- 如果 RSS 报错，不要立刻失败，进入 Strategy 2。

### Strategy 2：自动发现 RSS / Feed

从 homepage_url 或 topic page HTML 中发现：

- `<link rel="alternate" type="application/rss+xml">`
- `<link rel="alternate" type="application/atom+xml">`
- `/feed`
- `/rss`
- `/rss.xml`
- `/feed.xml`
- `/football/rss`
- `/soccer/rss`
- `/world-cup/rss`
- WordPress `/feed/`

发现后尝试抓取，并把发现结果写入：

- `source_status.discovered_feeds`
- `source_coverage_report.discovered_feeds`

### Strategy 3：HTML 新闻列表抓取

对 homepage_url / topic page 尝试多 selector：

```text
article a
h1 a, h2 a, h3 a
[class*=headline] a
[class*=title] a
[class*=story] a
[class*=article] a
[class*=card] a
[class*=teaser] a
[class*=media] a
a[href*="world-cup"]
a[href*="worldcup"]
a[href*="fifa"]
a[href*="soccer"]
a[href*="football"]
a[href*="/sport/"]
a[href*="/sports/"]
a[href*="/news/"]
```

对抓到的链接进行过滤：

- title 长度 20–160 字符优先；
- URL 必须在同域或可信子域；
- 排除 video-only、tag page、author page、login、subscribe、privacy、terms、ads；
- 排除纯导航项；
- 去重；
- 每源保留最多 40 条候选，最多 25 条有效 item。

### Strategy 4：JSON-LD 结构化数据

解析页面中的：

```html
<script type="application/ld+json">
```

支持：

- `NewsArticle`
- `Article`
- `SportsEvent`
- `ItemList`
- `CollectionPage`
- `WebPage`

提取：

- headline
- description
- url
- datePublished
- dateModified
- author
- itemListElement

这个对 WordPress、新闻站、专题页很重要。

### Strategy 5：Open Graph / Meta

对专题页和文章页解析：

- `og:title`
- `og:description`
- `twitter:title`
- `twitter:description`
- `meta[name=description]`
- canonical URL

如果列表页抓不到 article link，也至少把页面本身作为一个 reference item，但必须标记为：

- `item_type = page_reference`
- 不进入主要 topic clustering，除非 title/description 明确是新闻。

### Strategy 6：Sitemap / News Sitemap

尝试抓取：

- `/sitemap.xml`
- `/sitemap_index.xml`
- `/news-sitemap.xml`
- `/post-sitemap.xml`

从 sitemap URL 中筛选包含：

- world-cup
- worldcup
- fifa
- soccer
- football
- sport
- sports
- cup

每源最多保留 30 条 sitemap 候选。

### Strategy 7：WordPress REST API

如果判断为 WordPress 站点，尝试：

```text
/wp-json/wp/v2/posts?per_page=20&search=world%20cup
/wp-json/wp/v2/posts?per_page=20&search=football
/wp-json/wp/v2/posts?per_page=20&search=soccer
```

提取：

- title.rendered
- excerpt.rendered
- link
- date
- modified

### Strategy 8：多 User-Agent 和超时重试

实现温和重试，不要攻击式抓取：

- User-Agent 设置为常见浏览器 UA；
- timeout 15–20 秒；
- 每源最多 2 次重试；
- 429/403 不要硬闯；
- 不使用付费代理；
- 不绕过 paywall；
- 不使用登录 cookie；
- 失败写入报告。

### Strategy 9：Google Trends Sports 实验

Google Trends 如果自动抓取不稳定：

- 标记 `test_pending` 或 `manual_export_supported`；
- 不计入失败源；
- 不生成虚假 topic；
- 但在 coverage report 中保留。

---

## 四、输出抓取覆盖率报告

请增强 `source_coverage_report.json` 和 `docs/source-coverage-report.md`。

每个源必须包含：

```ts
{
  source_id,
  source_name,
  source_type,
  homepage_url,
  rss_url,
  enabled,
  crawl_mode,
  attempted_strategies: [],
  successful_strategy,
  fetched_count,
  valid_items_count,
  discarded_count,
  discovered_feeds: [],
  discovered_sitemaps: [],
  status,
  failure_category,
  failure_reason,
  next_action
}
```

报告中必须有总览：

```text
总源数
enabled 源数
成功源数
成功率
目标成功率 60%
未达标原因
按失败类型统计
按 source_type 统计
按 crawl_mode 统计
下一步需人工配置的源
```

---

## 五、话题线索标题必须是完整新闻短句，而不是泛分类名

当前标题如“墨西哥队赛前看点”不可接受。标题必须是能代表新闻事件的一句话。

### 1. 标题生成原则

每个 topic title 应该尽量包含：

- 主体：球队/球员/教练/裁判/球场/赛事组织方
- 动作或状态：受伤、缺席、竞争首发、质疑、准备、罢工、入境受阻、预测、晋级、调整
- 事件对象或背景：某场比赛、世界杯、某球场、某组出线形势
- 必要时保留英文简称，如 USMNT

标题必须是完整短句，例如：

不合格：

- `墨西哥队赛前看点`
- `赛事组织与场外事件`
- `美国队阵容`
- `巴西伤病`

合格：

- `图赫尔称英格兰并非本届世界杯夺冠热门`
- `美国队两名球员竞争首发位置`
- `SoFi 球场员工决定不在世界杯期间罢工`
- `亚特兰大奔驰球场完成世界杯准备工作`
- `裁判因入境问题将缺席世界杯`
- `巴西队赛前伤病影响首发安排`
- `墨西哥队揭幕战前关注主场压力与进攻选择`

### 2. 不能只用 issue_type 当标题

`issue_type` 只能是内部分类，不能直接作为标题。

例如：

- issue_type = `赛事组织与场外事件`
- title 应该是：`SoFi 球场员工决定不在世界杯期间罢工`

### 3. 根据新闻五要素生成标题

请写一个 deterministic title builder：

输入：

- lead_source_title
- lead_source_summary
- extracted_entities
- issue_type
- event_action
- event_object
- match_context

输出：

- `topic_title_zh`

尽量回答：

- 谁/什么主体？
- 发生了什么？
- 与世界杯/比赛有什么关系？

如果无法生成具体标题，不进入主话题列表，放入 `low_confidence_items.json`。

---

## 六、提升内容理解：从标题、摘要、公开正文片段中提取事件要素

请在 `normalize-items.ts` 或新文件中增加事件抽取层：

```ts
EventFrame {
  subject: string
  action: string
  object: string
  context: string
  issue_type: string
  teams: string[]
  players: string[]
  venues: string[]
  match_ids: string[]
  event_fingerprint: string
  confidence: "high" | "medium" | "low"
}
```

### 1. 信息来源优先级

- 公开正文片段 > RSS summary/description > title
- 但不要为了抓正文绕过 paywall。
- 如果只有 title，就 confidence 不能高于 medium，除非标题很明确。

### 2. 事件动词和语义模式

建立 pattern：

- `said X are not favourites` → `某教练/人物称某队并非夺冠热门`
- `fight for starting XI roles` → `某队球员竞争首发位置`
- `will not go on strike` → `某球场员工不会罢工`
- `became World-Cup-ready` → `某球场完成世界杯准备`
- `barred from entering` → `某人/裁判因入境问题缺席世界杯`
- `injury concern / fitness concern` → `某球员/球队存在伤病隐忧`
- `projected starting lineup` → `某队首发阵容预测`
- `odds / predictions / best bets` → `某队赔率与赛前预测`
- `squad announced / roster` → `某队公布/调整大名单`
- `ticket / travel / security` → `观赛安排/票务/交通/安保`

### 3. 对外摘要

`summary_zh` 要简洁，不要模板化：

不合格：

> 根据公开标题与摘要识别。线索主要围绕墨西哥队赛前看点相关的赛前讨论与背景看点。

合格：

> 图赫尔在赛前讨论中淡化英格兰夺冠预期，该话题主要来自海外媒体对英格兰前景的分析。

---

## 七、同一热点事件必须合并，不同事件必须拆分

当前问题：不同源讲同一个事件时被拆成多个卡片；同一个大类下不同事件又可能被混在一起。

请重构合并逻辑。

### 1. 事件指纹 event_fingerprint

为每条 normalized item 生成：

```text
event_fingerprint = normalized_subject + normalized_action + normalized_object + normalized_context
```

示例：

- `usmnt::starting_xi_competition::reyna_freese`
- `sofi_stadium::strike_cancelled::world_cup`
- `mercedes_benz_stadium::world_cup_ready::atlanta`
- `england::not_favourites::tuchel`
- `referee::entry_barred::usa_world_cup`

### 2. 合并同一事件

如果以下条件满足，则合并为一个 topic card：

- event_fingerprint 相同；或
- subject 相同 + action 相同 + object/context 相似；或
- 标题 token similarity > 0.72；或
- issue_type 相同 + primary entities 相同 + event action 相同。

合并后：

- 选择最具体、最完整的 `topic_title_zh`；
- evidence 全部放入同一卡片；
- source_count 增加；
- regions 合并；
- recency 使用最新 item；
- representative title 使用最清晰的一条。

### 3. 拆分不同事件

即使 match/team 相同，如果 action 不同，必须拆分：

例如同一场 A vs B：

- `裁判给 A 的点球判罚引争议`
- `B 队前锋完成帽子戏法`
- `A 队主教练赛后批评 VAR`
- `B 队门将伤退`

这四个必须是四张不同 topic card。

### 4. 大类不能作为合并依据

不要因为都属于：

- 赛前看点
- 赛事组织
- 阵容选择
- 伤病情况

就合并。大类只是过滤和排序维度，不是事件本身。

---

## 八、前台呈现规则

### 1. 话题线索卡

展示：

- `topic_title_zh`
- lead original title
- `summary_zh`
- tag
- 线索强度
- 来源数量
- 覆盖区域
- 最近更新

不展示：

- match_id
- 识别依据
- 识别把握
- 相关比赛
- 匹配实体
- 数据说明
- 线索构成

### 2. 如果标题低质量

如果生成标题仍然是以下形式，不允许进入前台主列表：

- `X赛前看点`
- `赛事组织与场外事件`
- `X伤病情况`
- `X阵容选择`
- `X世界杯新闻`
- `X update`

这些放入：

- `public/data/low_confidence_items.json`
- 或后台报告。

---

## 九、最终验收标准

完成后运行：

```bash
npm run build:data
npm run build
```

回复用户时必须说明：

1. 成功抓取源从 23 提升到多少？成功率多少？
2. 是否达到 60% 目标？如果没有，按失败类型说明原因。
3. 新增了哪些抓取策略？
4. 每类策略成功贡献多少源？
5. 是否生成了 `source_coverage_report.json` 和 `docs/source-coverage-report.md`？
6. 是否移除了泛标题，例如 `X赛前看点`、`赛事组织与场外事件`？
7. 是否实现事件级 `event_fingerprint`？
8. 同一事件多源是否合并为一张卡？
9. 同一比赛不同事件是否拆成不同卡？
10. 是否仍然保证抓取失败不阻断构建？

必须保证：

- 不使用付费 API；
- 不绕过 paywall；
- 不使用登录 Cookie；
- 不让 403/429 进入攻击式重试；
- 抓取失败源进入报告，不阻断构建；
- 前台标题必须是完整新闻短句；
- 泛分类名不能作为 topic title。
