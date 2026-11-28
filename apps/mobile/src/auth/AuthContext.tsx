import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Api } from "../api/endpoints";
import {
  ApiError,
  loadCsrf,
  setCsrf,
  setPasswordChangeHandler,
  setSessionLostHandler,
} from "../api/client";
import type { Me } from "../api/types";
import { LOCK_AFTER_MS } from "../config";

type Status = "loading" | "signedOut" | "locked" | "signedIn";
type LoginOutcome = { step: "done" } | { step: "2fa"; tempToken: string };

interface AuthValue {
  status: Status;
  user: Me | null;
  bioAvailable: boolean;
  bioEnabled: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  complete2FA: (tempToken: string, code: string, isBackup: boolean) => Promise<void>;
  completeInvite: (token: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  unlock: () => Promise<boolean>;
  setBioEnabled: (on: boolean) => Promise<boolean>;
}

const Ctx = createContext<AuthValue | null>(null);
const BIO_KEY = "hawl.biolock";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<Me | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabledState] = useState(false);
  const bioRef = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  const dropSession = useCallback(() => {
    void setCsrf(null);
    setUser(null);
    setStatus("signedOut");
  }, []);

  const refresh = useCallback(async () => {
    const me = await Api.me();
    setUser(me);
  }, []);

  // ── boot ──────────────────────────────────────────────
  useEffect(() => {
    setSessionLostHandler(dropSession);
    setPasswordChangeHandler(() => setUser((u) => (u ? { ...u, mustChangePassword: true } : u)));
    (async () => {
      const [hw, enrolled, pref] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(BIO_KEY),
      ]);
      setBioAvailable(hw && enrolled);
      const on = pref === "1" && hw && enrolled;
      bioRef.current = on;
      setBioEnabledState(on);

      await loadCsrf();
      try {
        const me = await Api.me();
        setUser(me);
        setStatus(on ? "locked" : "signedIn");
      } catch {
        dropSession();
      }
    })();
    return () => {
      setSessionLostHandler(null);
      setPasswordChangeHandler(null);
    };
  }, [dropSession]);

  // ── re-lock after backgrounding ───────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background" || s === "inactive") {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
      } else if (s === "active") {
        const away = backgroundedAt.current;
        backgroundedAt.current = null;
        if (away && Date.now() - away > LOCK_AFTER_MS && bioRef.current) {
          setStatus((cur) => (cur === "signedIn" ? "locked" : cur));
        }
      }
    });
    return () => sub.remove();
  }, []);

  const finishLogin = useCallback(
    async (csrf: string) => {
      await setCsrf(csrf);
      try {
        await refresh();
      } catch (e) {
        // Login succeeded but the session cookie did not stick (cookie jar / SameSite issue).
        await setCsrf(null);
        throw new ApiError(
          401,
          "Signed in, but the session cookie was not stored. Check API_URL / WEB_ORIGIN and HTTPS.",
          "cookie_not_stored",
        );
      }
      setStatus("signedIn");
    },
    [refresh],
  );

  const login = useCallback<AuthValue["login"]>(
    async (email, password) => {
      const r = await Api.login(email.trim().toLowerCase(), password);
      if (r.requires2FA) return { step: "2fa", tempToken: r.tempToken };
      await finishLogin(r.csrfToken);
      return { step: "done" };
    },
    [finishLogin],
  );

  const complete2FA = useCallback<AuthValue["complete2FA"]>(
    async (tempToken, code, isBackup) => {
      const r = await Api.authenticate2FA(tempToken, code.trim(), isBackup);
      await finishLogin(r.csrfToken);
    },
    [finishLogin],
  );

  const completeInvite = useCallback<AuthValue["completeInvite"]>(
    async (token, password, fullName) => {
      const r = await Api.acceptInvite(token.trim(), password, fullName);
      await finishLogin(r.csrfToken);
    },
    [finishLogin],
  );

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch {
      /* best effort: the local session is dropped regardless */
    }
    dropSession();
  }, [dropSession]);

  const unlock = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock HAWLHAYE",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    if (r.success) setStatus("signedIn");
    return r.success;
  }, []);

  const setBioEnabled = useCallback(async (on: boolean) => {
    if (on) {
      const r = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm to enable app lock",
      });
      if (!r.success) return false;
      await SecureStore.setItemAsync(BIO_KEY, "1");
    } else {
      await SecureStore.deleteItemAsync(BIO_KEY);
    }
    bioRef.current = on;
    setBioEnabledState(on);
    return true;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      bioAvailable,
      bioEnabled,
      login,
      complete2FA,
      completeInvite,
      logout,
      refresh,
      unlock,
      setBioEnabled,
    }),
    [
      status,
      user,
      bioAvailable,
      bioEnabled,
      login,
      complete2FA,
      completeInvite,
      logout,
      refresh,
      unlock,
      setBioEnabled,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
/** For screens that only render when signed in. */
export function useMe(): Me {
  const { user } = useAuth();
  if (!user) throw new Error("useMe called without a signed-in user");
  return user;
}
