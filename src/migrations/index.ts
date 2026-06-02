import * as migration_20260421_051827_initial from './20260421_051827_initial';
import * as migration_20260602_072414 from './20260602_072414';

export const migrations = [
  {
    up: migration_20260421_051827_initial.up,
    down: migration_20260421_051827_initial.down,
    name: '20260421_051827_initial',
  },
  {
    up: migration_20260602_072414.up,
    down: migration_20260602_072414.down,
    name: '20260602_072414'
  },
];
