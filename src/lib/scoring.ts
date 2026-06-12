export interface ScoreInputs {
  sourceCount: number;
  sourceCountScore: number;
  recencyScore: number;
  crossRegionScore: number;
  sourcePriorityScore: number;
  matchRelevanceScore: number;
  isSeedExample?: boolean;
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function calculateHeatScore(inputs: ScoreInputs) {
  const evidenceCountScore = Math.min(100, inputs.sourceCount * 26);

  let score =
    inputs.sourceCountScore * 0.3 +
    evidenceCountScore * 0.05 +
    inputs.recencyScore * 0.25 +
    inputs.crossRegionScore * 0.2 +
    inputs.sourcePriorityScore * 0.1 +
    inputs.matchRelevanceScore * 0.1;

  if (inputs.sourceCount <= 1) {
    score = Math.min(score, 65);
  } else if (inputs.sourceCount === 2 && inputs.crossRegionScore < 60) {
    score = Math.min(score, 75);
  }

  if (inputs.isSeedExample) {
    score = Math.min(score, 55);
  }

  return Math.round(clamp(score));
}
