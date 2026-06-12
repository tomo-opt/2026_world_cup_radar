import path from 'node:path';
import { copyIfMissing, ensureDirs, getPublicDataPath, readSourcesConfig, writeJsonFile } from './utils';

async function main() {
  await ensureDirs();

  await Promise.all([
    copyIfMissing(
      path.join(process.cwd(), 'new_world_cup_hotspot_sources_completed_utf8.csv'),
      path.join(process.cwd(), 'data', 'sources', 'new_world_cup_hotspot_sources_completed_utf8.csv'),
    ),
    copyIfMissing(
      path.join(process.cwd(), 'world_cup_radar_mvp_source_whitelist_utf8.csv'),
      path.join(process.cwd(), 'data', 'sources', 'world_cup_radar_mvp_source_whitelist_utf8.csv'),
    ),
    copyIfMissing(
      path.join(process.cwd(), 'world_cup_radar_mvp_sources_config.json'),
      path.join(process.cwd(), 'data', 'sources', 'world_cup_radar_mvp_sources_config.json'),
    ),
  ]);

  const config = await readSourcesConfig();
  await writeJsonFile(getPublicDataPath('sources.json'), config.sources);
  console.log(`Wrote ${config.sources.length} sources to public/data/sources.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
