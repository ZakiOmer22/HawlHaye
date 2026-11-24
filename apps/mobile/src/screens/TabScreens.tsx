import React, { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../api/endpoints";
import { ApiError } from "../api/client";
import { ROLE_LABELS, STATUSES, STATUS_LABELS, type Task, type TaskStatus } from "../api/types";
import { useAuth, useMe } from "../auth/AuthContext";
import { Banner, Button, Card, Chip, Empty, ErrorState, Loading, Pill, Row, Screen, SectionTitle, Sheet, Field, Txt } from "../components/ui";
import { useLoad } from "../lib/useLoad";
import { canCreateTask, isWorkflowLeader } from "../lib/workflow";
import { isOverdue } from "../lib/format";
import { STATUS_COLOR } from "../theme";
import { usePalette } from "../prefs";
import type { MainStackParams } from "../navigation/types";

type Nav = NativeStackNavigationProp<MainStackParams>;
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");

function Header({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <View style={{ flexShrink: 1 }}>
        <Txt size={26} weight="800">{title}</Txt>
        {subtitle ? <Txt muted size={13}>{subtitle}</Txt> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>{children}</View>
    </View>
  );
}
function IconBtn({ name, onPress, label }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string }) {
  const c = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={8}
      style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.panel, borderColor: c.border, borderWidth: 1, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={name} size={20} color={c.text} />
    </Pressable>
  );
}

// ── Dashboard ──────────────────────────────────────────────
export function DashboardScreen() {
  const nav = useNavigation<Nav>();
  const c = usePalette();
  const q = useLoad(() => Api.summary(), []);
  const s = q.data;
  const total = Math.max(1, s?.totalTasks ?? 1);
  return (
    <Screen pad={false}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={c.accent} />}>
        <Header title="Dashboard" subtitle="Last 30 days" />
        {q.loading ? <Loading /> : q.error && !s ? <ErrorState message={q.error} onRetry={q.reload} /> : s ? (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Stat label="Total tasks" value={String(s.totalTasks)} />
              <Stat label="Completion" value={`${s.completionRate}%`} color={c.ok} />
              <Stat label="Overdue" value={String(s.overdueTasks)} color={s.overdueTasks ? c.danger : c.text} />
              <Stat label="Due in 3 days" value={String(s.dueSoonTasks)} color={c.warn} />
              <Stat label="On-time rate" value={`${s.onTimeRate}%`} />
              <Stat label="Avg. days to finish" value={String(s.avgCompletionDays)} />
            </View>
            <SectionTitle>By status</SectionTitle>
            <Card>
              {STATUSES.map((st) => {
                const n = s.byStatus[st] ?? 0;
                return (
                  <View key={st} style={{ marginVertical: 6 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Txt size={13}>{STATUS_LABELS[st]}</Txt><Txt size={13} weight="700">{n}</Txt>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.panelAlt, marginTop: 4 }}>
                      <View style={{ height: 6, borderRadius: 3, width: `${Math.round((n / total) * 100)}%`, backgroundColor: STATUS_COLOR[st] }} />
                    </View>
                  </View>
                );
              })}
            </Card>
            {s.blockedTasks.length ? (
              <>
                <SectionTitle>Blocked</SectionTitle>
                {s.blockedTasks.map((t) => (
                  <Card key={t.id} onPress={() => nav.navigate("TaskDetail", { id: t.id })} style={{ marginBottom: 8 }}>
                    <Txt size={11} weight="800" muted>{t.code} · {t.days}d</Txt>
                    <Txt weight="700">{t.title}</Txt>
                    {t.reason ? <Txt muted size={13} style={{ marginTop: 4 }}>{t.reason}</Txt> : null}
                  </Card>
                ))}
              </>
            ) : null}
            {s.pendingReview.length ? (
              <>
                <SectionTitle>Waiting for review</SectionTitle>
                {s.pendingReview.map((t) => (
                  <Card key={t.id} onPress={() => nav.navigate("TaskDetail", { id: t.id })} style={{ marginBottom: 8 }}>
                    <Txt size={11} weight="800" muted>{t.code} · {t.days}d waiting</Txt>
                    <Txt weight="700">{t.title}</Txt>
                    <Txt muted size={13}>{t.owner}</Txt>
                  </Card>
                ))}
              </>
            ) : null}
            {s.workload.length ? (
              <>
                <SectionTitle>Workload</SectionTitle>
                <Card>
                  {s.workload.map((w) => <Row key={w.id} label={w.name} value={`${w.total} open · ${w.blocked} blocked`} />)}
                </Card>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ width: "48%", flexGrow: 1 }}>
      <Txt muted size={12}>{label}</Txt>
      <Txt size={26} weight="800" color={color}>{value}</Txt>
    </Card>
  );
}

// ── Profile ────────────────────────────────────────────────
export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const me = useMe();
  const { logout } = useAuth();
  const c = usePalette();
  const warn = me.twoFAStatus && (me.twoFAStatus.enforcement === "warning" || me.twoFAStatus.enforcement === "blocked");
  return (
    <Screen scroll>
      <Header title="Profile" />
      <Card style={{ alignItems: "center", paddingVertical: 22 }}>
        <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
          <Txt size={28} weight="800" color={c.accentText}>{me.fullName.slice(0, 1).toUpperCase()}</Txt>
        </View>
        <Txt size={20} weight="800">{me.fullName}</Txt>
        <Txt muted size={13}>{me.email}</Txt>
        <View style={{ marginTop: 10 }}><Pill label={ROLE_LABELS[me.role].toUpperCase()} color={c.accent} /></View>
      </Card>
      {warn ? (
        <View style={{ marginTop: 14 }}>
          <Banner tone={me.twoFAStatus?.enforcement === "blocked" ? "danger" : "warn"}>
            {me.twoFAStatus?.enforcement === "blocked"
              ? "Two-factor authentication is required for your role and its grace period has ended."
              : `Enable two-factor authentication${me.twoFAStatus?.daysLeft != null ? ` within ${me.twoFAStatus.daysLeft} day(s)` : ""}.`}
          </Banner>
        </View>
      ) : null}
      <SectionTitle>Account</SectionTitle>
      <Card onPress={() => nav.navigate("Security")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="shield-checkmark-outline" size={22} color={c.accent} />
          <View><Txt weight="700">Security</Txt><Txt muted size={12}>Password, 2FA, app lock, sessions</Txt></View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.muted} />
      </Card>
      <View style={{ marginTop: 10, gap: 10 }}>
        <NavRow icon="help-buoy-outline" title="Support tickets" sub="Report a problem or ask for help" onPress={() => nav.navigate("Tickets")} />
        {["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(me.role) ? <NavRow icon="people-outline" title="Users" sub="Accounts, invitations, access" onPress={() => nav.navigate("Users")} /> : null}
        {["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(me.role) ? <NavRow icon="document-text-outline" title="Audit log" sub="Tamper-evident activity history" onPress={() => nav.navigate("Audit")} /> : null}
      </View>
      <SectionTitle>Details</SectionTitle>
      <Card>
        <Row label="Two-factor" value={me.twoFactorEnabled ? "Enabled" : "Off"} />
        <Row label="Last sign-in" value={me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : "—"} />
      </Card>
      <View style={{ marginTop: 24 }}><Button title="Sign out" variant="danger" icon="log-out-outline" onPress={logout} /></View>
    </Screen>
  );
}

function NavRow({ icon, title, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress: () => void }) {
  const c = usePalette();
  return (
    <Card onPress={onPress} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ionicons name={icon} size={22} color={c.accent} />
        <View><Txt weight="700">{title}</Txt><Txt muted size={12}>{sub}</Txt></View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </Card>
  );
}
