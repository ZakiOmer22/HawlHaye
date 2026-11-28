import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "../api/endpoints";
import { ApiError } from "../api/client";
import { API_URL } from "../config";
import {
  ROLE_LABELS,
  type Attachment,
  type Comment,
  type Task,
  type TaskEvent,
  type TaskStatus,
  type UserLite,
} from "../api/types";
import { useMe } from "../auth/AuthContext";
import { Shell } from "../components/Shell";
import {
  ModalButtons,
  ReasonModal,
  StatusBadge,
  STATUS_KEY,
  UserCombobox,
} from "../components/TaskUI";
import { Avatar, Modal, Spinner, Txt } from "../components/ui";
import { formatDate, formatDateTime, isOverdue } from "../lib/format";
import { useBoardRealtime } from "../realtime/RealtimeProvider";
import { usePrefs } from "../prefs";
import { alpha } from "../theme";
import type { TranslationKey } from "../i18n";
import type { MainStackParams } from "../navigation/types";

type Props = NativeStackScreenProps<MainStackParams, "TaskDetail">;
type Tab = "details" | "activity" | "comments";
type Action = { to: TaskStatus; labelKey: TranslationKey; needsReason: boolean; isDanger: boolean };

export function TaskDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const me = useMe();
  const nav = useNavigation();
  const { palette: c, t } = usePrefs();
  const [task, setTask] = useState<(Task & { allowedActions?: TaskStatus[] }) | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{ to: TaskStatus; label: string } | null>(null);
  const [tab, setTab] = useState<Tab>("details");
  const [refreshing, setRefreshing] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [delegateId, setDelegateId] = useState("");
  const [delegateReason, setDelegateReason] = useState("");
  const [delegateBusy, setDelegateBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAtt, setDeletingAtt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [tk, ev, cm, at] = await Promise.all([
        Api.task(id),
        Api.events(id),
        Api.comments(id),
        Api.attachments(id),
      ]);
      setTask(tk);
      setEvents(ev);
      setComments(cm);
      setAttachments(at);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load task");
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  useBoardRealtime(() => {
    void reload();
  });
  useEffect(() => {
    // web: silent poll every 15s while visible
    const i = setInterval(() => {
      if (AppState.currentState === "active") void reload();
    }, 15000);
    return () => clearInterval(i);
  }, [reload]);

  if (error && !task)
    return (
      <Shell active="Board">
        <View style={{ padding: 32 }}>
          <Txt size={16} weight="700" color={c.red} align="center">
            {error}
          </Txt>
        </View>
      </Shell>
    );
  if (!task)
    return (
      <Shell active="Board">
        <View style={{ padding: 32, alignItems: "center" }}>
          <Txt muted>{t("common.loading")}</Txt>
        </View>
      </Shell>
    );

  const overdue = isOverdue(task.dueDate, task.status);
  const isLeadership = ["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(me.role);
  const isOwner = task.ownerId === me.id;
  const canDelegate = (isOwner || isLeadership) && task.status !== "COMPLETED";
  const canDeleteTask = isLeadership;
  const canDeleteAtt = isLeadership || isOwner;

  const actions: Action[] = [];
  if (task.status === "ASSIGNED" && (isOwner || isLeadership))
    actions.push({
      to: "IN_PROGRESS",
      labelKey: "task.action.start",
      needsReason: false,
      isDanger: false,
    });
  if (task.status === "IN_PROGRESS" && (isOwner || isLeadership)) {
    actions.push({
      to: "REVIEW",
      labelKey: "task.action.submit",
      needsReason: false,
      isDanger: false,
    });
    actions.push({
      to: "BLOCKED",
      labelKey: "task.action.block",
      needsReason: true,
      isDanger: true,
    });
  }
  if (task.status === "BLOCKED" && (isOwner || isLeadership))
    actions.push({
      to: "IN_PROGRESS",
      labelKey: "task.action.unblock",
      needsReason: false,
      isDanger: false,
    });
  if (task.status === "REVIEW" && ["DEAN", "DEPUTY"].includes(me.role)) {
    actions.push({
      to: "COMPLETED",
      labelKey: "task.action.approve",
      needsReason: false,
      isDanger: false,
    });
    actions.push({
      to: "IN_PROGRESS",
      labelKey: "task.action.return",
      needsReason: true,
      isDanger: true,
    });
  }

  async function transition(to: TaskStatus, reason?: string) {
    setBusy(true);
    setError(null);
    try {
      await Api.transition(id, to, reason);
      setPending(null);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Transition failed");
    } finally {
      setBusy(false);
    }
  }
  async function openDelegate() {
    setDelegateOpen(true);
    setDelegateId("");
    setDelegateReason("");
    try {
      setUsers(await Api.users());
    } catch {
      setError("Failed to load users");
    }
  }
  async function submitDelegate() {
    if (!delegateId || !delegateReason.trim()) return;
    setDelegateBusy(true);
    try {
      await Api.delegate(id, delegateId, delegateReason);
      setDelegateOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delegation failed");
    } finally {
      setDelegateBusy(false);
    }
  }
  async function deleteTask() {
    setDeleting(true);
    try {
      await Api.deleteTask(id);
      navigation.reset({ index: 0, routes: [{ name: "Board" }] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete task");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }
  function deleteAttachment(aid: string) {
    Alert.alert("Delete attachment", "Are you sure you want to delete this attachment?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingAtt(aid);
          try {
            await Api.deleteAttachment(id, aid);
            await reload();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "Failed to delete attachment");
          } finally {
            setDeletingAtt(null);
          }
        },
      },
    ]);
  }
  async function addComment() {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await Api.addComment(id, comment);
      setComment("");
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Comment failed");
    } finally {
      setBusy(false);
    }
  }
  async function viewFile(aid: string) {
    try {
      const r = await Api.signedUrl(id, aid);
      await WebBrowser.openBrowserAsync(`${API_URL}${r.url}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open file");
    }
  }
  async function upload() {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setUploading(true);
    setError(null);
    try {
      await Api.upload(id, {
        uri: a.uri,
        name: a.name,
        type: a.mimeType ?? "application/octet-stream",
      });
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "File upload failed");
    } finally {
      setUploading(false);
    }
  }
  let gcal = "";
  if (task.dueDate) {
    const s = new Date(task.dueDate),
      e = new Date(s.getTime() + 3600000);
    const f = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${f(s)}/${f(e)}`;
  }
  const card = {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.panel,
  } as const;
  const H = (icon: keyof typeof Ionicons.glyphMap, text: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 }}>
      <Ionicons name={icon} size={16} color={c.accent} />
      <Txt size={14} weight="800" tracking={0.05} upper>
        {text}
      </Txt>
    </View>
  );
  const eyebrow = (s: string) => (
    <Txt size={10} weight="700" tracking={0.05} upper muted style={{ marginBottom: 4 }}>
      {s}
    </Txt>
  );

  return (
    <Shell active="Board">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
            tintColor={c.accent}
          />
        }
      >
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.reset({ index: 0, routes: [{ name: "Board" }] })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              alignSelf: "flex-start",
            }}
          >
            <Ionicons name="arrow-back" size={16} color={c.muted} />
            <Txt size={14} weight="700" muted>
              {t("task.back")}
            </Txt>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {canDelegate ? (
              <Pressable
                onPress={openDelegate}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 12,
                  backgroundColor: c.panel,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Ionicons name="person-add-outline" size={16} color={c.accent} />
                <Txt size={14} weight="700">
                  Delegate
                </Txt>
              </Pressable>
            ) : null}
            {canDeleteTask ? (
              <Pressable
                onPress={() => setDeleteOpen(true)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 12,
                  backgroundColor: alpha("#EF4444", 0.1),
                  borderWidth: 1,
                  borderColor: alpha("#EF4444", 0.2),
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Ionicons name="trash-outline" size={16} color={c.redSoft} />
                <Txt size={14} weight="700" color={c.redSoft}>
                  Delete Task
                </Txt>
              </Pressable>
            ) : null}
          </View>
        </View>

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: alpha("#EF4444", 0.2),
              backgroundColor: alpha("#EF4444", 0.1),
              padding: 12,
            }}
          >
            <Ionicons name="alert-circle-outline" size={18} color={c.red} />
            <Txt size={14} weight="700" color={c.red} style={{ flex: 1 }}>
              {error}
            </Txt>
          </View>
        ) : null}

        <View style={[card, { padding: 24 }]}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Txt size={12} weight="700" tracking={0.05} muted>
              {task.code}
            </Txt>
            <StatusBadge status={task.status} />
            {overdue ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: alpha("#EF4444", 0.2),
                  backgroundColor: alpha("#EF4444", 0.1),
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Ionicons name="warning-outline" size={12} color={c.redSoft} />
                <Txt size={10} weight="700" tracking={0.05} upper color={c.redSoft}>
                  Overdue
                </Txt>
              </View>
            ) : null}
          </View>
          <Txt size={24} weight="800" style={{ lineHeight: 30 }}>
            {task.title}
          </Txt>
          {task.description ? (
            <View
              style={{
                marginTop: 24,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: alpha(c.border, 0.5),
                backgroundColor: alpha(c.app, 0.5),
                padding: 16,
              }}
            >
              <Txt size={14} color={c.secondary} selectable style={{ lineHeight: 22 }}>
                {task.description}
              </Txt>
            </View>
          ) : null}
          {task.blockedReason ? (
            <View
              style={{
                marginTop: 24,
                flexDirection: "row",
                gap: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: alpha("#EF4444", 0.2),
                backgroundColor: alpha("#EF4444", 0.1),
                padding: 16,
              }}
            >
              <Ionicons name="warning-outline" size={18} color={c.redSoft} />
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="700" color={c.redSoft} style={{ marginBottom: 4 }}>
                  {t("task.blockedTitle")}
                </Txt>
                <Txt size={14} color={c.redSoft}>
                  {task.blockedReason}
                </Txt>
              </View>
            </View>
          ) : null}
          <View
            style={{ marginTop: 32, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 24 }}
          >
            {actions.length > 0 ? (
              <View
                style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }}
              >
                <Txt size={12} weight="700" tracking={0.05} upper muted>
                  Actions:
                </Txt>
                {actions.map((a) => (
                  <Pressable
                    key={a.to + a.labelKey}
                    disabled={busy}
                    onPress={() =>
                      a.needsReason
                        ? setPending({ to: a.to, label: t(a.labelKey) })
                        : void transition(a.to)
                    }
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      opacity: busy ? 0.5 : 1,
                      borderWidth: 1,
                      borderColor: a.isDanger ? alpha("#EF4444", 0.2) : c.accent,
                      backgroundColor: a.isDanger ? alpha("#EF4444", 0.1) : c.accent,
                    }}
                  >
                    <Txt size={14} weight="700" color={a.isDanger ? c.redSoft : c.accentText}>
                      {t(a.labelKey)}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="information-circle-outline" size={16} color={c.muted} />
                <Txt size={14} muted style={{ flex: 1 }}>
                  {t("task.noActions", { status: t(STATUS_KEY[task.status]) })}
                </Txt>
              </View>
            )}
          </View>
        </View>

        <View style={[card, { padding: 24 }]}>
          {H("attach", t("task.attachments.title"))}
          <View style={{ gap: 12, marginBottom: 24 }}>
            {attachments.length === 0 ? (
              <View
                style={{
                  paddingVertical: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: c.border,
                  borderRadius: 12,
                }}
              >
                <Txt size={14} muted>
                  {t("task.attachments.empty")}
                </Txt>
              </View>
            ) : (
              attachments.map((f) => (
                <View
                  key={f.id}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.app,
                    padding: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons
                        name={
                          f.mimeType.startsWith("image/")
                            ? "image-outline"
                            : f.mimeType === "application/pdf"
                              ? "document-text-outline"
                              : "document-outline"
                        }
                        size={18}
                        color={c.accent}
                      />
                      <Txt size={10} weight="500" muted>
                        {(f.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </Txt>
                    </View>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <Pressable
                        onPress={() => viewFile(f.id)}
                        hitSlop={8}
                        style={{ padding: 6 }}
                        accessibilityLabel="Download"
                      >
                        <Ionicons name="download-outline" size={14} color={c.muted} />
                      </Pressable>
                      {canDeleteAtt ? (
                        <Pressable
                          onPress={() => deleteAttachment(f.id)}
                          disabled={deletingAtt === f.id}
                          hitSlop={8}
                          style={{ padding: 6 }}
                          accessibilityLabel="Delete"
                        >
                          {deletingAtt === f.id ? (
                            <Spinner size="small" />
                          ) : (
                            <Ionicons name="trash-outline" size={14} color={c.muted} />
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <Pressable onPress={() => viewFile(f.id)}>
                    <Txt size={14} weight="700" numberOfLines={1}>
                      {f.fileName}
                    </Txt>
                  </Pressable>
                </View>
              ))
            )}
          </View>
          <View
            style={{
              alignItems: "center",
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: c.border,
              padding: 24,
            }}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={24}
              color={c.muted}
              style={{ marginBottom: 8 }}
            />
            <Txt size={14} weight="500" align="center" style={{ marginBottom: 12 }}>
              {uploading ? t("task.attachments.uploading") : "Tap to choose a file to upload"}
            </Txt>
            <Pressable
              onPress={upload}
              disabled={uploading}
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.panel,
                paddingHorizontal: 16,
                paddingVertical: 8,
                opacity: uploading ? 0.5 : 1,
              }}
            >
              <Txt size={12} weight="700">
                {t("task.attachments.upload")}
              </Txt>
            </Pressable>
          </View>
        </View>

        <View style={[card, { height: 600, overflow: "hidden" }]}>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.border }}>
            {(["details", "activity", "comments"] as Tab[]).map((k) => (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderBottomWidth: 2,
                  borderBottomColor: tab === k ? c.accent : "transparent",
                  backgroundColor: tab === k ? alpha(c.accent, 0.05) : "transparent",
                }}
              >
                <Txt size={12} weight="700" color={tab === k ? c.accent : c.muted}>
                  {k === "details" ? "Details" : k === "activity" ? "Activity" : "Comments"}
                </Txt>
              </Pressable>
            ))}
          </View>
          <ScrollView
            nestedScrollEnabled
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {tab === "details" ? (
              <View style={{ gap: 20 }}>
                <View>
                  {eyebrow(t("task.details.owner"))}
                  <Txt size={14} weight="700">
                    {task.owner?.fullName ?? t("task.details.unassigned")}
                  </Txt>
                </View>
                <View>
                  {eyebrow(t("task.details.category"))}
                  <Txt size={14} weight="700">
                    {task.category?.name ?? "—"}
                  </Txt>
                </View>
                <View>
                  {eyebrow(t("task.details.office"))}
                  <Txt size={14} weight="700">
                    {task.office?.name ?? "—"}
                  </Txt>
                </View>
                <View>
                  {eyebrow(t("task.details.dueDate"))}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: c.app,
                      padding: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: c.border,
                      marginTop: 4,
                    }}
                  >
                    <Txt size={14} weight="700" color={overdue ? c.redSoft : c.primary}>
                      {task.dueDate ? formatDate(task.dueDate) : "—"}
                    </Txt>
                    {gcal ? (
                      <Pressable
                        onPress={() => Linking.openURL(gcal)}
                        accessibilityLabel={t("task.gcal")}
                        style={{
                          padding: 6,
                          backgroundColor: c.panel,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: c.border,
                        }}
                      >
                        <Ionicons name="calendar-outline" size={14} color={c.muted} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}
            {tab === "activity" ? (
              events.length === 0 ? (
                <Txt size={12} muted align="center" style={{ paddingVertical: 16 }}>
                  {t("task.history.empty")}
                </Txt>
              ) : (
                <View
                  style={{ borderLeftWidth: 1, borderLeftColor: c.border, marginLeft: 8, gap: 24 }}
                >
                  {events.map((ev) => (
                    <View key={ev.id} style={{ paddingLeft: 24 }}>
                      <View
                        style={
                          {
                            position: "absolute",
                            left: -5,
                            top: 6,
                            height: 10,
                            width: 10,
                            borderRadius: 5,
                            backgroundColor: c.accent,
                            borderWidth: 3,
                            borderColor: c.panel,
                            boxSizing: "content-box",
                          } as never
                        }
                      />
                      <Txt size={14} weight="700" style={{ textTransform: "capitalize" }}>
                        {ev.type.replace(/_/g, " ").toLowerCase()}
                      </Txt>
                      <Txt size={10} muted style={{ marginTop: 2 }}>
                        {ev.actor?.fullName ?? "System"} · {formatDateTime(ev.createdAt)}
                      </Txt>
                      {ev.note ? (
                        <View
                          style={{
                            marginTop: 8,
                            backgroundColor: c.app,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: c.border,
                            padding: 8,
                          }}
                        >
                          <Txt size={12} color={c.secondary} style={{ fontStyle: "italic" }}>
                            "{ev.note}"
                          </Txt>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )
            ) : null}
            {tab === "comments" ? (
              <View style={{ gap: 12 }}>
                {comments.length === 0 ? (
                  <Txt size={12} muted align="center" style={{ paddingVertical: 16 }}>
                    {t("task.comments.empty")}
                  </Txt>
                ) : (
                  comments.map((cm) => (
                    <View
                      key={cm.id}
                      style={{
                        borderRadius: 12,
                        backgroundColor: c.app,
                        borderWidth: 1,
                        borderColor: c.border,
                        padding: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Avatar name={cm.author.fullName} size={20} />
                        <Txt size={12} weight="700">
                          {cm.author.fullName}
                        </Txt>
                        <Txt size={9} muted style={{ marginLeft: "auto" }}>
                          {formatDateTime(cm.createdAt)}
                        </Txt>
                      </View>
                      <Txt
                        size={12}
                        color={c.secondary}
                        selectable
                        style={{ paddingLeft: 28, lineHeight: 18 }}
                      >
                        {cm.body}
                      </Txt>
                    </View>
                  ))
                )}
                <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border }}>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    placeholder={t("task.comments.placeholder")}
                    placeholderTextColor={c.muted}
                    style={{
                      minHeight: 56,
                      textAlignVertical: "top",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: c.app,
                      color: c.primary,
                      padding: 12,
                      fontSize: 12,
                    }}
                  />
                  <Pressable
                    onPress={addComment}
                    disabled={busy || !comment.trim()}
                    style={{
                      marginTop: 8,
                      borderRadius: 12,
                      backgroundColor: c.accent,
                      paddingVertical: 8,
                      alignItems: "center",
                      opacity: busy || !comment.trim() ? 0.5 : 1,
                    }}
                  >
                    <Txt size={12} weight="700" color={c.accentText}>
                      {t("task.comments.post")}
                    </Txt>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </ScrollView>

      <ReasonModal
        visible={!!pending}
        minLength={3}
        busy={busy}
        title={pending?.label || "Action Required"}
        description={
          pending?.to === "BLOCKED" ? t("task.modal.reasonRequired") : "Please provide a comment."
        }
        hint={(n) => (n > 0 ? t("task.modal.charactersLeft", { count: n }) : t("task.modal.ready"))}
        onClose={() => setPending(null)}
        onSubmit={(r) => pending && transition(pending.to, r)}
      />

      <Modal
        visible={delegateOpen}
        onClose={() => setDelegateOpen(false)}
        title="Delegate Task"
        description="Search for a user by name or role to delegate this task to."
      >
        <View style={{ gap: 16 }}>
          <UserCombobox
            label="Delegate To"
            users={users.filter((u) => u.id !== me.id)}
            value={delegateId}
            onChange={setDelegateId}
          />
          <View>
            <Txt size={10} weight="700" tracking={0.05} upper muted style={{ marginBottom: 6 }}>
              Reason
            </Txt>
            <TextInput
              value={delegateReason}
              onChangeText={setDelegateReason}
              multiline
              placeholder="Why are you delegating this task?"
              placeholderTextColor={c.faint}
              style={{
                minHeight: 80,
                textAlignVertical: "top",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.app,
                color: c.primary,
                padding: 12,
                fontSize: 14,
              }}
            />
          </View>
          <ModalButtons
            cancelLabel={t("common.cancel")}
            submitLabel="Delegate"
            busy={delegateBusy}
            disabled={!delegateId || !delegateReason.trim()}
            onCancel={() => setDelegateOpen(false)}
            onSubmit={submitDelegate}
          />
        </View>
      </Modal>
      <Modal
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action is recorded in the audit log."
      >
        <ModalButtons
          cancelLabel={t("common.cancel")}
          submitLabel="Delete"
          busy={deleting}
          onCancel={() => setDeleteOpen(false)}
          onSubmit={deleteTask}
        />
      </Modal>
      {void nav}
      {void ROLE_LABELS}
    </Shell>
  );
}
