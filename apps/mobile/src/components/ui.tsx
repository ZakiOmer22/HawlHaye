import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePrefs } from "../prefs";
import { alpha, FONT } from "../theme";

export const InShell = createContext(false);

type W = "400" | "500" | "600" | "700" | "800" | "900";

/** Text with the web's typography: Plus Jakarta Sans, Tailwind-style tracking (em). */
export function Txt({
  children,
  style,
  size = 14,
  weight = "400",
  muted,
  color,
  tracking,
  upper,
  numberOfLines,
  selectable,
  align,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  size?: number;
  weight?: W;
  muted?: boolean;
  color?: string;
  tracking?: number;
  upper?: boolean;
  numberOfLines?: number;
  selectable?: boolean;
  align?: "left" | "center" | "right";
}) {
  const { palette: c } = usePrefs();
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: FONT[weight], fontSize: size, color: color ?? (muted ? c.muted : c.primary) },
        tracking ? { letterSpacing: size * tracking } : null,
        upper ? { textTransform: "uppercase" } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Screen({
  children,
  scroll,
  pad = true,
  edges,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  pad?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  const { palette: c } = usePrefs();
  const inShell = useContext(InShell);
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[pad && { padding: 16 }, { paddingBottom: 184 }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad && { padding: 16 }, pad && { paddingBottom: 184 }]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView
      edges={edges ?? (inShell ? ["left", "right"] : ["top", "left", "right"])}
      style={{ flex: 1, backgroundColor: c.app }}
    >
      {inner}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { palette: c } = usePrefs();
  const base: ViewStyle = {
    backgroundColor: c.panel,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  };
  if (onPress)
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [base, pressed && { borderColor: alpha(c.accent, 0.5) }, style]}
      >
        {children}
      </Pressable>
    );
  return <View style={[base, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  busy,
  disabled,
  icon,
  small,
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "dangerSolid";
  busy?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { palette: c } = usePrefs();
  const v = {
    primary: { bg: c.accent, fg: c.accentText, bd: "transparent" },
    secondary: { bg: c.panel, fg: c.primary, bd: c.border },
    danger: { bg: alpha("#EF4444", 0.1), fg: c.red, bd: alpha("#EF4444", 0.2) },
    dangerSolid: { bg: "#EF4444", fg: "#FFFFFF", bd: "transparent" },
    ghost: { bg: "transparent", fg: c.muted, bd: "transparent" },
  }[variant];
  const off = busy || disabled;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [
        {
          backgroundColor: pressed && variant === "primary" ? c.accentHover : v.bg,
          borderColor: v.bd,
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: small ? 10 : 16,
          paddingHorizontal: small ? 20 : 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: off ? 0.5 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={small ? 16 : 18} color={v.fg} />
      ) : null}
      <Text
        style={[
          { fontFamily: FONT[small ? "700" : "800"], fontSize: small ? 14 : 16, color: v.fg },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const SurfaceCtx = createContext<"app" | "panel">("app");

export function Field({
  label,
  labelRight,
  error,
  hint,
  secure,
  icon,
  mono,
  centered,
  ...rest
}: TextInputProps & {
  label?: string;
  labelRight?: React.ReactNode;
  error?: string | null;
  hint?: string;
  secure?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  mono?: boolean;
  centered?: boolean;
}) {
  const { palette: c } = usePrefs();
  const onPanel = useContext(SurfaceCtx) === "panel"; // inside a modal the input sits on bg-app
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      {label || labelRight ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          {label ? (
            <Txt size={12} weight="800" tracking={0.15} upper muted>
              {label}
            </Txt>
          ) : (
            <View />
          )}
          {labelRight}
        </View>
      ) : null}
      <View style={{ justifyContent: "center" }}>
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={c.faint}
            style={{ position: "absolute", left: 16, zIndex: 1 }}
          />
        ) : null}
        <TextInput
          placeholderTextColor={c.faint}
          {...rest}
          onFocus={(e) => {
            setFocus(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            rest.onBlur?.(e);
          }}
          secureTextEntry={secure ? !show : rest.secureTextEntry}
          style={[
            {
              backgroundColor: onPanel ? c.app : c.panel,
              color: c.primary,
              borderColor: error ? "#EF4444" : focus ? c.accent : c.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: Platform.OS === "ios" ? 14 : 11,
              paddingLeft: icon ? 44 : 16,
              paddingRight: secure ? 48 : 16,
              fontSize: 16,
              fontFamily: FONT[mono ? "700" : "500"],
            },
            centered && { textAlign: "center" },
            rest.multiline && { minHeight: 96, textAlignVertical: "top" },
            rest.style,
          ]}
        />
        {secure ? (
          <Pressable
            onPress={() => setShow((s) => !s)}
            hitSlop={10}
            style={{ position: "absolute", right: 14 }}
            accessibilityLabel={show ? "Hide password" : "Show password"}
          >
            <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color={c.faint} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Txt size={12} weight="500" color={c.red} style={{ marginTop: 4 }}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt size={12} muted style={{ marginTop: 4 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** Small bordered badge (rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider). */
export function Pill({
  label,
  color,
  bg,
  border,
  size = 10,
}: {
  label: string;
  color: string;
  bg?: string;
  border?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        backgroundColor: bg ?? alpha(color, 0.1),
        borderColor: border ?? alpha(color, 0.2),
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color,
          fontSize: size,
          fontFamily: FONT["700"],
          letterSpacing: size * 0.05,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
  dot,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  color?: string;
  dot?: string;
}) {
  const { palette: c } = usePrefs();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? c.accent : c.border,
        backgroundColor: active ? c.accent : c.panel,
      }}
    >
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
      <Text
        style={{ color: active ? c.accentText : c.muted, fontFamily: FONT["700"], fontSize: 12 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Spinner({ size = "large" }: { size?: "small" | "large" }) {
  const { palette: c } = usePrefs();
  return <ActivityIndicator size={size} color={c.accent} />;
}
export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
      <Spinner />
    </View>
  );
}

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { palette: c } = usePrefs();
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [o]);
  return (
    <Animated.View
      style={[{ backgroundColor: c.panelHover, borderRadius: 8, opacity: o }, style]}
    />
  );
}

/** Red alert box used for load failures (rounded-2xl border-red-500/20 bg-red-500/10). */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { palette: c, t } = usePrefs();
  return (
    <View
      style={{
        margin: 16,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: alpha("#EF4444", 0.2),
        backgroundColor: alpha("#EF4444", 0.1),
        alignItems: "center",
      }}
    >
      <Ionicons name="alert-circle-outline" size={32} color={c.red} />
      {title ? (
        <Txt size={18} weight="800" color={c.red} style={{ marginTop: 8 }}>
          {title}
        </Txt>
      ) : null}
      <Txt
        size={14}
        muted
        style={{ textAlign: "center", marginTop: 6, marginBottom: onRetry ? 16 : 0 }}
      >
        {message}
      </Txt>
      {onRetry ? (
        <Button small title={retryLabel ?? t("common.retry")} icon="refresh" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function Empty({
  icon = "checkmark-done-outline",
  title,
  subtitle,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { palette: c } = usePrefs();
  return (
    <View
      style={{
        margin: 16,
        padding: 40,
        borderRadius: 24,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: c.border,
        backgroundColor: alpha(c.panel, 0.5),
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: c.app,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon} size={36} color={c.accent} />
      </View>
      <Txt size={22} weight="800" align="center" style={{ marginBottom: 8 }}>
        {title}
      </Txt>
      {subtitle ? (
        <Txt size={14} muted align="center" style={{ marginBottom: action ? 20 : 0 }}>
          {subtitle}
        </Txt>
      ) : null}
      {action}
    </View>
  );
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "danger" | "warn" | "ok";
  children: React.ReactNode;
}) {
  const { palette: c } = usePrefs();
  const col =
    tone === "danger"
      ? "#EF4444"
      : tone === "warn"
        ? "#F59E0B"
        : tone === "ok"
          ? "#10B981"
          : "#3B82F6";
  const fg =
    tone === "danger" ? c.red : tone === "warn" ? c.amber : tone === "ok" ? c.emerald : c.blue;
  return (
    <View
      role="alert"
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        backgroundColor: alpha(col, 0.1),
        borderColor: alpha(col, 0.2),
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
      }}
    >
      <Ionicons
        name={tone === "ok" ? "checkmark-circle-outline" : "warning-outline"}
        size={20}
        color={fg}
      />
      <Text style={{ flex: 1, color: fg, fontSize: 14, fontFamily: FONT["700"] }}>{children}</Text>
    </View>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { palette: c } = usePrefs();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      <Txt size={12} weight="800" tracking={0.05} upper color={c.secondary}>
        {children}
      </Txt>
      {right}
    </View>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, gap: 12 }}
    >
      <Txt muted size={13}>
        {label}
      </Txt>
      <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
        {typeof value === "string" ? (
          <Txt size={13} weight="700" style={{ textAlign: "right" }}>
            {value}
          </Txt>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

export function Avatar({ name, size = 28 }: { name?: string | null; size?: number }) {
  const { palette: c } = usePrefs();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.app,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: c.primary, fontFamily: FONT["700"], fontSize: Math.round(size * 0.36) }}
      >
        {name ? name.charAt(0).toUpperCase() : "U"}
      </Text>
    </View>
  );
}

/** Web <Modal>: centered, rounded-2xl panel, p-6, black/60 backdrop. */
export function Modal({
  visible,
  onClose,
  title,
  description,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { palette: c } = usePrefs();
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", padding: 16 }}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View
          style={{
            backgroundColor: c.panel,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 24,
            maxHeight: "90%",
            width: "100%",
            maxWidth: 448,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Txt size={20} weight="700">
                {title}
              </Txt>
              {description ? (
                <Txt size={14} muted style={{ marginTop: 4 }}>
                  {description}
                </Txt>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={c.muted} />
            </Pressable>
          </View>
          <SurfaceCtx.Provider value="panel">
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </SurfaceCtx.Provider>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
/** Older screens call it Sheet. */
export const Sheet = Modal;

export function IconBtn({
  name,
  onPress,
  label,
  size = 40,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  const { palette: c } = usePrefs();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: c.panel,
        borderColor: c.border,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={16} color={c.muted} />
    </Pressable>
  );
}
