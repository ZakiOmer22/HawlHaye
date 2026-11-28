import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../api/endpoints";
import { ApiError } from "../api/client";
import {
  PRIORITIES,
  ROLES,
  ROLE_LABELS,
  type AuditRow,
  type Priority,
  type Role,
  type Ticket,
  type TicketStatus,
} from "../api/types";
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
  Screen,
  SectionTitle,
  Sheet,
  Txt,
} from "../components/ui";
import { useLoad } from "../lib/useLoad";
import { fmtDateTime } from "../lib/format";
import { PRIORITY_COLOR } from "../theme";
import { usePalette } from "../prefs";
import type { MainStackParams } from "../navigation/types";

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");
type P<K extends keyof MainStackParams> = NativeStackScreenProps<MainStackParams, K>;
const isAdminRole = (r: Role) => r === "DEAN" || r === "ADMINISTRATOR";

function Bar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const c = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        paddingBottom: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={c.accent} />
        </Pressable>
        <Txt size={22} weight="800">
          {title}
        </Txt>
      </View>
      {right}
    </View>
  );
}

// ── Support tickets ────────────────────────────────────────
const TICKET_COLOR: Record<TicketStatus, string> = {
  OPEN: "#60A5FA",
  IN_PROGRESS: "#E8BC69",
  RESOLVED: "#4ADE80",
  CLOSED: "#94A3B8",
};

export function TicketsScreen({ navigation }: P<"Tickets">) {
  const q = useLoad(() => Api.tickets(), [], false);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (subject.trim().length < 3 || description.trim().length < 10)
      return setError("Subject needs 3+ characters and the description 10+.");
    setBusy(true);
    setError(null);
    try {
      await Api.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      });
      setOpen(false);
      setSubject("");
      setDescription("");
      await q.reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen pad={false}>
      <Bar
        title="Support"
        onBack={() => navigation.goBack()}
        right={<Button small title="New" icon="add" onPress={() => setOpen(true)} />}
      />
      {q.loading ? (
        <Loading />
      ) : q.error && !q.data ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : (
        <FlatList
          data={q.data ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          onRefresh={q.reload}
          refreshing={q.refreshing}
          ListEmptyComponent={
            <Empty
              icon="help-buoy-outline"
              title="No tickets"
              subtitle="Tap New to contact support."
            />
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => navigation.navigate("TicketDetail", { id: item.id })}
              style={{ marginBottom: 10 }}
            >
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}
              >
                <Pill label={item.status.replace("_", " ")} color={TICKET_COLOR[item.status]} />
                <Txt size={12} muted>
                  {fmtDateTime(item.createdAt)}
                </Txt>
              </View>
              <Txt weight="700">{item.subject}</Txt>
              <Txt muted size={12}>
                {item.category}
                {item.createdBy ? ` · ${item.createdBy.fullName}` : ""}
              </Txt>
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title="New ticket">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Field label="Subject" value={subject} onChangeText={setSubject} maxLength={200} />
        <Field
          label="Describe the problem"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={5000}
        />
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {["General", "Bug", "Account", "Feature request"].map((k) => (
            <Chip key={k} label={k} active={category === k} onPress={() => setCategory(k)} />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
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
        <Button title="Submit" busy={busy} onPress={submit} />
      </Sheet>
    </Screen>
  );
}

export function TicketDetailScreen({ route, navigation }: P<"TicketDetail">) {
  const me = useMe();
  const q = useLoad(() => Api.ticket(route.params.id), [route.params.id], false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const t: Ticket | null = q.data;
  async function send() {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      await Api.replyTicket(route.params.id, msg.trim());
      setMsg("");
      await q.reload();
    } catch (e) {
      Alert.alert("Couldn't send", errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  async function setStatus(s: TicketStatus) {
    try {
      await Api.setTicketStatus(route.params.id, s);
      await q.reload();
    } catch (e) {
      Alert.alert("Couldn't update", errMsg(e));
    }
  }
  return (
    <Screen pad={false}>
      <Bar title="Ticket" onBack={() => navigation.goBack()} />
      {q.loading ? (
        <Loading />
      ) : !t ? (
        <ErrorState message={q.error ?? "Not found"} onRetry={q.reload} />
      ) : (
        <FlatList
          data={t.replies ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 12 }}>
              <Pill label={t.status.replace("_", " ")} color={TICKET_COLOR[t.status]} />
              <Txt size={20} weight="800" style={{ marginVertical: 8 }}>
                {t.subject}
              </Txt>
              <Txt selectable>{t.description}</Txt>
              {isAdminRole(me.role) ? (
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as TicketStatus[]).map((s) => (
                    <Chip
                      key={s}
                      label={s.replace("_", " ")}
                      active={t.status === s}
                      color={TICKET_COLOR[s]}
                      onPress={() => setStatus(s)}
                    />
                  ))}
                </View>
              ) : null}
              <SectionTitle>Replies</SectionTitle>
            </View>
          }
          ListFooterComponent={
            <View style={{ marginTop: 8 }}>
              <Field
                value={msg}
                onChangeText={setMsg}
                placeholder="Write a reply…"
                multiline
                maxLength={5000}
              />
              <Button title="Send reply" small busy={busy} disabled={!msg.trim()} onPress={send} />
            </View>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8 }}>
              <Txt weight="700" size={13}>
                {item.author.fullName}{" "}
                <Txt muted size={12}>
                  · {ROLE_LABELS[item.author.role]} · {fmtDateTime(item.createdAt)}
                </Txt>
              </Txt>
              <Txt selectable style={{ marginTop: 4 }}>
                {item.message}
              </Txt>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

// ── Admin: users & invitations ─────────────────────────────
export function UsersScreen({ navigation }: P<"Users">) {
  const me = useMe();
  const canManage = isAdminRole(me.role);
  const q = useLoad(
    async () => ({
      users: await Api.adminUsers(),
      invites: canManage ? await Api.invites().catch(() => []) : [],
    }),
    [],
    false,
  );
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("LAB_TECHNICIAN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>, okMsg: string) {
    try {
      await fn();
      setNote(okMsg);
      await q.reload();
    } catch (e) {
      Alert.alert("Action failed", errMsg(e));
    }
  }
  async function invite() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email.");
    setBusy(true);
    setError(null);
    try {
      await Api.invite(
        email.trim().toLowerCase(),
        role,
        name.trim() || undefined,
        me.officeId ?? undefined,
      );
      setOpen(false);
      setEmail("");
      setName("");
      setNote("Invitation sent.");
      await q.reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen pad={false}>
      <Bar
        title="Users"
        onBack={() => navigation.goBack()}
        right={
          canManage ? (
            <Button small title="Invite" icon="person-add-outline" onPress={() => setOpen(true)} />
          ) : undefined
        }
      />
      {q.loading ? (
        <Loading />
      ) : q.error && !q.data ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : (
        <FlatList
          data={q.data?.users ?? []}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          onRefresh={q.reload}
          refreshing={q.refreshing}
          ListHeaderComponent={
            <>
              {note ? <Banner tone="ok">{note}</Banner> : null}
              {q.data?.invites.length ? (
                <Banner tone="info">
                  {q.data.invites.length} pending invitation(s):{" "}
                  {q.data.invites.map((i) => i.email).join(", ")}
                </Banner>
              ) : null}
            </>
          }
          renderItem={({ item: u }) => (
            <Card style={{ marginBottom: 8, opacity: u.active ? 1 : 0.6 }}>
              <Txt weight="700">{u.fullName}</Txt>
              <Txt muted size={12}>
                {u.email}
              </Txt>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6, alignItems: "center" }}>
                <Pill label={ROLE_LABELS[u.role].toUpperCase()} color="#E8BC69" />
                {!u.active ? <Pill label="INACTIVE" color="#F87171" /> : null}
              </View>
              {canManage && u.id !== me.id ? (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  {u.active ? (
                    <Button
                      small
                      variant="danger"
                      title="Deactivate"
                      onPress={() =>
                        Alert.alert(
                          "Deactivate " + u.fullName + "?",
                          "They are signed out immediately.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Deactivate",
                              style: "destructive",
                              onPress: () =>
                                act(() => Api.deactivateUser(u.id), "User deactivated."),
                            },
                          ],
                        )
                      }
                    />
                  ) : (
                    <Button
                      small
                      variant="secondary"
                      title="Reactivate"
                      onPress={() => act(() => Api.reactivateUser(u.id), "User reactivated.")}
                    />
                  )}
                  <Button
                    small
                    variant="ghost"
                    title="Unlock"
                    onPress={() => act(() => Api.unlockUser(u.id), "Account unlocked.")}
                  />
                </View>
              ) : null}
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title="Invite user">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field label="Full name (optional)" value={name} onChangeText={setName} />
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {ROLES.filter((r) => me.role === "ADMINISTRATOR" || r !== "ADMINISTRATOR").map((r) => (
            <Chip key={r} label={ROLE_LABELS[r]} active={role === r} onPress={() => setRole(r)} />
          ))}
        </View>
        <Button title="Send invitation" busy={busy} onPress={invite} />
      </Sheet>
    </Screen>
  );
}

// ── Audit log ──────────────────────────────────────────────
export function AuditScreen({ navigation }: P<"Audit">) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(reset: boolean, query = q) {
    setLoading(true);
    try {
      const r = await Api.audit(reset ? 0 : rows.length, query.trim());
      setRows(reset ? r.data : [...rows, ...r.data]);
      setTotal(r.meta.total);
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const t = setTimeout(() => void load(true, q), 350);
    return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [q]);

  return (
    <Screen pad={false}>
      <Bar title="Audit log" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 16 }}>
        <Field
          value={q}
          onChangeText={setQ}
          placeholder="Filter by action, entity, IP…"
          autoCapitalize="none"
        />
      </View>
      {error ? (
        <ErrorState message={error} onRetry={() => load(true)} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          onEndReached={() => {
            if (!loading && rows.length < total) void load(false);
          }}
          ListEmptyComponent={
            loading ? <Loading /> : <Empty icon="document-text-outline" title="No entries" />
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8 }}>
              <Txt weight="700" size={14}>
                {item.action}
              </Txt>
              <Txt muted size={12}>
                {item.actor?.fullName ?? "System"}
                {item.entityType ? ` · ${item.entityType}` : ""}
                {item.ip ? ` · ${item.ip}` : ""}
              </Txt>
              <Txt muted size={12}>
                {fmtDateTime(item.createdAt)}
              </Txt>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
