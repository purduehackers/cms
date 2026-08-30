import * as migration_20260421_051827_initial from './20260421_051827_initial';
import * as migration_20260602_072414 from './20260602_072414';
import * as migration_20260828_204401_events_site_integration from './20260828_204401_events_site_integration';
import * as migration_20260830_052607_drop_media_sizes from './20260830_052607_drop_media_sizes';

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
    name: '20260828_204401_events_site_integration',
  },
  {
    up: migration_20260830_052607_drop_media_sizes.up,
    down: migration_20260830_052607_drop_media_sizes.down,
    name: '20260830_052607_drop_media_sizes'
  },
];
