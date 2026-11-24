import React, { useState } from "react";
import {
  Pressable, View, Text, TextInput, StyleSheet, ActivityIndicator,
  ScrollView, useWindowDimensions, Image, KeyboardAvoidingView, Platform
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../api/client";
import { Api } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import type { AuthStackParams } from "../navigation/types";

// Import the actual logo
import logo from "../../assets/logo.png";

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Try again.");
export const PASSWORD_HINT = "At least 12 characters with upper-case, lower-case and a number.";
export function passwordProblem(p: string): string | null {
  if (p.length < 12) return "Use at least 12 characters.";
  if (p.length > 128) return "Use at most 128 characters.";
  if (!/[A-Z]/.test(p) || !/[a-z]/.test(p) || !/[0-9]/.test(p)) return "Include upper-case, lower-case and a number.";
  return null;
}

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  accent: "#e8bc69",
  accentHover: "#f1cf8b",
  errorBg: "rgba(239, 68, 68, 0.1)",
  errorBorder: "rgba(239, 68, 68, 0.2)",
  errorText: "#F87171",
};

// Exact colors from the Web version's Tailwind classes
const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@mail.com", text: "#CBD5E1", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.2)" },
  { label: "Dean", email: "dean@mail.com", text: "#FBBF24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  { label: "Deputy", email: "deputy@mail.com", text: "#FBBF24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
  { label: "Faculty", email: "faculty@mail.com", text: "#60A5FA", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
  { label: "Labs", email: "labs@mail.com", text: "#A78BFA", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)" },
  { label: "Tech", email: "tech@mail.com", text: "#34D399", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
];
const DEMO_PASSWORD = "12345678";

type P<K extends keyof AuthStackParams> = NativeStackScreenProps<AuthStackParams, K>;

export function LoginScreen({ navigation }: P<"Login">) {
  const { login, complete2FA } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [code, setCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isCodeValid = isBackupCode ? code.replace(/[-\s]/g, "").length === 10 : code.length === 6;

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  function resetToLogin() {
    setRequires2FA(false);
    setCode("");
    setTempToken("");
    setIsBackupCode(false);
    setError(null);
  }

  async function submit() {
    if (busy) return;
    if (!requires2FA && (!email.trim() || !password)) {
      setError("Enter your email and password.");
      return;
    }
    if (requires2FA && !isCodeValid) {
      setError("Enter a valid code.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (requires2FA) {
        await complete2FA(tempToken, code, isBackupCode);
      } else {
        const r = await login(email.trim().toLowerCase(), password);
        if (r.step === "2fa") {
          setRequires2FA(true);
          setTempToken(r.tempToken);
          setBusy(false);
          return;
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case "invalid_credentials": setError("Incorrect email or password."); break;
          case "invalid_token": setError(isBackupCode ? "Invalid or already-used backup code." : "Invalid or expired authentication code."); break;
          case "account_locked": setError("This account is temporarily locked. Try again later."); break;
          case "too_many_requests": setError("Too many attempts. Wait a few minutes and try again."); break;
          case "csrf_failed": setError("Session expired. Please try again."); break;
          case "forbidden":
            if (err.message.toLowerCase().includes("deactivated")) {
              setError("Your account has been deactivated. Please contact your Administrator.");
            } else {
              setError("You do not have permission to sign in.");
            }
            break;
          default: setError(err.message || "Sign-in failed.");
        }
      } else {
        setError("Could not reach the server. Please check your connection.");
      }
    } finally {
      setBusy(false);
    }
  }

  const LeftForm = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48, justifyContent: "center" }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: "100%", maxWidth: 448, alignSelf: "center" }}>

        {/* Logo & Brand */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <Image source={logo} style={{ width: 48, height: 48, resizeMode: "contain" }} />
          <View>
            <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: "900", letterSpacing: 3.2 }}>HAWLHAYE</Text>
            <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>
              Work. Organised.
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: 40 }}>
          <Text style={{ color: COLORS.text, fontSize: 32, fontWeight: "900" }}>
            {requires2FA ? (isBackupCode ? "Backup Code" : "Two-Factor Auth.") : "Welcome back."}
          </Text>
          <Text style={{ color: COLORS.muted, fontSize: 16, marginTop: 12 }}>
            {requires2FA
              ? isBackupCode
                ? "Enter one of your 10-character backup recovery codes."
                : "Enter the 6-digit code from your authenticator app."
              : "Sign in to continue to your institutional workspace."}
          </Text>
        </View>

        {!requires2FA ? (
          <View style={{ gap: 24 }}>
            <View>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); if(error) setError(null); }}
                  placeholder="you@cecit.edu.so"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!busy}
                />
              </View>
            </View>

            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={styles.label}>Password</Text>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: "700" }}>{showPassword ? "Hide" : "Show"}</Text>
                  </Pressable>
                  <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
                    <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: "700" }}>Forgot password?</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); if(error) setError(null); }}
                  placeholder="••••••••"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPassword}
                  editable={!busy}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>{isBackupCode ? "Backup Recovery Code" : "Authentication Code"}</Text>
            <TextInput
              style={[styles.inputContainer, { textAlign: "center", fontSize: isBackupCode ? 18 : 24, letterSpacing: isBackupCode ? 2 : 8, color: COLORS.text, fontWeight: "700", paddingHorizontal: 16 }]}
              value={code}
              onChangeText={(t) => { setCode(t); if(error) setError(null); }}
              placeholder={isBackupCode ? "XXXXX-XXXXX" : "000000"}
              placeholderTextColor="#334155"
              autoCapitalize={isBackupCode ? "characters" : "none"}
              keyboardType={isBackupCode ? "default" : "number-pad"}
              maxLength={isBackupCode ? 11 : 6}
              editable={!busy}
              autoFocus
            />
            <Pressable onPress={() => { setIsBackupCode(!isBackupCode); setCode(""); setError(null); }} style={{ alignSelf: "center", paddingVertical: 8 }}>
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>
                {isBackupCode ? "Use authenticator code instead" : "Use a backup code instead"}
              </Text>
            </Pressable>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={20} color={COLORS.errorText} />
            <Text style={{ color: COLORS.errorText, fontSize: 14, fontWeight: "700", flex: 1 }}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={busy || (requires2FA ? !isCodeValid : !email || !password)}
          style={({ pressed }) => [
            styles.button,
            { opacity: busy || (requires2FA ? !isCodeValid : !email || !password) ? 0.5 : 1, marginTop: 24 },
            pressed && { transform: [{ scale: 0.98 }] }
          ]}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={{ color: COLORS.bg, fontSize: 16, fontWeight: "900" }}>
              {requires2FA ? (isBackupCode ? "Verify Backup Code" : "Verify Code") : "Sign in to Workspace"}
            </Text>
          )}
        </Pressable>

        {requires2FA && (
          <Pressable onPress={resetToLogin} style={{ alignSelf: "center", marginTop: 16 }}>
            <Text style={{ color: COLORS.muted, fontSize: 13, fontWeight: "600" }}>Back to login</Text>
          </Pressable>
        )}

        {!requires2FA && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
              <Text style={{ color: COLORS.muted, paddingHorizontal: 16, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>Or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
            </View>
            <Pressable style={({ pressed }) => [styles.outlineButton, pressed && { backgroundColor: COLORS.border }]}>
              <Ionicons name="finger-print" size={20} color={COLORS.accent} />
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: "800" }}>Sign in with Passkey</Text>
            </Pressable>
          </>
        )}

        {/* Exact Web Version Demo Accounts */}
        {!requires2FA && (
          <View style={styles.demoContainer}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" }} />
                <Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>Demo Accounts</Text>
              </View>
              <View style={{ backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: COLORS.bg, fontSize: 10, fontWeight: "900" }}>PASS: {DEMO_PASSWORD}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <Pressable
                  key={acc.email}
                  onPress={() => fillDemo(acc.email)}
                  style={({ pressed }) => [
                    {
                      width: "31%", // 3 columns
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: acc.border,
                      backgroundColor: acc.bg,
                      alignItems: "center"
                    },
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Text style={{ color: acc.text, fontSize: 11, fontWeight: "800" }}>{acc.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text style={{ color: COLORS.muted, fontSize: 12, textAlign: "center", marginTop: 32, lineHeight: 20 }}>
          Accounts are managed by the CECIT administrator.{"\n"}Unauthorized access is strictly prohibited.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg, flexDirection: isDesktop ? "row" : "column" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {LeftForm}

      {isDesktop && (
        <View style={{ flex: 1, backgroundColor: COLORS.card, borderLeftWidth: 1, borderColor: COLORS.border, padding: 64, justifyContent: "space-between", overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -160, top: -160, width: 600, height: 600, borderRadius: 300, borderWidth: 1, borderColor: COLORS.border }} />
          <View style={{ position: "absolute", right: -80, top: 0, width: 450, height: 450, borderRadius: 225, borderWidth: 1, borderColor: "rgba(232,188,105,0.1)" }} />
          <View style={{ position: "absolute", bottom: -160, left: -160, width: 600, height: 600, borderRadius: 300, borderWidth: 1, borderColor: COLORS.border }} />

          <View style={{ zIndex: 10 }}>
            <View style={{ alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,188,105,0.3)", backgroundColor: "rgba(232,188,105,0.05)", marginBottom: 32 }}>
              <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Institutional Platform</Text>
            </View>
            <Text style={{ color: COLORS.text, fontSize: 48, fontWeight: "900", lineHeight: 56 }}>
              One workspace.{"\n"}Clear ownership.{"\n"}
              <Text style={{ color: COLORS.accent }}>Every task visible.</Text>
            </Text>
          </View>

          <View style={{ zIndex: 10, gap: 24 }}>
            {[
              "Structured six-stage workflow",
              "Role-based permissions enforced on the server",
              "Full audit trail for every task change",
              "Institutional reports and dashboards",
            ].map((line) => (
              <View key={line} style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="checkmark" size={16} color={COLORS.accent} />
                </View>
                <Text style={{ color: COLORS.muted, fontSize: 16, fontWeight: "500" }}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export function ForgotPasswordScreen({ navigation }: P<"ForgotPassword">) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return;
    setBusy(true); setError(null);
    try { await Api.forgotPassword(email.trim().toLowerCase()); setSent(true); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: "900", marginBottom: 20 }}>Reset your password</Text>
      {sent ? (
        <View style={{ gap: 16 }}>
          <View style={{ backgroundColor: COLORS.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
            <Text style={{ color: COLORS.text }}>If that email belongs to an active account, a reset link is on its way. It expires in 1 hour.</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("ResetPassword", {})} style={styles.button}>
            <Text style={{ color: COLORS.bg, fontWeight: "800" }}>I have my reset token</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {error && <Text style={{ color: COLORS.errorText }}>{error}</Text>}
          <TextInput style={styles.inputContainer} placeholder="Email" placeholderTextColor={COLORS.muted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Pressable onPress={submit} style={styles.button}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={{ color: COLORS.bg, fontWeight: "800" }}>Send reset link</Text>}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

export function ResetPasswordScreen({ route, navigation }: P<"ResetPassword">) {
  const [token, setToken] = useState(route.params?.token ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const problem = passwordProblem(password);
    if (token.trim().length < 32) { setError("Paste the full token from the email link (after ?token=)."); return; }
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    try { await Api.resetPassword(token.trim(), password); navigation.popToTop(); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: "900", marginBottom: 20 }}>Choose a new password</Text>
      {error && <Text style={{ color: COLORS.errorText, marginBottom: 10 }}>{error}</Text>}
      <View style={{ gap: 16 }}>
        <TextInput style={styles.inputContainer} placeholder="Reset token" placeholderTextColor={COLORS.muted} value={token} onChangeText={setToken} autoCapitalize="none" />
        <TextInput style={styles.inputContainer} placeholder="New password" placeholderTextColor={COLORS.muted} value={password} onChangeText={setPassword} secureTextEntry />
        <Pressable onPress={submit} style={styles.button}>
          {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={{ color: COLORS.bg, fontWeight: "800" }}>Set new password</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function AcceptInviteScreen({ route }: P<"AcceptInvite">) {
  const { completeInvite } = useAuth();
  const [token, setToken] = useState(route.params?.token ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const problem = passwordProblem(password);
    if (token.trim().length < 32) { setError("Paste the full invitation token from your email."); return; }
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    try { await completeInvite(token, password, name.trim() || undefined); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: "900", marginBottom: 20 }}>Activate your account</Text>
      {error && <Text style={{ color: COLORS.errorText, marginBottom: 10 }}>{error}</Text>}
      <View style={{ gap: 16 }}>
        <TextInput style={styles.inputContainer} placeholder="Invitation token" placeholderTextColor={COLORS.muted} value={token} onChangeText={setToken} autoCapitalize="none" />
        <TextInput style={styles.inputContainer} placeholder="Full name (optional)" placeholderTextColor={COLORS.muted} value={name} onChangeText={setName} />
        <TextInput style={styles.inputContainer} placeholder="Password" placeholderTextColor={COLORS.muted} value={password} onChangeText={setPassword} secureTextEntry />
        <Pressable onPress={submit} style={styles.button}>
          {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={{ color: COLORS.bg, fontWeight: "800" }}>Activate & sign in</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function LockScreen() {
  const { unlock, logout } = useAuth();
  const [failed, setFailed] = useState(false);
  async function go() { setFailed(!(await unlock())); }
  React.useEffect(() => { void go(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <Ionicons name="lock-closed" size={60} color={COLORS.accent} />
      <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: "900" }}>HAWLHAYE is locked</Text>
      {failed ? <Text style={{ color: COLORS.muted, fontSize: 13 }}>Authentication failed or was cancelled.</Text> : null}
      <Pressable onPress={go} style={[styles.button, { width: "100%", marginTop: 20 }]}>
        <Text style={{ color: COLORS.bg, fontWeight: "800" }}>Unlock</Text>
      </Pressable>
      <Pressable onPress={logout} style={{ padding: 16 }}>
        <Text style={{ color: COLORS.muted, fontWeight: "600" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

export function ChangePasswordForm({ onDone, forced }: { onDone: () => void; forced?: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const problem = passwordProblem(next);
    if (!current) { setError("Enter your current password."); return; }
    if (problem) { setError(problem); return; }
    if (next === current) { setError("The new password must be different."); return; }
    setBusy(true); setError(null);
    try { await Api.changePassword(current, next); setCurrent(""); setNext(""); onDone(); }
    catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  }

  return (
    <View style={{ gap: 16 }}>
      {forced && <Text style={{ color: COLORS.accent, fontWeight: "700" }}>Your administrator requires you to choose a new password before continuing.</Text>}
      {error && <Text style={{ color: COLORS.errorText }}>{error}</Text>}
      <TextInput style={styles.inputContainer} placeholder="Current password" placeholderTextColor={COLORS.muted} value={current} onChangeText={setCurrent} secureTextEntry />
      <TextInput style={styles.inputContainer} placeholder="New password" placeholderTextColor={COLORS.muted} value={next} onChangeText={setNext} secureTextEntry />
      <Pressable onPress={submit} style={styles.button}>
        {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={{ color: COLORS.bg, fontWeight: "800" }}>Change password</Text>}
      </Pressable>
    </View>
  );
}

export function ForcedPasswordScreen() {
  const { refresh, logout } = useAuth();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: "900", marginBottom: 20 }}>Password change required</Text>
      <ChangePasswordForm forced onDone={() => { void refresh(); }} />
      <Pressable onPress={logout} style={{ padding: 16, alignItems: "center", marginTop: 10 }}>
        <Text style={{ color: COLORS.muted, fontWeight: "600" }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: COLORS.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, height: 54, color: COLORS.text, fontSize: 16 },
  inputIcon: { paddingLeft: 16, paddingRight: 12 },
  input: { flex: 1, color: COLORS.text, fontSize: 16, height: "100%", paddingRight: 16 },
  errorBanner: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.errorBorder, borderRadius: 12, padding: 14, marginTop: 20, gap: 10 },
  button: { backgroundColor: COLORS.accent, borderRadius: 12, height: 54, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  outlineButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, height: 54, gap: 8 },
  demoContainer: { marginTop: 48, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 24 }
});
