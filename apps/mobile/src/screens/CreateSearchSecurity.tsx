import React, { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../api/endpoints";
import { ApiError } from "../api/client";
import {
  PRIORITIES,
  ROLE_LABELS,
  STATUS_LABELS,
  type Priority,
  type SearchResult,
} from "../api/types";
import { useAuth, useMe } from "../auth/AuthContext";
import {
  Banner,
  Button,
  Card,
  Chip,
  Empty,
  ErrorState,
  Field,
  Loading,
  Row,
  Screen,
  SectionTitle,
  Sheet,
  Txt,
} from "../components/ui";
import { useLoad } from "../lib/useLoad";
import { toIsoDate, ymdFromNow } from "../lib/format";
import { isOrgWide } from "../lib/workflow";
import { PRIORITY_COLOR } from "../theme";
import { usePalette } from "../prefs";
import type { MainStackParams } from "../navigation/types";

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");
type P<K extends keyof MainStackParams> = NativeStackScreenProps<MainStackParams, K>;

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={26} color={c.accent} />
      </Pressable>
      <Txt size={22} weight="800">
        {title}
      </Txt>
    </View>
  );
}

// ── Search ─────────────────────────────────────────────────
export function SearchScreen({ navigation }: P<"Search">) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setRes(await Api.search(q.trim()));
        setError(null);
      } catch (e) {
        setError(errMsg(e));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  const nothing = res && !res.tasks.length && !res.users.length && !res.offices.length;
  return (
    <Screen scroll>
      <BackBar title="Search" onBack={() => navigation.goBack()} />
      <Field
        value={q}
        onChangeText={setQ}
        placeholder="Tasks, people, offices…"
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {nothing ? <Empty icon="search-outline" title="No results" /> : null}
      {res?.tasks.length ? <SectionTitle>Tasks</SectionTitle> : null}
      {res?.tasks.map((t) => (
        <Card
          key={t.id}
          onPress={() => navigation.navigate("TaskDetail", { id: t.id })}
          style={{ marginBottom: 8 }}
        >
          <Txt size={11} weight="800" muted>
            {t.code} · {STATUS_LABELS[t.status]}
          </Txt>
          <Txt weight="700">{t.title}</Txt>
        </Card>
      ))}
      {res?.users.length ? <SectionTitle>People</SectionTitle> : null}
      {res?.users.map((u) => (
        <Card key={u.id} style={{ marginBottom: 8 }}>
          <Txt weight="700">{u.fullName}</Txt>
          <Txt muted size={13}>
            {ROLE_LABELS[u.role]} · {u.email}
          </Txt>
        </Card>
      ))}
      {res?.offices.length ? <SectionTitle>Offices</SectionTitle> : null}
      {res?.offices.map((o) => (
        <Card key={o.id} style={{ marginBottom: 8 }}>
          <Txt weight="700">{o.name}</Txt>
          <Txt muted size={13}>
            {o.type}
          </Txt>
        </Card>
      ))}
    </Screen>
  );
}

// ── Security ───────────────────────────────────────────────
export function SecurityScreen({ navigation }: P<"Security">) {
  const me = useMe();
  const { refresh, bioAvailable, bioEnabled, setBioEnabled } = useAuth();
  const c = usePalette();
  const sessions = useLoad(() => Api.sessions(), [], false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  async function revoke(id: string) {
    try {
      await Api.revokeSession(id);
      await sessions.reload();
    } catch (e) {
      Alert.alert("Couldn't revoke", errMsg(e));
    }
  }
  async function toggleBio() {
    const ok = await setBioEnabled(!bioEnabled);
    if (!ok) Alert.alert("App lock not changed", "Biometric confirmation failed.");
  }
  return (
    <Screen scroll>
      <BackBar title="Security" onBack={() => navigation.goBack()} />
      <SectionTitle>Password</SectionTitle>
      <Card
        onPress={() => navigation.navigate("ChangePassword")}
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <Txt weight="700">Change password</Txt>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Card>

      <SectionTitle>Two-factor authentication</SectionTitle>
      <Card>
        <Row label="Status" value={me.twoFactorEnabled ? "Enabled" : "Not enabled"} />
        <View style={{ marginTop: 10 }}>
          {me.twoFactorEnabled ? (
            <Button
              title="Turn off 2FA"
              variant="danger"
              small
              onPress={() => setDisableOpen(true)}
            />
          ) : (
            <Button
              title="Set up authenticator app"
              small
              icon="shield-checkmark-outline"
              onPress={() => setSetupOpen(true)}
            />
          )}
        </View>
      </Card>

      <SectionTitle>App lock</SectionTitle>
      <Card>
        <Txt muted size={13} style={{ marginBottom: 10 }}>
          Require Face ID / fingerprint / device passcode when you return to the app after 30
          seconds away.
        </Txt>
        <Button
          title={bioEnabled ? "Turn off app lock" : "Turn on app lock"}
          variant="secondary"
          small
          disabled={!bioAvailable}
          onPress={toggleBio}
        />
        {!bioAvailable ? (
          <Txt muted size={12} style={{ marginTop: 6 }}>
            Set up biometrics or a passcode on this device first.
          </Txt>
        ) : null}
      </Card>

      <SectionTitle>Active sessions</SectionTitle>
      {sessions.loading ? (
        <Loading />
      ) : sessions.error ? (
        <ErrorState message={sessions.error} onRetry={sessions.reload} />
      ) : (
        (sessions.data ?? []).map((s, i) => (
          <Card key={s.id} style={{ marginBottom: 8 }}>
            <Txt weight="700" numberOfLines={2}>
              {s.userAgent ?? "Unknown device"}
            </Txt>
            <Txt muted size={12}>
              {s.ip ?? "unknown IP"} · last active {new Date(s.lastSeenAt).toLocaleString()}
            </Txt>
            {i > 0 ? (
              <Button
                title="Revoke"
                small
                variant="danger"
                style={{ marginTop: 10, alignSelf: "flex-start" }}
                onPress={() => revoke(s.id)}
              />
            ) : (
              <Txt size={12} color={c.ok} style={{ marginTop: 6 }}>
                Most recent session
              </Txt>
            )}
          </Card>
        ))
      )}

      <TwoFASetupSheet
        visible={setupOpen}
        email={me.email}
        onClose={() => {
          setSetupOpen(false);
          void refresh();
        }}
      />
      <DisableSheet
        visible={disableOpen}
        onClose={() => setDisableOpen(false)}
        onDone={() => {
          setDisableOpen(false);
          void refresh();
        }}
      />
    </Screen>
  );
}

function TwoFASetupSheet({
  visible,
  email,
  onClose,
}: {
  visible: boolean;
  email: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setPassword("");
    setSecret(null);
    setCode("");
    setCodes(null);
    setError(null);
    onClose();
  }
  async function start() {
    setBusy(true);
    setError(null);
    try {
      const r = await Api.twoFASetup(password);
      setSecret(r.secret);
      setPassword("");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const r = await Api.twoFAVerify(code.trim());
      setCodes(r.backupCodes);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  const uri = secret
    ? `otpauth://totp/HAWLHAYE:${encodeURIComponent(email)}?secret=${secret}&issuer=HAWLHAYE`
    : null;
  return (
    <Sheet visible={visible} onClose={close} title="Set up two-factor">
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {codes ? (
        <>
          <Banner tone="warn">
            Save these backup codes now. They are shown only once and each works one time.
          </Banner>
          <Card style={{ marginBottom: 14 }}>
            {codes.map((k) => (
              <Txt
                key={k}
                selectable
                size={18}
                weight="700"
                style={{ letterSpacing: 2, marginVertical: 3 }}
              >
                {k}
              </Txt>
            ))}
          </Card>
          <Button title="I've saved them" onPress={close} />
        </>
      ) : secret ? (
        <>
          <Txt muted size={13} style={{ marginBottom: 10 }}>
            Add this key to your authenticator app (Google Authenticator, Microsoft Authenticator,
            Authy…).
          </Txt>
          <Card style={{ marginBottom: 12 }}>
            <Txt selectable weight="700" size={16} style={{ letterSpacing: 1.5 }}>
              {secret}
            </Txt>
          </Card>
          {uri ? (
            <Button
              title="Open in authenticator app"
              variant="secondary"
              small
              icon="open-outline"
              onPress={() =>
                Linking.openURL(uri).catch(() =>
                  Alert.alert(
                    "No authenticator app found",
                    "Type the key above into your app manually.",
                  ),
                )
              }
              style={{ marginBottom: 14 }}
            />
          ) : null}
          <Field
            label="6-digit code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button title="Verify & enable" busy={busy} disabled={code.length < 6} onPress={verify} />
        </>
      ) : (
        <>
          <Field label="Confirm your password" value={password} onChangeText={setPassword} secure />
          <Button title="Continue" busy={busy} disabled={!password} onPress={start} />
        </>
      )}
    </Sheet>
  );
}

function DisableSheet({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    try {
      await Api.twoFADisable(password);
      setPassword("");
      onDone();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet visible={visible} onClose={onClose} title="Turn off 2FA">
      <Banner tone="warn">
        Your account will be protected by your password alone. Leadership roles may be required to
        use 2FA.
      </Banner>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Field label="Confirm your password" value={password} onChangeText={setPassword} secure />
      <Button title="Turn off 2FA" variant="danger" busy={busy} disabled={!password} onPress={go} />
    </Sheet>
  );
}
