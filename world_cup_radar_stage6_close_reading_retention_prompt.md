# Codex Stage 6 Prompt — 话题标题 close reading、禁止丢弃有效信源、产品命名调整

你现在继续在本地项目目录工作：

`C:\Users\14916\Desktop\2026_world_cup_radar`

当前项目已经完成多轮修正，但用户最新预览后认为核心问题仍然集中在“话题线索标题”和“有效信源被错误丢弃”。请不要进行大规模视觉重写。本轮只聚焦三件事：

1. 话题标题必须从真实信源内容中 close reading 得出，不能再用模板化关键词拼接。
2. 禁止因为标题/摘要短、外文、难总结、低置信度就直接丢弃真实有效信源；应保留并进入待归纳/低置信队列，再改进总结策略。
3. 全站命名从“热点雷达”改为“话题线索雷达”，减少“热榜/热点”误导。

---

## 一、先排查，不要立即改代码

请先检查这些文件：

- `scripts/fetch-rss.ts`
- `scripts/fetch-html-list.ts`
- `scripts/normalize-items.ts`
- `scripts/match-entities.ts`
- `scripts/cluster-topics.ts`
- `scripts/build-data.ts`
- `src/App.tsx`
- `src/components/TopicCard.tsx`
- `src/components/EvidencePanel.tsx`
- `src/components/KeywordTagFlow.tsx`
- `src/lib/filters.ts`
- `public/data/raw_items.json`
- `public/data/normalized_items.json`
- `public/data/topic_cards.json`
- `public/data/low_confidence_items.json`
- `public/data/source_coverage_report.json`

先回答以下问题：

1. 当前 `topic_title_zh` 是如何生成的？是否仍然是 issue_type、球队名、关键词模板的排列组合？
2. 当前是否存在以下模板化标题：
   - `X赛前看点`
   - `X赛前准备成为海外媒体焦点`
   - `X赛前动态成为海外媒体焦点`
   - `X伤病影响出场安排`
   - `X队赛前伤病影响出场安排`
   - `X阵容选择`
   - `赛事组织与场外事件`
3. 当前哪些 item 被丢弃？丢弃原因分别是什么？
4. 是否存在“因为标题短、外文标题、摘要为空、总结不出中文标题、confidence low”而直接不进入任何输出文件的情况？
5. 当前 raw_items、normalized_items、event_frames、topic_cards、low_confidence_items、discarded_items 之间的数量漏斗是多少？
6. 当前是否保留了每条被丢弃 item 的 `discard_reason`？
7. 当前是否可以从前台或内部报告追踪“某条真实信源为什么没有进入话题卡”？

完成排查后再修改。

---

## 二、全站命名调整：从“热点雷达”改为“话题线索雷达”

用户明确要求：网站主标题和导航栏页面标题都不用“热点”了，改为“话题线索雷达”。

请全站替换面向用户的产品命名：

- `世界杯海外热点雷达` → `世界杯海外话题线索雷达`
- `世界杯热点雷达` → `世界杯话题线索雷达`
- 浏览器标题 / document title：`世界杯海外话题线索雷达`
- 导航栏 tab 标题：`世界杯海外话题线索雷达`
- 页面中如仍有“热点短语流”，改为：
  - `话题短语流`
  - 或 `海外话题短语流`
- 如仍有“热点话题矩阵”，改为：
  - `海外话题线索`
  - 或 `话题线索列表`

保留“热点”只允许出现在说明文字中，例如：

> 这里的“话题线索”不是平台热搜榜，而是从海外公开信源中识别出的世界杯相关讨论线索。

首页主标题改为：

> 世界杯海外话题线索雷达

副标题改为：

> 聚合海外体育媒体、论坛讨论与趋势信号，按赛程、球队和球员整理世界杯相关话题线索，帮助你快速了解不同地区正在讨论什么。

---

## 三、核心原则：标题不能再由模板映射生成，必须走 close reading pipeline

当前最大问题是：Codex 似乎先生成了若干关键词/模板表达，再把球队名、issue_type、match_context 拼进去，导致标题大量像：

- `贝林厄姆赛前伤病影响出场安排`
- `英格兰赛前伤病影响阵容安排`
- `英格兰赛前动态成为海外媒体焦点`

这些不是对原文的理解，而是模板化归纳。

请彻底修改标题生成逻辑。

### 1. 新 pipeline 必须按以下顺序

对每条信源 item：

```text
raw item
→ 提取原始标题、摘要、正文片段、来源、链接
→ close reading 识别单条新闻事件 EventFrame
→ 为每个 EventFrame 写出完整中文事件句 candidate_event_title
→ 计算 event_fingerprint
→ 进行跨源同事件归并
→ 合并为 topic card
→ 选择最准确、最具体的一句作为 topic_title_zh
```

不能再走：

```text
关键词命中 → issue_type → 模板拼接标题
```

issue_type 只能作为内部标签，不能直接生成标题。

### 2. 每条新闻先做单条事件理解

为每条 item 生成：

```ts
EventFrame {
  item_id: string
  source_id: string
  original_title: string
  original_summary?: string
  public_text_excerpt?: string
  subject: string
  action: string
  object?: string
  context?: string
  affected_team?: string[]
  affected_player?: string[]
  venue?: string[]
  issue_type: string
  candidate_event_title_zh: string
  candidate_summary_zh: string
  event_fingerprint: string
  confidence: "high" | "medium" | "low"
  evidence_basis: "title_only" | "title_and_summary" | "public_text_excerpt"
}
```

### 3. 标题必须是完整事件句

标题必须满足：

- 有主体；
- 有动作/状态；
- 有对象或背景；
- 能让用户不看原文也知道发生了什么；
- 不只是类别、话题、关键词或看点。

合格标题（以下仅为示例，严禁套用下面的内容为模板或照搬，请按照信源实际内容总结。而且你不能只关注关于下面的新闻）：

- `图赫尔称英格兰并非本届世界杯夺冠热门`
- `图赫尔仍未透露英格兰10号位首发人选`
- `贝林厄姆的健康状况影响英格兰中前场安排`
- `雷纳和弗里斯竞争美国队首发位置`
- `SoFi 球场员工决定不在世界杯期间罢工`
- `亚特兰大奔驰球场完成世界杯准备工作`
- `XX国裁判因入境问题将缺席世界杯`
- `美国队公布对阵巴拉圭前的首发预测`

不合格标题：

- `英格兰赛前动态成为海外媒体焦点`
- `墨西哥队赛前看点`
- `贝林厄姆赛前伤病影响出场安排`
- `赛事组织与场外事件`
- `球队状态`
- `阵容选择`
- `赛前准备`
- `海外媒体讨论英格兰`
- `英格兰 vs 克罗地亚`

### 4. 针对外文标题的处理

不要因为标题是英文、西语、葡语、法语、德语就丢弃。

处理策略：

- 原始标题照常保留；
- 对常见英文足球标题用规则解析；
- 对西语、葡语、法语、德语，如果无法深度理解，至少：
  - 保留为 low_confidence event；
  - 用原始标题 + source metadata 进入 `low_confidence_items.json`；
  - 不得直接丢弃；
  - 在 source coverage report 中统计为 `needs_language_rule`，而不是 `discarded`.

---

## 四、禁止因“总结不好”而丢弃真实有效信源

用户明确指出：不能因为真实信源标题短、外文、摘要缺失、难总结、低置信度，就把它从系统里排除。正确做法是尽量保留并尝试总结、实在不行再降级、待归纳，而不是丢弃。

请建立严格的 item lifecycle。

### 1. 所有抓到的真实有效 item 必须进入至少一个输出池

一个 item 只要满足：

- 有 title；
- 有 URL；
- 不是导航/广告/隐私政策/订阅页；
- 与 football/soccer/World Cup/sports 语境相关；
- 注意：登录/订阅/隐私/条款页面有的是自动弹出的，不能因为看到这个就放弃内容

就不得被直接丢弃。它必须进入以下之一：

- `normalized_items.json`
- `topic_cards[].evidence`
- `low_confidence_items.json`
- `unclustered_items.json`

### 2. 只有以下情况可以真正 discarded

- title 为空；
- URL 为空；
- 明显全都是导航项；
- 明显全都是广告；
- 全都是重复 URL；
- 全都是乱码；
- 非体育且完全无关；
- 403/抓取失败导致根本没有 item 内容。

### 3. 低置信 item 不等于丢弃

如果出现以下情况：

- 标题太短；
- 外文难以解析；
- 摘要为空；
- 无法生成完整中文事件句；
- 只能识别大类；
- confidence low；

应进入：

`public/data/low_confidence_items.json`

并附带：

```ts
{
  item_id,
  source_name,
  title,
  url,
  reason: "title_too_short" | "summary_missing" | "language_rule_missing" | "event_frame_incomplete" | "topic_title_low_quality",
  next_action: "needs_manual_review" | "needs_language_rule" | "needs_selector_improvement"
}
```

### 4. 生成 item retention report

新增：

- `public/data/item_retention_report.json`
- `docs/item-retention-report.md`

报告包括：

- raw_items 数
- normalized_items 数
- topic evidence items 数
- low_confidence_items 数
- truly_discarded_items 数
- discard reasons 分布
- low confidence reasons 分布
- 每个源抓取到多少 item、进入前台多少、进入 low confidence 多少、真正丢弃多少

目标：

> 除真正无效内容外，真实信源不应因为“总结不出标题”而消失。

---

## 五、同源/跨源合并：先事件，再归类

当前可能还是“先归类，再聚合”，这会导致两个问题：

1. 同一事件被多个模板标题拆开；
2. 不同事件因为同 issue_type 被混合。

请改成：

```text
单条 item → EventFrame → event_fingerprint → merge same event → topic card
```

### 1. 同一事件合并

如果以下任意条件成立，应合并：

- event_fingerprint 完全相同；
- subject + action + object 高度一致；
- candidate_event_title_zh 语义高度相近；
- lead original titles 指向同一新闻事件；
- 共享核心实体 + 核心动作 + 同一时间窗口。

例如：

- `Thomas Tuchel remains coy over who will start at No 10...`
- `INSIDE THE ENGLAND CAMP: The major fitness concern for Thomas Tuchel...`

如果实际都围绕“英格兰10号位/贝林厄姆状态/图赫尔首发安排”，应判断是同一事件还是相邻事件：

- 如果都是“贝林厄姆健康影响10号位/首发选择”，可以合并；
- 如果一个是“图赫尔不透露首发”，另一个是“贝林厄姆伤病情况”，可以保留为两个不同但相邻的事件，但标题必须足够具体。

### 2. 不同事件拆分

即使同球队同比赛，也要按动作拆分：

- “图赫尔称英格兰不是夺冠热门”
- “贝林厄姆健康影响首发安排”
- “英格兰公布训练营名单”
- “英格兰球迷票务问题”

这是四个事件，不能混成“英格兰赛前看点”。

---

## 六、前台质量门槛：不允许模板化标题进入主列表

在生成 topic_cards 前增加质量检测函数：

```ts
isLowQualityTopicTitle(title: string): boolean
```

命中以下模式，一律不得进入主列表：

```text
.*赛前看点
.*赛前准备
.*赛前动态
.*成为海外媒体焦点
.*影响出场安排
.*影响阵容安排
.*相关讨论
.*海外媒体讨论.*
赛事组织与场外事件
阵容选择
球队状态
伤病情况
世界杯新闻
.*update
```

处理方式：

- 放入 `low_confidence_items.json`
- 或尝试用 lead original title 重新生成；
- 仍失败则不展示在前台主列表。

---

## 七、对外文标题的最小可接受策略

如果不能稳定生成高质量中文标题，至少用“忠实翻译 + 事件补全”，不要模板化套话。

例如：

原文：

`Thomas Tuchel remains coy over who will start at No 10 amid battle between Jude Bellingham...`

可生成：

> 图赫尔仍未透露英格兰10号位首发人选

原文：

`World Cup 2026: Why Thomas Tuchel said England are not favourites to end 60 years of hurt in USA...`

可生成：

> 图赫尔解释为何英格兰不是本届世界杯夺冠热门

原文：

`The Three Lions are out in the US ahead of the tournament getting underway on Thursday...`

不要生成：

> 英格兰赛前动态成为海外媒体焦点

可以生成：

> 英格兰队抵达美国备战世界杯首战

前提是 title/summary 里确实表达了这个意思；如果没有足够信息，放入 low confidence。

但注意：不能为了达到要求强行将原文向这些标题的内容和表达凑，而是要严格基于原文的内容来，不要杜撰。本次我有发现你总结的内容甚至和下面的英文标题表达的含义都不一样。

---

## 八、前台文案同步修改

页面中的以下表述也要改：

- `海外公开信源观察中` 可以保留；
- `话题线索` 保留；
- `线索强度` 保留；
- `热点短语流` 改为 `话题短语流`；
- `当前话题` 可以改为 `当前线索`；
- 浏览器 tab 改为 `世界杯海外话题线索雷达`。

---

## 九、最终验收标准

完成后运行：

```bash
npm run build:data
npm run build
```

回复用户时必须说明：

1. 是否全站把“热点雷达”改为“话题线索雷达”？
2. `topic_title_zh` 是否仍然使用模板映射？如果否，请说明新 pipeline。
3. 是否新增 EventFrame？
4. 是否新增 `low_confidence_items.json`？
5. 是否新增 `item_retention_report.json` 和 `docs/item-retention-report.md`？
6. raw_items、normalized_items、topic evidence、low_confidence、truly_discarded 分别是多少？
7. 是否还存在：
   - `X赛前看点`
   - `X赛前准备成为海外媒体焦点`
   - `X赛前动态成为海外媒体焦点`
   - `X伤病影响出场安排`
   - `赛事组织与场外事件`
8. 对外文标题是否保留并尝试理解，而不是直接丢弃？
9. 真实有效信源是否不再因为“总结不好”而消失？
10. 同一事件的多源是否先合并，再生成话题卡？

必须保证：

- 不使用付费 API；
- 不绕过 paywall；
- 不使用登录 Cookie；
- 不因总结困难等相关原因而丢弃有效信源；
- 泛模板标题不得进入前台；
- 前台主标题和浏览器标题都改为“世界杯海外话题线索雷达”。