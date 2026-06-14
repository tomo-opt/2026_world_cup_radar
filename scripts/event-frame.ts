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

function normalizeSourceLanguage(language?: string) {
  const normalized = (language ?? '').toLowerCase().trim();

  if (!normalized) return 'en';
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('pt')) return 'pt';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('de')) return 'de';
  if (normalized.startsWith('it')) return 'it';
  if (normalized.startsWith('nl')) return 'nl';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('ar')) return 'ar';

  return 'en';
}

async function translateToChinese(text: string, sourceLanguage?: string) {
  const trimmed = cleanFragment(text);
  if (!trimmed) return '';
  if (looksMostlyChinese(trimmed)) return trimmed;

  const normalizedLanguage = normalizeSourceLanguage(sourceLanguage);
  const cacheKey = `${normalizedLanguage}::${trimmed.slice(0, 1200)}`;
  const cached = TRANSLATE_CACHE.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const memoryParams = new URLSearchParams({
        q: trimmed.slice(0, 1200),
        langpair: `${normalizedLanguage}|zh-CN`,
      });

      const memoryResponse = await fetch(`https://api.mymemory.translated.net/get?${memoryParams.toString()}`, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        },
      });

      if (memoryResponse.ok) {
        const memoryData = (await memoryResponse.json()) as {
          responseData?: { translatedText?: string };
        };

        const translatedText = memoryData?.responseData?.translatedText?.trim() ?? '';
        if (translatedText && !/INVALID SOURCE LANGUAGE/i.test(translatedText)) {
          return sanitizeTranslatedLine(translatedText);
        }
      }
    } catch {
      // ignore and fall through
    }

    try {
      const googleParams = new URLSearchParams({
        client: 'gtx',
        sl: normalizedLanguage,
        tl: 'zh-CN',
        dt: 't',
        q: trimmed.slice(0, 1200),
      });

      const googleResponse = await fetch(
        `https://translate.googleapis.com/translate_a/single?${googleParams.toString()}`,
        {
          headers: {
            'user-agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
          },
        },
      );

      if (!googleResponse.ok) return trimmed;

      const googleData = (await googleResponse.json()) as unknown;
      if (!Array.isArray(googleData) || !Array.isArray(googleData[0])) return trimmed;

      const translated = (googleData[0] as unknown[])
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

async function buildTranslatedEvidence(item: NormalizedItem) {
  const titleSource = pickTitleSource(item);
  const summarySource = pickSummarySource(item);
  const excerptSource = pickExcerptSource(item);
  const sourceLanguage = item.language || 'en';

  const [titleZh, summaryZh, excerptZh] = await Promise.all([
    translateToChinese(titleSource, sourceLanguage),
    translateToChinese(summarySource, sourceLanguage),
    translateToChinese(excerptSource, sourceLanguage),
  ]);

  const candidateTitle = titleZh || summaryZh || excerptZh || '';
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
      candidateTitle: translated.titleZh || translated.summaryZh || '',
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
