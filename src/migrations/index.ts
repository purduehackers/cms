import * as migration_20260421_051827_initial from './20260421_051827_initial';
import * as migration_20260602_072414 from './20260602_072414';
import * as migration_20260828_204401_events_site_integration from './20260828_204401_events_site_integration';

export const migrations = [
  {
    up: migration_20260421_051827_initial.up,
    down: migration_20260421_051827_initial.down,
    name: '20260421_051827_initial',
  },
  {
    up: migration_20260602_072414.up,
    down: migration_20260602_072414.down,
    name: '20260602_072414',
  },
  {
    up: migration_20260828_204401_events_site_integration.up,
    down: migration_20260828_204401_events_site_integration.down,
    name: '20260828_204401_events_site_integration'
  },
];
