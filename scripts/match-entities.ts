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

export function matchEntities(
  items: Array<
    Omit<
      NormalizedItem,
      'matched_teams' | 'matched_players' | 'matched_matches' | 'entity_match_score' | 'event_frame' | 'event_fingerprint'
    >
  >,
  entities: EntitiesSeed,
  matches: Match[],
) {
  return items.map((item) => {
    const text = `${item.title} ${item.summary} ${item.content_text ?? ''}`;
    const normalized = normalizeText(text);
    const suppressTeamInference = shouldSuppressTeamInference(item);

    const matchedTeamEntities = suppressTeamInference ? [] : findTeamByAlias(entities.teams, text);
    const matchedTeams = matchedTeamEntities.map((team) => team.name_zh);
    const matchedPlayers = entities.players
      .filter((player) => player.aliases.some((alias) => containsAlias(normalized, alias)))
      .map((player) => player.name_zh ?? player.name);

    const matchedMatches = matches
      .filter((match) => {
        const directTeamHit = matchedTeams.includes(match.home_team) || matchedTeams.includes(match.away_team);
        const directMatchupHit = normalized.includes(normalizeText(match.display_matchup));
        return directTeamHit || directMatchupHit;
      })
      .map((match) => match.match_id);

    const entityMatchScore = Math.min(100, matchedTeams.length * 22 + matchedPlayers.length * 32 + matchedMatches.length * 38);

    const itemWithEntities: NormalizedItem = {
      ...item,
      matched_teams: uniqueStrings(matchedTeams),
      matched_players: uniqueStrings(matchedPlayers),
      matched_matches: uniqueStrings(matchedMatches),
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

    const eventFrame = inferEventFrame(itemWithEntities, matches);

    return {
      ...itemWithEntities,
      event_frame: eventFrame,
      event_fingerprint: eventFrame.event_fingerprint,
      low_confidence_reason: item.low_confidence_reason ?? null,
    };
  });
}
