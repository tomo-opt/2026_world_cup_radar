import type { EntitiesSeed, Match, NormalizedItem } from '../src/lib/types';
import { inferEventFrame } from './event-frame';
import { containsAlias, findTeamByAlias, normalizeText, uniqueStrings } from './utils';

const LOCATION_NOT_TEAM_HINTS = ['entering usa', 'entry', 'visa', 'barred', 'banned', 'travel'];
const REFEREE_HINTS = ['referee', 'official', 'officiating', 'match official'];

function shouldSuppressTeamInference(item: Pick<NormalizedItem, 'title' | 'summary' | 'topic_terms'>) {
  const normalized = normalizeText(`${item.title} ${item.summary}`);
  const hasLocationHint = LOCATION_NOT_TEAM_HINTS.some((term) => normalized.includes(term));
  const hasRefereeHint =
    item.topic_terms.includes('referee_assignment') || REFEREE_HINTS.some((term) => normalized.includes(term));
  return hasLocationHint && hasRefereeHint;
}

function scoreMatch(match: Match, matchedTeams: string[], normalized: string) {
  const teamHits = [match.home_team, match.away_team].filter((team) => matchedTeams.includes(team)).length;
  const normalizedDisplayMatchup = normalizeText(match.display_matchup);
  const directMatchupHit = normalizedDisplayMatchup ? normalized.includes(normalizedDisplayMatchup) : false;

  let score = 0;

  if (teamHits === 2) score += 100;
  else if (teamHits === 1) score += 30;

  if (directMatchupHit) score += 80;

  return score;
}

function selectMatchedMatches(matches: Match[], matchedTeams: string[], normalized: string) {
  const scored = matches
    .map((match) => ({
      match_id: match.match_id,
      score: scoreMatch(match, matchedTeams, normalized),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [] as string[];

  const bestScore = scored[0].score;
  const bestMatches = scored.filter((entry) => entry.score === bestScore).map((entry) => entry.match_id);

  if (bestScore >= 100) {
    return bestMatches;
  }

  if (bestScore >= 80) {
    return bestMatches;
  }

  if (bestScore >= 30 && bestMatches.length === 1) {
    return bestMatches;
  }

  return [] as string[];
}

export async function matchEntities(
  items: Array<
    Omit<
      NormalizedItem,
      'matched_teams' | 'matched_players' | 'matched_matches' | 'entity_match_score' | 'event_frame' | 'event_fingerprint'
    >
  >,
  entities: EntitiesSeed,
  matches: Match[],
) {
  return Promise.all(
    items.map(async (item) => {
    const text = `${item.title} ${item.summary} ${item.content_text ?? ''}`;
    const normalized = normalizeText(text);
    const suppressTeamInference = shouldSuppressTeamInference(item);

    const matchedTeamEntities = suppressTeamInference ? [] : findTeamByAlias(entities.teams, text);
    const matchedTeams = uniqueStrings(matchedTeamEntities.map((team) => team.name_zh));

    const matchedPlayers = uniqueStrings(
      entities.players
        .filter((player) => player.aliases.some((alias) => containsAlias(normalized, alias)))
        .map((player) => player.name_zh ?? player.name),
    );

    const matchedMatches = selectMatchedMatches(matches, matchedTeams, normalized);

    const entityMatchScore = Math.min(
      100,
      matchedTeams.length * 22 + matchedPlayers.length * 32 + matchedMatches.length * 38,
    );

    const itemWithEntities: NormalizedItem = {
      ...item,
      matched_teams: matchedTeams,
      matched_players: matchedPlayers,
      matched_matches: matchedMatches,
      entity_match_score: entityMatchScore,
      event_frame: {
        subject: '',
        action: '',
        object: '',
        context: '',
        issue_type: item.topic_terms[0] ?? 'general',
        teams: [],
        players: [],
        venues: [],
        match_ids: [],
        event_fingerprint: '',
        confidence:
          item.extraction_level === 'public_article_text'
            ? 'high'
            : item.extraction_level === 'title_and_summary'
              ? 'medium'
              : 'low',
      },
      event_fingerprint: '',
    };

    const eventFrame = await inferEventFrame(itemWithEntities, matches);

    return {
      ...itemWithEntities,
      event_frame: eventFrame,
      event_fingerprint: eventFrame.event_fingerprint,
      low_confidence_reason: item.low_confidence_reason ?? null,
    };
    }),
  );
}
