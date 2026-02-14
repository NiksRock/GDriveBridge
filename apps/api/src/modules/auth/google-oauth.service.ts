import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';

@Injectable()
export class GoogleOAuthService {
  private readonly oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  /**
   * Step 1: Generate Google Consent URL
   */
  getConsentUrl(userId: string) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'openid',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      state: userId,
    });
  }

  /**
   * Step 2: Exchange OAuth Code → Tokens
   */
  async getTokens(code: string): Promise<Credentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Step 3: Fetch Google Profile Info
   */
  async getDriveUser(tokens: Credentials) {
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: this.oauth2Client,
      version: 'v2',
    });

    const { data } = await oauth2.userinfo.get();

    return {
      email: data.email!,
      name: data.name,
      picture: data.picture,
    };
  }
}
