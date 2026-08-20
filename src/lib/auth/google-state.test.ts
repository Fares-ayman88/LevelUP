import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createGoogleCodeChallenge,
  createGoogleOAuthState,
  matchesGoogleOAuthState,
  readGoogleOAuthState,
} from "./google-state";

afterEach(() => {
  vi.unstubAllEnvs();
});

function configureEnvironment(): void {
  vi.stubEnv("APP_URL", "http://127.0.0.1:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://levelup:levelup@127.0.0.1:5433/levelup_test");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("SESSION_SECRET", "a-session-secret-that-is-longer-than-thirty-two-characters");
}

describe("Google OAuth state", () => {
  it("round-trips a signed state and uses a PKCE S256 challenge", () => {
    configureEnvironment();
    const { cookieValue, state } = createGoogleOAuthState();

    expect(readGoogleOAuthState(cookieValue)).toEqual(state);
    expect(matchesGoogleOAuthState(state.state, state.state)).toBe(true);
    expect(matchesGoogleOAuthState(state.state, `${state.state}x`)).toBe(false);
    expect(createGoogleCodeChallenge(state.codeVerifier)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("preserves the requested authentication intent in the signed state", () => {
    configureEnvironment();
    const { cookieValue, state } = createGoogleOAuthState("sign_up");

    expect(state.intent).toBe("sign_up");
    expect(readGoogleOAuthState(cookieValue)?.intent).toBe("sign_up");
  });

  it("rejects a state whose signature was modified", () => {
    configureEnvironment();
    const { cookieValue } = createGoogleOAuthState();

    expect(readGoogleOAuthState(`${cookieValue}x`)).toBeNull();
  });
});
