import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Strategy } from 'passport-strategy';
import type { OAuthProviderConfig } from '@rekog/mcp-nest';

// Sign-in step for @rekog/mcp-nest's OAuth server (McpAuthModule): instead of
// a third-party identity provider, the browser is sent to Ascent's own login.
// The frontend /mcp/sign-in page then returns to the callback with a
// short-lived handoff token (see AuthController.mcpHandoff).

type StrategyOptions = { signInUrl: string; callbackUrl: string };
type Verify = (
  accessToken: string,
  refreshToken: string,
  profile: AscentProfile,
  done: (error: unknown, user?: unknown) => void,
) => void;
type AscentProfile = { id: string; email: string; displayName: string };

export const MCP_HANDOFF_TYPE = 'mcp_handoff';

class AscentLoginStrategy extends Strategy {
  private readonly jwt = new JwtService({ secret: process.env.JWT_SECRET });

  constructor(
    private readonly options: StrategyOptions,
    private readonly verify: Verify,
  ) {
    super();
  }

  authenticate(req: Request) {
    const handoff =
      typeof req.query.handoff === 'string' ? req.query.handoff : null;
    if (!handoff) {
      const url = new URL(this.options.signInUrl);
      url.searchParams.set('callback', this.options.callbackUrl);
      return this.redirect(url.toString());
    }
    let payload: { sub: string; email: string; name: string; type: string };
    try {
      payload = this.jwt.verify(handoff);
    } catch {
      return this.fail(401); // expired or tampered handoff
    }
    if (payload.type !== MCP_HANDOFF_TYPE) return this.fail(401);
    const profile = {
      id: payload.sub,
      email: payload.email,
      displayName: payload.name,
    };
    this.verify('', '', profile, (error, user) =>
      error ? this.error(error as Error) : this.success(user as Express.User),
    );
  }
}

export const AscentLoginProvider: OAuthProviderConfig = {
  name: 'ascent',
  displayName: 'Ascent',
  strategy: AscentLoginStrategy,
  strategyOptions: ({ serverUrl, callbackPath }) => ({
    signInUrl: `${(process.env.WEBSITE_URL ?? '').replace(/\/$/, '')}/mcp/sign-in`,
    callbackUrl: `${serverUrl.replace(/\/$/, '')}/${(callbackPath ?? 'callback').replace(/^\//, '')}`,
  }),
  // username becomes the access token's `sub`, so tools get the Ascent user id
  profileMapper: (profile: AscentProfile) => ({
    id: profile.id,
    username: profile.id,
    email: profile.email,
    displayName: profile.displayName,
  }),
};
