import { withTwoFactorMiddleware } from '../src/middleware'

export const middleware = withTwoFactorMiddleware()

export const config = {
  matcher: ['/admin/:path*'],
}
