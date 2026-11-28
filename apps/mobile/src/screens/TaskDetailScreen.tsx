import React, { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../api/endpoints";
import { ApiError } from "../api/client";
import { API_URL } from "../config";
import { PRIORITIES, ROLE_LABELS, STATUS_LABELS, type Priority, type UserLite } from "../api/types";
import { useMe } from "../auth/AuthContext";
import {
  Banner,
  Button,
  Card,
  Chip,
  Empty,
  ErrorState,
  Field,
  Loading,
  Pill,
  Row,
  Screen,
  SectionTitle,
  Sheet,
  Txt,
} from "../components/ui";
import { useLoad } from "../lib/useLoad";
import { availableMoves, canAssign, canDelegate, canDeleteTask, type Move } from "../lib/workflow";
import {
  dueLabel,
  fmtBytes,
  fmtDate,
  fmtDateTime,
  isOverdue,
  toIsoDate,
  ymdFromNow,
} from "../lib/format";
import { PRIORITY_COLOR, STATUS_COLOR, usePalette } from "../theme";
import type { MainStackParams } from "../navigation/types";

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");
type Tab = "details" | "activity" | "comments" | "files";

const EVENT_LABEL: Record<string, string> = {
  CREATED: "Task created",
  ASSIGNED: "Assigned",
  STATUS_CHANGED: "Status changed",
  DELEGATED: "Delegated",
  DELEGATION_ACCEPTED: "Delegation accepted",
  DELEGATION_DECLINED: "Delegation declined",
  COMMENTED: "Commented",
  ATTACHED: "File attached",
  SOFT_DELETED: "Deleted",
};

export function TaskDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<MainStackParams, "TaskDetail">) {
  const me = useMe();
  const c = usePalette();
  const { id } = route.params;
  const [tab, setTab] = useState<Tab>("details");
  const [move, setMove] = useState<Move | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const q = useLoad(async () => {
    const [task, events, comments, attachments] = await Promise.all([
      Api.task(id),
      Api.events(id).catch(() => []),
      Api.comments(id).catch(() => []),
      Api.attachments(id).catch(() => []),
    ]);
    return { task, events, comments, attachments };
  }, [id]);

  if (q.loading)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (q.error && !q.data) {
    return (
      <Screen>
        <ErrorState message={q.error} onRetry={q.reload} />
      </Screen>
    );
  }
  const { task, events, comments, attachments } = q.data!;
  const moves = availableMoves(me, task);
  const overdue = isOverdue(task);

  async function runMove(m: Move, reason?: string) {
    setBusy(true);
    try {
      await Api.transition(id, m.to, reason);
      setMove(null);
      await q.reload();
    } catch (e) {
      Alert.alert("Couldn't update task", errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  function confirmDelete() {
    Alert.alert(
      "Delete this task?",
      "It will be removed from all boards. This is recorded in the audit log.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await Api.deleteTask(id);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Couldn't delete", errMsg(e));
            }
          },
        },
      ],
    );
  }

  return (
    <Screen edges={["left", "right"]} pad={false}>
      <View
        style={{
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="Back"
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name="chevron-back" size={22} color={c.accent} />
          <Txt color={c.accent} weight="700">
            Back
          </Txt>
        </Pressable>
        {canDeleteTask(me) ? (
          <Pressable onPress={confirmDelete} hitSlop={12} accessibilityLabel="Delete task">
            <Ionicons name="trash-outline" size={21} color={c.danger} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={q.refreshing} onRefresh={q.reload} tintColor={c.accent} />
        }
      >
        <Txt size={12} weight="800" muted style={{ letterSpacing: 0.8 }}>
          {task.code}
        </Txt>
        <Txt size={22} weight="800" style={{ marginTop: 4, marginBottom: 10 }}>
          {task.title}
        </Txt>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pill
            label={STATUS_LABELS[task.status].toUpperCase()}
            color={STATUS_COLOR[task.status]}
          />
          <Pill label={task.priority} color={PRIORITY_COLOR[task.priority]} />
          {overdue ? <Pill label="OVERDUE" color={c.danger} /> : null}
        </View>

        {task.status === "BLOCKED" && task.blockedReason ? (
          <View style={{ marginTop: 14 }}>
            <Banner tone="danger">Blocked: {task.blockedReason}</Banner>
          </View>
        ) : null}

        {moves.length > 0 || canAssign(me, task) || canDelegate(me, task) ? (
          <View style={{ marginTop: 16, gap: 8 }}>
            {canAssign(me, task) ? (
              <Button
                title="Assign task"
                icon="person-add-outline"
                onPress={() => setAssignOpen(true)}
              />
            ) : null}
            {moves.map((m) => (
              <Button
                key={m.to + m.label}
                title={m.label}
                variant={
                  m.danger
                    ? "danger"
                    : m.to === "COMPLETED" || m.to === "REVIEW" || m.to === "IN_PROGRESS"
                      ? "primary"
                      : "secondary"
                }
                busy={busy && !move}
                onPress={() => (m.reason === "none" ? runMove(m) : setMove(m))}
              />
            ))}
            {canDelegate(me, task) ? (
              <Button
                title="Delegate…"
                variant="secondary"
                icon="swap-horizontal-outline"
                onPress={() => setDelegateOpen(true)}
              />
            ) : null}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
          {(["details", "activity", "comments", "files"] as Tab[]).map((t) => (
            <Chip
              key={t}
              active={tab === t}
              onPress={() => setTab(t)}
              label={
                t === "comments"
                  ? `Comments ${comments.length}`
                  : t === "files"
                    ? `Files ${attachments.length}`
                    : t[0]!.toUpperCase() + t.slice(1)
              }
            />
          ))}
        </View>

        <View style={{ marginTop: 14 }}>
          {tab === "details" ? (
            <>
              {task.description ? (
                <Card style={{ marginBottom: 12 }}>
                  <Txt selectable>{task.description}</Txt>
                </Card>
              ) : null}
              <Card>
                <Row label="Owner" value={task.owner?.fullName ?? "Unassigned"} />
                <Row
                  label="Due"
                  value={
                    task.dueDate ? `${fmtDate(task.dueDate)} · ${dueLabel(task)}` : "No due date"
                  }
                />
                <Row label="Office" value={task.office?.name ?? "—"} />
                <Row label="Category" value={task.category?.name ?? "—"} />
                <Row label="Created by" value={task.createdBy?.fullName ?? "—"} />
                {task.assignedBy ? (
                  <Row label="Assigned by" value={task.assignedBy.fullName} />
                ) : null}
                <Row label="Created" value={fmtDate(task.createdAt)} />
                {task.completedAt ? (
                  <Row label="Completed" value={fmtDate(task.completedAt)} />
                ) : null}
              </Card>
              {task.delegations?.length ? (
                <>
                  <SectionTitle>Delegations</SectionTitle>
                  <Card>
                    {task.delegations.map((d) => (
                      <Row
                        key={d.id}
                        label={fmtDate(d.createdAt)}
                        value={`${d.status.toLowerCase()}${d.reason ? ` — ${d.reason}` : ""}`}
                      />
                    ))}
                  </Card>
                </>
              ) : null}
            </>
          ) : null}

          {tab === "activity" ? (
            events.length ? (
              events.map((e) => (
                <View key={e.id} style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: c.accent,
                      marginTop: 5,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Txt weight="700" size={14}>
                      {EVENT_LABEL[e.type] ?? e.type}
                      {e.fromValue && e.toValue ? `: ${e.fromValue} → ${e.toValue}` : ""}
                    </Txt>
                    {e.note ? (
                      <Txt size={13} muted>
                        {e.note}
                      </Txt>
                    ) : null}
                    <Txt size={12} muted>
                      {e.actor?.fullName ?? "System"} · {fmtDateTime(e.createdAt)}
                    </Txt>
                  </View>
                </View>
              ))
            ) : (
              <Empty icon="time-outline" title="No activity yet" />
            )
          ) : null}

          {tab === "comments" ? (
            <Comments id={id} comments={comments} onSent={q.silentReload} />
          ) : null}
          {tab === "files" ? (
            <Files id={id} files={attachments} onUploaded={q.silentReload} />
          ) : null}
        </View>
      </ScrollView>

      <ReasonSheet
        move={move}
        busy={busy}
        onClose={() => setMove(null)}
        onConfirm={(r) => move && runMove(move, r)}
      />
      <AssignSheet
        visible={assignOpen}
        taskId={id}
        defaultPriority={task.priority}
        onClose={() => setAssignOpen(false)}
        onDone={() => {
          setAssignOpen(false);
          void q.reload();
        }}
      />
      <DelegateSheet
        visible={delegateOpen}
        taskId={id}
        canSearch={me.role !== "LAB_TECHNICIAN"}
        meId={me.id}
        onClose={() => setDelegateOpen(false)}
        onDone={() => {
          setDelegateOpen(false);
          Alert.alert("Delegation sent", "The task stays yours until they accept.");
          void q.reload();
        }}
      />
    </Screen>
  );
}

function ReasonSheet({
  move,
  busy,
  onClose,
  onConfirm,
}: {
  move: Move | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [text, setText] = useState("");
  const required = move?.reason === "required";
  return (
    <Sheet visible={!!move} onClose={onClose} title={move?.label ?? ""}>
      <Field
        label={required ? "Reason (required)" : "Note (optional)"}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
      />
      <Button
        title="Confirm"
        disabled={required && !text.trim()}
        busy={busy}
        variant={move?.danger ? "danger" : "primary"}
        onPress={() => {
          onConfirm(text.trim() || undefined);
          setText("");
        }}
      />
    </Sheet>
  );
}

function DueInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Field
        label="Due date (YYYY-MM-DD)"
        value={value}
        onChangeText={onChange}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      <View
        style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: -6, marginBottom: 14 }}
      >
        {[1, 3, 7, 14, 30].map((d) => (
          <Chip key={d} label={`+${d}d`} onPress={() => onChange(ymdFromNow(d))} />
        ))}
      </View>
    </View>
  );
}

function AssignSheet({
  visible,
  taskId,
  defaultPriority,
  onClose,
  onDone,
}: {
  visible: boolean;
  taskId: string;
  defaultPriority: Priority;
  onClose: () => void;
  onDone: () => void;
}) {
  const c = usePalette();
  const users = useLoad(
    () => (visible ? Api.users() : Promise.resolve([] as UserLite[])),
    [visible],
    false,
  );
  const [owner, setOwner] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>(defaultPriority);
  const [due, setDue] = useState(ymdFromNow(7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const iso = toIsoDate(due);
    if (!owner) return setError("Choose an owner.");
    if (!iso) return setError("Enter the due date as YYYY-MM-DD.");
    setBusy(true);
    setError(null);
    try {
      await Api.assign(taskId, owner, priority, iso);
      onDone();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet visible={visible} onClose={onClose} title="Assign task">
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Txt size={12} weight="700" muted style={{ marginBottom: 8, textTransform: "uppercase" }}>
        Owner
      </Txt>
      {users.error ? <Banner tone="danger">{users.error}</Banner> : null}
      <View style={{ marginBottom: 14, maxHeight: 220 }}>
        <ScrollView nestedScrollEnabled>
          {(users.data ?? []).map((u) => (
            <Pressable
              key={u.id}
              onPress={() => setOwner(u.id)}
              style={{
                padding: 11,
                borderRadius: 10,
                marginBottom: 6,
                borderWidth: 1,
                borderColor: owner === u.id ? c.accent : c.border,
                backgroundColor: owner === u.id ? c.accent + "1F" : c.panelAlt,
              }}
            >
              <Txt weight="700" size={14}>
                {u.fullName}
              </Txt>
              <Txt muted size={12}>
                {ROLE_LABELS[u.role]} · {u.email}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <Txt size={12} weight="700" muted style={{ marginBottom: 8, textTransform: "uppercase" }}>
        Priority
      </Txt>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {PRIORITIES.map((p) => (
          <Chip
            key={p}
            label={p}
            active={priority === p}
            color={PRIORITY_COLOR[p]}
            onPress={() => setPriority(p)}
          />
        ))}
      </View>
      <DueInput value={due} onChange={setDue} />
      <Button title="Assign" busy={busy} onPress={submit} />
    </Sheet>
  );
}

function DelegateSheet({
  visible,
  taskId,
  canSearch,
  meId,
  onClose,
  onDone,
}: {
  visible: boolean;
  taskId: string;
  canSearch: boolean;
  meId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const c = usePalette();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [picked, setPicked] = useState<UserLite | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!visible || q.trim().length < 2 || !canSearch) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setResults((await Api.search(q.trim())).users.filter((u) => u.id !== meId));
      } catch {
        /* keep old results */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, visible, canSearch, meId]);

  async function submit() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await Api.delegate(taskId, picked.id, reason.trim() || undefined);
      setPicked(null);
      setQ("");
      setReason("");
      onDone();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet visible={visible} onClose={onClose} title="Delegate task">
      {!canSearch ? (
        <Banner tone="warn">
          Lab technicians can't look up colleagues. Ask your coordinator to delegate this task.
        </Banner>
      ) : null}
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Field
        label="Find a colleague"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        editable={canSearch}
        placeholder="Name or email"
      />
      {results.map((u) => (
        <Pressable
          key={u.id}
          onPress={() => setPicked(u)}
          style={{
            padding: 11,
            borderRadius: 10,
            marginBottom: 6,
            borderWidth: 1,
            borderColor: picked?.id === u.id ? c.accent : c.border,
            backgroundColor: picked?.id === u.id ? c.accent + "1F" : c.panelAlt,
          }}
        >
          <Txt weight="700" size={14}>
            {u.fullName}
          </Txt>
          <Txt muted size={12}>
            {ROLE_LABELS[u.role]} · {u.email}
          </Txt>
        </Pressable>
      ))}
      <Field
        label="Reason (optional)"
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={1000}
      />
      <Banner tone="info">If they accept, ownership transfers to them.</Banner>
      <Button
        title={picked ? `Delegate to ${picked.fullName}` : "Choose someone"}
        disabled={!picked}
        busy={busy}
        onPress={submit}
      />
    </Sheet>
  );
}

function Comments({
  id,
  comments,
  onSent,
}: {
  id: string;
  comments: { id: string; body: string; createdAt: string; author: { fullName: string } }[];
  onSent: () => void;
}) {
  const c = usePalette();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await Api.addComment(id, text.trim());
      setText("");
      onSent();
    } catch (e) {
      Alert.alert("Couldn't post comment", errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View>
      {comments.length === 0 ? (
        <Empty icon="chatbubble-outline" title="No comments yet" />
      ) : (
        comments.map((m) => (
          <Card key={m.id} style={{ marginBottom: 8, backgroundColor: c.panelAlt }}>
            <Txt weight="700" size={13}>
              {m.author.fullName}{" "}
              <Txt muted size={12}>
                · {fmtDateTime(m.createdAt)}
              </Txt>
            </Txt>
            <Txt selectable style={{ marginTop: 4 }}>
              {m.body}
            </Txt>
          </Card>
        ))
      )}
      <Field
        value={text}
        onChangeText={setText}
        placeholder="Write a comment…"
        multiline
        maxLength={5000}
      />
      <Button title="Post comment" small busy={busy} disabled={!text.trim()} onPress={send} />
    </View>
  );
}

function Files({
  id,
  files,
  onUploaded,
}: {
  id: string;
  files: { id: string; fileName: string; mimeType: string; sizeBytes: number }[];
  onUploaded: () => void;
}) {
  const c = usePalette();
  const [busy, setBusy] = useState(false);
  async function open(aid: string) {
    try {
      const r = await Api.signedUrl(id, aid); // 5-minute, HMAC-signed link
      await WebBrowser.openBrowserAsync(`${API_URL}${r.url}`);
    } catch (e) {
      Alert.alert("Couldn't open file", errMsg(e));
    }
  }
  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: [
        "application/pdf",
        "image/*",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.*",
        "application/vnd.ms-excel",
      ],
    });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    if ((a.size ?? 0) > 10 * 1024 * 1024)
      return Alert.alert("File too large", "The limit is 10 MB.");
    setBusy(true);
    try {
      await Api.upload(id, {
        uri: a.uri,
        name: a.name,
        type: a.mimeType ?? "application/octet-stream",
      });
      onUploaded();
    } catch (e) {
      Alert.alert("Upload failed", errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View>
      {files.length === 0 ? (
        <Empty icon="document-outline" title="No files attached" />
      ) : (
        files.map((f) => (
          <Card
            key={f.id}
            onPress={() => open(f.id)}
            style={{ marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Ionicons
              name={f.mimeType.startsWith("image/") ? "image-outline" : "document-text-outline"}
              size={24}
              color={c.accent}
            />
            <View style={{ flex: 1 }}>
              <Txt weight="700" numberOfLines={1}>
                {f.fileName}
              </Txt>
              <Txt muted size={12}>
                {fmtBytes(f.sizeBytes)}
              </Txt>
            </View>
            <Ionicons name="open-outline" size={18} color={c.muted} />
          </Card>
        ))
      )}
      <Button title="Attach a file" icon="attach" variant="secondary" busy={busy} onPress={pick} />
      <Txt muted size={12} style={{ marginTop: 8 }}>
        PDF, images, Word and Excel · max 10 MB · the server limits uploads to 5 per hour.
      </Txt>
    </View>
  );
}
