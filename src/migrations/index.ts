import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20260121_190126 from './20260121_190126';
import * as migration_20260129_203122 from './20260129_203122';
import * as migration_20260203_004323 from './20260203_004323';
import * as migration_20260203_004818 from './20260203_004818';
import * as migration_20260203_010158 from './20260203_010158';
import * as migration_20260203_021108 from './20260203_021108';
import * as migration_20260211_155629 from './20260211_155629';
import * as migration_20260211_190033 from './20260211_190033';
import * as migration_20260211_190742 from './20260211_190742';
import * as migration_20260211_203449 from './20260211_203449';

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
    name: '20260203_004323',
  },
  {
    up: migration_20260203_004818.up,
    down: migration_20260203_004818.down,
    name: '20260203_004818',
  },
  {
    up: migration_20260203_010158.up,
    down: migration_20260203_010158.down,
    name: '20260203_010158',
  },
  {
    up: migration_20260203_021108.up,
    down: migration_20260203_021108.down,
    name: '20260203_021108',
  },
  {
    up: migration_20260211_155629.up,
    down: migration_20260211_155629.down,
    name: '20260211_155629',
  },
  {
    up: migration_20260211_190033.up,
    down: migration_20260211_190033.down,
    name: '20260211_190033',
  },
  {
    up: migration_20260211_190742.up,
    down: migration_20260211_190742.down,
    name: '20260211_190742',
  },
  {
    up: migration_20260211_203449.up,
    down: migration_20260211_203449.down,
    name: '20260211_203449'
  },
];
