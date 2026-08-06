import * as SecureStore from "expo-secure-store";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, setTokenSource } from "@/api/client";
import { ApiRequestError } from "@/api/errors";
import type { SignupInput, User } from "@/api/types";
import { clearUserData } from "@/db/index";
import { replaceStamps } from "@/db/shops";

const TOKEN_KEY = "bunna.session.token";
const USER_KEY = "bunna.session.user";

type Auth = {
  user: User | null;
  signedIn: boolean;
  /** False until stored credentials have been read. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  syncPassport: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  // A ref, not state: the API client reads the token synchronously on every
  // request and must never see a stale render's value.
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    setTokenSource(() => tokenRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [token, cachedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (!active) return;
        tokenRef.current = token;
        if (token && cachedUser) setUser(JSON.parse(cachedUser) as User);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (token: string, nextUser: User) => {
    tokenRef.current = token;
    setUser(nextUser);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const forget = useCallback(async () => {
    tokenRef.current = null;
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    await clearUserData();
  }, []);

  const syncPassport = useCallback(async () => {
    if (!tokenRef.current) return;
    const { data } = await api.getPassport();
    await replaceStamps(
      data.stamps.map((stamp) => ({
        shopId: stamp.shop.id,
        earnedAt: stamp.earned_at,
        level: stamp.level,
        checkInsCount: stamp.check_ins_count,
      })),
    );
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.signIn(email, password);
      await persist(data.token, data.user);
      await syncPassport();
    },
    [persist, syncPassport],
  );

  const signUp = useCallback(
    async (input: SignupInput) => {
      const { data } = await api.signUp(input);
      await persist(data.token, data.user);
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } catch {
      // Revoking server-side is best-effort; the device forgets either way.
    }
    await forget();
  }, [forget]);

  const refreshProfile = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const { data } = await api.getProfile();
      setUser(data);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data));
    } catch (error) {
      // An expired or revoked device session ends locally too.
      if (error instanceof ApiRequestError && error.isUnauthorized) await forget();
    }
  }, [forget]);

  const value = useMemo(
    () => ({
      user,
      signedIn: user !== null,
      ready,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      syncPassport,
    }),
    [user, ready, signIn, signUp, signOut, refreshProfile, syncPassport],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): Auth {
  const auth = use(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
