import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../api/client";
import { Api } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { Button, Field, Spinner, Txt } from "../components/ui";
import { usePrefs } from "../prefs";
import { alpha } from "../theme";
import type { AuthStackParams, MainStackParams } from "../navigation/types";

import logo from "../../assets/logo.png";

type P<K extends keyof AuthStackParams> = NativeStackScreenProps<AuthStackParams, K>;

// Exact Web Demo Account Colors
const DEMO_ACCOUNTS = [
  {
    label: "Admin",
    email: "admin@mail.com",
    text: "#CBD5E1",
    bg: "rgba(100,116,139,0.1)",
    border: "rgba(100,116,139,0.2)",
  },
  {
    label: "Dean",
    email: "dean@mail.com",
    text: "#FBBF24",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    label: "Deputy",
    email: "deputy@mail.com",
    text: "#FBBF24",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  {
    label: "Faculty",
    email: "faculty@mail.com",
    text: "#60A5FA",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.2)",
  },
  {
    label: "Labs",
    email: "labs@mail.com",
    text: "#A78BFA",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.2)",
  },
  {
    label: "Tech",
    email: "tech@mail.com",
    text: "#34D399",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.2)",
  },
];
const DEMO_PASSWORD = "12345678";

export const PASSWORD_RULES = [
  { key: "len-min", test: (p: string) => p.length >= 12, label: "At least 12 characters" },
  { key: "len-max", test: (p: string) => p.length <= 128, label: "At most 128 characters" },
  { key: "upper", test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { key: "lower", test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { key: "digit", test: (p: string) => /[0-9]/.test(p), label: "One digit" },
];
export const passwordValid = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

function ErrorBox({ message }: { message: string }) {
  const { palette: c } = usePrefs();
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: alpha("#EF4444", 0.2),
        backgroundColor: alpha("#EF4444", 0.1),
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <Ionicons name="warning-outline" size={20} color={c.red} />
      <Txt size={14} weight="700" color={c.red} style={{ flex: 1 }}>
        {message}
      </Txt>
    </View>
  );
}
function NoticeBox({
  tone,
  title,
  children,
}: {
  tone: "ok" | "bad";
  title: string;
  children: React.ReactNode;
}) {
  const { palette: c } = usePrefs();
  const col = tone === "ok" ? "#10B981" : "#EF4444";
  return (
    <View
      accessibilityRole="alert"
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: alpha(col, 0.2),
        backgroundColor: alpha(col, 0.1),
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}
    >
      <Txt
        size={14}
        weight="700"
        color={tone === "ok" ? c.emerald : c.red}
        style={{ marginBottom: 4 }}
      >
        {title}
      </Txt>
      <Txt size={14} color={alpha(tone === "ok" ? "#6EE7B7" : "#FCA5A5", 0.9)}>
        {children}
      </Txt>
    </View>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: boolean;
}) {
  const { palette: c } = usePrefs();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.app }}>
      <LinearGradient
        colors={[alpha("#E8BC69", 0.05), "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.6 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: "100%", maxWidth: 448, alignSelf: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 48 }}>
            <Image source={logo} style={{ height: 48, width: 48 }} resizeMode="contain" />
            <View>
              <Txt size={20} weight="800" tracking={0.16}>
                HAWLHAYE
              </Txt>
              <Txt size={11} weight="700" tracking={0.2} upper muted>
                Work. Organised.
              </Txt>
            </View>
          </View>
          <View style={{ marginBottom: 40 }}>
            <Txt size={30} weight="800">
              {title}
            </Txt>
            {subtitle ? (
              <Txt size={16} muted style={{ marginTop: 12 }}>
                {subtitle}
              </Txt>
            ) : null}
          </View>
          {children}
          {footer ? (
            <Txt
              size={12}
              weight="500"
              color={c.faint}
              align="center"
              style={{ marginTop: 32, lineHeight: 24 }}
            >
              Accounts are managed by the CECIT administrator.{"\n"}Unauthorized access is strictly
              prohibited.
            </Txt>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function loginError(e: unknown, backup: boolean): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "invalid_credentials":
        return "Incorrect email or password.";
      case "invalid_token":
        return backup
          ? "Invalid or already-used backup code."
          : "Invalid or expired authentication code.";
      case "account_locked":
        return "This account is temporarily locked. Try again later.";
      case "too_many_requests":
        return "Too many attempts. Wait a few minutes and try again.";
      case "csrf_failed":
        return "Session expired. Please try again.";
      case "network":
        return "Could not reach the server. Please check your connection.";
      case "forbidden":
        return e.message.toLowerCase().includes("deactivated")
          ? "Your account has been deactivated. Please contact your Administrator."
          : "You do not have permission to sign in.";
      default:
        return e.message || "Sign-in failed.";
    }
  }
  return "Could not reach the server. Please check your connection.";
}

function Spin({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <Spinner size="small" />
      <Txt size={16} weight="800" color="#0F172A">
        {label}
      </Txt>
    </View>
  );
}
function PrimaryBtn({
  title,
  busy,
  busyLabel,
  disabled,
  onPress,
}: {
  title: string;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { palette: c } = usePrefs();
  return (
    <Pressable
      onPress={busy || disabled ? undefined : onPress}
      accessibilityRole="button"
      style={{
        backgroundColor: c.accent,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: "center",
        opacity: busy || disabled ? 0.5 : 1,
        shadowColor: "#E8BC69",
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 2,
      }}
    >
      {busy ? (
        <Spin label={busyLabel ?? ""} />
      ) : (
        <Txt size={16} weight="800" color={c.accentText}>
          {title}
        </Txt>
      )}
    </Pressable>
  );
}

export function LoginScreen({ navigation }: P<"Login">) {
  const { login, complete2FA } = useAuth();
  const { palette: c } = usePrefs();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const codeValid = backup ? code.replace(/[-\s]/g, "").length === 10 : code.length === 6;
  const resetToLogin = () => {
    setRequires2FA(false);
    setCode("");
    setTempToken("");
    setBackup(false);
    setError(null);
  };

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  async function submit() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (requires2FA)
        await complete2FA(
          tempToken,
          backup ? code.replace(/[-\s]/g, "").toUpperCase() : code,
          backup,
        );
      else {
        const r = await login(email, password);
        if (r.step === "2fa") {
          setRequires2FA(true);
          setTempToken(r.tempToken);
        }
      }
    } catch (e) {
      setError(loginError(e, backup));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={requires2FA ? (backup ? "Backup Code" : "Two-Factor Auth.") : "Welcome back."}
      subtitle={
        requires2FA
          ? backup
            ? "Enter one of your 10-character backup recovery codes."
            : "Enter the 6-digit code from your authenticator app."
          : "Sign in to continue to your institutional workspace."
      }
    >
      <View style={{ gap: 24 }}>
        {!requires2FA ? (
          <>
            <View>
              <Field
                label="Email address"
                icon="mail-outline"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                autoComplete="email"
                placeholder="you@cecit.edu.so"
                returnKeyType="next"
              />
            </View>
            <View>
              <Field
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (error) setError(null);
                }}
                secureTextEntry={!show}
                textContentType="password"
                autoComplete="current-password"
                maxLength={128}
                placeholder="••••••••"
                returnKeyType="go"
                onSubmitEditing={submit}
                labelRight={
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <Pressable onPress={() => setShow(!show)} hitSlop={8}>
                      <Txt size={12} weight="700" muted>
                        {show ? "Hide" : "Show"}
                      </Txt>
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("ForgotPassword")} hitSlop={8}>
                      <Txt size={12} weight="700" color={c.accent}>
                        Forgot password?
                      </Txt>
                    </Pressable>
                  </View>
                }
              />
            </View>
          </>
        ) : (
          <View>
            <Field
              label={backup ? "Backup Recovery Code" : "Authentication Code"}
              mono
              centered
              value={code}
              onChangeText={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              maxLength={backup ? 11 : 6}
              keyboardType={backup ? "default" : "number-pad"}
              autoCapitalize={backup ? "characters" : "none"}
              autoCorrect={false}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              placeholder={backup ? "XXXXX-XXXXX" : "000000"}
              style={{ fontSize: backup ? 18 : 24, letterSpacing: backup ? 3 : 12 }}
            />
            <Pressable
              onPress={() => {
                setBackup(!backup);
                setCode("");
                setError(null);
              }}
            >
              <Txt size={12} muted>
                {backup ? "Use authenticator code instead" : "Use a backup code instead"}
              </Txt>
            </Pressable>
          </View>
        )}
        {error ? <ErrorBox message={error} /> : null}
        <PrimaryBtn
          busy={busy}
          busyLabel={requires2FA ? "Verifying..." : "Signing in..."}
          disabled={requires2FA ? !codeValid : !email || !password}
          onPress={submit}
          title={
            requires2FA ? (backup ? "Verify Backup Code" : "Verify Code") : "Sign in to Workspace"
          }
        />
        {requires2FA ? (
          <Pressable onPress={resetToLogin}>
            <Txt size={12} muted align="center">
              Back to login
            </Txt>
          </Pressable>
        ) : null}

        {!requires2FA && (
          <View
            style={{
              marginTop: 24,
              backgroundColor: "#1E293B",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#334155",
              padding: 24,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" }}
                />
                <Txt size={11} weight="800" color="#94A3B8" upper tracking={0.15}>
                  Demo Accounts (Dev Only)
                </Txt>
              </View>
              <View
                style={{
                  backgroundColor: "#E8BC69",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Txt size={10} weight="900" color="#0F172A">
                  PASS: {DEMO_PASSWORD}
                </Txt>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                rowGap: 8,
              }}
            >
              {DEMO_ACCOUNTS.map((acc) => (
                <Pressable
                  key={acc.email}
                  onPress={() => fillDemo(acc.email)}
                  style={({ pressed }) => [
                    {
                      width: "31%",
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: acc.border,
                      backgroundColor: acc.bg,
                      alignItems: "center",
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Txt size={11} weight="800" color={acc.text}>
                    {acc.label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </AuthLayout>
  );
}

export function ForgotPasswordScreen({ navigation }: P<"ForgotPassword">) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await Api.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === "too_many_requests"
          ? "Too many requests. Wait a few minutes and try again."
          : "Could not reach the server. Please check your connection.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter the email address on your account. If an account exists, we'll send a password reset link."
    >
      {sent ? (
        <View style={{ gap: 24 }}>
          <NoticeBox tone="ok" title="Check your email">
            If {email} matches an account, a reset link is on its way. The link expires in 60
            minutes.
          </NoticeBox>
          <Txt size={14} muted>
            Didn't receive it? Contact the{" "}
            <Txt size={14} weight="700">
              CECIT Administrator
            </Txt>{" "}
            for a manual reset.
          </Txt>
          <PrimaryBtn title="Back to Sign In" onPress={() => navigation.popToTop()} />
        </View>
      ) : (
        <View style={{ gap: 24 }}>
          <Field
            label="Email address"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@cecit.edu.so"
          />
          {error ? <ErrorBox message={error} /> : null}
          <PrimaryBtn
            title="Send Reset Link"
            busyLabel="Sending..."
            busy={busy}
            disabled={!email}
            onPress={submit}
          />
          <Pressable onPress={() => navigation.popToTop()}>
            <Txt size={12} muted align="center">
              Back to Sign In
            </Txt>
          </Pressable>
        </View>
      )}
    </AuthLayout>
  );
}

function Requirements({
  password,
  extra,
}: {
  password: string;
  extra?: { label: string; ok: boolean }[];
}) {
  const { palette: c } = usePrefs();
  const rows = [
    ...PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(password) })),
    ...(extra ?? []),
  ];
  return (
    <View style={{ gap: 6, marginTop: -4 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons
            name={r.ok ? "checkmark-circle" : "ellipse-outline"}
            size={14}
            color={r.ok ? c.emerald : c.faint}
          />
          <Txt size={12} weight="500" color={r.ok ? c.emerald : c.muted}>
            {r.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export function ResetPasswordScreen({ route, navigation }: P<"ResetPassword">) {
  const { palette: c } = usePrefs();
  const [token, setToken] = useState(route.params?.token ?? "");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = passwordValid(pw) && pw === confirm && token.trim().length > 0;
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await Api.resetPassword(token.trim(), pw);
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && (e.code === "invalid_token" || e.code === "invalid_invite"))
        setError("This reset link is invalid or has expired. Request a new one.");
      else if (e instanceof ApiError && e.code === "too_many_requests")
        setError("Too many attempts. Wait a few minutes and try again.");
      else if (e instanceof ApiError && e.code !== "network") setError(e.message);
      else setError("Could not reach the server. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      title="Set a new password."
      subtitle="Choose a strong password you don't use anywhere else. Your reset link can only be used once."
    >
      {done ? (
        <View style={{ gap: 24 }}>
          <NoticeBox tone="ok" title="Password updated">
            Your password has been reset. You can now sign in with the new password.
          </NoticeBox>
          <PrimaryBtn title="Sign In Now" onPress={() => navigation.popToTop()} />
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          {!route.params?.token ? (
            <Field
              label="Reset token"
              icon="key-outline"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste the token from your email link"
            />
          ) : null}
          <Field
            label="New password"
            icon="lock-closed-outline"
            secure
            value={pw}
            onChangeText={setPw}
            textContentType="newPassword"
            placeholder="••••••••••••"
            maxLength={128}
          />
          <Requirements password={pw} />
          <View>
            <Field
              label="Confirm password"
              icon="lock-closed-outline"
              secure
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter your new password"
              maxLength={128}
            />
            {confirm.length > 0 && pw !== confirm ? (
              <Txt size={12} weight="500" color={c.red} style={{ marginTop: -8 }}>
                Passwords do not match
              </Txt>
            ) : null}
          </View>
          {error ? <ErrorBox message={error} /> : null}
          <PrimaryBtn
            title="Reset Password"
            busy={busy}
            busyLabel="Resetting..."
            disabled={!valid}
            onPress={submit}
          />
        </View>
      )}
    </AuthLayout>
  );
}

export function AcceptInviteScreen({ route, navigation }: P<"AcceptInvite">) {
  const { palette: c } = usePrefs();
  const [token, setToken] = useState(route.params?.token ?? "");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Web rules for this page: 8+ chars, a number, passwords match.
  const lenOk = pw.length >= 8,
    numOk = /\d/.test(pw),
    match = pw === confirm && confirm.length > 0;
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigation.popToTop(), 3000);
      return () => clearTimeout(t);
    }
  }, [success, navigation]);
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await Api.acceptInviteWeb(token.trim(), pw);
      setSuccess(true);
    } catch (e) {
      if (e instanceof ApiError && (e.code === "invalid_invite" || e.code === "invalid_token"))
        setError(
          "This invitation has expired or is no longer valid. Please contact your administrator.",
        );
      else if (e instanceof ApiError && e.code !== "network")
        setError(e.message || "Failed to accept invitation.");
      else setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      title="Set up your account."
      subtitle="You've been invited to HAWLHAYE. Create a secure password to continue."
    >
      {success ? (
        <View
          style={{
            alignItems: "center",
            gap: 8,
            padding: 24,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: alpha("#10B981", 0.2),
            backgroundColor: alpha("#10B981", 0.1),
          }}
        >
          <Ionicons name="checkmark-circle" size={32} color={c.emerald} />
          <Txt size={18} weight="700">
            Account activated!
          </Txt>
          <Txt size={14} color={alpha("#34D399", 0.8)}>
            Redirecting to login...
          </Txt>
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          {!route.params?.token ? (
            <Field
              label="Invitation token"
              icon="key-outline"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Paste the token from your invitation"
            />
          ) : null}
          <Field
            label="New Password"
            secure
            value={pw}
            onChangeText={setPw}
            textContentType="newPassword"
            placeholder="••••••••"
          />
          <Field
            label="Confirm Password"
            secure
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
          />
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.panel,
              padding: 16,
              gap: 8,
            }}
          >
            <Txt size={10} weight="700" tracking={0.05} upper muted>
              Password Requirements
            </Txt>
            {[
              { ok: lenOk, l: "At least 8 characters" },
              { ok: numOk, l: "Contains a number" },
              { ok: match, l: "Passwords match" },
            ].map((r) => (
              <View key={r.l} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons
                  name={r.ok ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={r.ok ? c.emerald : c.faint}
                />
                <Txt size={12} weight="500" color={r.ok ? c.emerald : c.muted}>
                  {r.l}
                </Txt>
              </View>
            ))}
          </View>
          {error ? <ErrorBox message={error} /> : null}
          <PrimaryBtn
            title="Activate Account"
            busy={busy}
            busyLabel="Activating..."
            disabled={!(lenOk && numOk && match && token.trim())}
            onPress={submit}
          />
          <Pressable onPress={() => navigation.popToTop()}>
            <Txt size={12} muted align="center">
              Return to login
            </Txt>
          </Pressable>
        </View>
      )}
    </AuthLayout>
  );
}

export function ChangePasswordScreen({ forced }: { forced?: boolean }) {
  const { palette: c } = usePrefs();
  const { refresh, logout } = useAuth();
  const nav = useNavigation<NavigationProp<MainStackParams>>();
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const differs = pw.length > 0 && pw !== cur;
  const valid = cur.length > 0 && passwordValid(pw) && pw === confirm && pw !== cur;
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await Api.changePassword(cur, pw);
      setOk(true);
      await refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === "invalid_credentials")
        setError("Current password is incorrect.");
      else if (e instanceof ApiError && (e.code === "unauthenticated" || e.code === "session_idle"))
        setError("Session expired. Please sign in again.");
      else if (e instanceof ApiError && e.code === "too_many_requests")
        setError("Too many attempts. Wait a few minutes and try again.");
      else if (e instanceof ApiError && e.code !== "network") setError(e.message);
      else setError("Could not reach the server. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      footer={false}
      title="Change password."
      subtitle="Choose a strong password you don't use anywhere else. Other devices signed into your account will be signed out."
    >
      {ok ? (
        <View style={{ gap: 24 }}>
          <NoticeBox tone="ok" title="Password updated">
            Your password was changed. Other devices have been signed out.
          </NoticeBox>
          {!forced ? (
            <PrimaryBtn
              title="Done"
              onPress={() => nav.reset({ index: 0, routes: [{ name: "Board" }] })}
            />
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <Field
            label="Current password"
            icon="lock-closed-outline"
            secure
            value={cur}
            onChangeText={setCur}
            textContentType="password"
            placeholder="Enter your current password"
            maxLength={128}
          />
          <Field
            label="New password"
            icon="lock-closed-outline"
            secure
            value={pw}
            onChangeText={setPw}
            textContentType="newPassword"
            placeholder="••••••••••••"
            maxLength={128}
          />
          <Requirements
            password={pw}
            extra={[{ label: "New password must differ from current password", ok: differs }]}
          />
          <View>
            <Field
              label="Confirm new password"
              icon="lock-closed-outline"
              secure
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter your new password"
              maxLength={128}
            />
            {confirm.length > 0 && pw !== confirm ? (
              <Txt size={12} weight="500" color={c.red} style={{ marginTop: -8 }}>
                Passwords do not match
              </Txt>
            ) : null}
          </View>
          {error ? <ErrorBox message={error} /> : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {forced ? (
              <Button variant="secondary" title="Sign out" onPress={logout} style={{ flex: 1 }} />
            ) : (
              <Button
                variant="secondary"
                title="Cancel"
                onPress={() => nav.goBack()}
                style={{ flex: 1 }}
              />
            )}
            <View style={{ flex: 2 }}>
              <PrimaryBtn
                title="Update Password"
                busy={busy}
                busyLabel="Saving..."
                disabled={!valid}
                onPress={submit}
              />
            </View>
          </View>
        </View>
      )}
    </AuthLayout>
  );
}

export function LockScreen() {
  const { unlock, logout } = useAuth();
  const { palette: c } = usePrefs();
  const [failed, setFailed] = useState(false);
  async function go() {
    setFailed(!(await unlock()));
  }
  useEffect(() => {
    void go();
  }, []);
  return (
    <AuthLayout
      title="HAWLHAYE is locked."
      subtitle="Authenticate to continue to your workspace."
      footer={false}
    >
      <View style={{ gap: 16 }}>
        {failed ? <ErrorBox message="Authentication failed or was cancelled." /> : null}
        <PrimaryBtn title="Unlock" onPress={go} />
        <Pressable onPress={logout}>
          <Txt size={12} muted align="center" color={c.muted}>
            Sign out
          </Txt>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
