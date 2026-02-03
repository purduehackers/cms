import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20260121_190126 from './20260121_190126';
import * as migration_20260129_203122 from './20260129_203122';
import * as migration_20260203_004323 from './20260203_004323';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20260121_190126.up,
    down: migration_20260121_190126.down,
    name: '20260121_190126',
  },
  {
    up: migration_20260129_203122.up,
    down: migration_20260129_203122.down,
    name: '20260129_203122',
  },
  {
    up: migration_20260203_004323.up,
    down: migration_20260203_004323.down,
    name: '20260203_004323'
  },
];
