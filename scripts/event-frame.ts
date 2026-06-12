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

function inferFromSpecificTitle(item: NormalizedItem, text: string) {
  const team = item.matched_teams[0] ?? '';
  const player = item.matched_players[0] ?? '';
  const players = joinedPlayers(item);
  const titleText = normalizeText(item.title);
  const firstSentence = firstMeaningfulSentence(item) ?? '';

  if (/who will start at no 10|start at no 10/.test(text) && (text.includes('tuchel') || team === '英格兰')) {
    return {
      action: 'starting_xi_competition',
      object: '英格兰10号位首发人选',
      candidateTitle: '图赫尔仍未透露英格兰10号位首发人选',
      candidateSummary: '海外媒体围绕图赫尔对英格兰10号位首发安排的表态展开讨论。',
    };
  }

  if (/not favourites|not favorites/.test(text)) {
    if (text.includes('tuchel') && (team === '英格兰' || text.includes('england'))) {
      return {
        action: 'not_favourites',
        object: '英格兰夺冠前景',
        candidateTitle: '图赫尔解释为何英格兰不是本届世界杯夺冠热门',
        candidateSummary: '图赫尔在赛前表态中淡化英格兰的夺冠预期，这一说法被多家海外媒体关注。',
      };
    }

    return {
      action: 'not_favourites',
      object: team || '夺冠前景',
      candidateTitle: `${team || '相关球队'}并非本届世界杯夺冠热门`,
      candidateSummary: '该话题主要围绕海外媒体对球队世界杯前景的判断。',
    };
  }

  if (/fight for starting xi|fight for starting lineup|competition for starting xi|starting xi roles/.test(text)) {
    if (players && team) {
      return {
        action: 'starting_xi_competition',
        object: `${team}首发位置`,
        candidateTitle: `${players}竞争${team}首发位置`,
        candidateSummary: `海外媒体正在关注${team}首发位置的竞争走势。`,
      };
    }
    if (team) {
      return {
        action: 'starting_xi_competition',
        object: `${team}首发位置`,
        candidateTitle: `${team}首发位置竞争升温`,
        candidateSummary: `海外媒体正在关注${team}首发位置的竞争走势。`,
      };
    }
  }

  if (/win final warm-up|won final warm-up/.test(text) && team) {
    return {
      action: 'warmup_result',
      object: '热身赛表现',
      candidateTitle: `${team}热身赛取胜后进入世界杯备战收尾阶段`,
      candidateSummary: `该线索主要围绕${team}在世界杯开赛前最后一场热身赛后的状态判断。`,
    };
  }

  if (/overcomes injury ahead of world cup|ready ahead of world cup|i m ready/.test(text) && player) {
    return {
      action: 'injury_return',
      object: '赛前身体状况',
      candidateTitle: `${player}伤后恢复并准备迎接世界杯`,
      candidateSummary: `该线索主要围绕${player}在世界杯前的恢复情况。`,
    };
  }

  if (/arrive in the us|arrives in the us|out in the us ahead of the tournament|ahead of the tournament getting underway/.test(text) && team) {
    return {
      action: 'arrival_preparation',
      object: '赴美备战',
      candidateTitle: `${team}队抵达美国备战世界杯`,
      candidateSummary: `该话题主要围绕${team}抵达比赛地后的备战状态展开。`,
    };
  }
  if (/revealed: somalian world cup referee kicked out of america|shares similar name to man linked to al qaida-backed terror group/.test(text)) {
    return {
      action: 'entry_barred',
      object: '?????????',
      candidateTitle: '??????????????????????',
      candidateSummary: '?????????????????????????????',
    };
  }


  if (/barred from entering|denied entry|visa denial|sent back after landing/.test(text)) {
    return {
      action: 'entry_barred',
      object: '入境与执法安排',
      candidateTitle: text.includes('somali') ? '索马里裁判因美国签证问题无缘世界杯' : '裁判因入境问题将缺席世界杯',
      candidateSummary: '该话题围绕裁判的入境受阻与世界杯执法安排变化展开。',
    };
  }

  if (/var/.test(titleText) && /explained|how will it work|what to know/.test(text)) {
    return {
      action: 'var_explainer',
      object: 'VAR 机制',
      candidateTitle: '前裁判解读世界杯 VAR 规则与执行方式',
      candidateSummary: '该线索主要围绕世界杯 VAR 的运作方式、争议点与规则变化展开。',
    };
  }

  if (/group stage explained|tiebreakers|third-place teams/.test(text)) {
    return {
      action: 'format_explainer',
      object: '小组赛出线规则',
      candidateTitle: '2026 世界杯小组赛出线规则与第三名晋级机制',
      candidateSummary: '该线索解释 48 队赛制下的小组赛排名、同分比较和晋级方式。',
    };
  }

  if (/kit ranking|look best in 2026/.test(text)) {
    return {
      action: 'fan_culture',
      object: '球衣设计讨论',
      candidateTitle: '2026 世界杯各队球衣设计引发审美讨论',
      candidateSummary: '该线索聚焦世界杯参赛队球衣设计与球迷审美评价。',
    };
  }

  if (/player ratings|ratings/.test(text) && (text.includes('england') || team === '英格兰')) {
    return {
      action: 'player_ratings',
      object: '热身赛表现与首发竞争',
      candidateTitle: '英格兰热身赛后首发竞争仍留悬念',
      candidateSummary: '这条线索围绕英格兰热身赛后的球员表现评分，以及谁能挤进世界杯首发展开。',
    };
  }

  if (/how usa is embracing football|impacting the global game/.test(text)) {
    return {
      action: 'host_impact',
      object: '主办国影响力',
      candidateTitle: '美国借主办世界杯扩大对足球产业的影响',
      candidateSummary: '该线索关注美国作为主办国，如何同时改变本土足球热度与全球足球产业格局。',
    };
  }

  if (/every key question answered|48 key questions answered|one-stop-shop/.test(text)) {
    return {
      action: 'tournament_guide',
      object: '赛事总览',
      candidateTitle: '世界杯开赛前的关键问题与观赛信息汇总',
      candidateSummary: '该线索整理本届世界杯开赛前最受关注的赛制、看点与观赛信息。',
    };
  }

  if (/critic[s]? must chill|chill and relax/.test(text) && text.includes('infantino')) {
    return {
      action: 'fifa_press_conference',
      object: '签证与办赛争议',
      candidateTitle: '因凡蒂诺回应签证与办赛争议时要求外界“冷静”',
      candidateSummary: '该线索聚焦因凡蒂诺在世界杯前新闻发布会上，对签证、票务和办赛争议的回应。',
    };
  }

  if (/who could be the usmnt s breakout star/.test(text)) {
    return {
      action: 'player_focus',
      object: '潜在爆发球员',
      candidateTitle: '美媒关注美国队谁会在世界杯上成为爆发点',
      candidateSummary: '该线索围绕美国队阵中可能在世界杯期间迎来爆发的球员展开。',
    };
  }

  if (/england football news|live updates|three lions/.test(text) && text.includes('england')) {
    return {
      action: 'news_hub',
      object: '备战动态汇总',
      candidateTitle: '英格兰队世界杯备战动态持续更新',
      candidateSummary: '该线索汇总英格兰队赛前的赛程、训练与阵容动态。',
    };
  }

  if (/ca[nñ]izares explica su accidente.*mundial 2002/.test(text)) {
    return {
      action: 'history_generic',
      object: '2002 落选往事',
      candidateTitle: '卡尼萨雷斯回忆自己因意外错过2002年世界杯',
      candidateSummary: '该线索回顾卡尼萨雷斯当年因场外意外无缘世界杯的旧事。',
    };
  }

  if (/eric garcia, entrenador desde los 16|capaz de ver seis partidos en un d[ií]a/.test(text)) {
    return {
      action: 'player_focus',
      object: '球员个性与成长',
      candidateTitle: '埃里克·加西亚自称从16岁起就在为未来执教做准备',
      candidateSummary: '该线索聚焦西班牙国脚埃里克·加西亚的成长经历与职业规划。',
    };
  }

  if (/rafaela pimenta tiene un plan/.test(text)) {
    return {
      action: 'player_market',
      object: '世界杯身价操作',
      candidateTitle: '皮门塔希望借世界杯舞台推高旗下新星身价',
      candidateSummary: '该线索聚焦经纪人皮门塔如何借世界杯为球员制造市场关注。',
    };
  }

  if (/toute l actu de la coupe du monde/.test(text)) {
    return {
      action: 'news_hub',
      object: '世界杯动态汇总',
      candidateTitle: '法媒持续汇总世界杯最新动态',
      candidateSummary: '该线索属于世界杯相关新闻与快讯的聚合页。',
    };
  }

  if (/bosnia y herzegovina/.test(text)) {
    return {
      action: 'schedule_guide',
      object: '波黑队赛程与观赛信息',
      candidateTitle: '波黑队世界杯赛程与观赛信息汇总',
      candidateSummary: '该线索整理波黑队在本届世界杯的赛程、对手与观赛信息。',
    };
  }

  if (/bosnia and herzegovina/.test(text)) {
    return {
      action: 'schedule_guide',
      object: '波黑队赛程与观赛信息',
      candidateTitle: '波黑队世界杯赛程与观赛信息汇总',
      candidateSummary: '该线索整理波黑队在本届世界杯的赛程、对手与观赛信息。',
    };
  }

  if (/would you stop work for a photo with shakira|shakira/.test(text) && /opening ceremony|opening match|opening/.test(text)) {
    return {
      action: 'opening_ceremony',
      object: '夏奇拉彩排',
      candidateTitle: '夏奇拉为世界杯揭幕式彩排引发场边关注',
      candidateSummary: '该线索围绕揭幕战前夏奇拉的彩排和场边花絮展开。',
    };
  }

  if (/spain s 2010 world cup winners|where are they now/.test(text)) {
    return {
      action: 'history_generic',
      object: '2010 西班牙冠军回顾',
      candidateTitle: '外媒回顾2010年西班牙世界杯冠军成员现状',
      candidateSummary: '该线索回顾西班牙 2010 年世界杯冠军班底的后续发展。',
    };
  }

  if (/laboured lionesses|women s world cup|world cup 2027|bleues/.test(text)) {
    return {
      action: 'irrelevant_other_football',
      object: '女足或非本届赛事',
      candidateTitle: '',
      candidateSummary: '',
    };
  }

  if (/brittney sykes|connecticut sun|commissioner s cup|toronto tempo|wnba/.test(text)) {
    return {
      action: 'irrelevant_other_football',
      object: '???????????????',
      candidateTitle: '',
      candidateSummary: '',
    };
  }

  if (/mexico s jim[e?]nez signs deal to return to wolves|quest to score 1,000 goals/.test(text)) {
    return {
      action: 'irrelevant_other_football',
      object: '???????????????',
      candidateTitle: '',
      candidateSummary: '',
    };
  }

  if (/man city|transfer news|premier league|ligue 1 2026-2027|ipswich|m[aá]laga|betis lanza su campaña|barcelona keep or dump|soccer transfer news and rumors|walker powers the cardinals/.test(text)) {
    return {
      action: 'irrelevant_other_football',
      object: '俱乐部或其他项目新闻',
      candidateTitle: '',
      candidateSummary: '',
    };
  }

  if ((/eight red cards|chaos reigns as usa edge brazil/.test(text)) && (/uswnt|emma hayes|women/.test(text) || !/world cup|mundial|2026|fifa/.test(text + ' ' + item.url))) {
    return {
      action: 'irrelevant_other_football',
      object: '??????????',
      candidateTitle: '',
      candidateSummary: '',
    };
  }

  if (/eight red cards|chaos reigns as usa edge brazil/.test(text)) {
    return {
      action: 'chaotic_match',
      object: '红牌混战',
      candidateTitle: '美国队在八码红牌乱战中险胜巴西',
      candidateSummary: '该线索围绕美国队与巴西队比赛中出现的大量红牌与混乱场面展开。',
    };
  }

  if (/two stars who have made their case to start|made their case to start/.test(text) && text.includes('england')) {
    return {
      action: 'starting_xi_competition',
      object: '首发竞争',
      candidateTitle: '两名英格兰球员在热身赛后提升首发机会',
      candidateSummary: '该线索聚焦英格兰热身赛后首发竞争格局的变化。',
    };
  }

  if (/jordan pickford.*wife megan.*nails/.test(text) || /wife megan shows off her new england nails/.test(text)) {
    return {
      action: 'fan_culture',
      object: '家属助威',
      candidateTitle: '皮克福德妻子以英格兰主题美甲为球队助威',
      candidateSummary: '该线索反映世界杯开赛前围绕英格兰队的场外助威氛围。',
    };
  }

  if (/1986 world cup|hand of god|diego maradona/.test(text)) {
    return {
      action: 'history_generic',
      object: '1986 世界杯回顾',
      candidateTitle: '英媒回顾马拉多纳与1986墨西哥世界杯的传奇往事',
      candidateSummary: '该线索以历史回顾方式重访 1986 年墨西哥世界杯的经典记忆。',
    };
  }

  if (/betting south africa/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '南非首战前景',
      candidateTitle: '南非队揭幕战赔率与投注热度受到关注',
      candidateSummary: '该线索主要围绕南非队在揭幕战前的赔率与投注走势。',
    };
  }

  if (/the morning poll/.test(text) && text.includes('world cup')) {
    return {
      action: 'fan_activity',
      object: '球迷即时投票',
      candidateTitle: '英媒发起球迷对世界杯期待度的即时投票',
      candidateSummary: '该线索反映开赛前球迷对世界杯关注度与参与热情。',
    };
  }

  if (/bbc director of sport defends controversial work-from-home world cup plans/.test(text)) {
    return {
      action: 'media_operations',
      object: '媒体报道方案',
      candidateTitle: 'BBC为世界杯远程办公报道方案辩护并确认决赛主持人',
      candidateSummary: '该线索围绕 BBC 的世界杯报道安排与主持阵容展开。',
    };
  }
  if (/roldan: usmnt can t be too honest vs\. paraguay/.test(text)) {
    return {
      action: 'match_preview',
      object: '??????????',
      candidateTitle: '????????????????????????????',
      candidateSummary: '??????????????????????????',
    };
  }


  if (/report: iran s world cup team plots against america/.test(text)) {
    return {
      action: 'political_commentary',
      object: '美伊对立叙事',
      candidateTitle: '英媒借伊朗队话题渲染与美国有关的紧张叙事',
      candidateSummary: '该线索主要反映世界杯前围绕伊朗与美国的敏感舆论。',
    };
  }

  if (/integrity of world cup 2026 planning|allocation withdrawal/.test(text) && text.includes('iran')) {
    return {
      action: 'event_operations',
      object: '???????????',
      candidateTitle: '??????????????????????????',
      candidateSummary: '???????????????????????????????????????????',
    };
  }

  if (/christophe gleizes|symboliquement accredit[eé]/.test(text)) {
    return {
      action: 'media_access',
      object: '象征性采访证',
      candidateTitle: '被囚法国记者获得世界杯象征性采访证',
      candidateSummary: '该线索围绕一名被关押记者获得世界杯采访资格的象征性举动展开。',
    };
  }

  if (/socceroos star reveals why he doesn t want his family/.test(text)) {
    return {
      action: 'family_story',
      object: '家人观赛顾虑',
      candidateTitle: '澳大利亚国脚解释为何不希望家人现场观看世界杯比赛',
      candidateSummary: '该线索聚焦球员在世界杯前对家人现场观赛的顾虑。',
    };
  }

  if (/deadly virus with no vaccine|ebola/.test(text) && text.includes('world cup')) {
    return {
      action: 'public_health',
      object: '公共卫生风险',
      candidateTitle: '世界杯主办地的公共卫生风险引发担忧',
      candidateSummary: '该线索围绕可能影响世界杯举办环境的公共卫生隐忧展开。',
    };
  }

  if (/norway s incredible viking world cup team photo/.test(text)) {
    return {
      action: 'fan_culture',
      object: '球队合影争议',
      candidateTitle: '挪威队维京主题世界杯合影因巨额现金道具再起争议',
      candidateSummary: '该线索围绕挪威队世界杯主题宣传照所引发的争议展开。',
    };
  }

  if (/sweden s new sheriff|graham potter shows off cowboy look/.test(text)) {
    return {
      action: 'fan_culture',
      object: '得州入乡随俗',
      candidateTitle: '瑞典主帅以牛仔造型亮相得州为世界杯预热',
      candidateSummary: '该线索聚焦瑞典队在得州备战期间的场外形象包装。',
    };
  }

  if (/usmnt 2026 world cup schedule|potential opponents and venues/.test(text)) {
    return {
      action: 'schedule_guide',
      object: '赛程与场地',
      candidateTitle: '美国队世界杯赛程、潜在对手与比赛场地一览',
      candidateSummary: '该线索整理美国队本届世界杯的小组赛路径、潜在对手与举办场地。',
    };
  }

  if (/raphinha backs vinicius jr|brazil s sixth world cup/.test(text)) {
    return {
      action: 'star_form',
      object: '争冠核心',
      candidateTitle: '拉菲尼亚看好维尼修斯带领巴西冲击第六冠',
      candidateSummary: '该线索围绕巴西队训练营中对维尼修斯作用的评价展开。',
    };
  }

  if (/acompanhe as not[ií]cias de sele[cç][aã]o|ultimas not[ií]cias de sele[cç][aã]o/.test(text)) {
    return {
      action: 'news_hub',
      object: '葡萄牙队动态汇总',
      candidateTitle: '葡媒持续汇总葡萄牙队世界杯最新动态',
      candidateSummary: '该线索属于葡萄牙国家队的赛前新闻、采访与视频动态汇总。',
    };
  }

  if (/thursdays top stories also include|first manchester united transfer of the summer/.test(text)) {
    return {
      action: 'irrelevant_other_football',
      object: '俱乐部转会新闻',
      candidateTitle: '',
      candidateSummary: '',
    };
  }

  if (/scaloneta|argentina \(v[ií]deo\)/.test(text)) {
    return {
      action: 'team_momentum',
      object: '争冠氛围',
      candidateTitle: '葡媒称“斯卡洛尼战车”继续托起阿根廷争冠希望',
      candidateSummary: '该线索围绕阿根廷队延续冠军班底与争冠气氛展开。',
    };
  }

  if (/five questions facing the usmnt/.test(text)) {
    return {
      action: 'pre_tournament_questions',
      object: '五个关键疑问',
      candidateTitle: '世界杯开赛前美国队仍有五个关键疑问待解',
      candidateSummary: '该线索梳理美国队在世界杯开赛前最受关注的五个问题。',
    };
  }

  if (/american soccer still has a global stigma/.test(text)) {
    return {
      action: 'host_impact',
      object: '国家形象与足球认知',
      candidateTitle: '美国希望借本届世界杯改写外界对本土足球的刻板印象',
      candidateSummary: '该线索讨论美国足球在全球语境中的形象与主办世界杯带来的变化机会。',
    };
  }

  if (/can t be too honest.*paraguay|roldan/.test(text)) {
    return {
      action: 'match_preview',
      object: '对阵巴拉圭策略',
      candidateTitle: '罗尔丹提醒美国队对阵巴拉圭时不能踢得过于直接',
      candidateSummary: '该线索聚焦美国队赛前对巴拉圭的战术提醒与比赛取向。',
    };
  }

  if (/birthday boy hickey|dream to be playing at world cup/.test(text)) {
    return {
      action: 'player_focus',
      object: '世界杯梦想',
      candidateTitle: '希基在生日当天表示参加世界杯是梦想成真',
      candidateSummary: '该线索围绕球员在世界杯开赛前的个人心态与成长故事展开。',
    };
  }

  if (/next world cup stars|wonderkid|galactico/.test(text)) {
    return {
      action: 'player_focus',
      object: '潜在新星',
      candidateTitle: '英媒盘点可能在本届世界杯成名的潜力新星',
      candidateSummary: '该线索关注有望借世界杯舞台提升身价或名气的年轻球员。',
    };
  }

  if (/mexican wonderkid|who will shine/.test(text)) {
    return {
      action: 'player_focus',
      object: '潜在亮点球员',
      candidateTitle: '外媒热议哪些球员可能在本届世界杯脱颖而出',
      candidateSummary: '该线索围绕潜在黑马与可能一战成名的球员展开讨论。',
    };
  }

  if (/misterio en argentina/.test(text)) {
    return {
      action: 'team_momentum',
      object: '赛前悬念',
      candidateTitle: '阿根廷队赛前仍留下一道悬念',
      candidateSummary: '该线索聚焦阿根廷队在世界杯前仍未完全明朗的关键问题。',
    };
  }

  if (/a la oranje no la exprimen antes del 90/.test(text)) {
    return {
      action: 'team_style',
      object: '末段发力特点',
      candidateTitle: '西媒称荷兰队往往在比赛最后阶段才真正发力',
      candidateSummary: '该线索围绕荷兰队比赛节奏与末段冲击力展开观察。',
    };
  }

  if (/espa[nñ]a gan[oó] su primer partido del mundial a holanda y alemania/.test(text)) {
    return {
      action: 'team_momentum',
      object: '心理优势',
      candidateTitle: '西媒称西班牙在气势上先赢了荷兰和德国',
      candidateSummary: '该线索以评论角度讨论西班牙在世界杯开赛前的心理与舆论优势。',
    };
  }

  if (/morata/.test(text) && /mundial 2026/.test(text)) {
    return {
      action: 'player_focus',
      object: '中锋角色',
      candidateTitle: '莫拉塔在世界杯前仍是西班牙锋线焦点人物',
      candidateSummary: '该线索围绕莫拉塔在西班牙队中的角色与期待展开。',
    };
  }

  if (/milmillonario/.test(text) && /mundial/.test(text)) {
    return {
      action: 'event_operations',
      object: '商业规模',
      candidateTitle: '西媒关注本届世界杯背后的庞大商业体量',
      candidateSummary: '该线索围绕世界杯的商业收益、投入规模与经济影响展开。',
    };
  }

  if (/sigue el partido de hoy en directo|en vivo y directo|live commentary|live score/.test(text) && /marcador|goles|jugadas|resultado|esperaremos a que empiece|we ll show|offer them once it starts/.test(text)) {
    return {
      action: 'non_topic_page',
      object: '?????',
      candidateTitle: '',
      candidateSummary: '????????????????????????????????????',
    };
  }

  if (/the 10 best forwards at the 2026 world cup/.test(text)) {
    return {
      action: 'player_ranking',
      object: '前锋榜单',
      candidateTitle: '外媒评选本届世界杯十佳前锋',
      candidateSummary: '该线索围绕本届世界杯最受关注的前锋人选展开排序。',
    };
  }

  if (/10 chelsea transfer targets to watch at the 2026 world cup/.test(text)) {
    return {
      action: 'player_focus',
      object: '引援观察名单',
      candidateTitle: '切尔西把十名世界杯参赛球员列为重点考察对象',
      candidateSummary: '该线索从俱乐部视角盘点在世界杯舞台值得关注的潜在引援对象。',
    };
  }

  if (/2026 world cup base camps|training sites confirmed/.test(text)) {
    return {
      action: 'team_bases',
      object: '训练基地',
      candidateTitle: '各队世界杯大本营与训练基地安排已经确认',
      candidateSummary: '该线索整理各支参赛队在本届世界杯的驻地与训练安排。',
    };
  }

  if (/ars[eè]ne wenger claims kylian mbapp[eé] will win world cup/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '法国争冠前景',
      candidateTitle: '温格看好姆巴佩带领法国赢得世界杯',
      candidateSummary: '该线索围绕温格对法国队与姆巴佩前景的公开判断展开。',
    };
  }

  if (/breaking down 1 world cup player to watch from all 48 teams/.test(text)) {
    return {
      action: 'player_focus',
      object: '各队焦点球员',
      candidateTitle: '外媒为48支参赛队各选出一名值得关注的球员',
      candidateSummary: '该线索盘点每支世界杯球队最值得留意的一名球员。',
    };
  }

  if (/the art of defending/.test(text) && /world cup defender/.test(text)) {
    return {
      action: 'tactical_explainer',
      object: '防守要点',
      candidateTitle: '前美国国脚解析世界杯顶级后卫需要具备的能力',
      candidateSummary: '该线索以战术讲解形式分析世界杯级别防守球员的关键能力。',
    };
  }

  if (/messi, mbapp[eé], greatness: the 2022 final/.test(text)) {
    return {
      action: 'history_generic',
      object: '2022 决赛回顾',
      candidateTitle: '外媒把2022年决赛列为最难忘的世界杯瞬间',
      candidateSummary: '该线索回顾梅西、姆巴佩与 2022 年决赛留下的经典记忆。',
    };
  }

  if (/final world cup power rankings|power rankings before the tournament begins/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '争冠实力榜',
      candidateTitle: '世界杯开赛前最终实力榜出炉',
      candidateSummary: '该线索汇总多支争冠球队在开赛前的实力排序。',
    };
  }

  if (/world cup rank: the 50 best players/.test(text)) {
    return {
      action: 'player_ranking',
      object: '球员榜单',
      candidateTitle: '外媒列出本届世界杯50大球员榜单',
      candidateSummary: '该线索围绕本届世界杯最受瞩目的球员排名展开。',
    };
  }

  if (/sal[a?]rios dos [a?]rbitros no mundial/.test(text)) {
    return {
      action: 'referee_assignment',
      object: '??????',
      candidateTitle: '?????????????????????????',
      candidateSummary: '??????????????????????????????????????',
    };
  }

  if (/saiba quem s[a?]o os jogadores que mais valorizaram/.test(text)) {
    return {
      action: 'player_market',
      object: '?????????',
      candidateTitle: '???????????????????????????',
      candidateSummary: '????????????????????????????????????????????????????',
    };
  }

  if (/m[e?]xico sem plano para conter propaga[c?][a?]o do [?e]bola/.test(text)) {
    return {
      action: 'public_health',
      object: '??????????????',
      candidateTitle: '????????????????????????????????',
      candidateSummary: '??????????????????????????????????????????????',
    };
  }

  if (/vai dar portugal/.test(text) && text.includes('mundial')) {
    return {
      action: 'team_momentum',
      object: '??????',
      candidateTitle: '????????????????????',
      candidateSummary: '??????????????????????????????????????????',
    };
  }

  if (/lamine yamal/.test(text) && /record-valued 2026 world cup|golden touch/.test(text)) {
    return {
      action: 'player_focus',
      object: '超级新星身价与表现',
      candidateTitle: '外媒把亚马尔视作本届世界杯最受瞩目的高身价新星之一',
      candidateSummary: '该线索围绕亚马尔的天赋、身价和他在本届世界杯上的关注度展开。',
    };
  }

  if (/time for the soccer to do the talking/.test(text)) {
    return {
      action: 'tournament_guide',
      object: '开赛前氛围',
      candidateTitle: '外媒认为世界杯开赛后应让比赛本身成为主角',
      candidateSummary: '该线索强调开赛后球场表现将取代赛前喧嚣与争议。',
    };
  }

  if (/predicting the usmnt s world cup six months out/.test(text)) {
    return {
      action: 'squad_projection',
      object: '名单推演',
      candidateTitle: '外媒提前推演美国队世界杯名单构成',
      candidateSummary: '该线索围绕美国队世界杯名单与阵容结构的提前预测展开。',
    };
  }

  if (/mexico mexico versus south africa south africa/.test(text)) {
    return {
      action: 'match_preview',
      object: '揭幕战',
      candidateTitle: '墨西哥对南非揭幕战赛前信息汇总',
      candidateSummary: '该线索对应世界杯揭幕战墨西哥对南非的赛前信息页面。',
    };
  }

  if (/usmnt adapt to pochettino s attack-minded style/.test(text)) {
    return {
      action: 'tactics',
      object: '进攻风格调整',
      candidateTitle: '美国队正在适应波切蒂诺强调进攻的世界杯踢法',
      candidateSummary: '该线索围绕美国队在世界杯前对波切蒂诺进攻思路的适应展开。',
    };
  }

  if (/world cup power rankings: usmnt lurk in 12th, spain atop/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '争冠实力榜',
      candidateTitle: '世界杯实力榜看好西班牙领跑，美国队暂列第12',
      candidateSummary: '该线索围绕开赛前各队争冠实力排序展开。',
    };
  }

  if (/somali ref omar abdulkadir artan denied u\.s\. entry|somali ref omar abdulkadir artan denied u s entry/.test(text)) {
    return {
      action: 'entry_barred',
      object: '???????????',
      candidateTitle: '??????????????????????????????????',
      candidateSummary: '?????????????????????????????????????????',
    };
  }

  if (/d.?zeko, ronaldo, modric .*over-40 players at the world cup/.test(text)) {
    return {
      action: 'player_focus',
      object: '??????',
      candidateTitle: '?????????????????????????????????',
      candidateSummary: '???????????????????????????????????????????????????',
    };
  }

  if (/richards trains fully but adams misses through load management/.test(text)) {
    return {
      action: 'injury_monitoring',
      object: '训练负荷管理',
      candidateTitle: '理查兹已恢复完整训练，亚当斯因负荷管理缺席',
      candidateSummary: '该线索围绕美国队关键球员的训练状态与出勤安排展开。',
    };
  }

  if (/di maria grows argentina legend with heroic display/.test(text)) {
    return {
      action: 'star_form',
      object: '老将表现',
      candidateTitle: '迪马利亚用关键表现继续巩固阿根廷传奇地位',
      candidateSummary: '该线索聚焦迪马利亚在世界杯前后的关键贡献与象征意义。',
    };
  }

  if (/messi scores in return as argentina look to wcup/.test(text)) {
    return {
      action: 'star_form',
      object: '复出进球',
      candidateTitle: '梅西复出进球后阿根廷继续朝世界杯冲刺',
      candidateSummary: '该线索围绕梅西复出后的状态与阿根廷备战展开。',
    };
  }

  if (/rodrigo de paul/.test(text) && /argentina siempre es candidata/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '争冠信心',
      candidateTitle: '德保罗称阿根廷始终是世界杯夺冠候选',
      candidateSummary: '该线索围绕阿根廷队内对争冠前景的公开表态展开。',
    };
  }

  if (/oliver sonne/.test(text) && /hait[ií] y espa[nñ]a/.test(text)) {
    return {
      action: 'player_focus',
      object: '热身赛表现',
      candidateTitle: '外媒复盘奥利弗·索内对海地和西班牙时的表现',
      candidateSummary: '该线索围绕球员在两场世界杯相关比赛中的发挥展开。',
    };
  }

  if (/the world cup shortlist/.test(text) && /eight-game grind/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '长赛程耐力',
      candidateTitle: '外媒分析谁能撑过世界杯八码密集赛程',
      candidateSummary: '该线索围绕漫长赛程下哪些球队更有韧性展开讨论。',
    };
  }

  if (/meet the world cup s potential breakout stars/.test(text)) {
    return {
      action: 'player_focus',
      object: '潜在爆发新星',
      candidateTitle: '外媒盘点本届世界杯可能爆发的新星',
      candidateSummary: '该线索聚焦可能借世界杯一战成名的年轻球员。',
    };
  }

  if (/harry kane s last ever shot at international glory/.test(text)) {
    return {
      action: 'player_focus',
      object: '最后冲冠机会',
      candidateTitle: '外媒追问这是否是凯恩最后一次冲击国家队大赛荣誉',
      candidateSummary: '该线索围绕凯恩在国家队层面的最后争冠窗口展开。',
    };
  }

  if (/mbappe s reputation only grows in world cup loss/.test(text)) {
    return {
      action: 'star_form',
      object: '声望提升',
      candidateTitle: '即使失利，姆巴佩在世界杯舞台上的声望仍在上升',
      candidateSummary: '该线索讨论姆巴佩即便在输球场景中仍持续提升的个人声望。',
    };
  }

  if (/dzeko.*ronaldo.*modric.*over-40 players/.test(text)) {
    return {
      action: 'player_focus',
      object: '高龄老将',
      candidateTitle: '外媒解读为何本届世界杯仍有多名高龄老将',
      candidateSummary: '该线索围绕多位年龄偏大的球员继续出战世界杯的原因展开。',
    };
  }

  if (/world cup record that will be broken three times in first week/.test(text)) {
    return {
      action: 'record_milestone',
      object: '纪录刷新',
      candidateTitle: '外媒预测某项世界杯纪录将在首周被三次刷新',
      candidateSummary: '该线索围绕世界杯开赛首周可能被频繁打破的纪录展开。',
    };
  }

  if (/rating the biggest 2026 world cup ads/.test(text)) {
    return {
      action: 'fan_culture',
      object: '品牌广告战',
      candidateTitle: '外媒盘点本届世界杯最受关注的品牌广告战',
      candidateSummary: '该线索围绕世界杯期间 Adidas、Nike、可口可乐等品牌广告展开。',
    };
  }

  if (/predicting how all 48 men s world cup teams will do/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '全队走势预测',
      candidateTitle: '外媒逐场推演48支球队的世界杯走势',
      candidateSummary: '该线索围绕全部 48 支参赛队在本届世界杯的可能表现展开预测。',
    };
  }

  if (/simulating the men s world cup/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '模拟结果',
      candidateTitle: '模拟结果预测谁最可能赢得本届世界杯',
      candidateSummary: '该线索围绕数据模拟对世界杯冠军归属的预测展开。',
    };
  }

  if (/las pol[eé]micas del mundial 2026 antes de la inauguraci[oó]n/.test(text)) {
    return {
      action: 'event_operations',
      object: '开幕前争议',
      candidateTitle: '2026世界杯开幕前已累积多项争议',
      candidateSummary: '该线索汇总本届世界杯在开幕前的主要争议事项。',
    };
  }

  if (/cu[aá]nto subi[oó] el precio de los boletos.*1986.*2026/.test(text)) {
    return {
      action: 'ticket_issue',
      object: '票价变化',
      candidateTitle: '墨西哥世界杯门票价格较1986年显著上涨',
      candidateSummary: '该线索对比 1986 年与 2026 年世界杯门票价格变化。',
    };
  }

  if (/mercado negro de las monedas/.test(text)) {
    return {
      action: 'fan_culture',
      object: '纪念币交易',
      candidateTitle: '世界杯纪念币黑市交易开始升温',
      candidateSummary: '该线索聚焦世界杯纪念币在二级市场上的炒作现象。',
    };
  }

  if (/costar[aá]n alimentos y bebidas en inauguraci[oó]n/.test(text)) {
    return {
      action: 'ticket_issue',
      object: '现场消费',
      candidateTitle: '世界杯揭幕战现场餐饮价格据称较联赛日翻倍',
      candidateSummary: '该线索围绕揭幕战期间食品饮料价格上涨展开。',
    };
  }

  if (/pellistri/.test(text) && /uruguay no es candidato/.test(text)) {
    return {
      action: 'odds_prediction',
      object: '乌拉圭争冠信心',
      candidateTitle: '佩利斯特里称没有球队愿在世界杯碰上乌拉圭',
      candidateSummary: '该线索围绕乌拉圭队内对世界杯竞争力的自信表态展开。',
    };
  }

  if (/maxi ara[uú]jo/.test(text) && /ilusionada como nosotros/.test(text)) {
    return {
      action: 'team_momentum',
      object: '队内期待',
      candidateTitle: '阿劳霍称乌拉圭队和球迷一样对世界杯充满期待',
      candidateSummary: '该线索围绕乌拉圭队启程前的队内情绪与外界期待展开。',
    };
  }

  if (/uruguay al mundial|parti[oó] rumbo a playa del carmen/.test(text)) {
    return {
      action: 'arrival_preparation',
      object: '驻地启程',
      candidateTitle: '乌拉圭队已启程前往普拉亚德尔卡门建立世界杯基地',
      candidateSummary: '该线索围绕乌拉圭队前往世界杯驻地的行程安排展开。',
    };
  }

  if (/sud[aá]frica ya est[aá] en la cdmx/.test(text)) {
    return {
      action: 'arrival_preparation',
      object: '揭幕战备战',
      candidateTitle: '南非队已抵达墨西哥城准备揭幕战',
      candidateSummary: '该线索围绕南非队抵达主办城市后的揭幕战备战展开。',
    };
  }

  if (/michael olise se perfila como pieza clave/.test(text)) {
    return {
      action: 'player_focus',
      object: '关键变招',
      candidateTitle: '奥利塞被视为法国队在世界杯上的关键变招',
      candidateSummary: '该线索围绕奥利塞在法国队中的战术作用展开。',
    };
  }

  if (/enner valencia asegur[oó]/.test(text)) {
    return {
      action: 'injury_return',
      object: '首战可出场',
      candidateTitle: '恩纳·瓦伦西亚表示自己已准备好出战世界杯首战',
      candidateSummary: '该线索围绕厄瓜多尔前锋的身体状态与首战出勤展开。',
    };
  }

  if (/qu[eé] tan importante ser[aá] el primer partido.*ecuador/.test(text)) {
    return {
      action: 'group_outlook',
      object: '首战重要性',
      candidateTitle: '厄瓜多尔把世界杯首战视为小组出线关键',
      candidateSummary: '该线索围绕厄瓜多尔队对世界杯首战重要性的判断展开。',
    };
  }

  if (/madres buscadoras/.test(text) && /mundial/.test(text)) {
    return {
      action: 'political_commentary',
      object: '社会抗议',
      candidateTitle: '世界杯开幕前墨西哥发生与寻亲群体相关的道路抗议',
      candidateSummary: '该线索反映世界杯开幕前主办地周边的社会抗议事件。',
    };
  }

  if (/m[ií]ster mundial es espa[nñ]ol/.test(text)) {
    return {
      action: 'player_focus',
      object: '代表性人物',
      candidateTitle: '西媒称本届世界杯最具代表性的人物来自西班牙',
      candidateSummary: '该线索围绕西班牙球员或教练在本届世界杯中的象征意义展开。',
    };
  }

  if (/excedente de entradas|reventa oficial/.test(text)) {
    return {
      action: 'ticket_issue',
      object: '官方转售',
      candidateTitle: '世界杯官方转售平台出现可流转余票',
      candidateSummary: '该线索围绕世界杯门票余量与官方转售渠道展开。',
    };
  }

  if (/futbolistas que no nacieron en el pa[ií]s que defienden/.test(text)) {
    return {
      action: 'player_focus',
      object: '跨国国脚',
      candidateTitle: '多名球员将在本届世界杯代表非出生国出战',
      candidateSummary: '该线索聚焦世界杯参赛球员中的跨国身份与归化背景。',
    };
  }

  if (/gregg berhalter sends emotional message to son/.test(text)) {
    return {
      action: 'family_story',
      object: '世界杯首秀前寄语',
      candidateTitle: '贝哈尔特在儿子世界杯首秀前送上寄语',
      candidateSummary: '该线索聚焦美国足球圈在世界杯前的家庭与情感故事。',
    };
  }

  if (/beginner s guide|everything you need to know to cheer on the usmnt/.test(text)) {
    return {
      action: 'fan_guide',
      object: '美国队观赛指南',
      candidateTitle: '美国队世界杯观赛入门指南集中上线',
      candidateSummary: '该线索整理支持美国队观赛所需的基础信息与赛程背景。',
    };
  }

  if (/world cup venues|which cities stadiums will host games/.test(text)) {
    return {
      action: 'venue_guide',
      object: '举办城市与球场',
      candidateTitle: '本届世界杯举办城市与比赛球场名单出炉',
      candidateSummary: '该线索围绕世界杯在美国、加拿大和墨西哥的举办城市与球场分布展开。',
    };
  }

  if (/match day 1|kick off tournament/.test(text) && /mexico|south africa|south korea|czechia/.test(text)) {
    return {
      action: 'opening_day',
      object: '首个比赛日',
      candidateTitle: '世界杯首个比赛日由墨西哥、南非、韩国和捷克揭幕',
      candidateSummary: '该线索围绕世界杯开赛首日的对阵安排与看点展开。',
    };
  }

  if (/energizer bunny|keeps things loose with usa s world cup squad/.test(text)) {
    return {
      action: 'team_culture',
      object: '队内气氛人物',
      candidateTitle: '美国队更衣室里的“气氛制造者”成为赛前话题',
      candidateSummary: '该线索聚焦美国队内帮助维持轻松氛围的人物与团队文化。',
    };
  }

  if (/noni madueke.*open goal.*world cup/.test(text)) {
    return {
      action: 'missed_chance',
      object: '首发竞争',
      candidateTitle: '马杜埃凯错失空门后仍在争夺英格兰首发位置',
      candidateSummary: '该线索围绕马杜埃凯在热身赛中的失误以及对首发竞争的影响展开。',
    };
  }

  if (/sofi stadium workers make final decision.*strike/.test(text)) {
    return {
      action: 'strike_cancelled',
      object: '世界杯期间罢工风险',
      candidateTitle: 'SoFi 球场员工在世界杯前决定取消罢工行动',
      candidateSummary: '该线索聚焦美国主办球场在世界杯前的劳工谈判结果。',
    };
  }

  if (/earthquake|tremors/.test(text) && text.includes('england') && text.includes('florida')) {
    return {
      action: 'training_camp_conditions',
      object: '训练营突发状况',
      candidateTitle: '英格兰队佛州训练营在世界杯前遭遇地震余波',
      candidateSummary: '该线索聚焦英格兰队赛前驻地遇到的突发环境状况。',
    };
  }

  if (/five-time major winner|world cup camp|baking florida heat/.test(text) && text.includes('england')) {
    return {
      action: 'training_camp_conditions',
      object: '训练营安排',
      candidateTitle: '英格兰队在佛州高温训练营中迎来特别来访者',
      candidateSummary: '该线索围绕英格兰队在佛州训练营的备战氛围与访客互动展开。',
    };
  }

  if (/tactical fuel advantage|carbohydrate pouches|theme nights/.test(text) && text.includes('england')) {
    return {
      action: 'training_camp_conditions',
      object: '后勤与恢复方案',
      candidateTitle: '英格兰队通过饮食与恢复方案争取备战优势',
      candidateSummary: '该线索聚焦英格兰队在世界杯前的营养、后勤和恢复安排。',
    };
  }

  if (/en contrôle contre une faible équipe du costa rica|fait le plein de confiance/.test(text)) {
    return {
      action: 'warmup_result',
      object: '热身赛信心提升',
      candidateTitle: '法媒称英格兰击败哥斯达黎加后信心明显回升',
      candidateSummary: '该线索围绕英格兰在最后一场热身赛后的状态回升展开。',
    };
  }

  if (/dr[oô]le de marathon [àa] mexico pour r[ée]cup[ée]rer les accr[ée]ditations/.test(text)) {
    return {
      action: 'logistics_issue',
      object: '媒体证件领取',
      candidateTitle: '墨西哥世界杯媒体证件领取流程过于漫长引发抱怨',
      candidateSummary: '该线索围绕媒体在墨西哥领取世界杯采访证件的流程问题展开。',
    };
  }

  if (/truth about world cup pitch problems|pitch problems/.test(text)) {
    return {
      action: 'pitch_quality',
      object: '场地质量争议',
      candidateTitle: '世界杯开赛前场地质量问题再次受到关注',
      candidateSummary: '该线索围绕世界杯球场草皮与比赛场地条件的争议展开。',
    };
  }

  if (/happy juice effect|peace prize|oblivious to world cup/.test(text) && text.includes('trump')) {
    return {
      action: 'political_commentary',
      object: '世界杯政治效应',
      candidateTitle: '英媒质疑特朗普能否借世界杯缓和政治对立',
      candidateSummary: '该线索从评论视角讨论世界杯的政治象征作用及美国政治环境。',
    };
  }

  if (/sunburnt|official world cup photos|official world cup photos/.test(text) && (text.includes('england') || team === '英格兰')) {
    return {
      action: 'training_camp_conditions',
      object: '佛州高温备战',
      candidateTitle: '英格兰队在佛州高温中完成世界杯官方拍摄',
      candidateSummary: '该线索关注英格兰队在佛州高温环境中的备战与官方拍摄情况。',
    };
  }

  if (/misfires in portugal s final game|wasted several clear cut chances/.test(text) && text.includes('ronaldo')) {
    return {
      action: 'star_form',
      object: '赛前状态',
      candidateTitle: 'C罗在葡萄牙最后一场热身赛中错失多次机会',
      candidateSummary: '该线索聚焦 C罗在世界杯前最后一场热身赛中的状态与角色讨论。',
    };
  }

  if (/presento la lista para el mundial|presentó la lista para el mundial|lista para el mundial/.test(text)) {
    return {
      action: 'squad_announced',
      object: team ? `${team}世界杯名单` : '世界杯名单发布',
      candidateTitle: team ? `${team}用发布视频公布世界杯名单` : '球队用发布视频公布世界杯名单',
      candidateSummary: firstSentence || '该线索围绕球队公布世界杯名单时的视频与传播方式展开。',
    };
  }

  if (/ticket practices|ticket allotment/.test(text)) {
    return {
      action: 'ticket_issue',
      object: '票务分配与售票安排',
      candidateTitle: '世界杯票务分配与售票安排引发争议',
      candidateSummary: '该线索主要围绕票务分配、售票规则或球迷购票权益展开。',
    };
  }

  if (/funcionario de ee uu|presuntos vinculos terroristas|vínculos terroristas/.test(text) && text.includes('omar artan')) {
    return {
      action: 'entry_barred',
      object: '签证被拒原因',
      candidateTitle: '美国官员称索马里裁判被拒入境涉及安全疑虑',
      candidateSummary: '该线索补充了索马里裁判无缘世界杯执法背后的美国官方说法。',
    };
  }

  if (/mensaje de messi|gol en el amistoso|regreso a la actividad/.test(text) && text.includes('messi')) {
    return {
      action: 'star_form',
      object: '复出与表态',
      candidateTitle: '梅西在复出进球后发文谈世界杯首战',
      candidateSummary: '该线索主要围绕梅西复出后的进球表现及赛前表态展开。',
    };
  }

  if (/marca record|récord|record que logro messi/.test(text) && text.includes('messi')) {
    return {
      action: 'record_milestone',
      object: '生涯纪录',
      candidateTitle: '梅西在世界杯前热身赛中再创阿根廷队史纪录',
      candidateSummary: '该线索聚焦梅西在世界杯前的热身赛中继续刷新个人与国家队纪录。',
    };
  }

  if (/dificultad del grupo mundialista|alcanzar la próxima ronda|fase de grupos/.test(text) && text.includes('ecuador')) {
    return {
      action: 'group_outlook',
      object: '小组出线前景',
      candidateTitle: '厄瓜多尔被看作身处艰难小组，出线前景承压',
      candidateSummary: '该线索围绕厄瓜多尔所在小组难度和晋级前景展开分析。',
    };
  }

  if (/arranca el mundial de trump/.test(text)) {
    return {
      action: 'political_commentary',
      object: '政治与主办国语境',
      candidateTitle: '西媒关注世界杯在特朗普政治语境下开幕',
      candidateSummary: '该线索以评论视角讨论世界杯开幕与美国国内外政治环境的交织。',
    };
  }

  if (/bruno guimaraes|ancelotti es muy inteligente/.test(text) && text.includes('brasil')) {
    return {
      action: 'coach_player_view',
      object: '教练与球队角色',
      candidateTitle: '布鲁诺·吉马良斯谈安切洛蒂执教巴西的更衣室管理',
      candidateSummary: '该线索聚焦巴西国脚对安切洛蒂执教方式和世界杯角色的评价。',
    };
  }

if (
  /la ciencia coreana frente al colectivo checo/.test(text) ||
  (
    /(south korea|korea republic|republic of korea|czechia|czech republic)/.test(text) &&
    /preview|ahead of|build-up|storylines|crucial clash|showdown/.test(text) &&
    !/2-1|1-0|3-0|comeback win|come from behind|beat|rallying from goal down|winning start|late winner|match report|post match/.test(text)
  )
) {
  return {
    action: 'match_preview',
    object: '韩国与捷克赛前对位',
    candidateTitle: '韩国队与捷克队赛前对位和比赛看点受到关注',
    candidateSummary: '该线索围绕韩国与捷克交锋前的人员对位、战术特点和小组赛首战前景展开。',
  };
}

  if (/no me arrepiento de que estados unidos organice el mundial/.test(text) && text.includes('infantino')) {
    return {
      action: 'fifa_press_conference',
      object: '主办决定辩护',
      candidateTitle: '因凡蒂诺为美国主办世界杯的决定辩护',
      candidateSummary: '该线索聚焦因凡蒂诺在赛前发布会上对世界杯主办安排的辩护。',
    };
  }

  if (/gran porra del mundial|vota cada dia|gana premios/.test(text)) {
    return {
      action: 'fan_activity',
      object: '竞猜活动',
      candidateTitle: '西媒围绕世界杯推出每日竞猜互动活动',
      candidateSummary: '该线索反映世界杯开赛前媒体通过竞猜活动吸引球迷参与。',
    };
  }

  if (/en contacto estrecho con todos sus internacionales|area medica|federaciones y los futbolistas/.test(text)) {
    return {
      action: 'injury_monitoring',
      object: '国脚身体监控',
      candidateTitle: '巴萨持续跟踪参加世界杯国脚的身体状况',
      candidateSummary: '该线索主要围绕俱乐部医疗团队对参加世界杯国脚的持续跟踪与沟通。',
    };
  }

  if (/message politique refus[eé] par la fifa|changer de maillots en urgence|haiti/.test(text)) {
    return {
      action: 'kit_issue',
      object: '球衣图案争议',
      candidateTitle: '海地队因球衣图案涉政治含义被要求赛前紧急换装',
      candidateSummary: '该线索围绕海地队世界杯球衣因被视为政治表达而被临时要求修改。',
    };
  }

  if (/contexte alarmant|peut etre sauv[eé]e? par le jeu|france part/.test(text)) {
    return {
      action: 'political_commentary',
      object: '争议环境下开幕',
      candidateTitle: '法媒关注世界杯在外交与票务争议中开幕',
      candidateSummary: '该线索从评论视角讨论世界杯在争议环境中的开幕氛围与竞技期待。',
    };
  }

  if (/conference de presse de gianni infantino|prix des billets|presidence de l iran/.test(text)) {
    return {
      action: 'fifa_press_conference',
      object: '票务与参赛争议',
      candidateTitle: '因凡蒂诺在赛前发布会上回应票务与伊朗参赛争议',
      candidateSummary: '该线索围绕因凡蒂诺赛前新闻发布会中的多个敏感议题展开。',
    };
  }

  return null;
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

export function inferEventFrame(item: NormalizedItem, matches: Match[]): EventFrame {
  const text = compactText(item);
  const subject = buildSubject(item, text);
  const context = buildContext(item, matches, text);
  const venues = extractVenues(`${item.title} ${item.summary} ${item.content_text ?? ''}`, matches);
  const detail = extractActionObject(item, matches);

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
