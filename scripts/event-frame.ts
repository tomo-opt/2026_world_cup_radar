import type { EventFrame, Match, NormalizedItem } from '../src/lib/types';
import { normalizeText } from './utils';

function compactText(item: NormalizedItem) {
  const seed = getHeadlineSeed(item);
  return normalizeText(`${seed} ${item.summary} ${item.content_text ?? ''}`);
}

function firstMeaningfulSentence(item: NormalizedItem) {
  return `${item.summary} ${item.content_text ?? ''}`
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .find((part) => part.length >= 30);
}

function parseTitlePrefix(title: string) {
  const match = title.match(/^([^:?]{1,40})[:?]\s*(.+)$/);
  if (!match) return null;
  return { prefix: match[1].trim(), rest: match[2].trim() };
}

function isFeedNoiseTitle(title: string) {
  const normalized = normalizeText(title);
  return [
    /\b\d+\s+(minutes?|hours?|days?)\s+ago\b/,
    /^offsaide/,
    /^\s*\/\//,
    /\| a bola$/,
    /^pagina \d+/,
    /^ultimas noticias/,
  ].some((pattern) => pattern.test(normalized));
}

function getHeadlineSeed(item: NormalizedItem) {
  if (item.summary?.trim() && isFeedNoiseTitle(item.title)) return item.summary.trim();
  return item.title;
}

function isGenericHeadlinePrefix(prefix: string) {
  const normalized = normalizeText(prefix);
  return [
    'revealed',
    'spotlight',
    'analysis',
    'exclusive',
    'live',
    'latest',
    'breaking',
    'report',
    'watch',
    'share',
    'opinion',
    'preview',
    'update',
    'updates',
    'ranking',
    'rankings',
  ].includes(normalized);
}

function looksLikeSpeakerPrefix(prefix: string) {
  if (isGenericHeadlinePrefix(prefix)) return false;
  return /^[A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){0,2}$/.test(prefix.trim());
}

function buildSubject(item: NormalizedItem, text: string) {
  if ((text.includes('referee') || text.includes('official')) && (text.includes('entry') || text.includes('visa') || text.includes('barred'))) {
    if (text.includes('somali')) return '索马里裁判';
    return '裁判';
  }
  if (text.includes('ticket')) return '世界杯票务';
  if (text.includes('sofi stadium')) return 'SoFi 球场';
  if (text.includes('mercedes-benz stadium')) return '亚特兰大奔驰球场';
  if (text.includes('tuchel')) return '图赫尔';
    const titlePrefix = parseTitlePrefix(getHeadlineSeed(item));
  if (titlePrefix && looksLikeSpeakerPrefix(titlePrefix.prefix)) return titlePrefix.prefix;
  return item.matched_players[0] || item.matched_teams[0] || '???';
}

function buildContext(item: NormalizedItem, matches: Match[], text: string) {
  const match = matches.find((entry) => entry.match_id === item.matched_matches[0]);
  if (match) return match.display_matchup;
  if (text.includes('world cup')) return '世界杯';
  if (text.includes('opening')) return '揭幕战';
  return '世界杯';
}

function extractVenues(text: string, matches: Match[]) {
  const normalized = normalizeText(text);
  const venues = matches
    .map((match) => match.stadium)
    .filter(Boolean)
    .filter((stadium, index, self) => self.indexOf(stadium) === index)
    .filter((stadium) => normalized.includes(normalizeText(stadium)));

  if (normalized.includes('sofi stadium')) venues.push('SoFi 球场');
  if (normalized.includes('mercedes-benz stadium')) venues.push('亚特兰大奔驰球场');
  return Array.from(new Set(venues));
}

function joinedPlayers(item: NormalizedItem) {
  return item.matched_players.slice(0, 2).join('和');
}

const TRANSLATE_CACHE = new Map<string, Promise<string>>();

function cleanFragment(input: string) {
  return input
    .replace(/[“”"'`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,.;:：\-–—\s]+/, '')
    .replace(/[,.;:：\-–—\s]+$/, '')
    .trim();
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function looksMostlyChinese(text: string) {
  const matches = text.match(/[\u4e00-\u9fff]/g) ?? [];
  return matches.length >= Math.max(4, Math.floor(text.length / 4));
}

function detectUtilityPage(text: string, url: string) {
  const combined = `${text} ${url}`;
  return /live commentary|live score|scores[-\s]?fixtures|fixtures|schedule|how to watch|watch guide|tv channel|standings|bracket|en vivo y directo|sigue el partido/i.test(
    combined,
  );
}

function sanitizeTranslatedLine(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*([，。！？；：])/g, '$1')
    .replace(/([（【])\s+/g, '$1')
    .replace(/\s+([）】])/g, '$1')
    .replace(/\s+\./g, '.')
    .trim();
}

function stripGenericTitlePrefix(title: string) {
  const parsed = parseTitlePrefix(title);
  if (parsed && isGenericHeadlinePrefix(parsed.prefix)) return parsed.rest;
  return title;
}

function pickTitleSource(item: NormalizedItem) {
  return cleanFragment(stripGenericTitlePrefix(getHeadlineSeed(item).trim()));
}

function pickSummarySource(item: NormalizedItem) {
  const firstSentence = firstMeaningfulSentence(item);
  if (firstSentence) return cleanFragment(firstSentence);
  if (item.summary?.trim()) return cleanFragment(item.summary.trim());
  return '';
}

function pickExcerptSource(item: NormalizedItem) {
  const excerpt = splitSentences(item.content_text ?? '')
    .filter((sentence) => sentence.length >= 24)
    .slice(0, 2)
    .join(' ');
  return cleanFragment(excerpt);
}

async function translateToChinese(text: string) {
  const trimmed = cleanFragment(text);
  if (!trimmed) return '';
  if (looksMostlyChinese(trimmed)) return trimmed;

  const cacheKey = trimmed.slice(0, 1200);
  const cached = TRANSLATE_CACHE.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const params = new URLSearchParams({
        client: 'gtx',
        sl: 'auto',
        tl: 'zh-CN',
        dt: 't',
        q: cacheKey,
      });

      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) return trimmed;

      const data = (await response.json()) as unknown;

      if (!Array.isArray(data) || !Array.isArray(data[0])) return trimmed;

      const translated = (data[0] as unknown[])
        .map((part) => (Array.isArray(part) ? String(part[0] ?? '') : ''))
        .join('');

      return sanitizeTranslatedLine(translated || trimmed);
    } catch {
      return trimmed;
    }
  })();

  TRANSLATE_CACHE.set(cacheKey, promise);
  return promise;
}

function isLowSignalTranslatedTitle(text: string) {
  if (!text) return true;
  if (text.length < 8) return true;
  if (detectUtilityPage(normalizeText(text), '')) return true;

  return [
    /^最新$/,
    /^更新$/,
    /^分析$/,
    /^独家$/,
    /^报道$/,
    /^观察$/,
    /^排名$/,
    /^预告$/,
    /^预览$/,
    /^世界杯$/,
    /^足球$/,
  ].some((pattern) => pattern.test(text));
}

async function buildTranslatedEvidence(item: NormalizedItem) {
  const titleSource = pickTitleSource(item);
  const summarySource = pickSummarySource(item);
  const excerptSource = pickExcerptSource(item);

  const [titleZh, summaryZh, excerptZh] = await Promise.all([
    translateToChinese(titleSource),
    translateToChinese(summarySource),
    translateToChinese(excerptSource),
  ]);

  const candidateTitle = !isLowSignalTranslatedTitle(titleZh)
    ? titleZh
    : !isLowSignalTranslatedTitle(summaryZh)
      ? summaryZh
      : !isLowSignalTranslatedTitle(excerptZh)
        ? excerptZh
        : '';

  const candidateSummary = summaryZh || excerptZh || titleZh || '';

  return {
    titleSource,
    summarySource,
    excerptSource,
    titleZh,
    summaryZh,
    excerptZh,
    candidateTitle,
    candidateSummary,
  };
}

function classifyActionFromContent(text: string) {
  const normalized = normalizeText(text);

  if (/barred from entering|denied entry|visa denial|sent back/.test(normalized)) return 'entry_barred';
  if (/injury concern|fitness concern|injury scare|missed training|returns? to training/.test(normalized)) return 'injury_concern';
  if (/projected starting lineup|predicted lineup|expected lineup/.test(normalized)) return 'starting_lineup_projection';
  if (/fight for starting xi|battle for starting xi|competition for starting xi|starting xi roles/.test(normalized)) return 'starting_xi_competition';
  if (/squad announced|final squad|roster announced|named the squad/.test(normalized)) return 'squad_announced';
  if (/not favourites|not favorites/.test(normalized)) return 'not_favourites';
  if (/ticket|ticketing|tickets/.test(normalized)) return 'ticket_issue';
  if (/security|transport|travel|logistics/.test(normalized)) return 'logistics_issue';
  if (/world cup-ready|ready for the world cup/.test(normalized)) return 'world_cup_ready';
  if (/will not go on strike|strike action off|strike cancelled|avoid strike/.test(normalized)) return 'strike_cancelled';
  if (/\brecap\b|\btakeaways\b|\bmatch report\b|\bcomeback win\b|\bbeat\b|\bbeats\b|\bedged\b|\bwins?\b/.test(normalized)) return 'warmup_result';
  if (/preview|ahead of|build-up|storylines/.test(normalized)) return 'pre_match_focus';

  return 'general_discussion';
}

function buildObjectFromEntities(item: NormalizedItem, matches: Match[]) {
  const venues = extractVenues(`${item.title} ${item.summary} ${item.content_text ?? ''}`, matches);
  return item.matched_players[0] || item.matched_teams[0] || venues[0] || 'world_cup';
}

async function extractActionObject(item: NormalizedItem, matches: Match[]) {
  const text = compactText(item);
  const translated = await buildTranslatedEvidence(item);

  if (detectUtilityPage(text, item.url)) {
    return {
      action: 'non_topic_page',
      object: 'utility_page',
      candidateTitle: '',
      candidateSummary: translated.candidateSummary,
    };
  }

  return {
    action: classifyActionFromContent(text),
    object: buildObjectFromEntities(item, matches),
    candidateTitle: translated.candidateTitle,
    candidateSummary: translated.candidateSummary,
  };
}

function buildMatchLabel(item: NormalizedItem) {
  if (item.matched_teams.length >= 2) return `${item.matched_teams[0]}对${item.matched_teams[1]}`;
  if (item.matched_teams.length === 1) return item.matched_teams[0];
  return '';
}

function isUtilityCoveragePage(titleText: string, text: string, url: string) {
  const combined = `${titleText} ${text} ${url}`;
  return [
    /live commentary|live score|scores[-\s]?fixtures|fixtures|schedule|how to watch|watch guide|tv channel/,
    /standings|bracket|group stage explained|tiebreakers|third-place teams/,
    /en vivo y directo|sigue el partido de hoy en directo/,
    /we'?ll show|offer them once it starts|esperaremos a que empiece/,
    /latest news, stats and live commentary/,
  ].some((pattern) => pattern.test(combined));
}

function isRankingOrGuidePage(text: string) {
  return [
    /power rankings|rankings|best players|stars to watch|dark horses/,
    /every key question answered|one-stop-shop/,
    /group stage explained|tiebreakers|third-place teams/,
    /odds|predictions|best bets|favourites|favorites/,
  ].some((pattern) => pattern.test(text));
}

function isHistoryOrArchivePage(text: string) {
  return [
    /all-time/,
    /where are they now/,
    /history of the world cup/,
    /iconic world cup/,
    /2002 world cup/,
    /1986 world cup/,
    /2010 world cup winners/,
  ].some((pattern) => pattern.test(text));
}

function looksLikeMatchResult(text: string) {
  return [
    /\brecap\b/,
    /\btakeaways\b/,
    /\bmatch report\b/,
    /\bfinal score\b/,
    /\bresultado final\b/,
    /\bcomeback win\b/,
    /\bown goal\b/,
    /\bdraw\b/,
    /\bbeat\b/,
    /\bbeats\b/,
    /\bedge\b/,
    /\bwin\b/,
    /\bwins\b/,
  ].some((pattern) => pattern.test(text));
}



function extractActionObject(item: NormalizedItem, matches: Match[]) {
  const text = compactText(item);
  const team = item.matched_teams[0] ?? '';
  const player = item.matched_players[0] ?? '';
  const venues = extractVenues(text, matches);
  const specific = inferFromSpecificTitle(item, text);

  if (specific) return specific;

  if (/scores on .* return after injury|return after injury|returns from injury/.test(text)) {
    return {
      action: 'injury_return',
      object: player || team || '伤愈回归',
      candidateTitle: player ? `${player}伤愈回归后重新成为焦点` : `${team || '相关球队'}有球员伤愈回归`,
      candidateSummary: '该话题来自公开标题与摘要，对球员复出后的状态进行跟踪。',
    };
  }

  if (/projected starting lineup|predicted lineup|starting lineup/.test(text)) {
    return {
      action: 'starting_lineup_projection',
      object: team || '首发阵容预测',
      candidateTitle: team ? `${team}赛前首发阵容预测逐渐成形` : '世界杯首发阵容预测逐渐成形',
      candidateSummary: '该线索主要来自海外媒体对赛前首发名单的推演与取舍讨论。',
    };
  }

  if (/injury concern|fitness concern|fitness update|injury scare|missed training|returns to training/.test(text)) {
    if (player && team) {
      return {
        action: 'injury_concern',
        object: `${team}赛前安排`,
        candidateTitle: `${player}的身体状况影响${team}赛前安排`,
        candidateSummary: `该线索主要围绕${player}的训练或身体情况对${team}排兵布阵的影响。`,
      };
    }
    if (player) {
      return {
        action: 'injury_concern',
        object: '赛前身体状况',
        candidateTitle: `${player}的身体状况引发赛前担忧`,
        candidateSummary: '该线索主要来自海外媒体对球员赛前身体情况的跟踪。',
      };
    }
    return {
      action: 'injury_concern',
      object: `${team || '相关球队'}赛前伤病`,
      candidateTitle: `${team || '相关球队'}赛前伤病情况影响排兵布阵`,
      candidateSummary: '该线索主要围绕球队赛前伤病与训练情况。',
    };
  }

  if (/will not go on strike|avoid strike|strike action off|strike cancelled|agreement to avoid strike/.test(text)) {
    return {
      action: 'strike_cancelled',
      object: venues[0] || '球场运营',
      candidateTitle: `${venues[0] || '相关球场'}员工决定不在世界杯期间罢工`,
      candidateSummary: '该话题聚焦世界杯举办场馆的劳工与运营安排。',
    };
  }

  if (/world cup-ready|became world cup ready|ready for the world cup/.test(text)) {
    return {
      action: 'world_cup_ready',
      object: venues[0] || '球场准备',
      candidateTitle: `${venues[0] || '相关球场'}完成世界杯准备工作`,
      candidateSummary: '该线索主要围绕场馆或承办城市的准备进度。',
    };
  }

  if (/odds|predictions|best bets|favourites|favorites/.test(text)) {
    return {
      action: 'odds_prediction',
      object: team || '赛前赔率与预测',
      candidateTitle: team ? `海外媒体正在重新评估${team}的世界杯前景` : '海外媒体正在重新评估本届世界杯争冠前景',
      candidateSummary: '该线索主要来自海外媒体对夺冠前景、赔率与冷门风险的赛前判断。',
    };
  }

  if (/squad announced|roster announced|named the squad|final squad|roster/.test(text)) {
    return {
      action: 'squad_announced',
      object: team || '世界杯名单',
      candidateTitle: team ? `${team}公布世界杯最终名单并留下争议选择` : '球队公布世界杯最终名单并留下争议选择',
      candidateSummary: '该线索主要围绕球队名单调整与最终入选情况。',
    };
  }

  if (/practice focused|training focused|good memories/.test(text)) {
    return {
      action: 'practice_focus',
      object: team || '赛前训练重点',
      candidateTitle: team ? `${team}训练营把心理准备和比赛氛围作为重点` : '球队训练营把心理准备和比赛氛围作为重点',
      candidateSummary: '该线索主要围绕赛前训练重点与心理准备展开。',
    };
  }

  if (/put the united states on track to host|on track to host all over again|host all over again/.test(text)) {
    return {
      action: 'host_path',
      object: '主办路径',
      candidateTitle: '1994 世界杯经验让美国再次走到主办台前',
      candidateSummary: '该线索主要回顾美国主办世界杯的历史背景。',
    };
  }

  if (/ticket|tickets|ticketing/.test(text)) {
    return {
      action: 'ticket_issue',
      object: '观赛票务',
      candidateTitle: '世界杯票务分配与购票安排引发争议',
      candidateSummary: '该线索主要围绕球迷购票与观赛安排。',
    };
  }

  if (/travel|security|transport|logistics/.test(text)) {
    return {
      action: 'logistics_issue',
      object: venues[0] || '赛事组织',
      candidateTitle: venues[0] ? `${venues[0]}周边交通与观赛组织成为赛前焦点` : '世界杯观赛交通与现场组织成为赛前焦点',
      candidateSummary: '该线索围绕交通、安保或观赛组织安排展开。',
    };
  }

if (
  /(south korea|korea republic|republic of korea)/.test(text) &&
  /(czechia|czech republic)/.test(text) &&
  /2-1|comeback win|come from behind|rallying from goal down|winning start|late winner|match report|post match/.test(text)
) {
  return {
    action: 'post_match_result',
    object: '韩国逆转捷克的赛后结果',
    candidateTitle: '韩国队逆转捷克后以胜利开启世界杯征程',
    candidateSummary: '该线索围绕韩国队对捷克一战中的逆转取胜、关键进球和赛后评价展开。',
  };
}

if (
  /(post match thread|match report|come from behind|comeback win|winning start|late winner|rallied from|rallying from goal down)/.test(text) &&
  item.matched_teams.length > 0
) {
  return {
    action: 'post_match_result',
    object: `${team || '相关球队'}赛后结果`,
    candidateTitle: `${team || '相关球队'}的赛后表现与比赛结果成为海外讨论焦点`,
    candidateSummary: firstMeaningfulSentence(item) ?? '该线索围绕比赛结果、关键进球、逆转过程或赛后讨论展开。',
  };
}
  
  if (/preview|ahead of|build-up|storylines/.test(text)) {
    if (firstMeaningfulSentence(item)?.includes('ready to challenge')) {
      return {
        action: 'pre_match_focus',
        object: team || '赛前备战状态',
        candidateTitle: team ? `${team}热身赛后进入冲刺备战阶段` : '球队热身赛后进入冲刺备战阶段',
        candidateSummary: firstMeaningfulSentence(item) ?? '该线索主要围绕赛前最后阶段的备战状态展开。',
      };
    }
    return {
      action: 'pre_match_focus',
      object: team || player || '赛前动态',
      candidateTitle: '',
      candidateSummary: '该线索仅能识别到较宽泛的赛前信息，仍需更多证据补充。',
    };
  }

  if (/all-time|2002 world cup|history of the world cup|iconic world cup/.test(text)) {
    return {
      action: 'history_generic',
      object: '历史回顾',
      candidateTitle: '世界杯历史回顾内容',
      candidateSummary: '这类内容偏历史回顾，不直接进入当前事件主列表。',
    };
  }

  return {
    action: 'general_discussion',
    object: team || player || venues[0] || '世界杯话题',
    candidateTitle: '',
    candidateSummary: firstMeaningfulSentence(item) || '该线索目前只能识别到宽泛讨论，等待更多信源补充。',
  };
}

export async function inferEventFrame(item: NormalizedItem, matches: Match[]): Promise<EventFrame> {
  const text = compactText(item);
  const subject = buildSubject(item, text);
  const context = buildContext(item, matches, text);
  const venues = extractVenues(`${item.title} ${item.summary} ${item.content_text ?? ''}`, matches);
  const detail = await extractActionObject(item, matches);

  const fingerprint = [subject, detail.action, detail.object, context]
    .map((part) => normalizeText(part).replace(/\s+/g, '_'))
    .filter(Boolean)
    .join('::');

  const confidence =
    item.extraction_level === 'public_article_text'
      ? 'high'
      : item.extraction_level === 'title_and_summary'
        ? 'medium'
        : 'low';

  return {
    item_id: item.item_id,
    source_id: item.source_id,
    original_title: item.title,
    original_summary: item.summary,
    public_text_excerpt: item.content_text?.slice(0, 240),
    subject,
    action: detail.action,
    object: detail.object,
    context,
    issue_type: item.topic_terms[0] ?? 'general',
    teams: item.matched_teams,
    players: item.matched_players,
    venues,
    match_ids: item.matched_matches,
    candidate_event_title_zh: detail.candidateTitle,
    candidate_summary_zh: detail.candidateSummary,
    event_fingerprint: fingerprint || 'world_cup::general',
    confidence,
    evidence_basis:
      item.extraction_level === 'public_article_text'
        ? 'public_text_excerpt'
        : item.extraction_level === 'title_and_summary'
          ? 'title_and_summary'
          : 'title_only',
  };
}
