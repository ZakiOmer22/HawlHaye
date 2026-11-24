import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Task } from "../api/types";
import { STATUS_LABELS } from "../api/types";
import { PRIORITY_COLOR, STATUS_COLOR, usePalette } from "../theme";
import { dueLabel, isOverdue } from "../lib/format";
import { Card, Pill, Txt } from "./ui";

export function TaskCard({ task, onPress, showStatus }: { task: Pick<Task, "code" | "title" | "status" | "priority" | "dueDate" | "owner" | "category">; onPress: () => void; showStatus?: boolean }) {
  const c = usePalette();
  const overdue = isOverdue(task);
  return (
    <Card onPress={onPress} style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: PRIORITY_COLOR[task.priority] }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Txt size={11} weight="800" muted style={{ letterSpacing: 0.6 }}>{task.code}</Txt>
        {showStatus ? <Pill label={STATUS_LABELS[task.status].toUpperCase()} color={STATUS_COLOR[task.status]} /> : <Pill label={task.priority} color={PRIORITY_COLOR[task.priority]} />}
      </View>
      <Txt weight="700" size={16} numberOfLines={2}>{task.title}</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="time-outline" size={14} color={overdue ? c.danger : c.muted} />
          <Txt size={12} color={overdue ? c.danger : c.muted} weight={overdue ? "700" : "400"}>{dueLabel(task)}</Txt>
        </View>
        {task.owner ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="person-outline" size={14} color={c.muted} />
            <Txt size={12} muted numberOfLines={1}>{task.owner.fullName}</Txt>
          </View>
        ) : null}
        {task.category ? <Txt size={12} muted numberOfLines={1}>• {task.category.name}</Txt> : null}
      </View>
    </Card>
  );
}
