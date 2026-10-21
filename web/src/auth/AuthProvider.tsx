import { retrieveRawInitData } from "@telegram-apps/sdk-react";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setTokenSource } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import type { AuthenticatedPayload, User } from "@/api/types";
import { inTelegram } from "@/telegram/sdk";

type Status = "loading" | "signedIn" | "signedOut" | "failed";

type Auth = {
  status: Status;
  user: User | null;
  /** Telegram's first name, for the greeting, before the profile loads. */
  firstName: string | null;
  /** Telegram user id, the default doodle seed. */
  telegramId: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<Auth | null>(null);

// The plain website keeps its token across reloads; inside Telegram we sign
// in again from initData on every launch, so nothing needs to persist there.
const TOKEN_KEY = "bunna.token";
let token: string | null = null;
setTokenSource(() => token);

function storedToken(): string | null {
  try {
    return inTelegram ? null : window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function keepToken(next: string | null) {
  token = next;
  if (inTelegram) return;
  try {
    if (next) window.localStorage.setItem(TOKEN_KEY, next);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Only costs a sign-in on the next visit.
  }
}

function telegramUser(): { id: string; firstName: string } | null {
  try {
    const raw = retrieveRawInitData();
    const user = raw ? JSON.parse(new URLSearchParams(raw).get("user") ?? "null") : null;
    return user ? { id: String(user.id), firstName: String(user.first_name ?? "") } : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [attempt, setAttempt] = useState(0);
  const launchUser = useMemo(telegramUser, []);

  const accept = useCallback(
    (payload: AuthenticatedPayload) => {
      keepToken(payload.token);
      setUser(payload.user);
      queryClient.setQueryData(["profile"], payload.user);
      setStatus("signedIn");
    },
    [queryClient],
  );

  useEffect(() => {
    let active = true;
    async function start() {
      setStatus("loading");
      try {
        if (inTelegram) {
          const initData = retrieveRawInitData();
          if (!initData) throw new Error("Telegram sent no initData");
          const { data } = await api.telegramSignIn(initData);
          if (active) accept(data);
          return;
        }
        const existing = storedToken();
        if (!existing) {
          if (active) setStatus("signedOut");
          return;
        }
        token = existing;
        const { data } = await api.getProfile();
        if (!active) return;
        setUser(data);
        queryClient.setQueryData(["profile"], data);
        setStatus("signedIn");
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiRequestError && error.isUnauthorized && !inTelegram) {
          keepToken(null);
          setStatus("signedOut");
        } else {
          setStatus("failed");
        }
      }
    }
    void start();
    return () => {
      active = false;
    };
  }, [accept, attempt, queryClient]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.signIn(email, password);
      accept(data);
    },
    [accept],
  );

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } finally {
      keepToken(null);
      setUser(null);
      queryClient.clear();
      setStatus("signedOut");
    }
  }, [queryClient]);

  const value = useMemo<Auth>(
    () => ({
      status,
      user,
      firstName: launchUser?.firstName || null,
      telegramId: launchUser?.id ?? null,
      signInWithEmail,
      signOut,
      retry: () => setAttempt((n) => n + 1),
    }),
    [status, user, launchUser, signInWithEmail, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const auth = use(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
