import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';

@Injectable()
export class GoogleOAuthService {
  private readonly oauth2Client: OAuth2Client;

  constructor() {
    if (
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.GOOGLE_REDIRECT_URI
    ) {
      throw new Error('Google OAuth environment variables not configured');
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  // ============================================================
  // STEP 1 — Generate Consent URL
  // ============================================================

  getConsentUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // 🔥 Required for refresh token
      prompt: 'consent', // 🔥 Always force refresh token return
      scope: [
        'openid',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state,
      include_granted_scopes: true,
    });
  }

  // ============================================================
  // STEP 2 — Exchange Code → Tokens
  // ============================================================

  async getTokens(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error('No refresh token returned. Ensure prompt=consent is enforced.');
    }

    return tokens;
  }

  // ============================================================
  // STEP 3 — Get Google Profile
  // ============================================================

  async getDriveUser(tokens: Credentials) {
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: this.oauth2Client,
      version: 'v2',
    });

    const { data } = await oauth2.userinfo.get();

    if (!data.email) {
      throw new Error('Unable to retrieve Google account email');
    }

    return {
      email: data.email,
      name: data.name ?? null,
      picture: data.picture ?? null,
    };
  }

  // ============================================================
  // STEP 4 — Build Drive Client (Runtime Use)
  // ============================================================

  buildDriveClient(refreshToken: string) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    client.setCredentials({
      refresh_token: refreshToken,
    });

    return google.drive({
      version: 'v3',
      auth: client,
    });
  }
}
