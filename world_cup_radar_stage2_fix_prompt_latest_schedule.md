# Codex 修正提示词：World Cup Hotspot Radar Stage 2

你现在要在现有项目 `C:\Users\14916\Desktop\2026_world_cup_radar` 上做第二轮修正。请先完整检查当前代码，不要直接重写整个项目。当前第一版已经能跑通，但页面语言、赛程、热点生成逻辑、筛选器和状态说明都不符合产品目标。请按下面要求逐项排查并修改。

## 一、先做代码排查，不要立即改动

请先检查这些文件，并在改动前总结当前逻辑：

- `src/App.tsx`
- `src/lib/types.ts`
- `src/lib/scoring.ts`
- `scripts/build-data.ts`
- `scripts/normalize-items.ts`
- `scripts/match-entities.ts`
- `scripts/cluster-topics.ts`
- `data/seeds/matches_seed.json`
- `data/seeds/entities_seed.json`
- `data/seeds/topic_rules.json`
- `public/data/topic_cards.json`
- `public/data/source_status.json`

重点回答：

1. 当前比赛时间轴的数据来自哪里？是否来自真实赛程，还是 mock/seed？
2. 当前 topic card 的标题是如何生成的？为什么出现 `Spain update`、`Canada update`、`Argentina update` 这种无意义标题？
3. 当前 heat score 的计算公式是什么？哪些字段进入了计算？
4. 当前 keyword tags 是从哪里抽取的？有没有停用词、实体词和无意义泛词过滤？
5. 当前 Source Status 的 `partial`、`cached`、`error`、`ok` 是如何产生的？
6. 当前筛选器里的 region、platform、match、time window 是否来自真实字段？有没有过于宽泛或内部化的问题？

完成排查后再开始修改。

---

## 二、全站界面语言改为中文

除原始抓取标题、原始来源名称、原始关键词、国家/球队/球员英文名等不可强行翻译的内容外，所有 UI 文案必须改成中文。

需要修改：

- 页面主标题
- 副标题
- 分区标题
- 说明文字
- 按钮
- 筛选器标签
- 状态说明
- 卡片字段名
- 更新时间说明
- Source Status 说明

英文示例替换：

- `World Cup Hotspot Radar` → `世界杯热点雷达`
- `2026 WORLD CUP RADAR MVP` → `2026 世界杯热点雷达 MVP`
- `LAST BUILD` → `最近更新`
- `VISIBLE TOPICS` → `当前热点`
- `Top Match Timeline` → `重点赛程时间轴`
- `Filter Bar` → `筛选条件`
- `Main Hotspot Matrix` → `热点话题矩阵`
- `Keyword Tag Flow` → `热点短语流`
- `Source Status` → `数据源状态`
- `Topic Card` → `热点话题`
- `Heat` → `热度`
- `Evidence` → `信源`
- `Region` → `区域`
- `Platform` → `来源类型`
- `Match` → `比赛`
- `Time Window` → `时间范围`

下拉选项也要中文化：

- `All` → `全部`
- `All matches` → `全部比赛`
- `official` → `官方赛程`
- `media_fixture` → `媒体赛程`
- `media` → `体育媒体`
- `forum` → `论坛讨论`
- `trends` → `趋势数据`
- `Last 24h` → `近24小时`

---

## 三、重写首页副标题，不要用内部工程描述

当前副标题：

> Topic-first signal board for matches, teams, players, regions, and platforms. Public metadata only, no paid APIs, no paywall bypass.

这像内部开发说明，不适合用户。请替换为面向用户的简洁中文介绍：

> 按比赛、球队、球员、区域和平台整理世界杯相关热点，帮助你快速了解不同地区正在讨论什么。

也可以使用稍微更产品化的版本：

> 一个按赛程组织的世界杯热点观察面板，聚合公开体育媒体、论坛讨论和趋势信号，呈现每场比赛背后的主要话题与信源。

不要在首页主视觉区强调 `no paid APIs`、`no paywall bypass`，这些可以放到页脚或“数据说明”小字里。

页脚/数据说明可以写：

> 数据来自公开页面、RSS 或公开元数据；本站不使用付费 API，也不绕过付费墙。

---

## 四、赛程必须改为北京时间显示，并修正当前假赛程

当前截图中显示的是 UTC，例如 `Jun 11 · 00:00 UTC`。请改为北京时间，即 `Asia/Shanghai`，格式为：

> 6月12日 03:00 北京时间

注意：

1. 北京时间全年为 UTC+8，中国大陆不实行夏令时。
2. 但比赛发生地可能有夏令时，因此不要用手工加减主办地时区。统一以赛程原始 UTC 或 ISO 时间为基准，再用 `Intl.DateTimeFormat` 转为 `Asia/Shanghai`。
3. 如果原始数据已经是北京时间，则不要再次 +8，需要在字段里明确 `time_basis`。

请实现通用工具函数，例如：

- `formatBeijingTime(isoUtcString: string): string`
- 输出中文日期时间
- 用 `timeZone: "Asia/Shanghai"`

### 赛程数据问题

当前页面里的：

- Mexico vs Canada
- United States vs Argentina
- Brazil vs Spain
- England vs Japan

明显是 seed/mock 数据，不是用户提供的正式赛程图里的真实完整赛程。请不要继续使用这些 mock 作为真实赛程。

请做以下修改：

1. 去掉示例赛程，=读取 `C:\Users\14916\Desktop\2026_world_cup_radar\world_cup_2026_latest_image_schedule_utf8.csv`，这个是真实的赛程数据 
2. 首页时间轴只显示“近期/重点比赛”，但需要有“查看全部赛程”的结构预留。

请在修改后说明：当前赛程来自哪个文件，是否仍为示例数据。

---

## 五、彻底重构热点话题标题生成逻辑

当前 `Spain update`、`Canada update`、`Mexico update`、`Argentina update` 这种标题不可接受。它们不是热点，只是实体名 + 泛词。

产品目标是：呈现具有实际含义的热点短语或话题标题，较为完整简洁的展现出队伍、角色、比赛、事件等核心要素，避免过于宽泛或过于具体，例如（下面的只是主场）：

- `梅西受伤替补待命`
- `姆巴佩抢队长袖标`
- `美国队在VAR判罚中获利`
- `英格兰首发中场组合`
- `美国队主场压力`
- `西班牙中场配置争议`
- `阿根廷赛前训练缺席`
- `捷克小组出线`
- `西班牙门将选择争议`
- `拉亚点球大战偷看小纸条`

请修改 `cluster-topics.ts` 和相关规则：

### 1. 禁止把上面的话题标题示例直接用于话题标题展示，应当是根据抓取到的实际内容来总结生成。

### 2. 禁止生成无意义标题

如果标题只由以下结构组成，应降级或丢弃：

- `{country} update`
- `{team} update`
- `{country} news`
- `{team} match`
- `{team} football`
- `{country} world cup`
- 单个国家名
- 单个球员名
- 单个泛词，如 `fans`、`goal`、`match`、`football`、`soccer`

### 3. 话题标题应由“实体 + 事件/议题类型”组成

请设计 topic phrase extraction 规则：

- injury / fitness / training / missed training → `伤病与训练情况`
- lineup / starting XI / selection / squad → `首发与阵容选择`
- coach / tactics / formation → `战术与教练安排`
- VAR / referee / penalty / red card → `VAR 与判罚争议`
- fans / tickets / crowd / atmosphere → `球迷与现场氛围`
- qualification / group / standings / knockout → `出线形势`
- star player + injury / training / form → `球星状态`
- opening match / host / pressure → `揭幕战与主场压力`

### 4. topic title 可以用中文呈现

原始信源标题保留英文/西语/葡语等原文，但 topic card 的标题可以中文化。同时在topic card上呈现原文标题和中文标题（类似于双语翻译呈现）

示例：

topic card：
`Brazil sweat over Vinicius fitness before Spain clash`
`巴西队伤病与维尼修斯状态`

如果一个 cluster 只有国家名或泛词，没有事件语义（这种应当是极小概率实践，凡是能提取到具体内容的你都应当归类出上述topic）。因为一整个cluster的好几篇新闻应当不会没有内容的：

- 不要生成 `Argentina update`
- 可以放入 `待归类线索`
- 或者不进入主热点矩阵，只进入原始信源列表

---

## 六、重新定义热度 heat score，并在页面说明

当前右侧 `Heat 84` 不透明。请让热度分可解释，至少在代码和页面 tooltip/说明中明确：

建议公式：

```text
heat_score =
  source_count_score * 0.35 +
  recency_score * 0.25 +
  cross_region_score * 0.20 +
  source_priority_score * 0.10 +
  match_relevance_score * 0.10
```

要求：

1. 不要让单一 mock 数据生成很高热度。
2. 只有一个来源的 topic，默认不得超过 70，除非来源优先级极高且非常近期。
3. 多个来源、多区域同时出现，热度才应显著上升。
4. 在卡片里或鼠标悬停时显示：
   - `来源数量`
   - `最近更新时间`
   - `覆盖区域`
   - `相关比赛`
5. 如果当前是 seed/mock 数据，请标注 `示例热度`，避免误导。

---

## 七、重构 Keyword Tag Flow：改为“热点短语流”

当前 tag 里出现 `United States`、`Spain`、`Canada`、`fans`、`goal`、`debate` 等，很多是国家名或泛词，不符合产品目标。

请将该模块改为：

> 热点短语流

只展示具有语义的信息短语，而不是单词词频。

过滤规则：

1. 过滤单独国家名、球队名，除非它和议题词组合出现。
2. 过滤 `football`、`soccer`、`match`、`team`、`goal`、`news`、`update`、`fans` 等泛词。
3. 保留组合短语（仅为示例）：
   - `伤病疑云`
   - `首发阵容`
   - `VAR争议`
   - `赛前训练`
   - `出线形势`
   - `主场压力`
   - `门将选择`
   - `战术调整`
   - `球星状态`
4. 英文原文可以作为内部匹配，但前台尽量显示中文短语。
5. 如果没有足够真实短语，则显示：
   > 暂无足够稳定的热点短语，等待更多信源汇聚。
6. 注意：不要直接采用上面的组合短语示例，要根据实际内容概括总结。

---

## 八、筛选器需要收紧和中文化

当前筛选器里的 `Region`、`Platform` 分类偏松，且选项内部化。请修改：

### 区域筛选

不要直接用 CSV 里的松散 region 字符串堆叠。统一映射为：

- 全部
- 全球/英语圈
- 北美
- 拉美
- 欧洲
- 中东与北非
- 非洲
- 亚洲

如果具体国家趋势源存在，可以后续作为二级筛选，不要第一版都堆在主筛选器里。

### 来源类型筛选

将内部类型映射为中文：

- 全部
- 官方赛程
- 体育媒体
- 论坛讨论
- 趋势数据
- 媒体赛程

不要显示 `official`、`media_fixture`、`media`、`forum`、`trends` 这些内部字段。

### 比赛筛选

选项格式：

> 墨西哥 vs 南非｜6月12日 03:00

如果球队没有中文名映射，则先用英文名，但格式保持一致。

### 时间范围

- 近1小时
- 近6小时
- 近24小时
- 近72小时
- 全部

---

## 九、Source Status 改为“数据源状态”，并解释状态含义

当前 Source Status 对用户不友好，`PARTIAL`、`CACHED`、`ERROR` 不知道是什么意思。请改成中文并加说明。

状态映射：

- `OK` → `正常`
- `PARTIAL` → `部分可用`
- `CACHED` → `使用缓存`
- `ERROR` → `暂不可用`
- `TEST_PENDING` → `待测试`

说明文案：

> 数据源状态用于说明各来源最近一次抓取情况。某些来源失败时，系统会优先使用缓存或示例数据，不会影响页面基本浏览。

卡片字段中文化：

- `抓取方式`
- `条目数`
- `最近成功`
- `错误信息`

不要把 Source Status 放在页面太靠前。它应该在页面底部，作为技术透明信息，而不是主要内容。

如果错误是 `ETIMEDOUT`、`ECONNRESET`，请前台翻译为：

- `连接超时`
- `连接被重置`
- `抓取失败`

原始错误可以放在 `title` 或调试字段中，不要直接作为用户主文案。

---

## 十、Evidence Panel 必须成为可读的信源链

如果当前 evidence panel 只是占位，请补充：

每个 topic card 点击后，右侧或下方显示：

- 热点标题
- 相关比赛
- 相关球队/球员
- 热度解释
- 信源列表：
  - 原始标题
  - 来源名称
  - 区域
  - 发布时间/抓取时间
  - 链接按钮：`查看原文`
- 是否为缓存数据

如果当前还没有真实信源，使用 seed 数据也要明确标注 `示例信源`。

---

## 十一、视觉和信息层级修正

当前页面视觉偏科技大屏，能接受，但信息层级需要调整：

1. 首页第一屏要让普通用户知道这是干什么的。
2. 不要让内部工程状态过早出现。
3. `Last build`、`Visible topics` 可以保留，但中文化并降低视觉权重。
4. Topic card 的标题要更像新闻议题，而不是系统变量。
5. “热点短语流”放在 topic matrix 之后或旁边，作为辅助。
6. Source Status 放到底部。
7. 移动端下，筛选器要折叠，不要占据太多高度。

---

## 十二、最终验收标准

完成后请运行：

```bash
npm run build:data
npm run build
```

然后输出：

1. 修改了哪些文件。
2. 当前赛程数据来自哪里，是否还是示例。
3. 当前 topic card 标题生成逻辑是什么。
4. heat score 新公式是什么。
5. keyword/tag 过滤规则是什么。
6. Source Status 状态解释在哪里。
7. 如果有无法解决的问题，请明确说明原因，不要伪装完成。

必须保证：

- 页面主体中文化。
- 北京时间显示正确。
- 不再出现 `Spain update`、`Canada update` 这类无意义热点。
- 热点短语流不再堆国家名和泛词。
- 筛选器选项中文化。
- 数据源状态用户可理解。
- 抓取失败仍不阻断构建。
---

# 附加任务：使用最新版赛程图片转录后的标准赛程

注意：不要再使用旧的 HTML 赛程文件，也不要再使用 `world_cup_2026_schedule_from_uploaded_html_utf8.csv`。旧 HTML 版本包含“欧预胜者 / FIFA 附加赛”等占位队伍，已经不是用户确认的最新版赛程。

用户已经提供最新版赛程图片，并已人工转录为机器可读 CSV/JSON。请把下面这个 CSV 放入项目并作为当前正式赛程 seed：

`data/seeds/world_cup_2026_latest_image_schedule_utf8.csv`

如果你看到同名 JSON，也可以同步使用：

`data/seeds/world_cup_2026_latest_image_schedule.json`

## 赛程文件字段

CSV/JSON 字段包括：

- `match_id`
- `match_number`
- `round`
- `group`
- `home_team`
- `away_team`
- `matchup`
- `matchup_code`
- `display_matchup`
- `date_beijing_text`
- `time_beijing_text`
- `display_time_beijing`
- `city`
- `stadium`
- `kickoff_beijing`
- `kickoff_utc`
- `time_basis`
- `status`
- `source_note`

## 必须执行的修改

1. 停止使用当前 mock 赛程作为前台真实赛程。
2. 停止使用旧 HTML 赛程 seed：`world_cup_2026_schedule_from_uploaded_html_utf8.csv`。
3. 停止使用任何含有 `欧预胜者`、`FIFA附加赛`、`附加赛` 占位队伍的旧数据。
4. 用 `world_cup_2026_latest_image_schedule_utf8.csv` 替换或优先覆盖 `data/seeds/matches_seed.json` 的前台展示来源。
5. 这份最新版赛程共有 104 场，全部已有 `kickoff_beijing` 与 `kickoff_utc`，包括小组赛和淘汰赛。
6. 前台比赛时间统一使用 `display_time_beijing`，例如：
   - `6月12日 03:00 北京时间`
   - `7月20日 03:00 北京时间`
7. 时间轴默认展示近期/重点比赛，不要一次性把 104 场全部堆在首屏。
8. 增加“查看全部赛程”按钮或折叠区，允许用户展开全部 104 场。
9. 比赛筛选器必须使用最新版赛程生成，格式为：
   - `墨西哥 vs 南非｜6月12日 03:00 北京时间`
   - `A2 - B2｜6月29日 03:00 北京时间`
   - `89胜者 - 90胜者｜7月10日 04:00 北京时间`
10. 页面底部“数据说明”写：
    - `赛程数据来自用户提供的最新版赛程图片人工转录稿，时间字段以北京时间 GMT+8 为准；正式上线前建议与 FIFA 官方赛程再次核对。`

## 最新版赛程关键校验点

请在代码中或构建后检查以下前几场是否正确：

- M001：墨西哥 vs 南非｜6月12日 03:00 北京时间
- M002：韩国 vs 捷克｜6月12日 10:00 北京时间
- M003：加拿大 vs 波黑｜6月13日 03:00 北京时间
- M004：美国 vs 巴拉圭｜6月13日 09:00 北京时间
- M005：卡塔尔 vs 瑞士｜6月14日 03:00 北京时间

请检查以下淘汰赛是否正确：

- M073：A2 - B2｜6月29日 03:00 北京时间
- M090：73胜者 - 75胜者｜7月5日 01:00 北京时间
- M097：89胜者 - 90胜者｜7月10日 04:00 北京时间
- M101：97胜者 - 98胜者｜7月15日 03:00 北京时间
- M103：两场半决赛负者｜7月19日 05:00 北京时间
- M104：两场半决赛胜者｜7月20日 03:00 北京时间

## 数据质量说明

请在项目 README 或 `docs/data-notes.md` 中说明：

- 104 场比赛均拥有北京时间和 UTC ISO 字段。
- 当前赛程来自用户最新版赛程图片的人工转录稿。
- 旧 HTML 赛程文件只可作为历史参考，不得作为前台赛程源。
- 不得将 `欧预胜者`、`FIFA附加赛` 等旧占位队伍重新写入前台。
- 若后续用户提供 FIFA 官方 CSV 或人工校对版 CSV，应优先覆盖当前 seed。

## 验收要求补充

完成后请运行：

```bash
npm run build:data
npm run build
```

并在回复中说明：

1. 是否成功读入 104 场比赛。
2. 小组赛和淘汰赛分别有多少场。
3. 104 场是否全部有 `kickoff_beijing` 与 `kickoff_utc`。
4. 是否已经完全移除旧占位队伍：`欧预胜者`、`FIFA附加赛`、`附加赛`。
5. 前台是否还存在 `Mexico vs Canada`、`United States vs Argentina` 这类旧 mock 赛程。
6. 前台是否已显示 `墨西哥 vs 南非｜6月12日 03:00 北京时间`。
