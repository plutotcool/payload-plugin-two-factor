import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `jose` is used by the middleware to decode the Payload JWT.
  serverExternalPackages: ['jose'],
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default withPayload(nextConfig)
