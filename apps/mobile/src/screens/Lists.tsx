import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { PendingDelegation, Task } from "../api/types";
import { useMe } from "../auth/AuthContext";
import { Shell } from "../components/Shell";
import { ReasonModal, STATUS_KEY, StatusBadge } from "../components/TaskUI";
import { Button, Skeleton, Spinner, Txt } from "../components/ui";
import { formatDate, isOverdue } from "../lib/format";
import { useBoardRealtime } from "../realtime/RealtimeProvider";
import { usePrefs } from "../prefs";
import { alpha } from "../theme";
import type { TranslationKey } from "../i18n";
import type { MainStackParams } from "../navigation/types";

type Nav = NativeStackNavigationProp<MainStackParams>;

function Eyebrow({ children, icon }: { children: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const { palette: c } = usePrefs();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{icon ? <Ionicons name={icon} size={14} color={c.accent} /> : null}<Txt size={12} weight="800" tracking={0.22} upper color={c.accent}>{children}</Txt></View>;
}
function LoadError({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  const { palette: c, t } = usePrefs();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <View accessibilityRole="alert" style={{ maxWidth: 448, borderRadius: 16, borderWidth: 1, borderColor: alpha("#EF4444", 0.2), backgroundColor: alpha("#EF4444", 0.1), padding: 24, alignItems: "center" }}>
        <Ionicons name="alert-circle-outline" size={32} color={c.red} />
        <Txt size={18} weight="700" color={c.red} style={{ marginTop: 12, marginBottom: 4 }}>{title}</Txt>
        <Txt size={14} color={c.red} align="center" style={{ marginBottom: onRetry ? 16 : 0 }}>{message}</Txt>
        {onRetry ? <Button small title={t("common.retry")} icon="refresh" onPress={onRetry} /> : null}
      </View>
    </View>
  );
}
function Dashed({ icon, iconColor, title, desc, children }: { icon: keyof typeof Ionicons.glyphMap; iconColor: string; title: string; desc: string; children?: React.ReactNode }) {
  const { palette: c } = usePrefs();
  return (
    <View accessibilityRole="summary" style={{ borderRadius: 24, borderWidth: 1, borderStyle: "dashed", borderColor: c.border, backgroundColor: alpha(c.panel, 0.5), padding: 40, alignItems: "center" }}>
      <View style={{ height: 80, width: 80, borderRadius: 40, backgroundColor: c.app, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginBottom: 16 }}><Ionicons name={icon} size={40} color={iconColor} /></View>
      <Txt size={22} weight="800" align="center" style={{ marginBottom: 8 }}>{title}</Txt>
      <Txt size={14} muted align="center" style={{ maxWidth: 384, marginBottom: children ? 24 : 0 }}>{desc}</Txt>
      {children}
    </View>
  );
}

// ───────────────────────────── My Tasks ─────────────────────────────
type Filter = "all" | "active" | "completed";
const FILTER_KEY: Record<Filter, TranslationKey> = { all: "myTasks.filter.all", active: "myTasks.filter.active", completed: "myTasks.filter.completed" };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function MyTasksScreen() {
  const nav = useNavigation<Nav>();
  const me = useMe();
  const { palette: c, t } = usePrefs();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setRefreshing(true);
    try { setTasks(await Api.tasks({ mine: true, take: 200 })); setError(null); }
    catch (e) {
      if (e instanceof ApiError && (e.code === "unauthenticated" || e.code === "session_idle")) setError(t("error.sessionExpired"));
      else if (!(e instanceof ApiError && e.code === "password_change_required")) setError(e instanceof ApiError ? e.message : t("error.generic"));
    } finally { if (!opts?.silent) setRefreshing(false); }
  }, [t]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useBoardRealtime(() => { void load({ silent: true }); });

  const filtered = useMemo(() => {
    if (!tasks) return [];
    const q = search.trim().toLowerCase();
    return tasks.filter((x) => {
      if (filter === "active" && x.status === "COMPLETED") return false;
      if (filter === "completed" && x.status !== "COMPLETED") return false;
      if (q && !x.title.toLowerCase().includes(q) && !x.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, filter, search]);

  const groups = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const g: Record<string, Task[]> = { overdue: [], today: [], upcoming: [], noDate: [] };
    filtered.forEach((x) => {
      if (!x.dueDate) { g.noDate!.push(x); return; }
      const due = new Date(x.dueDate);
      if (due < now) g.overdue!.push(x); else if (sameDay(due, now)) g.today!.push(x); else g.upcoming!.push(x);
    });
    Object.keys(g).forEach((k) => g[k]!.sort((a, b) => (!a.dueDate ? 1 : !b.dueDate ? -1 : new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())));
    return g;
  }, [filtered]);

  const canCreate = me.role !== "LAB_TECHNICIAN";
  const goBoard = () => nav.reset({ index: 0, routes: [{ name: "Board" }] });

  let body: React.ReactNode;
  if (error && !tasks) body = <LoadError title={t("error.generic")} message={error} onRetry={() => void load()} />;
  else if (!tasks) body = <View style={{ padding: 16, gap: 24 }}><Skeleton style={{ height: 40, width: 192 }} /><View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel }}>{[1, 2, 3, 4, 5, 6].map((i) => <View key={i} style={{ flexDirection: "row", gap: 16, padding: 16, alignItems: "center" }}><Skeleton style={{ height: 20, width: 20, borderRadius: 10 }} /><Skeleton style={{ height: 16, flex: 1 }} /></View>)}</View></View>;
  else body = (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} tintColor={c.accent} />} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 16 }}>
        <View><Eyebrow>{t("myTasks.personalQueue")}</Eyebrow><Txt size={30} weight="800" style={{ marginTop: 4 }}>{t("myTasks.title")}</Txt></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={() => void load()} disabled={refreshing} accessibilityLabel={t("common.refresh")} style={{ borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, padding: 10, opacity: refreshing ? 0.5 : 1 }}><Ionicons name="refresh" size={16} color={c.muted} /></Pressable>
          {canCreate ? <Pressable onPress={goBoard} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: c.accent, paddingHorizontal: 20, paddingVertical: 10 }}><Ionicons name="add" size={16} color={c.accentText} /><Txt size={14} weight="700" color={c.accentText}>{t("dashboard.newTask")}</Txt></Pressable> : null}
        </View>
      </View>
      <View style={{ gap: 16, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 16 }}>
        <View accessibilityRole="tablist" style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.app, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignSelf: "flex-start" }}>
          {(Object.keys(FILTER_KEY) as Filter[]).map((f) => (
            <Pressable key={f} accessibilityRole="tab" accessibilityState={{ selected: filter === f }} onPress={() => setFilter(f)}
              style={{ borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: filter === f ? alpha(c.border, 0.5) : "transparent", backgroundColor: filter === f ? c.panel : "transparent" }}>
              <Txt size={14} weight="700" color={filter === f ? c.primary : c.muted}>{t(FILTER_KEY[f])}</Txt>
            </Pressable>
          ))}
        </View>
        <View style={{ justifyContent: "center" }}>
          <Ionicons name="search" size={16} color={c.muted} style={{ position: "absolute", left: 12, zIndex: 1 }} />
          <TextInput value={search} onChangeText={setSearch} placeholder={t("myTasks.searchPlaceholder")} placeholderTextColor={c.muted}
            style={{ borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, color: c.primary, paddingLeft: 36, paddingRight: 36, paddingVertical: 8, fontSize: 14 }} />
          {search ? <Pressable onPress={() => setSearch("")} style={{ position: "absolute", right: 8, padding: 4 }}><Ionicons name="close" size={14} color={c.muted} /></Pressable> : null}
        </View>
      </View>
      {filtered.length === 0 ? (
        <Dashed icon="file-tray-outline" iconColor={c.accent} title={search ? t("myTasks.empty.search.title") : t("myTasks.empty.all.title")} desc={search ? "Try a different title or task code." : "You have no tasks right now. New work assigned to you will show up here."}>
          {!search && canCreate ? <Pressable onPress={goBoard} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, backgroundColor: c.accent, paddingHorizontal: 20, paddingVertical: 10 }}><Ionicons name="add" size={16} color={c.accentText} /><Txt size={14} weight="700" color={c.accentText}>{t("myTasks.empty.create")}</Txt></Pressable> : null}
        </Dashed>
      ) : (["overdue", "today", "upcoming", "noDate"] as const).map((key) => {
        const list = groups[key]!;
        if (list.length === 0) return null;
        return (
          <View key={key} style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {key === "overdue" ? <Ionicons name="alert-circle-outline" size={14} color={c.redSoft} /> : key === "today" ? <Ionicons name="calendar-outline" size={14} color={c.accent} /> : null}
              <Txt size={12} weight="800" tracking={0.05} upper color={c.secondary}>{t(`myTasks.group.${key}` as TranslationKey)}</Txt>
              <View style={{ backgroundColor: c.app, borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}><Txt size={10} weight="700">{list.length}</Txt></View>
            </View>
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, overflow: "hidden" }}>
              {list.map((x, i) => {
                const od = isOverdue(x.dueDate, x.status);
                return (
                  <Pressable key={x.id} onPress={() => nav.navigate("TaskDetail", { id: x.id })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, backgroundColor: pressed ? c.panelHover : "transparent" })}>
                    {x.status === "COMPLETED" ? <Ionicons name="checkmark-circle" size={20} color={c.emerald} /> : <View style={{ height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: c.border }} />}
                    <View style={{ flex: 1 }}><Txt size={14} weight="700" numberOfLines={1} color={x.status === "COMPLETED" ? c.muted : c.primary} style={x.status === "COMPLETED" ? { textDecorationLine: "line-through" } : undefined}>{x.title}</Txt></View>
                    {x.dueDate ? <Txt size={12} weight="700" color={od ? c.redSoft : c.secondary}>{formatDate(x.dueDate)}</Txt> : null}
                    <Ionicons name="chevron-forward" size={16} color={c.border} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {tasks.length === 200 ? <Txt size={12} muted align="center" style={{ marginTop: 32 }}>{t("myTasks.truncationNotice")}</Txt> : null}
    </ScrollView>
  );
  return <Shell active="MyTasks">{body}</Shell>;
}

// ───────────────────────────── Delegations ─────────────────────────────
export function DelegationsScreen() {
  const nav = useNavigation<Nav>();
  const { palette: c, t } = usePrefs();
  const [items, setItems] = useState<PendingDelegation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await Api.pendingDelegations()); } catch (e) { setError(e instanceof ApiError ? e.message : "Failed to load delegations"); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useBoardRealtime(() => { void load(); });

  async function respond(d: PendingDelegation, action: "ACCEPTED" | "DECLINED") {
    setBusyId(d.id); setError(null);
    try { await Api.respondDelegation(d.task.id, d.id, action); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Failed to respond to delegation"); }
    finally { setBusyId(null); }
  }

  let body: React.ReactNode;
  if (error && !items) body = <LoadError title="Failed to load inbox" message={error} />;
  else if (!items) body = <View style={{ padding: 16, gap: 24 }}><Skeleton style={{ height: 40, width: 192 }} />{[1, 2].map((i) => <Skeleton key={i} style={{ height: 128, borderRadius: 16 }} />)}</View>;
  else body = (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.accent} />}>
      <View style={{ gap: 16 }}>
        <View>
          <Eyebrow>{t("nav.delegations")}</Eyebrow>
          <Txt size={30} weight="800" style={{ marginTop: 4 }}>{t("delegations.title")}</Txt>
          <Txt size={14} muted style={{ marginTop: 8 }}>{t("delegations.subtitle")}</Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Txt size={14} weight="700">{items.length}</Txt><Txt size={12} weight="700" tracking={0.05} upper muted>{t("delegations.pending")}</Txt>
        </View>
      </View>
      {error ? <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: alpha("#EF4444", 0.2), backgroundColor: alpha("#EF4444", 0.1), padding: 16 }}><Ionicons name="alert-circle-outline" size={18} color={c.red} /><Txt size={14} weight="700" color={c.red} style={{ flex: 1 }}>{error}</Txt></View> : null}
      {items.length === 0 ? <Dashed icon="file-tray-outline" iconColor={c.faint} title={t("delegations.empty.title")} desc={t("delegations.empty.desc")} /> : items.map((d) => {
        const busy = busyId === d.id;
        const od = !!d.task.dueDate && new Date(d.task.dueDate) < new Date();
        return (
          <View key={d.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, padding: 20, gap: 20 }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <View style={{ backgroundColor: c.app, borderWidth: 1, borderColor: c.border, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}><Txt size={11} weight="700" tracking={0.05} color={c.faint} style={{ fontFamily: undefined }}>{d.task.code}</Txt></View>
                <View style={{ backgroundColor: alpha("#FBBF24", 0.1), borderWidth: 1, borderColor: alpha("#FBBF24", 0.2), borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}><Txt size={10} weight="700" tracking={0.05} upper color="#FBBF24">{t("delegations.pending")}</Txt></View>
              </View>
              <Pressable onPress={() => nav.navigate("TaskDetail", { id: d.task.id })}><Txt size={18} weight="700" numberOfLines={2}>{d.task.title}</Txt></Pressable>
              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 24 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Txt size={10} weight="700" tracking={0.05} upper muted>{t("delegations.from")}:</Txt><Txt size={12} weight="500">{d.delegatedBy?.fullName ?? "Unknown"}</Txt></View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Txt size={10} weight="700" tracking={0.05} upper muted>{t("board.table.dueDate")}:</Txt><Txt size={12} weight="500" color={od ? c.red : c.primary}>{d.task.dueDate ? formatDate(d.task.dueDate) : "None"}</Txt></View>
              </View>
              {d.reason ? <View style={{ marginTop: 12, borderRadius: 8, backgroundColor: c.app, borderWidth: 1, borderColor: c.border, padding: 12 }}><Txt size={12} muted style={{ fontStyle: "italic" }}>"{d.reason}"</Txt></View> : null}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable disabled={busy} onPress={() => void respond(d, "ACCEPTED")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: c.accent, paddingVertical: 10, opacity: busy ? 0.5 : 1 }}>
                {busy ? <Spinner size="small" /> : <Ionicons name="checkmark-circle-outline" size={16} color={c.accentText} />}<Txt size={14} weight="700" color={c.accentText}>{t("delegations.accept")}</Txt>
              </Pressable>
              <Pressable disabled={busy} onPress={() => void respond(d, "DECLINED")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: alpha("#EF4444", 0.2), backgroundColor: alpha("#EF4444", 0.1), paddingVertical: 10, opacity: busy ? 0.5 : 1 }}>
                <Ionicons name="close-circle-outline" size={16} color={c.red} /><Txt size={14} weight="700" color={c.red}>{t("delegations.decline")}</Txt>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
  return <Shell active="Delegations">{body}</Shell>;
}

// ───────────────────────────── Review queue ─────────────────────────────
export function ReviewScreen() {
  const nav = useNavigation<Nav>();
  const { palette: c, t } = usePrefs();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ret, setRet] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await Api.tasks({ status: "REVIEW", take: 100, _t: Date.now() });
      setTasks([...list].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()));
    } catch (e) { setError(e instanceof ApiError ? e.message : t("review.error.load")); }
  }, [t]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useBoardRealtime(() => { void load(); });
  useEffect(() => { const i = setInterval(() => void load(), 15000); return () => clearInterval(i); }, [load]); // web polls every 15s

  async function act(task: Task, to: "COMPLETED" | "IN_PROGRESS", reason?: string) {
    setBusyId(task.id); setError(null);
    try { await Api.transition(task.id, to, reason); setRet(null); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : t("review.error.action")); }
    finally { setBusyId(null); }
  }
  const wait = (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    const label = days === 0 ? t("review.wait.today") : days === 1 ? t("review.wait.oneDay") : t("review.wait.days", { days });
    const col = days >= 5 ? "#F87171" : days >= 3 ? "#FBBF24" : days >= 1 ? "#60A5FA" : "#34D399";
    return { label, col };
  };

  let body: React.ReactNode;
  if (error && !tasks) body = <LoadError title={t("review.error.load")} message={error} />;
  else if (!tasks) body = <View style={{ padding: 16, gap: 16 }}><Skeleton style={{ height: 40, width: 192 }} />{[1, 2].map((i) => <Skeleton key={i} style={{ height: 150, borderRadius: 16 }} />)}</View>;
  else body = (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.accent} />}>
      <View style={{ gap: 16 }}>
        <View><Eyebrow icon="shield-checkmark-outline">{t("review.title")}</Eyebrow><Txt size={30} weight="800" style={{ marginTop: 4 }}>{t("review.heading")}</Txt><Txt size={14} muted style={{ marginTop: 8 }}>{t("review.subtitle")}</Txt></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "flex-start", borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Txt size={24} weight="800" color={c.accent}>{tasks.length}</Txt><Txt size={12} weight="700" tracking={0.05} upper muted>{t("review.pending")}</Txt>
        </View>
      </View>
      {error ? <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: alpha("#EF4444", 0.2), backgroundColor: alpha("#EF4444", 0.1), padding: 16 }}><Ionicons name="alert-circle-outline" size={18} color={c.red} /><Txt size={14} weight="700" color={c.red} style={{ flex: 1 }}>{error}</Txt></View> : null}
      {tasks.length === 0 ? <Dashed icon="checkmark-circle-outline" iconColor={c.emerald} title={t("review.empty.title")} desc={t("review.empty.desc")} /> : tasks.map((task) => {
        const busy = busyId === task.id;
        const w = wait(task.updatedAt);
        const od = !!task.dueDate && new Date(task.dueDate) < new Date();
        return (
          <View key={task.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, padding: 20, gap: 16, opacity: busy ? 0.6 : 1 }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <View style={{ backgroundColor: c.app, borderWidth: 1, borderColor: c.border, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}><Txt size={11} weight="700" tracking={0.05} color={c.faint}>{task.code}</Txt></View>
                {task.category ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.app, borderWidth: 1, borderColor: c.border, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: task.category.color || "#94A3B8" }} /><Txt size={10} weight="700" muted>{task.category.name}</Txt></View> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 6, borderWidth: 1, borderColor: alpha(w.col, 0.2), backgroundColor: alpha(w.col, 0.1), paddingHorizontal: 10, paddingVertical: 4 }}><Ionicons name="time-outline" size={11} color={w.col} /><Txt size={10} weight="700" tracking={0.05} upper color={w.col}>{w.label}</Txt></View>
              </View>
              <Pressable onPress={() => nav.navigate("TaskDetail", { id: task.id })}><Txt size={18} weight="700" numberOfLines={2}>{task.title}</Txt></Pressable>
              <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 24 }}>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Ionicons name="person-outline" size={14} color={c.faint} /><Txt size={12} weight="700">{task.owner?.fullName ?? t("review.table.unknown")}</Txt></View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Ionicons name="calendar-outline" size={14} color={c.faint} /><Txt size={12} weight="700" color={od ? c.red : c.primary}>{task.dueDate ? formatDate(task.dueDate) : t("review.table.none")}</Txt></View>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border }}>
              <Pressable disabled={!!busyId} onPress={() => void act(task, "COMPLETED")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: c.accent, paddingVertical: 10, opacity: busyId ? 0.5 : 1 }}>
                {busy ? <Spinner size="small" /> : <Ionicons name="checkmark-circle-outline" size={16} color={c.accentText} />}<Txt size={14} weight="700" color={c.accentText}>{t("review.action.accept")}</Txt>
              </Pressable>
              <Pressable disabled={!!busyId} onPress={() => setRet(task)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: alpha("#EF4444", 0.2), backgroundColor: alpha("#EF4444", 0.1), paddingVertical: 10, opacity: busyId ? 0.5 : 1 }}>
                <Ionicons name="return-up-back" size={16} color={c.red} /><Txt size={14} weight="700" color={c.red}>{t("review.action.return")}</Txt>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
  return (
    <Shell active="Review">
      {body}
      <ReasonModal visible={!!ret} minLength={5} busy={!!busyId} title={t("review.return.title")} description={t("review.return.desc")} placeholder={t("review.return.placeholder")}
        submitLabel={busyId ? t("review.return.submitting") : t("review.return.submit")}
        hint={(n) => (n > 0 ? t("review.return.minChars", { count: n }) : t("review.return.ready"))}
        onClose={() => setRet(null)} onSubmit={(r) => ret && act(ret, "IN_PROGRESS", r)} />
      {void STATUS_KEY}{void StatusBadge}
    </Shell>
  );
}
