import React, { useEffect, useMemo, useState } from "react";
import { Modal as RNModal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../api/endpoints";
import { ApiError } from "../api/client";
import { PRIORITIES, ROLE_LABELS, STATUSES, type Category, type Office, type Priority, type Task, type TaskStatus, type UserLite } from "../api/types";
import { usePrefs } from "../prefs";
import { alpha, priorityStyle, statusStyle } from "../theme";
import type { TranslationKey } from "../i18n";
import { Avatar, Modal, Pill, Spinner, Txt } from "./ui";

export const STATUS_KEY: Record<TaskStatus, TranslationKey> = {
  UNASSIGNED: "status.unassigned", ASSIGNED: "status.assigned", IN_PROGRESS: "status.inProgress",
  BLOCKED: "status.blocked", REVIEW: "status.review", COMPLETED: "status.completed",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { palette: c, t } = usePrefs();
  const s = statusStyle(status, c);
  return <Pill label={t(STATUS_KEY[status])} color={s.text} bg={s.bg} border={s.border} />;
}

/** Native stand-in for the web's <select>: a select-looking button that opens a list. */
export function SelectField<T extends string>({ label, value, onChange, options, placeholder, compact }: {
  label?: string; value: T | ""; onChange: (v: T) => void; options: { value: T; label: string }[]; placeholder?: string; compact?: boolean;
}) {
  const { palette: c, t } = usePrefs();
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <View style={{ flex: compact ? undefined : 1 }}>
      {label ? <Txt size={12} weight="700" tracking={0.05} upper muted style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: compact ? 8 : 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.app, paddingHorizontal: compact ? 8 : 16, paddingVertical: compact ? 8 : 10 }}>
        <Txt size={compact ? 12 : 14} weight={compact ? "700" : "400"} color={cur ? c.primary : c.faint} numberOfLines={1} style={{ flex: 1 }}>{cur?.label ?? placeholder ?? ""}</Txt>
        <Ionicons name="chevron-down" size={14} color={c.muted} />
      </Pressable>
      <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: c.panel, borderColor: c.border, borderWidth: 1, borderRadius: 16, maxHeight: "70%", overflow: "hidden" }}>
            <ScrollView>
              {options.map((o) => (
                <Pressable key={o.value} onPress={() => { onChange(o.value); setOpen(false); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: o.value === value ? alpha(c.accent, 0.1) : "transparent" }}>
                  <Txt size={14} weight={o.value === value ? "700" : "500"} color={o.value === value ? c.accent : c.secondary}>{o.label}</Txt>
                  {o.value === value ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} /> : null}
                </Pressable>
              ))}
              {options.length === 0 ? <View style={{ padding: 20 }}><Txt muted size={14}>{t("common.loading")}</Txt></View> : null}
            </ScrollView>
          </View>
        </Pressable>
      </RNModal>
    </View>
  );
}

const p2 = (n: number) => String(n).padStart(2, "0");
export const toYmd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** Native stand-in for <input type="date">. Value is "YYYY-MM-DD" like the web. */
export function DateField({ label, value, onChange }: { label?: string; value: string; onChange: (v: string) => void }) {
  const { palette: c, theme } = usePrefs();
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return (
    <View style={{ flex: 1 }}>
      {label ? <Txt size={12} weight="700" tracking={0.05} upper muted style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.app, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Txt size={14} color={value ? c.primary : c.faint}>{value || "dd/mm/yyyy"}</Txt>
        <Ionicons name="calendar-outline" size={16} color={c.muted} />
      </Pressable>
      {open && Platform.OS === "android" ? (
        <DateTimePicker value={date} mode="date" onChange={(e, d) => { setOpen(false); if (e.type === "set" && d) onChange(toYmd(d)); }} />
      ) : null}
      {Platform.OS === "ios" ? (
        <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}>
            <View style={{ backgroundColor: c.panel, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12 }}>
              <DateTimePicker value={date} mode="date" display="inline" themeVariant={theme} accentColor={c.accent} onChange={(_, d) => { if (d) onChange(toYmd(d)); }} />
              <Pressable onPress={() => setOpen(false)} style={{ alignSelf: "flex-end", paddingHorizontal: 20, paddingVertical: 10 }}><Txt size={14} weight="700" color={c.accent}>OK</Txt></Pressable>
            </View>
          </Pressable>
        </RNModal>
      ) : null}
    </View>
  );
}

/** Mirrors components/layout/TaskCard.tsx (drag handle replaced by the web's own mobile status <select>). */
export function TaskCard({ task, onOpen, onMove }: { task: Task; onOpen: () => void; onMove?: (taskId: string, to: TaskStatus) => void }) {
  const { palette: c, t } = usePrefs();
  const overdue = !!task.dueDate && task.status !== "COMPLETED" && new Date(task.dueDate).getTime() < Date.now();
  const pr = priorityStyle(task.priority);
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <Txt size={11} weight="700" tracking={0.05} muted>{task.code}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pill label={task.priority} color={pr.text} bg={pr.bg} border={pr.border} size={9} />
          <Ionicons name="ellipsis-vertical" size={14} color={c.borderStrong} />
        </View>
      </View>
      <Pressable onPress={onOpen}><Txt size={14} weight="700" numberOfLines={2} style={{ marginBottom: 12 }}>{task.title}</Txt></Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
          <Avatar name={task.owner?.fullName} size={28} />
          <Txt size={11} weight="500" muted numberOfLines={1} style={{ maxWidth: 80 }}>{task.owner?.fullName ?? t("board.table.unassigned")}</Txt>
        </View>
        {task.dueDate ? (
          <View style={overdue ? { backgroundColor: alpha("#F87171", 0.1), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 } : undefined}>
            <Txt size={10} weight="700" color={overdue ? "#F87171" : c.muted}>{new Date(task.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</Txt>
          </View>
        ) : null}
      </View>
      {onMove ? (
        <View style={{ marginTop: 12 }}>
          <SelectField compact value={task.status} onChange={(v) => onMove(task.id, v)} options={STATUSES.map((s) => ({ value: s, label: t(STATUS_KEY[s]) }))} />
        </View>
      ) : null}
    </View>
  );
}

/** Mirrors components/layout/Column.tsx */
export function Column({ status, label, tasks, onMove, onOpen }: { status: TaskStatus; label: string; tasks: Task[]; onMove: (id: string, to: TaskStatus) => void; onOpen: (id: string) => void }) {
  const { palette: c } = usePrefs();
  const s = statusStyle(status, c);
  return (
    <View style={{ width: 320, maxHeight: "100%", borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.dot }} />
          <Txt size={14} weight="800" tracking={0.05} upper numberOfLines={1}>{label}</Txt>
        </View>
        <View style={{ backgroundColor: c.app, borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Txt size={12} weight="700" muted>{tasks.length}</Txt>
        </View>
      </View>
      <ScrollView nestedScrollEnabled contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
        {tasks.length === 0 ? (
          <View style={{ height: 112, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: c.border }}>
            <Txt size={14} weight="500" color={c.borderStrong}>Drop tasks here</Txt>
          </View>
        ) : tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={() => onOpen(task.id)} onMove={onMove} />)}
      </ScrollView>
    </View>
  );
}

function FormError({ message }: { message: string }) {
  const { palette: c } = usePrefs();
  return <View style={{ borderRadius: 8, borderWidth: 1, borderColor: alpha("#EF4444", 0.2), backgroundColor: alpha("#EF4444", 0.1), padding: 12, marginBottom: 16 }}><Txt size={14} weight="700" color={c.red}>{message}</Txt></View>;
}
function Label({ children }: { children: string }) { return <Txt size={12} weight="700" tracking={0.05} upper muted style={{ marginBottom: 6 }}>{children}</Txt>; }
function ModalInput({ multiline, ...p }: React.ComponentProps<typeof TextInput> & { multiline?: boolean }) {
  const { palette: c } = usePrefs();
  const [f, setF] = useState(false);
  return <TextInput placeholderTextColor={c.faint} multiline={multiline} {...p} onFocus={() => setF(true)} onBlur={() => setF(false)}
    style={[{ borderRadius: 12, borderWidth: 1, borderColor: f ? c.accent : c.border, backgroundColor: c.app, color: c.primary, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 }, multiline && { minHeight: 80, textAlignVertical: "top" }]} />;
}
export function ModalButtons({ onCancel, onSubmit, submitLabel, busy, disabled, cancelLabel }: { onCancel: () => void; onSubmit: () => void; submitLabel: string; busy?: boolean; disabled?: boolean; cancelLabel: string }) {
  const { palette: c } = usePrefs();
  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, paddingTop: 16 }}>
      <Pressable onPress={onCancel} style={{ paddingHorizontal: 16, paddingVertical: 10 }}><Txt size={14} weight="700" muted>{cancelLabel}</Txt></Pressable>
      <Pressable onPress={busy || disabled ? undefined : onSubmit} style={{ backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, opacity: busy || disabled ? 0.5 : 1, flexDirection: "row", gap: 8, alignItems: "center" }}>
        {busy ? <Spinner size="small" /> : null}<Txt size={14} weight="700" color={c.accentText}>{submitLabel}</Txt>
      </Pressable>
    </View>
  );
}

export function CreateTaskModal({ visible, onClose, onSuccess, categories, offices }: { visible: boolean; onClose: () => void; onSuccess: () => void; categories: Category[]; offices: Office[] }) {
  const { t } = usePrefs();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!categoryId && categories[0]) setCategoryId(categories[0].id);
    if (!officeId && offices[0]) setOfficeId(offices[0].id);
  }, [categories, offices, categoryId, officeId]);
  async function submit() {
    setBusy(true); setError(null);
    try {
      await Api.createTask({ title, description: description || undefined, categoryId, officeId, priority, dueDate: dueDate ? new Date(dueDate).toISOString() : undefined });
      setTitle(""); setDescription(""); setDueDate(""); onSuccess(); onClose();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Failed to create task"); }
    finally { setBusy(false); }
  }
  return (
    <Modal visible={visible} onClose={onClose} title="Create New Task" description="Add a new task to the institutional workflow.">
      <View style={{ gap: 16 }}>
        {error ? <FormError message={error} /> : null}
        <View><Label>Task Title *</Label><ModalInput value={title} onChangeText={setTitle} placeholder="e.g. Update antivirus on lab PCs" /></View>
        <View><Label>Description</Label><ModalInput multiline value={description} onChangeText={setDescription} placeholder="Provide additional details..." /></View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <SelectField label="Category *" value={categoryId} onChange={setCategoryId} placeholder="Select category" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <SelectField label="Office *" value={officeId} onChange={setOfficeId} placeholder="Select office" options={offices.map((o) => ({ value: o.id, label: o.name }))} />
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <SelectField label="Priority" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
          <DateField label="Due Date" value={dueDate} onChange={setDueDate} />
        </View>
        <ModalButtons cancelLabel={t("common.cancel")} submitLabel="Create Task" busy={busy} disabled={title.trim().length < 1 || !categoryId || !officeId} onCancel={onClose} onSubmit={submit} />
      </View>
    </Modal>
  );
}

export function UserCombobox({ users, value, onChange, label }: { users: UserLite[]; value: string; onChange: (id: string) => void; label: string }) {
  const { palette: c } = usePrefs();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const sel = users.find((u) => u.id === value);
  const list = useMemo(() => users.filter((u) => u.fullName.toLowerCase().includes(q.toLowerCase()) || ROLE_LABELS[u.role]?.toLowerCase().includes(q.toLowerCase())), [users, q]);
  return (
    <View>
      <Label>{label}</Label>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, borderColor: open ? c.accent : c.border, backgroundColor: c.app, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Txt size={14} color={sel ? c.primary : c.faint} numberOfLines={1} style={{ flex: 1 }}>{sel ? `${sel.fullName} · ${ROLE_LABELS[sel.role]}` : "Select a user…"}</Txt>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={c.muted} />
      </Pressable>
      {open ? (
        <View style={{ marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Ionicons name="search" size={14} color={c.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search by name or role…" placeholderTextColor={c.faint} style={{ flex: 1, color: c.primary, paddingVertical: 10, fontSize: 14 }} />
          </View>
          <ScrollView style={{ maxHeight: 190 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {list.length === 0 ? <View style={{ padding: 16 }}><Txt size={12} muted align="center">No users found</Txt></View> : list.map((u) => (
              <Pressable key={u.id} onPress={() => { onChange(u.id); setOpen(false); setQ(""); }} style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: u.id === value ? alpha(c.accent, 0.1) : "transparent" }}>
                <View style={{ flex: 1 }}><Txt size={14} weight="700" color={u.id === value ? c.accent : c.primary}>{u.fullName}</Txt><Txt size={11} muted>{ROLE_LABELS[u.role]}</Txt></View>
                {u.id === value ? <Ionicons name="checkmark" size={16} color={c.accent} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function AssignTaskModal({ visible, onClose, onSuccess, task }: { visible: boolean; onClose: () => void; onSuccess: () => void; task: Task | null }) {
  const { t } = usePrefs();
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  useEffect(() => {
    if (!visible) return;
    setLoading(true); setError(null);
    Api.users().then(setUsers).catch(() => setError("Failed to load users")).finally(() => setLoading(false));
    setOwnerId(task?.ownerId || "");
    setDueDate(task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0]! : "");
    setPriority(task?.priority || "MEDIUM");
  }, [visible, task]);
  async function submit() {
    if (!task) return;
    if (!ownerId || !dueDate) { setError("You must select an owner and a due date."); return; }
    setBusy(true); setError(null);
    try { await Api.assign(task.id, ownerId, priority, new Date(dueDate).toISOString()); onSuccess(); onClose(); }
    catch (e) {
      if (e instanceof ApiError && e.code === "forbidden") setError("You do not have permission to assign tasks. Only Deans and Deputies can do this.");
      else setError(e instanceof ApiError ? e.message : "Failed to assign task");
    } finally { setBusy(false); }
  }
  return (
    <Modal visible={visible} onClose={onClose} title="Assign Task" description={`To move "${task?.title ?? ""}" to Assigned, you must select an owner and a due date.`}>
      {loading ? <View style={{ paddingVertical: 32, alignItems: "center" }}><Spinner /></View> : (
        <View style={{ gap: 16 }}>
          {error ? <FormError message={error} /> : null}
          <UserCombobox users={users} value={ownerId} onChange={setOwnerId} label="Assign to (Owner)" />
          <View style={{ flexDirection: "row", gap: 16 }}>
            <DateField label="Due Date" value={dueDate} onChange={setDueDate} />
            <SelectField label="Priority" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
          </View>
          <ModalButtons cancelLabel={t("common.cancel")} submitLabel="Assign Task" busy={busy} onCancel={onClose} onSubmit={submit} />
        </View>
      )}
    </Modal>
  );
}

/** Reason/comment modal used by Board, Review and Task detail (min length differs per page). */
export function ReasonModal({ visible, title, description, placeholder, minLength, busy, submitLabel, hint, onClose, onSubmit }: {
  visible: boolean; title: string; description?: string; placeholder?: string; minLength: number; busy?: boolean; submitLabel?: string; hint?: (remaining: number) => string;
  onClose: () => void; onSubmit: (reason: string) => void;
}) {
  const { palette: c, t } = usePrefs();
  const [text, setText] = useState("");
  useEffect(() => { if (!visible) setText(""); }, [visible]);
  const remaining = Math.max(0, minLength - text.trim().length);
  return (
    <Modal visible={visible} onClose={onClose} title={title} description={description}>
      <View style={{ gap: 16 }}>
        <TextInput value={text} onChangeText={setText} multiline autoFocus placeholder={placeholder} placeholderTextColor={c.faint}
          style={{ minHeight: 100, textAlignVertical: "top", borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.app, color: c.primary, padding: 12, fontSize: 14 }} />
        {hint ? <Txt size={12} weight="500" color={remaining > 0 ? c.muted : c.emerald}>{hint(remaining)}</Txt> : null}
        <ModalButtons cancelLabel={t("common.cancel")} submitLabel={busy ? t("board.modal.saving") : submitLabel ?? t("common.confirm")} busy={busy} disabled={remaining > 0} onCancel={onClose} onSubmit={() => onSubmit(text)} />
      </View>
    </Modal>
  );
}
