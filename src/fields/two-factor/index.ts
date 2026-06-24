import type { Field } from 'payload'

/**
 * Returns the Payload fields to inject into the target auth collection.
 * The UI field points to the client component via the
 * `@plutotcool/payload-plugin-two-factor/client#TwoFactorFieldComponent`
 * import map entry.
 */
export function buildTwoFactorFields(): Field[] {
  return [
    {
      type: 'row',
      fields: [
        {
          name: 'twoFactorSecret',
          type: 'text',
          access: {
            read: () => false,
            create: () => false,
            update: () => false,
          },
          admin: { hidden: true },
        },
        {
          name: 'twoFactorEnabled',
          type: 'checkbox',
          defaultValue: false,
          saveToJWT: true,
          access: {
            read: ({ req }) => !!req.user,
            create: () => false,
            update: () => false,
          },
          admin: { hidden: true },
        },
        {
          name: 'twoFactorPending',
          type: 'text',
          access: {
            read: ({ req }) => !!req.user,
            create: () => false,
            update: () => false,
          },
          admin: { hidden: true },
        },
      ],
    },
    {
      name: 'twoFactor',
      type: 'ui',
      admin: {
        components: {
          Field:
            '@plutotcool/payload-plugin-two-factor/client#TwoFactorFieldComponent',
        },
      },
    },
  ]
}
