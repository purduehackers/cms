import type { CollectionConfig } from 'payload'
import { adminOrSelf, isAdmin, isViewer, RolesField } from './auth-utils'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Administration',
  },
  auth: {
    useAPIKey: true,
  },
  access: {
    create: isAdmin,
    update: adminOrSelf,
    delete: adminOrSelf,
    read: isViewer,
    readVersions: isViewer,
    unlock: isAdmin,
  },
  fields: [
    // Email added by default
    // Add more fields as needed
    RolesField,
  ],
}
