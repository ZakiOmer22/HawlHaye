import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../api/endpoints";
import { ApiError } from "../api/client";
import {
  STATUSES,
  type Category,
  type Me,
  type Office,
  type Task,
  type TaskStatus,
} from "../api/types";
import { useMe } from "../auth/AuthContext";
import { Shell } from "../components/Shell";
import {
  Column,
  CreateTaskModal,
  AssignTaskModal,
  ReasonModal,
  STATUS_KEY,
  StatusBadge,
} from "../components/TaskUI";
import { Avatar, Button, Modal, Skeleton, Txt } from "../components/ui";
import { useBoardRealtime } from "../realtime/RealtimeProvider";
import { usePrefs } from "../prefs";
import { alpha, statusStyle } from "../theme";
import type { TranslationKey } from "../i18n";
import type { MainStackParams } from "../navigation/types";

type Nav = NativeStackNavigationProp<MainStackParams>;
type DateFilter = "ALL" | "OVERDUE" | "TODAY" | "THIS_WEEK" | "NEXT_TWO_WEEKS" | "THIS_MONTH";
type ViewMode = "board" | "list" | "calendar";
type Cols = Record<TaskStatus, Task[]>;
type BoardRaw = Partial<Record<TaskStatus, Task[] | { tasks: Task[]; total: number }>>;

const DATE_FILTER_KEY: Record<DateFilter, TranslationKey> = {
  ALL: "board.filter.anyDate",
  OVERDUE: "board.filter.overdue",
  TODAY: "board.filter.today",
  THIS_WEEK: "board.filter.thisWeek",
  NEXT_TWO_WEEKS: "board.filter.nextTwoWeeks",
  THIS_MONTH: "board.filter.thisMonth",
};
const DAY_KEYS: TranslationKey[] = [
  "board.day.sun",
  "board.day.mon",
  "board.day.tue",
  "board.day.wed",
  "board.day.thu",
  "board.day.fri",
  "board.day.sat",
];
const empty = (): Cols => ({
  UNASSIGNED: [],
  ASSIGNED: [],
  IN_PROGRESS: [],
  BLOCKED: [],
  REVIEW: [],
  COMPLETED: [],
});

function normalize(raw: BoardRaw | undefined) {
  const tasks = empty();
  const totals: Record<TaskStatus, number> = {
    UNASSIGNED: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    BLOCKED: 0,
    REVIEW: 0,
    COMPLETED: 0,
  };
  if (!raw) return { tasks, totals };
  for (const s of STATUSES) {
    const v = raw[s];
    if (Array.isArray(v)) {
      tasks[s] = v;
      totals[s] = v.length;
    } else if (v && Array.isArray(v.tasks)) {
      tasks[s] = v.tasks;
      totals[s] = v.total ?? v.tasks.length;
    }
  }
  return { tasks, totals };
}
const canCreate = (me: Me) =>
  ["ADMINISTRATOR", "DEAN", "DEPUTY", "FACULTY_COORDINATOR", "LABS_COORDINATOR"].includes(me.role);

export function BoardScreen() {
  const nav = useNavigation<Nav>();
  const me = useMe();
  const { palette: c, t } = usePrefs();
  const [columns, setColumns] = useState<Cols | null>(null);
  const [totals, setTotals] = useState<Record<TaskStatus, number>>({
    UNASSIGNED: 0,
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    BLOCKED: 0,
    REVIEW: 0,
    COMPLETED: 0,
  });
  const [offices, setOffices] = useState<Office[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<ViewMode>("board");
  const [searchInput, setSearchInput] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterMine, setFilterMine] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<DateFilter>("ALL");
  const [dateMenu, setDateMenu] = useState(false);
  const [calDate, setCalDate] = useState(new Date());
  const [pending, setPending] = useState<{
    taskId: string;
    from: TaskStatus;
    to: TaskStatus;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; description: string } | null>(null);
  const [assignTask, setAssignTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const x = setTimeout(() => setFilterSearch(searchInput.trim()), 400);
    return () => clearTimeout(x);
  }, [searchInput]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setRefreshing(true);
      try {
        const qs: Record<string, string | boolean> = {};
        if (filterMine) qs.mine = true;
        if (filterSearch) qs.q = filterSearch;
        if (filterCategory) qs.categoryId = filterCategory;
        if (filterDate === "OVERDUE") qs.overdue = true;
        const [b, o, k] = await Promise.all([
          Api.boardRaw(qs),
          Api.offices().catch(() => [] as Office[]),
          Api.categories().catch(() => [] as Category[]),
        ]);
        const { tasks, totals: nt } = normalize(b as BoardRaw);
        if (["TODAY", "THIS_WEEK", "NEXT_TWO_WEEKS", "THIS_MONTH"].includes(filterDate)) {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const endWeek = start + 7 * 86400000,
            endTwo = start + 14 * 86400000;
          const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
          const f = (task: Task) => {
            if (!task.dueDate) return false;
            const due = new Date(task.dueDate).getTime();
            if (filterDate === "TODAY") return due >= start && due < start + 86400000;
            if (filterDate === "THIS_WEEK") return due >= start && due < endWeek;
            if (filterDate === "NEXT_TWO_WEEKS") return due >= start && due < endTwo;
            return due >= start && due <= endMonth;
          };
          for (const s of STATUSES) {
            tasks[s] = tasks[s].filter(f);
            nt[s] = tasks[s].length;
          }
        }
        setColumns(tasks);
        setTotals(nt);
        setOffices(o);
        setCategories(k);
        setError(null);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t("board.loadError"));
      } finally {
        if (!opts?.silent) setRefreshing(false);
      }
    },
    [filterMine, filterSearch, filterCategory, filterDate, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useBoardRealtime(() => {
    void load({ silent: true });
  });

  const display = useMemo(() => {
    if (!columns) return null;
    if (!filterSearch) return columns;
    const q = filterSearch.toLowerCase();
    const r = empty();
    for (const s of STATUSES)
      r[s] = columns[s].filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.code.toLowerCase().includes(q) ||
          (x.description ?? "").toLowerCase().includes(q),
      );
    return r;
  }, [columns, filterSearch]);
  const allTasks = useMemo(() => (display ? Object.values(display).flat() : []), [display]);
  const dTotals = useMemo(() => {
    const r = { ...totals };
    if (display) for (const s of STATUSES) r[s] = display[s].length;
    return r;
  }, [display, totals]);

  const findCol = useCallback(
    (id: string): TaskStatus | null => {
      if (!columns) return null;
      for (const s of STATUSES) if (columns[s].some((x) => x.id === id)) return s;
      return null;
    },
    [columns],
  );

  const executeMove = useCallback(
    async (taskId: string, from: TaskStatus, to: TaskStatus, reason?: string) => {
      setSaving(true);
      try {
        await Api.transition(taskId, to, reason);
        setPending(null);
        void load({ silent: true });
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.code === "missing_owner" || err.code === "missing_due_date")
        ) {
          const tk =
            columns?.[from]?.find((x) => x.id === taskId) ||
            columns?.[to]?.find((x) => x.id === taskId);
          if (tk) {
            setAssignTask(tk);
            void load({ silent: true });
            return;
          }
        }
        setErrorModal({
          title: "Action Failed",
          description: err instanceof ApiError ? err.message : "Could not move task.",
        });
        void load({ silent: true });
        setPending(null);
      } finally {
        setSaving(false);
      }
    },
    [columns, load],
  );

  const onMove = useCallback(
    (taskId: string, to: TaskStatus) => {
      const from = findCol(taskId);
      if (!from || from === to) return;
      const tk = columns?.[from]?.find((x) => x.id === taskId);
      if (to === "ASSIGNED" && tk && (!tk.ownerId || !tk.dueDate)) {
        setAssignTask(tk);
        void load({ silent: true });
        return;
      }
      if (to === "BLOCKED" || (from === "REVIEW" && to === "IN_PROGRESS")) {
        setPending({ taskId, from, to });
        return;
      }
      setColumns((prev) => {
        if (!prev) return prev;
        const moving = prev[from].find((x) => x.id === taskId);
        if (!moving) return prev;
        return {
          ...prev,
          [from]: prev[from].filter((x) => x.id !== taskId),
          [to]: [{ ...moving, status: to }, ...prev[to]],
        };
      });
      void executeMove(taskId, from, to);
    },
    [columns, findCol, executeMove, load],
  );

  const anyFilter =
    filterMine || filterCategory !== null || filterDate !== "ALL" || filterSearch !== "";
  const clearFilters = () => {
    setFilterMine(false);
    setFilterCategory(null);
    setFilterDate("ALL");
    setSearchInput("");
    setFilterSearch("");
  };
  const open = (id: string) => nav.navigate("TaskDetail", { id });
  const total = Object.values(dTotals).reduce((a, b) => a + b, 0);

  // calendar
  const y = calDate.getFullYear(),
    m = calDate.getMonth();
  const monthName = calDate.toLocaleString("default", { month: "long" });
  const firstDay = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const monthTasks = allTasks.filter(
    (x) =>
      x.dueDate && new Date(x.dueDate).getFullYear() === y && new Date(x.dueDate).getMonth() === m,
  );

  const header = (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        backgroundColor: alpha(c.app, 0.95),
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
        gap: 20,
      }}
    >
      <View style={{ gap: 16 }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Txt size={24} weight="800" tracking={-0.025}>
              {t("board.title")}
            </Txt>
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.panel,
                paddingHorizontal: 10,
                paddingVertical: 2,
              }}
            >
              <Txt size={12} weight="700" muted>
                {total === 1
                  ? t("board.taskCountOne", { count: total })
                  : t("board.taskCount", { count: total })}
              </Txt>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: alpha("#10B981", 0.2),
                backgroundColor: alpha("#10B981", 0.1),
                paddingHorizontal: 10,
                paddingVertical: 2,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#34D399" }} />
              <Txt size={10} weight="700" tracking={0.05} upper color={c.emerald}>
                Live
              </Txt>
            </View>
          </View>
          <Txt size={14} muted style={{ marginTop: 4 }}>
            {t("board.subtitle")}
          </Txt>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.panel,
              padding: 4,
              marginEnd: 8,
            }}
          >
            {(
              [
                ["board", "grid-outline", "board.view.board"],
                ["list", "list-outline", "board.view.list"],
                ["calendar", "calendar-outline", "board.view.calendar"],
              ] as const
            ).map(([v, ic, k]) => (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={{
                  height: 32,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  backgroundColor: view === v ? c.app : "transparent",
                }}
              >
                <Ionicons name={ic} size={14} color={view === v ? c.primary : c.muted} />
                <Txt size={12} weight="700" color={view === v ? c.primary : c.muted}>
                  {t(k)}
                </Txt>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => void load()}
            disabled={refreshing}
            accessibilityLabel={t("common.refresh")}
            style={{
              height: 40,
              width: 40,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.panel,
              alignItems: "center",
              justifyContent: "center",
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <Ionicons name="refresh" size={16} color={c.muted} />
          </Pressable>
          {canCreate(me) ? (
            <Pressable
              onPress={() => setCreateOpen(true)}
              style={{
                height: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                backgroundColor: c.accent,
                paddingHorizontal: 20,
              }}
            >
              <Ionicons name="add" size={16} color={c.accentText} />
              <Txt size={14} weight="700" color={c.accentText}>
                {t("board.newTask")}
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <View style={{ flexGrow: 1, minWidth: 220, justifyContent: "center" }}>
            <Ionicons
              name="search"
              size={16}
              color={c.muted}
              style={{ position: "absolute", left: 12, zIndex: 1 }}
            />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder={t("board.searchPlaceholder").replace(" (Press '/')", "")}
              placeholderTextColor={c.muted}
              returnKeyType="search"
              style={{
                height: 40,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.panel,
                color: c.primary,
                paddingLeft: 36,
                paddingRight: 36,
                fontSize: 14,
              }}
            />
            {searchInput ? (
              <Pressable
                onPress={() => setSearchInput("")}
                style={{ position: "absolute", right: 8, padding: 4 }}
              >
                <Ionicons name="close" size={14} color={c.muted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setDateMenu(true)}
            style={{
              height: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: filterDate !== "ALL" ? c.accent : c.border,
              backgroundColor: filterDate !== "ALL" ? alpha(c.accent, 0.1) : c.panel,
              paddingHorizontal: 12,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={filterDate !== "ALL" ? c.accent : c.muted}
            />
            <Txt size={14} weight="700" color={filterDate !== "ALL" ? c.accent : c.muted}>
              {t(DATE_FILTER_KEY[filterDate])}
            </Txt>
            <Ionicons
              name="chevron-down"
              size={14}
              color={filterDate !== "ALL" ? c.accent : c.muted}
            />
          </Pressable>
          <Pressable
            onPress={() => setFilterMine(!filterMine)}
            style={{
              height: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: filterMine ? c.accent : c.border,
              backgroundColor: filterMine ? alpha(c.accent, 0.1) : c.panel,
              paddingHorizontal: 12,
            }}
          >
            <Ionicons
              name="person-circle-outline"
              size={16}
              color={filterMine ? c.accent : c.muted}
            />
            <Txt size={14} weight="700" color={filterMine ? c.accent : c.muted}>
              {t("board.filter.mine")}
            </Txt>
          </Pressable>
          {anyFilter ? (
            <Pressable
              onPress={clearFilters}
              style={{
                height: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons name="close" size={14} color={c.muted} />
              <Txt size={14} weight="700" muted>
                {t("board.filter.clear")}
              </Txt>
            </Pressable>
          ) : null}
        </View>
        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {categories.map((cat) => {
              const sel = filterCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setFilterCategory(sel ? null : cat.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: sel ? c.accent : c.border,
                    backgroundColor: sel ? c.accent : c.panel,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: cat.color || "#64748B",
                    }}
                  />
                  <Txt size={12} weight="700" color={sel ? c.accentText : c.muted}>
                    {cat.name}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );

  let body: React.ReactNode;
  if (!display) {
    body = error ? (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <View
          accessibilityRole="alert"
          style={{
            maxWidth: 448,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: alpha("#EF4444", 0.2),
            backgroundColor: alpha("#EF4444", 0.1),
            padding: 24,
            alignItems: "center",
          }}
        >
          <Txt size={18} weight="800" color={c.red} style={{ marginBottom: 8 }}>
            {t("board.loadError")}
          </Txt>
          <Txt size={14} muted align="center" style={{ marginBottom: 24 }}>
            {error}
          </Txt>
          <Button small title={t("board.retry")} icon="refresh" onPress={() => void load()} />
        </View>
      </View>
    ) : (
      <ScrollView horizontal contentContainerStyle={{ padding: 16, gap: 20 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 320,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: alpha(c.panel, 0.4),
              padding: 16,
              gap: 12,
            }}
          >
            <Skeleton style={{ height: 16, width: 96 }} />
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} style={{ height: 112, borderRadius: 12 }} />
            ))}
          </View>
        ))}
      </ScrollView>
    );
  } else if (total === 0) {
    body = (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load()}
            tintColor={c.accent}
          />
        }
      >
        <View
          style={{
            height: 80,
            width: 80,
            borderRadius: 24,
            backgroundColor: c.panel,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Ionicons name="layers-outline" size={40} color={c.muted} />
        </View>
        <Txt size={24} weight="800" style={{ marginBottom: 8 }}>
          {t("board.empty.title")}
        </Txt>
        <Txt size={14} muted align="center" style={{ maxWidth: 448, marginBottom: 24 }}>
          {anyFilter
            ? "No tasks match the current filters."
            : me.role === "LAB_TECHNICIAN"
              ? "No tasks on the board. Check 'My Tasks' for your assigned work."
              : "There are no tasks yet. Create one to get started."}
        </Txt>
        {anyFilter ? (
          <Pressable
            onPress={clearFilters}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.panel,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Txt size={14} weight="700">
              {t("board.empty.clearFilters")}
            </Txt>
          </Pressable>
        ) : canCreate(me) ? (
          <Pressable
            onPress={() => setCreateOpen(true)}
            style={{
              borderRadius: 12,
              backgroundColor: c.accent,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Txt size={14} weight="700" color={c.accentText}>
              {t("board.empty.createFirst")}
            </Txt>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  } else if (view === "board") {
    body = (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 110,
          gap: 20,
          alignItems: "flex-start",
        }}
        style={{ flex: 1 }}
      >
        {STATUSES.map((s) => {
          const shown = display[s].length,
            tot = dTotals[s] ?? shown;
          const lbl = t(STATUS_KEY[s]);
          return (
            <View key={s} style={{ maxHeight: "100%" }}>
              <Column
                status={s}
                label={tot > shown ? `${lbl} (${shown}/${tot})` : lbl}
                tasks={display[s]}
                onMove={onMove}
                onOpen={open}
              />
            </View>
          );
        })}
      </ScrollView>
    );
  } else if (view === "list") {
    const W = [260, 150, 140, 120, 180];
    body = (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.panel,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                backgroundColor: alpha(c.appSoft, 0.5),
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              {(
                [
                  "board.table.task",
                  "board.table.status",
                  "board.table.category",
                  "board.table.dueDate",
                  "board.table.assignee",
                ] as TranslationKey[]
              ).map((k, i) => (
                <View key={k} style={{ width: W[i], paddingHorizontal: 24, paddingVertical: 16 }}>
                  <Txt size={12} weight="700" tracking={0.05} upper muted>
                    {t(k)}
                  </Txt>
                </View>
              ))}
            </View>
            {allTasks.map((x, idx) => {
              const od =
                !!x.dueDate && new Date(x.dueDate) < new Date() && x.status !== "COMPLETED";
              return (
                <Pressable
                  key={x.id}
                  onPress={() => open(x.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderTopWidth: idx ? 1 : 0,
                    borderTopColor: c.border,
                  }}
                >
                  <View style={{ width: W[0], paddingHorizontal: 24, paddingVertical: 16 }}>
                    <Txt size={14} weight="700" numberOfLines={2}>
                      {x.title}
                    </Txt>
                    <Txt size={12} muted style={{ marginTop: 2 }}>
                      {x.code}
                    </Txt>
                  </View>
                  <View style={{ width: W[1], paddingHorizontal: 24, paddingVertical: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        alignSelf: "flex-start",
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: statusStyle(x.status, c).border,
                        backgroundColor: statusStyle(x.status, c).bg,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: statusStyle(x.status, c).dot,
                        }}
                      />
                      <Txt
                        size={10}
                        weight="700"
                        tracking={0.05}
                        upper
                        color={statusStyle(x.status, c).text}
                      >
                        {t(STATUS_KEY[x.status])}
                      </Txt>
                    </View>
                  </View>
                  <View style={{ width: W[2], paddingHorizontal: 24, paddingVertical: 16 }}>
                    <Txt size={14} muted numberOfLines={1}>
                      {x.category?.name || "—"}
                    </Txt>
                  </View>
                  <View style={{ width: W[3], paddingHorizontal: 24, paddingVertical: 16 }}>
                    <Txt size={14} weight="700" color={od ? c.redSoft : c.muted}>
                      {x.dueDate ? new Date(x.dueDate).toLocaleDateString() : "—"}
                    </Txt>
                  </View>
                  <View
                    style={{
                      width: W[4],
                      paddingHorizontal: 24,
                      paddingVertical: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Avatar name={x.owner?.fullName} size={24} />
                    <Txt size={12} weight="500" muted numberOfLines={1} style={{ flex: 1 }}>
                      {x.owner?.fullName || t("board.table.unassigned")}
                    </Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    );
  } else {
    const cell = Math.floor((Math.min(480, 360) - 32) / 7);
    body = (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.panel,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: alpha(c.appSoft, 0.3),
            }}
          >
            <Txt size={18} weight="800">
              {monthName} {y}
            </Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={() => setCalDate(new Date(y, m - 1, 1))}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.panel,
                }}
              >
                <Ionicons name="chevron-back" size={18} color={c.muted} />
              </Pressable>
              <Pressable
                onPress={() => setCalDate(new Date())}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.panel,
                }}
              >
                <Txt size={12} weight="700" muted>
                  {t("board.calendar.today")}
                </Txt>
              </Pressable>
              <Pressable
                onPress={() => setCalDate(new Date(y, m + 1, 1))}
                style={{
                  padding: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.panel,
                }}
              >
                <Ionicons name="chevron-forward" size={18} color={c.muted} />
              </Pressable>
            </View>
          </View>
          {monthTasks.length === 0 ? (
            <View style={{ padding: 32, alignItems: "center" }}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={c.muted}
                style={{ opacity: 0.5, marginBottom: 16 }}
              />
              <Txt size={18} weight="700">
                {t("board.calendar.noTasks")}
              </Txt>
              <Txt
                size={14}
                muted
                align="center"
                style={{ marginTop: 4 }}
              >{`No tasks are due in ${monthName} ${y}.`}</Txt>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {DAY_KEYS.map((k) => (
                <View
                  key={k}
                  style={{
                    width: `${100 / 7}%`,
                    padding: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: c.border,
                  }}
                >
                  <Txt size={10} weight="700" tracking={0.05} upper muted align="center">
                    {t(k)}
                  </Txt>
                </View>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <View
                  key={`e${i}`}
                  style={{
                    width: `${100 / 7}%`,
                    minHeight: 110,
                    borderBottomWidth: 1,
                    borderEndWidth: 1,
                    borderColor: c.border,
                    backgroundColor: alpha(c.appSoft, 0.2),
                  }}
                />
              ))}
              {Array.from({ length: daysIn }).map((_, i) => {
                const d = i + 1;
                const ds = new Date(y, m, d).toDateString();
                const dayTasks = allTasks.filter(
                  (x) => x.dueDate && new Date(x.dueDate).toDateString() === ds,
                );
                const now = new Date();
                const today =
                  d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
                return (
                  <View
                    key={d}
                    style={{
                      width: `${100 / 7}%`,
                      minHeight: 110,
                      padding: 4,
                      borderBottomWidth: 1,
                      borderEndWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={
                          today
                            ? {
                                backgroundColor: c.accent,
                                height: 20,
                                width: 20,
                                borderRadius: 10,
                                alignItems: "center",
                                justifyContent: "center",
                              }
                            : undefined
                        }
                      >
                        <Txt size={11} weight="700" color={today ? c.accentText : c.muted}>
                          {d}
                        </Txt>
                      </View>
                      {dayTasks.length > 0 ? (
                        <Txt size={10} weight="700" muted>
                          {dayTasks.length}
                        </Txt>
                      ) : null}
                    </View>
                    <View style={{ gap: 4 }}>
                      {dayTasks.map((x) => {
                        const st = statusStyle(x.status, c);
                        return (
                          <Pressable
                            key={x.id}
                            onPress={() => open(x.id)}
                            style={{
                              backgroundColor: st.bg,
                              borderLeftWidth: 2,
                              borderLeftColor: st.text,
                              borderRadius: 4,
                              paddingHorizontal: 4,
                              paddingVertical: 4,
                            }}
                          >
                            <Txt size={9} weight="700" color={st.text} numberOfLines={2}>
                              {x.title}
                            </Txt>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        {void cell}
      </ScrollView>
    );
  }

  const pm = pending;
  return (
    <Shell active="Board">
      {header}
      <View style={{ flex: 1 }}>{body}</View>
      <CreateTaskModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => void load({ silent: true })}
        categories={categories}
        offices={offices}
      />
      <ReasonModal
        visible={!!pm}
        minLength={3}
        busy={saving}
        title={pm?.to === "BLOCKED" ? t("board.modal.blockTitle") : t("board.modal.returnTitle")}
        description={
          pm?.to === "BLOCKED" ? t("board.modal.blockDesc") : t("board.modal.returnDesc")
        }
        placeholder={t("board.modal.reasonPlaceholder")}
        onClose={() => {
          if (pm) void load({ silent: true });
          setPending(null);
        }}
        onSubmit={(r) => pm && executeMove(pm.taskId, pm.from, pm.to, r)}
      />
      <AssignTaskModal
        visible={!!assignTask}
        task={assignTask}
        onClose={() => setAssignTask(null)}
        onSuccess={() => {
          setAssignTask(null);
          void load({ silent: true });
        }}
      />
      <Modal
        visible={!!errorModal}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title || "Error"}
        description={errorModal?.description}
      >
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <View
            style={{
              height: 64,
              width: 64,
              borderRadius: 32,
              backgroundColor: alpha("#EF4444", 0.1),
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="warning" size={32} color="#EF4444" />
          </View>
          <Txt size={14} color={c.secondary} align="center" style={{ marginBottom: 24 }}>
            {errorModal?.description}
          </Txt>
          <Button
            variant="dangerSolid"
            small
            title={t("common.close")}
            onPress={() => setErrorModal(null)}
            style={{ alignSelf: "stretch" }}
          />
        </View>
      </Modal>
      {/* date filter dropdown */}
      <Modal
        visible={dateMenu}
        onClose={() => setDateMenu(false)}
        title={t("board.filter.anyDate")}
      >
        {(Object.keys(DATE_FILTER_KEY) as DateFilter[]).map((o) => (
          <Pressable
            key={o}
            onPress={() => {
              setFilterDate(o);
              setDateMenu(false);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: filterDate === o ? alpha(c.accent, 0.1) : "transparent",
            }}
          >
            <Txt size={14} weight="500" color={filterDate === o ? c.accent : c.secondary}>
              {t(DATE_FILTER_KEY[o])}
            </Txt>
            {filterDate === o ? (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
            ) : null}
          </Pressable>
        ))}
      </Modal>
      {void StatusBadge}
    </Shell>
  );
}
