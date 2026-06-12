# World Cup Hotspot Radar 数据结构与 MVP 白名单方案

版本：2026-06-07  
输入源表：`new_world_cup_hotspot_sources_completed_utf8.csv`  
本方案对应输出：`world_cup_radar_mvp_source_whitelist_utf8.csv`

## 1. 当前阶段结论

目前不建议继续扩充数据源。候选源已经达到 102 条，下一步应转入“白名单 MVP 开发”。

第一版 MVP 只接入 18 个源：

- 官方/赛程源：3 个
- RSS/论坛源：4 个
- 国际媒体源：6 个
- Google Trends 测试源：5 个

这样可以兼顾赛事结构、新闻可信度、球迷讨论、区域趋势，同时避免 Codex 一次性处理过多动态页面。

## 2. MVP 第一版白名单

| 类别 | source_id | source_name | 角色 | 处理方式 |
|---|---|---|---|---|
| official | `official_fifa_scores_fixtures` | FIFA World Cup 2026 Scores & Fixtures | official_fixture_primary | fixture_parse |
| media_fixture | `sky_worldcup_scores_fixtures` | Sky Sports FIFA World Cup Scores & Fixtures | official_fixture_backup | fixture_parse |
| official | `official_fifa_schedule_article` | FIFA World Cup 2026 Official Match Schedule Article | official_fixture_reference | manual_reference |
| media | `media_bbc_sport_football` | BBC Sport Football | rss_media_core | rss |
| media | `media_guardian_football` | The Guardian Football | rss_media_core | rss |
| forum | `forum_reddit_soccer` | Reddit r/soccer | forum_discussion_core | rss |
| forum | `forum_reddit_worldcup` | Reddit r/worldcup | forum_discussion_core | rss |
| media | `media_espn_soccer_worldcup` | ESPN Soccer Worldcup Page | media_topic_core | html_list_test |
| media | `media_reuters_soccer` | Reuters Soccer | wire_media_core | html_list_test |
| media | `media_sky_sports_football_news` | Sky Sports Football News Page | media_news_core | html_list_test |
| media | `media_espn_deportes_futbol_mundial` | ESPN Deportes Fútbol Mundial | spanish_media_core | html_list_test |
| media | `media_goal_world_cup` | Goal World Cup News Page | media_topic_core | html_list_test |
| media | `media_ap_news_soccer` | AP News Soccer | wire_media_core | html_list_test |
| trends | `google_trends_sports_us` | Google Trends Sports - United States | trend_test_core | trend_page_test |
| trends | `google_trends_sports_gb` | Google Trends Sports - United Kingdom | trend_test_core | trend_page_test |
| trends | `google_trends_sports_br` | Google Trends Sports - Brazil | trend_test_core | trend_page_test |
| trends | `google_trends_sports_ar` | Google Trends Sports - Argentina | trend_test_core | trend_page_test |
| trends | `google_trends_sports_es` | Google Trends Sports - Spain | trend_test_core | trend_page_test |

## 3. 为什么这样筛选

### 3.1 官方/赛程源

第一版需要稳定的比赛索引。热点不是按平台排列，而是要挂到比赛、球队、日期、球员和赛事阶段上，所以赛程源优先级高于普通新闻源。

- `official_fifa_scores_fixtures`：官方比分和赛程入口，作为主测试源。
- `sky_worldcup_scores_fixtures`：页面更可能直接呈现赛程，作为 fallback。
- `official_fifa_schedule_article`：权威参考页，只做人工校验或静态比对，不作为主要抓取入口。

### 3.2 RSS/论坛源

第一版必须至少有若干“低技术风险”的源。BBC、Guardian、Reddit 类源适合先跑通抓取、去重、标准化、topic card 生成。

- BBC Football：稳定足球内容源。
- Guardian Football：标题质量较高，适合话题聚类。
- Reddit r/soccer：球迷讨论主源。
- Reddit r/worldcup：世界杯垂直讨论源，但需要先核查当前 RSS URL 是否确实指向 r/worldcup。

### 3.3 国际媒体源

国际媒体源优先选择大牌、体育专门、世界杯专题或新闻列表明确的来源。

- ESPN World Cup：美国和全球体育视角。
- Reuters Soccer：通讯社式高可信新闻信号。
- Sky Sports Football News：英式体育新闻和赛前赛后话题。
- ESPN Deportes Mundial：西语世界杯内容。
- Goal World Cup：足球垂直媒体，球员和球队话题丰富。
- AP News Soccer：补充 Reuters，避免单一通讯社偏差。

### 3.4 Google Trends 测试源

Google Trends 暂时不要作为核心依赖，而是作为趋势实验层。第一版只选 5 个：

- United States：东道主和大媒体市场。
- United Kingdom：英语足球舆论强市场。
- Brazil：足球强国，葡语测试。
- Argentina：足球强国，西语/拉美测试。
- Spain：欧洲强队和西语市场。

## 4. 数据管线设计

推荐的第一版管线：

```text
sources CSV / JSON config
        ↓
fetch scripts
        ↓
raw_items.json
        ↓
normalized_items.json
        ↓
entity matching
        ↓
topic clustering
        ↓
topic_cards.json
        ↓
static frontend reads public/data/*.json
```

## 5. 建议生成的 JSON 文件

### 5.1 `public/data/sources.json`

由白名单 CSV 生成。用于前端展示数据源状态，也用于抓取脚本选择来源。

关键字段：

```json
{
  "source_id": "media_bbc_sport_football",
  "source_name": "BBC Sport Football",
  "source_type": "media",
  "region": "UK",
  "country": "United Kingdom",
  "language": "en",
  "homepage_url": "...",
  "rss_url": "...",
  "crawl_strategy": "rss",
  "mvp_role": "rss_media_core",
  "mvp_fetch_phase": "primary"
}
```

### 5.2 `public/data/matches.json`

存放赛程基础数据。第一版可以手动 seed，再逐步从 FIFA/Sky 解析更新。

```json
{
  "match_id": "group_a_m01",
  "date_utc": "2026-06-11T00:00:00Z",
  "stage": "Group Stage",
  "group": "A",
  "home_team": "Mexico",
  "away_team": "South Africa",
  "venue": "Estadio Azteca",
  "status": "scheduled"
}
```

### 5.3 `public/data/entities.json`

存放球队、球员、别名、语言变体。第一版先做球队实体，球员实体后续逐步补。

```json
{
  "teams": [
    {
      "team_id": "argentina",
      "name": "Argentina",
      "country_code": "AR",
      "aliases": ["Argentina", "ARG", "Albiceleste"],
      "languages": ["en", "es"]
    }
  ]
}
```

### 5.4 `public/data/raw_items.json`

抓取后的原始条目，尽量保留源数据，不做过度加工。

```json
{
  "raw_id": "media_bbc_sport_football_20260607_001",
  "source_id": "media_bbc_sport_football",
  "title": "Example headline",
  "url": "https://...",
  "summary": "Optional summary",
  "published_at": "2026-06-07T10:00:00Z",
  "fetched_at": "2026-06-07T10:30:00Z"
}
```

### 5.5 `public/data/normalized_items.json`

标准化后的内容，用于实体识别和聚类。

```json
{
  "item_id": "norm_001",
  "source_id": "media_bbc_sport_football",
  "title": "Example headline",
  "normalized_title": "example headline",
  "language": "en",
  "region": "UK",
  "country": "United Kingdom",
  "matched_teams": ["Argentina"],
  "matched_players": ["Messi"],
  "matched_matches": ["group_x_mxx"],
  "topic_terms": ["injury", "training", "lineup"],
  "sports_context_score": 0.88
}
```

### 5.6 `public/data/topic_cards.json`

前端主体数据。第一版页面的核心不是关键词榜，而是 topic card。

```json
{
  "topic_id": "topic_messi_fitness_001",
  "topic_title": "Messi fitness concern before Argentina opener",
  "topic_summary": "Multiple media and discussion sources focus on Messi's training status and starting XI uncertainty.",
  "heat_score": 86,
  "related_matches": ["group_x_mxx"],
  "related_teams": ["Argentina"],
  "related_players": ["Messi"],
  "regions": ["Global", "UK", "Argentina"],
  "languages": ["en", "es"],
  "source_count": 5,
  "sources": [
    {
      "source_id": "media_espn_soccer_worldcup",
      "title": "Original headline",
      "url": "https://..."
    }
  ],
  "keywords": ["Messi", "fitness", "training", "starting XI"],
  "last_updated": "2026-06-07T10:30:00Z"
}
```

### 5.7 `public/data/source_status.json`

用于页面显示更新时间和抓取状态。

```json
{
  "last_build_at": "2026-06-07T10:30:00Z",
  "sources": [
    {
      "source_id": "media_bbc_sport_football",
      "status": "ok",
      "items_fetched": 20,
      "last_success_at": "2026-06-07T10:30:00Z",
      "error": null
    }
  ]
}
```

## 6. 热点识别规则

第一版不要只靠关键词。采用三层判断：

### 6.1 实体匹配

每条新闻先匹配球队、球员、比赛名、别名。

示例：

- Argentina / ARG / Albiceleste
- Brazil / Brasil / Seleção
- England / Three Lions
- Spain / España / La Roja

### 6.2 体育语境过滤

国家名不能单独触发入库。比如 `Argentina` 必须同时满足以下任一条件：

- 来源本身是足球/体育源；
- 标题或摘要包含 World Cup、FIFA、squad、lineup、injury、coach、goal、penalty、VAR、fixture 等语境词；
- 同时匹配到对手球队、球员或比赛阶段。

### 6.3 话题聚类

合并相似标题，不直接展示无意义词频。

聚类依据：

- 标题相似度；
- 共享球队/球员；
- 同一比赛窗口；
- 共同事件词，例如 injury、lineup、VAR、fans、ticket、weather、squad。

## 7. 热度分第一版公式

第一版使用透明、可解释的规则，不接付费 AI API。

```text
heat_score =
  40% source_weight
+ 25% source_count_score
+ 20% recency_score
+ 10% entity_match_score
+  5% trend_bonus
```

说明：

- `source_weight`：BBC、Reuters、ESPN、AP 等权威源权重更高。
- `source_count_score`：多个来源同时出现说明热点更稳。
- `recency_score`：越新的内容分越高。
- `entity_match_score`：同时匹配比赛、球队、球员更高。
- `trend_bonus`：Google Trends 若匹配则加分，但不作为唯一依据。

## 8. A/B/C/D 源的开发处理

| 等级 | 处理方式 |
|---|---|
| A | Codex 第一阶段直接接入，优先跑通 RSS/论坛抓取 |
| B | 第一阶段写适配器，但允许失败；失败时保留 previous cache |
| C | 先做配置和状态展示，抓取器只做测试，不阻断页面 |
| D | 只做 reference，不进入自动热点流 |

## 9. 页面原型原则

页面结构固定为：

```text
顶部：比赛时间轴 / 日期切换 / 状态标签
中部：热点 topic card 矩阵
侧边或下方：信源证据链
辅助区：关键词标签流、来源状态、更新时间
```

视觉重点：

- topic card 是主体；
- 关键词标签流只是辅助；
- 每个 topic card 必须能看到来源证据；
- 不做大而全热榜；
- 不做信息流瀑布流；
- 保持轻量化和移动端可读性。

## 10. Codex 前还需要的文件

建议本阶段准备这 4 个文件：

1. `new_world_cup_hotspot_sources_completed_utf8.csv`：完整候选源池。
2. `world_cup_radar_mvp_source_whitelist_utf8.csv`：第一版白名单。
3. `world_cup_radar_mvp_sources_config.json`：给代码直接读取的白名单配置。
4. `world_cup_radar_codex_stage1_prompt.md`：给 Codex 的开发提示词。

如果你希望进一步提升效果，后续还可以补：

- `teams_entities_seed.json`
- `matches_seed.json`
- `topic_rules.json`

但这些可以由 Codex 第一阶段根据文档先生成初版。
