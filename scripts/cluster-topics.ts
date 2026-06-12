import { calculateHeatScore } from '../src/lib/scoring';
import type {
  ConfidenceLevel,
  InterpretationBasis,
  LowConfidenceItem,
  Match,
  NormalizedItem,
  TopicCard,
  TopicRules,
} from '../src/lib/types';
import { normalizeText, recencyScoreFromDate, toPriorityScore, uniqueStrings } from './utils';

function hasWorldCupContext(item: NormalizedItem) {
  const text = normalizeText(`${item.title} ${item.summary} ${item.content_text ?? ''}`);
  return ['world cup', 'fifa', '2026', 'mundial', 'coupe du monde', 'copa del mundo', 'worldcup'].some((term) =>
    text.includes(term),
  );
}

function buildTopicGroupKey(item: NormalizedItem) {
  if (item.event_fingerprint) return item.event_fingerprint;
  const frame = item.event_frame;
  return [frame.subject, frame.action, frame.object, frame.context]
    .map((part) => normalizeText(part).replace(/\s+/g, '_'))
    .filter(Boolean)
    .join('::');
}

function tokenizeTitle(title: string) {
  return normalizeText(title)
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !['world', 'cup', 'fifa', '2026', 'preview', 'report', 'news', 'worldcup'].includes(token));
}

function buildFallbackGroupKey(item: NormalizedItem) {
  const frame = item.event_frame;
  const entity = item.matched_players[0] || item.matched_teams[0] || frame.subject || 'world_cup';
  const coreTokens = tokenizeTitle(item.title).slice(0, 4).join('_') || 'general';
  return [normalizeText(entity), frame.action || frame.issue_type || 'general', coreTokens].filter(Boolean).join('::');
}

export function isLowQualityTopicTitle(title: string) {
  if (!title || title.trim().length <= 4) return true;
  return [
    /赛前看点$/,
    /赛前准备$/,
    /赛前动态$/,
    /值得关注$/,
    /成为海外媒体焦点/,
    /影响出场安排$/,
    /影响阵容安排$/,
    /相关讨论$/,
    /海外媒体讨论/,
    /赛事组织与场外事件$/,
    /阵容选择$/,
    /球队状态$/,
    /伤病情况$/,
    /世界杯新闻$/,
    /\bupdate$/i,
    /^[\u4e00-\u9fa5A-Za-z\s-]{1,6}$/,
  ].some((pattern) => pattern.test(title));
}

function looksLikeRawHeadlineMix(title: string) {
  const asciiWords = (title.match(/[A-Za-z]{4,}/g) ?? []).length;
  return /[\u4e00-\u9fa5]/.test(title) && asciiWords >= 2;
}

function hasChinese(text: string) {
  return /[\u4e00-\u9fa5]/.test(text);
}

function hasBrokenPlaceholder(text: string) {
  return text.includes('???');
}

function needsRefineChineseTitle(title: string) {
  return [
    /动态持续更新$/,
    /仍留下一道悬念$/,
    /接受采访谈备战$/,
    /受到关注$/,
    /引发赛前关注$/,
    /历史回顾内容$/,
    /成为赛前话题$/,
    /晋级前景受到讨论$/,
    /前景$/,
    /信息汇总$/,
    /^L\d/,
  ].some((pattern) => pattern.test(title));
}

function translateForeignTopicTitle(input: string) {
  const text = normalizeText(input);

  if (/convocatoria de sudafrica.*mundial 2026/.test(text)) return '南非队2026世界杯名单与赛程安排已经公布';
  if (/lionel messi s argentina swansong.*cristiano ronaldo.*last dance/.test(text))
    return '梅西和C罗都把2026世界杯视作国家队生涯最后一舞';
  if (/as he flexes his muscles with iran and iraq.*happy juice/.test(text))
    return '外媒认为美国可借世界杯改善国家形象但地缘政治正在削弱这一红利';
  if (/report: iran s world cup team plots against america/.test(text))
    return '英媒借伊朗队话题渲染与美国有关的紧张叙事';
  if (/world cup 2026 dark horses who could shock the world/.test(text))
    return '外媒盘点本届世界杯最可能制造冷门的黑马球队';
  if (/latest news, stats and live commentary/.test(text) && /uzbekistan|colombia/.test(text))
    return '乌兹别克斯坦对哥伦比亚比赛的实时战况与数据页';
  if (/messi, mbappe, greatness: the 2022 final/.test(text))
    return '外媒把2022年世界杯决赛列为最难忘的经典瞬间';
  if (/teste muito bom|roberto martinez|venha o mundial|selecionador nacional gostou/.test(text))
    return '罗伯托·马丁内斯认可葡萄牙热身表现并准备转入世界杯节奏';
  if (/salarios dos arbitros no mundial/.test(text))
    return '世界杯裁判薪酬较往届有明显提升';
  if (/saiba quem sao os jogadores que mais valorizaram/.test(text))
    return '外媒盘点因世界杯而身价上涨最快的球员';
  if (/mexico sem plano para conter propagacao do ebola/.test(text))
    return '葡媒质疑墨西哥世界杯主办地缺乏应对传染病传播的预案';
  if (/world cup rank: the 50 best players/.test(text))
    return '外媒列出本届世界杯50大球员榜单';
  if (/world cup power rankings: usmnt lurk in 12th, spain atop/.test(text))
    return '世界杯实力榜看好西班牙领跑，美国队暂列第12';
  if (/somali ref omar abdulkadir artan denied u s entry/.test(text))
    return '索马里裁判奥马尔·阿坦因被拒入境美国而无缘世界杯';
  if (/dzeko, ronaldo, modric.*over-40 players/.test(text))
    return '外媒解读为何本届世界杯仍有多名四十岁以上老将';
  if (/vai dar portugal/.test(text)) return '葡媒以“轮到葡萄牙了”为世界杯造势';
  if (/misterio en argentina/.test(text)) return '阿根廷队仍有关键首发悬念没有完全揭晓';
  if (/world cup critics must chill|somali referee denied us visa/.test(text))
    return '因凡蒂诺为索马里裁判签证风波辩护并要求外界降温';
  if (/world cup stars to watch out for in new york, new jersey/.test(text))
    return '纽约和新泽西赛区最值得关注的世界杯球星名单出炉';
  if (/group stage odds: usa favored to win group d/.test(text))
    return '赔率看好美国队以头名身份从D组出线';
  if (/el tri heavily favored in high-handle tourney opener/.test(text))
    return '投注市场看好墨西哥赢下世界杯揭幕战';
  if (/world cup bold predictions: best players, storylines and who ll win it all/.test(text))
    return '外媒给出本届世界杯最佳球员与冠军归属预测';
  if (/ian darke s world cup preview.*brazil to win/.test(text))
    return '伊恩·达克看好巴西赢得本届世界杯';
  if (/world cup predictions: our writers make their picks/.test(text))
    return '多家外媒作者给出各自的世界杯冠军预测';
  if (/revealed: somalian world cup referee kicked out of america/.test(text))
    return '英媒追查索马里裁判被拒入境美国背后的安全争议';
  if (/fifa descarta el uni para japon y suecia/.test(text))
    return 'FIFA否决日本与瑞典赛前使用“大学队”方案引发争议';
  if (/tuchel enfria la euforia.*inglaterra no se ve favorita/.test(text))
    return '图赫尔主动给英格兰降温并称球队并非夺冠热门';
  if (/england fan delights americans.*culture day/.test(text))
    return '英格兰球迷在“文化日”活动中的互动意外赢得美国观众好感';
  if (/usa gets massive injury boost before opening world cup game against paraguay/.test(text))
    return '美国队在对阵巴拉圭前迎来关键伤员回归利好';
  if (/england s final world cup warm-up game is delayed amid weather chaos in florida/.test(text))
    return '佛州天气混乱导致英格兰最后一场热身赛延迟开球';
  if (/robbie fowler picks his all-time world cup xi/.test(text))
    return '福勒评选个人历史最佳世界杯阵容并选入三名前英格兰球员';
  if (/lamine yamal speeds up recovery, but spain refuses to take risks/.test(text))
    return '亚马尔恢复进度加快但西班牙仍不愿在世界杯前冒险';
  if (/raphinha says vinicius can help brazil win its sixth world cup/.test(text))
    return '拉菲尼亚相信维尼修斯能帮助巴西冲击第六冠';
  if (/ja kobe tharp breaks 110m hurdles world record|ncaa track and field championships/.test(text))
    return '';
  if (/que devient l equipe nationale de russie depuis sa suspension/.test(text))
    return '';
  if (/ligue 2 2026-2027/.test(text)) return '';
  if (/five world cup stars to watch out for in new york, new jersey/.test(text))
    return '纽约和新泽西赛区五名最值得关注的世界杯球员';
  if (/mexico mexico versus south africa south africa/.test(text))
    return '墨西哥对南非揭幕战的赛前信息与观赛要点汇总';
  if (/brasil 0-1 estados unidos.*resultado final/.test(text))
    return '美国队热身赛击败巴西后带着信心进入世界杯';
  if (/argentina aplasta a islandia y llega encendida al mundial 2026/.test(text))
    return '阿根廷大胜冰岛后以强势状态迎接世界杯';

  return '';
}

function shouldDropFinalTopic(topic: TopicCard) {
  const text = normalizeText(
    [
      topic.topic_title,
      topic.lead_source_title,
      topic.lead_source_summary ?? '',
      ...topic.sources.map((source) => `${source.title} ${source.summary ?? ''}`),
    ].join(' '),
  );

  return [
    /brittney sykes|commissioner s cup|toronto tempo|connecticut sun|wnba/,
    /uswnt|emma hayes/,
    /mexico s jimenez signs deal to return to wolves/,
    /quest to score 1,000 goals/,
    /liderazgo y compromiso, por eso quiere mourinho a bernardo silva/,
    /ligue 2 2026-2027/,
    /ja kob[e']? tharp|ncaa track and field championships/,
    /equipe nationale de russie depuis sa suspension/,
  ].some((pattern) => pattern.test(text));
}

function resolveTopicTitle(topic: TopicCard) {
  if (
    hasChinese(topic.topic_title) &&
    !looksLikeRawHeadlineMix(topic.topic_title) &&
    !isLowQualityTopicTitle(topic.topic_title) &&
    !needsRefineChineseTitle(topic.topic_title)
  ) {
    return topic.topic_title;
  }

  const text = [
    topic.topic_title,
    topic.lead_source_title,
    topic.lead_source_summary ?? '',
    ...topic.sources.map((source) => `${source.title} ${source.summary ?? ''}`),
  ].join(' ');

  const translated = translateForeignTopicTitle(text);
  if (translated) return translated;

  if (hasChinese(topic.lead_source_title) && !isLowQualityTopicTitle(topic.lead_source_title)) {
    return topic.lead_source_title;
  }

  return topic.topic_title;
}

function buildTopicTitle(item: NormalizedItem) {
  return item.event_frame.candidate_event_title_zh?.trim() ?? '';
}

function buildFallbackTitle(item: NormalizedItem) {
  const frame = item.event_frame;
  if (frame.candidate_event_title_zh?.trim()) return frame.candidate_event_title_zh.trim();
  const text = normalizeText(`${item.title} ${item.summary} ${item.content_text ?? ''}`);
  const subject = item.matched_players[0] || item.matched_teams[0] || frame.subject || '相关球队';
  if (/friendly|warm up|warm-up|amistoso/.test(text)) return `${subject}热身赛表现引发赛前关注`;
  if (/interview|atiende|said|dijo|declare|déclare/.test(text)) return `${subject}在世界杯前接受采访谈备战`;
  if (/injury|fitness|lesion|lésion|operad/.test(text)) return `${subject}的赛前身体状况受到关注`;
  if (/group|grupo|knockout|tiebreaker|standings/.test(text)) return `${subject}的世界杯晋级前景受到讨论`;
  if (/fifa|infantino|conference|press conference|rueda de prensa|conférence de presse/.test(text)) return `世界杯赛前发布会上的争议议题持续发酵`;
  if (/ticket|fan|aficionado|supporter/.test(text)) return `世界杯球迷与观赛安排成为讨论焦点`;
  if (/jersey|kit|maillot/.test(text)) return `${subject}相关球衣或装备话题引发讨论`;
  if (item.summary?.trim() && item.summary.trim().length >= 18) {
    return item.summary.trim().slice(0, 44);
  }
  return item.title.trim();
}

function buildInterpretationBasis(items: NormalizedItem[]): InterpretationBasis {
  if (items.every((item) => item.data_origin === 'seed')) return '示例数据';
  if (items.some((item) => item.extraction_level === 'public_article_text')) return '根据公开正文片段识别';
  if (items.some((item) => item.extraction_level === 'title_and_summary')) return '根据公开标题与摘要识别';
  return '根据公开标题识别';
}

function buildConfidence(sourceCount: number, regionCount: number, basis: InterpretationBasis): ConfidenceLevel {
  if (sourceCount >= 3 && regionCount >= 2 && basis !== '根据公开标题识别') return '较高';
  if (sourceCount >= 2 || basis === '根据公开标题与摘要识别') return '中';
  return '低';
}

function buildSummaryZh(head: NormalizedItem, title: string) {
  return head.event_frame.candidate_summary_zh?.trim() || `该线索围绕“${title}”展开，目前主要依据公开标题、摘要或可访问正文片段识别。`;
}

function buildTopicSummary(items: NormalizedItem[], title: string, summaryZh: string) {
  const sourceCount = uniqueStrings(items.map((item) => item.source_id)).length;
  if (sourceCount <= 1) {
    return `目前仅 1 个海外来源提到“${title}”，暂作为话题线索展示。${summaryZh}`;
  }
  return `共有 ${sourceCount} 个海外来源提到该话题。${summaryZh}`;
}

function buildTopicPhrases(items: NormalizedItem[], title: string) {
  const phrases = uniqueStrings(
    items
      .map((item) => item.event_frame.object || '')
      .filter(Boolean)
      .concat(items.map((item) => item.event_frame.subject || '').filter(Boolean)),
  ).filter((phrase) => {
    const normalized = normalizeText(phrase);
    return normalized && normalized !== normalizeText(title) && !isLowQualityTopicTitle(phrase);
  });
  return phrases.slice(0, 4);
}

function getCrossRegionScore(items: NormalizedItem[]) {
  const uniqueRegionCount = uniqueStrings(items.map((item) => item.ui_region)).length;
  if (uniqueRegionCount >= 4) return 100;
  if (uniqueRegionCount === 3) return 85;
  if (uniqueRegionCount === 2) return 68;
  return 35;
}

function getSourceCountScore(items: NormalizedItem[]) {
  const uniqueSources = uniqueStrings(items.map((item) => item.source_id)).length;
  return Math.min(100, uniqueSources * 26);
}

function getSourcePriorityScore(items: NormalizedItem[]) {
  return items.reduce((sum, item) => sum + toPriorityScore(item.source_type), 0) / items.length;
}

function getMatchRelevanceScore(items: NormalizedItem[]) {
  const uniqueMatchCount = uniqueStrings(items.flatMap((item) => item.matched_matches)).length;
  const uniqueTeamCount = uniqueStrings(items.flatMap((item) => item.matched_teams)).length;
  if (uniqueMatchCount >= 1) return 92;
  if (uniqueTeamCount >= 1) return 70;
  return 42;
}

function inferLowConfidenceReason(item: NormalizedItem, title: string): LowConfidenceItem['reason'] {
  if (item.item_type === 'page_reference') return 'page_reference_only';
  if (!item.summary?.trim()) return 'summary_missing';
  if (!title) return 'event_frame_incomplete';
  if (item.language !== 'en' && item.event_frame.confidence === 'low') return 'language_rule_missing';
  if (title.length <= 8) return 'title_too_short';
  return 'topic_title_low_quality';
}

function inferLowConfidenceNextAction(reason: LowConfidenceItem['reason']): LowConfidenceItem['next_action'] {
  switch (reason) {
    case 'language_rule_missing':
      return 'needs_language_rule';
    case 'page_reference_only':
      return 'needs_selector_improvement';
    case 'summary_missing':
    case 'event_frame_incomplete':
    case 'title_too_short':
    case 'topic_title_low_quality':
    case 'general_discussion_only':
    default:
      return 'needs_manual_review';
  }
}

export function buildLowConfidenceItems(normalizedItems: NormalizedItem[]): LowConfidenceItem[] {
  return normalizedItems
    .filter((item) => {
      const title = buildTopicTitle(item);
      return (
        item.item_type === 'page_reference' ||
        item.event_frame.action === 'history_generic' ||
        item.event_frame.action === 'odds_prediction' ||
        (item.event_frame.action === 'pre_match_focus' && (!title || isLowQualityTopicTitle(title))) ||
        !title ||
        isLowQualityTopicTitle(title) ||
        looksLikeRawHeadlineMix(title)
      );
    })
    .map((item) => {
      const title = buildTopicTitle(item);
      const reason =
        item.event_frame.action === 'general_discussion'
          ? 'general_discussion_only'
          : inferLowConfidenceReason(item, title);

      return {
        item_id: item.item_id,
        source_id: item.source_id,
        source_name: item.source_name,
        title: item.title,
        summary: item.summary,
        url: item.url,
        language: item.language,
        reason,
        next_action: inferLowConfidenceNextAction(reason),
        candidate_event_title_zh: title || undefined,
        candidate_summary_zh: item.event_frame.candidate_summary_zh,
      };
    });
}

export function clusterTopics(normalizedItems: NormalizedItem[], _rules: TopicRules, _matches: Match[]) {
  const lowConfidenceIdSet = new Set(buildLowConfidenceItems(normalizedItems).map((item) => item.item_id));

  const primaryEligible = normalizedItems.filter(
    (item) =>
      item.item_type !== 'page_reference' &&
      item.sports_context_score >= 30 &&
      !item.excluded_reason &&
      item.event_frame.action !== 'irrelevant_other_football' &&
      item.event_frame.action !== 'non_topic_page' &&
      item.topic_labels_zh.length > 0 &&
      (hasWorldCupContext(item) || item.matched_teams.length > 0 || item.matched_matches.length > 0) &&
      item.event_fingerprint &&
      !lowConfidenceIdSet.has(item.item_id),
  );

  const groups = new Map<string, NormalizedItem[]>();
  for (const item of primaryEligible) {
    const key = buildTopicGroupKey(item);
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  const topicCards: TopicCard[] = [];

  for (const [groupKey, items] of groups.entries()) {
    const ordered = [...items].sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );

    const head =
      ordered.find(
        (item) =>
          item.event_frame.candidate_event_title_zh &&
          !isLowQualityTopicTitle(item.event_frame.candidate_event_title_zh) &&
          !looksLikeRawHeadlineMix(item.event_frame.candidate_event_title_zh),
      ) ?? ordered[0];

    const titleZh = buildTopicTitle(head);
    if (!titleZh || isLowQualityTopicTitle(titleZh) || looksLikeRawHeadlineMix(titleZh)) continue;

    const sourceCountScore = getSourceCountScore(ordered);
    const recencyScore = ordered.reduce((sum, item) => sum + recencyScoreFromDate(item.published_at), 0) / ordered.length;
    const crossRegionScore = getCrossRegionScore(ordered);
    const sourcePriorityScore = getSourcePriorityScore(ordered);
    const matchRelevanceScore = getMatchRelevanceScore(ordered);
    const isExampleHeat = ordered.every((item) => item.data_origin === 'seed');
    const interpretationBasis = buildInterpretationBasis(ordered);
    const confidence = buildConfidence(
      uniqueStrings(ordered.map((item) => item.source_id)).length,
      uniqueStrings(ordered.map((item) => item.ui_region)).length,
      interpretationBasis,
    );
    const summaryZh = buildSummaryZh(head, titleZh);

    topicCards.push({
      topic_id: `topic_${normalizeText(groupKey).replace(/\s+/g, '_').replace(/[:]/g, '_')}`,
      topic_key: groupKey,
      issue_type: head.event_frame.issue_type || head.topic_terms[0] || 'general',
      topic_title: titleZh,
      lead_source_title: head.title,
      lead_source_summary: head.summary,
      topic_summary: buildTopicSummary(ordered, titleZh, summaryZh),
      summary_zh: summaryZh,
      heat_score: calculateHeatScore({
        sourceCount: uniqueStrings(ordered.map((item) => item.source_id)).length,
        sourceCountScore,
        recencyScore,
        crossRegionScore,
        sourcePriorityScore,
        matchRelevanceScore,
        isSeedExample: isExampleHeat,
      }),
      related_matches: uniqueStrings(ordered.flatMap((item) => item.matched_matches)),
      related_teams: uniqueStrings(ordered.flatMap((item) => item.matched_teams)),
      related_players: uniqueStrings(ordered.flatMap((item) => item.matched_players)),
      regions: uniqueStrings(ordered.map((item) => item.ui_region)),
      languages: uniqueStrings(ordered.map((item) => item.language)),
      source_count: uniqueStrings(ordered.map((item) => item.source_id)).length,
      evidence_count: ordered.length,
      source_names: uniqueStrings(ordered.map((item) => item.source_name)),
      sources: ordered.map((item) => ({
        source_id: item.source_id,
        source_name: item.source_name,
        title: item.title,
        summary: item.summary,
        url: item.url,
        published_at: item.published_at,
        fetched_at: item.fetched_at,
        language: item.language,
        region: item.ui_region,
        source_type: item.source_type,
        crawl_strategy: item.crawl_strategy,
        crawl_mode: item.crawl_mode,
        data_origin: item.data_origin,
        extraction_level: item.extraction_level,
        item_type: item.item_type,
      })),
      topic_phrases: buildTopicPhrases(ordered, titleZh),
      last_updated: head.published_at,
      source_count_score: Math.round(sourceCountScore),
      recency_score: Math.round(recencyScore),
      cross_region_score: Math.round(crossRegionScore),
      source_priority_score: Math.round(sourcePriorityScore),
      match_relevance_score: Math.round(matchRelevanceScore),
      is_example_heat: isExampleHeat,
      interpretation_basis: interpretationBasis,
      confidence,
      included_in_frontend: true,
    });
  }

  const usedEvidenceKeys = new Set(topicCards.flatMap((topic) => topic.sources.map((source) => `${source.source_id}::${source.url}`)));
  const fallbackEligible = normalizedItems.filter(
    (item) =>
      item.item_type === 'article' &&
      item.sports_context_score >= 25 &&
      !item.excluded_reason &&
      item.event_frame.action !== 'irrelevant_other_football' &&
      item.event_frame.action !== 'non_topic_page' &&
      (hasWorldCupContext(item) || item.matched_teams.length > 0 || item.matched_matches.length > 0) &&
      !usedEvidenceKeys.has(`${item.source_id}::${item.url}`),
  );

  const fallbackGroups = new Map<string, NormalizedItem[]>();
  for (const item of fallbackEligible) {
    const key = buildFallbackGroupKey(item);
    const bucket = fallbackGroups.get(key) ?? [];
    bucket.push(item);
    fallbackGroups.set(key, bucket);
  }

  for (const [groupKey, items] of fallbackGroups.entries()) {
    if (items.length === 0) continue;
    const ordered = [...items].sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );
    const head =
      ordered.find((item) => !isLowQualityTopicTitle(buildFallbackTitle(item)) && !looksLikeRawHeadlineMix(buildFallbackTitle(item))) ??
      ordered[0];
    const titleZh = buildFallbackTitle(head);
    if (!titleZh || looksLikeRawHeadlineMix(titleZh)) continue;
    if (topicCards.some((topic) => topic.topic_title === titleZh)) continue;

    const sourceCountScore = getSourceCountScore(ordered);
    const recencyScore = ordered.reduce((sum, item) => sum + recencyScoreFromDate(item.published_at), 0) / ordered.length;
    const crossRegionScore = getCrossRegionScore(ordered);
    const sourcePriorityScore = getSourcePriorityScore(ordered);
    const matchRelevanceScore = getMatchRelevanceScore(ordered);
    const interpretationBasis = buildInterpretationBasis(ordered);
    const confidence = buildConfidence(
      uniqueStrings(ordered.map((item) => item.source_id)).length,
      uniqueStrings(ordered.map((item) => item.ui_region)).length,
      interpretationBasis,
    );
    const summaryZh = buildSummaryZh(head, titleZh);

    topicCards.push({
      topic_id: `topic_fallback_${normalizeText(groupKey).replace(/\s+/g, '_').replace(/[:]/g, '_')}`,
      topic_key: groupKey,
      issue_type: head.event_frame.issue_type || head.topic_terms[0] || 'general',
      topic_title: titleZh,
      lead_source_title: head.title,
      lead_source_summary: head.summary,
      topic_summary: buildTopicSummary(ordered, titleZh, summaryZh),
      summary_zh: summaryZh,
      heat_score: calculateHeatScore({
        sourceCount: uniqueStrings(ordered.map((item) => item.source_id)).length,
        sourceCountScore,
        recencyScore,
        crossRegionScore,
        sourcePriorityScore,
        matchRelevanceScore,
        isSeedExample: false,
      }),
      related_matches: uniqueStrings(ordered.flatMap((item) => item.matched_matches)),
      related_teams: uniqueStrings(ordered.flatMap((item) => item.matched_teams)),
      related_players: uniqueStrings(ordered.flatMap((item) => item.matched_players)),
      regions: uniqueStrings(ordered.map((item) => item.ui_region)),
      languages: uniqueStrings(ordered.map((item) => item.language)),
      source_count: uniqueStrings(ordered.map((item) => item.source_id)).length,
      evidence_count: ordered.length,
      source_names: uniqueStrings(ordered.map((item) => item.source_name)),
      sources: ordered.map((item) => ({
        source_id: item.source_id,
        source_name: item.source_name,
        title: item.title,
        summary: item.summary,
        url: item.url,
        published_at: item.published_at,
        fetched_at: item.fetched_at,
        language: item.language,
        region: item.ui_region,
        source_type: item.source_type,
        crawl_strategy: item.crawl_strategy,
        crawl_mode: item.crawl_mode,
        data_origin: item.data_origin,
        extraction_level: item.extraction_level,
        item_type: item.item_type,
      })),
      topic_phrases: buildTopicPhrases(ordered, titleZh),
      last_updated: head.published_at,
      source_count_score: Math.round(sourceCountScore),
      recency_score: Math.round(recencyScore),
      cross_region_score: Math.round(crossRegionScore),
      source_priority_score: Math.round(sourcePriorityScore),
      match_relevance_score: Math.round(matchRelevanceScore),
      is_example_heat: false,
      interpretation_basis: interpretationBasis,
      confidence,
      included_in_frontend: true,
    });
  }

  const mergedByTitle = new Map<string, TopicCard>();
  for (const topic of topicCards) {
    const key = normalizeText(topic.topic_title).replace(/\s+/g, '');
    const existing = mergedByTitle.get(key);
    if (!existing) {
      mergedByTitle.set(key, topic);
      continue;
    }

    existing.sources = existing.sources.concat(topic.sources);
    existing.source_names = uniqueStrings(existing.source_names.concat(topic.source_names));
    existing.source_count = uniqueStrings(existing.sources.map((source) => source.source_id)).length;
    existing.evidence_count = existing.sources.length;
    existing.regions = uniqueStrings(existing.regions.concat(topic.regions));
    existing.languages = uniqueStrings(existing.languages.concat(topic.languages));
    existing.related_matches = uniqueStrings(existing.related_matches.concat(topic.related_matches));
    existing.related_teams = uniqueStrings(existing.related_teams.concat(topic.related_teams));
    existing.related_players = uniqueStrings(existing.related_players.concat(topic.related_players));
    existing.topic_phrases = uniqueStrings(existing.topic_phrases.concat(topic.topic_phrases)).slice(0, 6);
    if (new Date(topic.last_updated).getTime() > new Date(existing.last_updated).getTime()) {
      existing.last_updated = topic.last_updated;
      existing.lead_source_title = topic.lead_source_title;
      existing.lead_source_summary = topic.lead_source_summary;
      existing.summary_zh = topic.summary_zh;
      existing.topic_summary = topic.topic_summary;
    }
  }

  const finalized = Array.from(mergedByTitle.values())
    .map((topic) => {
      const nextTitle = resolveTopicTitle(topic);

      return {
        ...topic,
        topic_title: nextTitle,
        topic_phrases: uniqueStrings(topic.topic_phrases.filter((phrase) => phrase && phrase !== nextTitle)).slice(0, 6),
      };
    })
    .filter((topic) => hasChinese(topic.topic_title))
    .filter((topic) => !hasBrokenPlaceholder(topic.topic_title))
    .filter((topic) => !isLowQualityTopicTitle(topic.topic_title))
    .filter((topic) => !shouldDropFinalTopic(topic));

  return finalized.sort((a, b) => {
    if (b.heat_score !== a.heat_score) return b.heat_score - a.heat_score;
    return b.evidence_count - a.evidence_count;
  });
}
