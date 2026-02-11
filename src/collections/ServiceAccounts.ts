import { CollectionConfig } from 'payload'
import { isAdmin, nobody, RolesField } from './auth-utils'

export const ServiceAccounts: CollectionConfig = {
  slug: 'service-accounts',
  admin: {
    description: 'Service Accounts (API keys)',
    useAsTitle: 'name',
  },
  auth: {
    useAPIKey: true,
    disableLocalStrategy: true,
  },
  access: {
    admin: nobody,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    read: isAdmin,
    readVersions: isAdmin,
    unlock: isAdmin,
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'revoked',
      label: 'Revoked',
      type: 'checkbox',
      admin: {
        description: 'Check to revoke the API key',
      },
    },
    RolesField,
  ],
}
