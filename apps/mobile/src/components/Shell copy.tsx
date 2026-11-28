import React, { useState } from "react";
import { Image, Modal as RNModal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../auth/AuthContext";
import { usePrefs } from "../prefs";
import { useRealtime } from "../realtime/RealtimeProvider";
import { LANGUAGES } from "../i18n/types";
import { ROLE_LABELS } from "../api/types";
import { API_URL } from "../config";
import { alpha } from "../theme";
import type { MainStackParams } from "../navigation/types";
import type { TranslationKey } from "../i18n";
import { InShell, Txt } from "./ui";

import logoImg from "../../assets/logo.png";

type Nav = NativeStackNavigationProp<MainStackParams>;
type Icon = keyof typeof Ionicons.glyphMap;
type Item = {
  route: keyof MainStackParams;
  href: string;
  labelKey?: TranslationKey;
  label?: string;
  icon: Icon;
  roles: string[];
};

const ACADEMIC_NAV: Item[] = [
  { route: "Board", href: "/board", labelKey: "nav.board", icon: "grid-outline", roles: ["ALL"] },
  {
    route: "MyTasks",
    href: "/my-tasks",
    labelKey: "nav.myTasks",
    icon: "checkbox-outline",
    roles: ["ALL"],
  },
  {
    route: "Delegations",
    href: "/delegations",
    labelKey: "nav.delegations",
    icon: "file-tray-outline",
    roles: ["ALL"],
  },
  {
    route: "Review",
    href: "/review",
    labelKey: "nav.review",
    icon: "shield-checkmark-outline",
    roles: ["DEAN", "DEPUTY", "FACULTY_COORDINATOR", "LABS_COORDINATOR"],
  },
  {
    route: "Dashboard",
    href: "/dashboard",
    labelKey: "nav.dashboard",
    icon: "speedometer-outline",
    roles: ["DEAN", "DEPUTY", "ADMINISTRATOR", "FACULTY_COORDINATOR", "LABS_COORDINATOR"],
  },
];
const MANAGEMENT_NAV: Item[] = [
  {
    route: "Audit",
    href: "/admin/audit",
    label: "Audit Log",
    icon: "document-text-outline",
    roles: [],
  },
];

/** Branding logo: Use the local logo.png by default. */
function logoSource(url?: string | null) {
  // USE THE IMPORTED VARIABLE HERE
  if (!url || url === "/uoh.png" || url === "/logo.png") return logoImg;
  if (url.startsWith("/")) return { uri: `${API_URL}${url}` };
  return { uri: url };
}

export function Shell({
  active,
  children,
}: {
  active: keyof MainStackParams;
  children: React.ReactNode;
}) {
  const nav = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const { palette: c, t, language, setLanguage, theme, setTheme } = usePrefs();
  const { notifications, unreadCount, markAllRead } = useRealtime();
  const insets = useSafeAreaInsets();
  const [drawer, setDrawer] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  if (!user) return null;

  const accent = user.branding?.primaryColor || "#E8BC69"; // shell uses the branding colour (var(--accent))
  const perms = user.permissions ?? {};
  const permsSet = Object.keys(perms).length > 0;
  const isAdmin = user.role === "ADMINISTRATOR";
  const allowed = (i: Item) =>
    isAdmin ||
    (permsSet ? perms[i.href] === true : i.roles.includes("ALL") || i.roles.includes(user.role));
  const academic = ACADEMIC_NAV.filter(allowed);
  const canUsers =
    isAdmin || (permsSet ? perms["/admin/users"] === true : ["DEAN", "DEPUTY"].includes(user.role));
  const management: Item[] = [
    ...(canUsers
      ? [
          {
            route: "Users" as const,
            href: "/admin/users",
            label: "Users",
            icon: "people-outline" as Icon,
            roles: [],
          },
        ]
      : []),
    ...MANAGEMENT_NAV.filter(
      (i) =>
        isAdmin || (permsSet ? perms[i.href] === true : ["DEAN", "DEPUTY"].includes(user.role)),
    ),
  ];
  const isAdminRole = ["DEAN", "DEPUTY", "ADMINISTRATOR"].includes(user.role);

  const dock: Item[] = isAdmin
    ? [
        {
          route: "Dashboard",
          href: "/dashboard",
          labelKey: "nav.dashboard",
          icon: "speedometer-outline",
          roles: [],
        },
        {
          route: "Users",
          href: "/admin/users",
          labelKey: "nav.users",
          icon: "people-outline",
          roles: [],
        },
        {
          route: "Tickets",
          href: "/support",
          labelKey: "menu.support",
          icon: "ticket-outline",
          roles: [],
        },
      ]
    : ([
        academic.find((n) => n.route === "Board"),
        academic.find((n) => n.route === "MyTasks"),
        academic.find((n) => n.route === "Review") ??
          academic.find((n) => n.route === "Delegations"),
      ].filter(Boolean) as Item[]);

  const go = (route: keyof MainStackParams) => {
    setDrawer(false);
    setMenu(false);
    if (route !== active) nav.reset({ index: 0, routes: [{ name: route } as never] });
  };
  const label = (i: Item) => (i.labelKey ? t(i.labelKey) : (i.label ?? ""));
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const initial = user.fullName.charAt(0).toUpperCase();
  const logo = logoSource(user.branding?.logoUrl);

  // 👇 UPDATED TO SHOW "HAWLHAYE" AND "WORK. ORGANISED."
  const Logo = () => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 }}>
      <Image source={logo} style={{ height: 40, width: 40 }} resizeMode="contain" />
      <View
        style={{ borderLeftWidth: 1, borderLeftColor: "#334155", paddingLeft: 12, flexShrink: 1 }}
      >
        <Txt size={18} weight="900" color="#FFFFFF" numberOfLines={1} tracking={2}>
          HAWLHAYE
        </Txt>
        <Txt size={10} weight="700" color={accent} tracking={2} upper style={{ marginTop: 2 }}>
          Work. Organised.
        </Txt>
      </View>
    </View>
  );

  const twoFA = user.twoFAStatus;
  const showBanner = twoFA && (twoFA.enforcement === "warning" || twoFA.enforcement === "blocked");

  return (
    <View style={{ flex: 1, backgroundColor: c.app }}>
      {/* header: data-force-dark, bg-[#0F172A]/95 border-b border-[#334155] */}
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: "#0F172A", borderBottomWidth: 1, borderBottomColor: "#334155" }}
      >
        {showBanner ? (
          <Pressable
            onPress={() => nav.navigate("Security")}
            style={{
              backgroundColor: twoFA!.enforcement === "blocked" ? "#DC2626" : "#F59E0B",
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Ionicons
              name={twoFA!.enforcement === "blocked" ? "alert-circle" : "shield-checkmark"}
              size={20}
              color="#fff"
            />
            <View style={{ flex: 1 }}>
              <Txt size={14} weight="800" color="#fff">
                {twoFA!.enforcement === "blocked"
                  ? "2FA is now required"
                  : `Enable 2FA within ${twoFA!.daysLeft} day${twoFA!.daysLeft === 1 ? "" : "s"}`}
              </Txt>
              <Txt size={11} weight="500" color="#fff" numberOfLines={2}>
                Your leadership role requires two-factor authentication.
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </Pressable>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 }}>
            <Pressable onPress={() => setDrawer(true)} accessibilityLabel="Open menu" hitSlop={8}>
              <Ionicons name="menu" size={24} color="#CBD5E1" />
            </Pressable>
            <Logo />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => {
                setBell(true);
                markAllRead();
              }}
              accessibilityLabel="Notifications"
              hitSlop={8}
              style={{ padding: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color="#CBD5E1" />
              {unreadCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#EF4444",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "#0F172A",
                  }}
                >
                  <Txt size={9} weight="700" color="#fff">
                    {unreadCount > 9 ? "9+" : String(unreadCount)}
                  </Txt>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => setMenu(true)}
              accessibilityLabel="Account menu"
              hitSlop={6}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#1E293B",
                borderWidth: 1,
                borderColor: "#334155",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Txt size={14} weight="800" color={accent}>
                {initial}
              </Txt>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <View style={{ flex: 1 }}>
        <InShell.Provider value>{children}</InShell.Provider>
      </View>

      {/* floating dock (md:hidden): rounded-full border bg-[#0F172A] */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: Math.max(insets.bottom, 12) + 12,
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 4,
            backgroundColor: "#0F172A",
            borderColor: "#334155",
            borderWidth: 1,
            borderRadius: 999,
            padding: 8,
            width: "92%",
            maxWidth: 384,
            shadowColor: "#000",
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {dock.map((i) => {
            const on = i.route === active;
            return (
              <Pressable
                key={i.href}
                onPress={() => go(i.route)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  gap: 4,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: on ? accent : "transparent",
                }}
              >
                <Ionicons name={i.icon} size={20} color={on ? "#0F172A" : "#CBD5E1"} />
                <Txt size={10} weight="700" color={on ? "#0F172A" : "#CBD5E1"} numberOfLines={1}>
                  {label(i)}
                </Txt>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setDrawer(true)}
            style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 8 }}
          >
            <Ionicons name="menu" size={20} color="#CBD5E1" />
            <Txt size={10} weight="700" color="#CBD5E1">
              Menu
            </Txt>
          </Pressable>
        </View>
      </View>

      {/* drawer: w-4/5 max-w-sm bg-[#0F172A] p-6 border-r */}
      <RNModal
        visible={drawer}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawer(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, flexDirection: "row" }}>
          <SafeAreaView
            style={{
              width: "80%",
              maxWidth: 384,
              backgroundColor: "#0F172A",
              borderRightWidth: 1,
              borderRightColor: "#334155",
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 24 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 32,
                }}
              >
                <Logo />
                <Pressable onPress={() => setDrawer(false)} hitSlop={10}>
                  <Ionicons name="close" size={24} color="#CBD5E1" />
                </Pressable>
              </View>
              <Pressable
                onPress={() => {
                  setDrawer(false);
                  nav.navigate("Search");
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#334155",
                  backgroundColor: "#1E293B",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 16,
                }}
              >
                <Ionicons name="search" size={20} color="#CBD5E1" />
                <Txt size={16} weight="700" color="#CBD5E1">
                  Search...
                </Txt>
              </Pressable>
              {academic.map((i) => (
                <DrawerItem
                  key={i.href}
                  item={i}
                  active={i.route === active}
                  label={label(i)}
                  accent={accent}
                  onPress={() => go(i.route)}
                />
              ))}
              {isAdminRole && management.length > 0 ? (
                <View
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: "#334155",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 16,
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name="settings-outline" size={12} color="#64748B" />
                    <Txt size={10} weight="700" tracking={0.05} upper color="#64748B">
                      Management
                    </Txt>
                  </View>
                  {management.map((i) => (
                    <DrawerItem
                      key={i.href}
                      item={i}
                      active={i.route === active}
                      label={label(i)}
                      accent={accent}
                      onPress={() => go(i.route)}
                    />
                  ))}
                </View>
              ) : null}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#334155",
                  paddingTop: 16,
                  marginTop: 16,
                  gap: 12,
                }}
              >
                <View>
                  <Txt size={14} weight="700" color="#fff" numberOfLines={1}>
                    {user.fullName}
                  </Txt>
                  <Txt size={12} color={accent} upper tracking={0.05}>
                    {roleLabel}
                  </Txt>
                  <Txt size={11} color="#CBD5E1" numberOfLines={1}>
                    {user.email}
                  </Txt>
                </View>
                <MenuLink
                  icon="person-circle-outline"
                  label={t("menu.profile")}
                  onPress={() => go("Profile")}
                />
                <MenuLink
                  icon="shield-checkmark-outline"
                  label="Security & 2FA"
                  onPress={() => go("Security")}
                />
                <MenuLink
                  icon="key-outline"
                  label={t("menu.changePassword")}
                  onPress={() => go("ChangePassword")}
                />
                <MenuLink
                  icon="ticket-outline"
                  label={t("menu.support") || "Support"}
                  onPress={() => go("Tickets")}
                />
                <Prefs
                  accent={accent}
                  language={language}
                  theme={theme}
                  setLanguage={setLanguage}
                  setTheme={setTheme}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
          <Pressable
            style={[{ flex: 1 }, { backgroundColor: "rgba(0,0,0,0.6)" }]}
            onPress={() => setDrawer(false)}
            accessibilityLabel="Close menu"
          />
        </View>
      </RNModal>

      {/* notifications dropdown (w-80, rounded-xl, bg-[#1E293B]) */}
      <RNModal
        visible={bell}
        transparent
        animationType="fade"
        onRequestClose={() => setBell(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setBell(false)} />
        <View
          style={{
            position: "absolute",
            top: insets.top + 56,
            right: 16,
            width: 320,
            maxWidth: "92%",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#334155",
            backgroundColor: "#1E293B",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#334155",
            }}
          >
            <Txt size={14} weight="700" color="#fff">
              Notifications
            </Txt>
          </View>
          <ScrollView style={{ maxHeight: 320 }}>
            {notifications.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Ionicons
                  name="file-tray-outline"
                  size={32}
                  color="#94A3B8"
                  style={{ opacity: 0.5, marginBottom: 8 }}
                />
                <Txt size={14} color="#94A3B8">
                  No new notifications
                </Txt>
              </View>
            ) : (
              notifications.map((n, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setBell(false);
                    const m = n.link?.match(/^\/tasks\/([\w-]+)/);
                    if (m?.[1]) nav.navigate("TaskDetail", { id: m[1] });
                    else if (n.link === "/review") go("Review");
                    else if (n.link === "/delegations") go("Delegations");
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: "row",
                    gap: 12,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: "#334155",
                  }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color="#E8BC69"
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Txt size={14} weight="700" color="#fff">
                      {n.title}
                    </Txt>
                    <Txt size={12} color="#94A3B8" style={{ marginTop: 2 }}>
                      {n.message}
                    </Txt>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </RNModal>

      {/* account dropdown (w-72) */}
      <RNModal
        visible={menu}
        transparent
        animationType="fade"
        onRequestClose={() => setMenu(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} />
        <View
          style={{
            position: "absolute",
            top: insets.top + 56,
            right: 16,
            width: 288,
            maxWidth: "92%",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#334155",
            backgroundColor: "#1E293B",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#334155",
            }}
          >
            <Txt size={14} weight="700" color="#fff" numberOfLines={1}>
              {user.fullName}
            </Txt>
            <Txt
              size={10}
              weight="700"
              color={accent}
              upper
              tracking={0.05}
              style={{ marginTop: 2 }}
            >
              {roleLabel}
            </Txt>
            <Txt size={11} color="#CBD5E1" numberOfLines={1} style={{ marginTop: 4 }}>
              {user.email}
            </Txt>
          </View>
          <View style={{ paddingVertical: 4 }}>
            <PopLink
              icon="person-circle-outline"
              label={t("menu.profile")}
              onPress={() => go("Profile")}
            />
            <PopLink
              icon="shield-checkmark-outline"
              label="Security & 2FA"
              onPress={() => go("Security")}
            />
            <PopLink
              icon="key-outline"
              label={t("menu.changePassword")}
              onPress={() => go("ChangePassword")}
            />
            <PopLink
              icon="ticket-outline"
              label={t("menu.support") || "Support"}
              onPress={() => go("Tickets")}
            />
          </View>
          <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: "#334155" }}>
            <Prefs
              accent={accent}
              language={language}
              theme={theme}
              setLanguage={setLanguage}
              setTheme={setTheme}
            />
          </View>
          <Pressable
            onPress={() => {
              setMenu(false);
              void logout();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: "#334155",
            }}
          >
            <Ionicons name="log-out-outline" size={14} color="#F87171" />
            <Txt size={14} color="#F87171">
              {t("menu.signOut")}
            </Txt>
          </Pressable>
        </View>
      </RNModal>
      {void alpha}
    </View>
  );
}

function DrawerItem({
  item,
  active,
  label,
  accent,
  onPress,
}: {
  item: Item;
  active: boolean;
  label: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: active ? accent : "transparent",
      }}
    >
      <Ionicons name={item.icon} size={20} color={active ? "#0F172A" : "#CBD5E1"} />
      <Txt size={16} weight="700" color={active ? "#0F172A" : "#CBD5E1"}>
        {label}
      </Txt>
    </Pressable>
  );
}
function MenuLink({ icon, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#334155",
        backgroundColor: "#1E293B",
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <Ionicons name={icon} size={16} color="#CBD5E1" />
      <Txt size={14} weight="700" color="#CBD5E1">
        {label}
      </Txt>
    </Pressable>
  );
}
function PopLink({ icon, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <Ionicons name={icon} size={14} color="#CBD5E1" />
      <Txt size={14} color="#CBD5E1">
        {label}
      </Txt>
    </Pressable>
  );
}
function Prefs({
  accent,
  language,
  theme,
  setLanguage,
  setTheme,
}: {
  accent: string;
  language: string;
  theme: string;
  setLanguage: (l: "en" | "so" | "ar") => void;
  setTheme: (t: "dark" | "light") => void;
}) {
  const { t } = usePrefs();
  const btn = (on: boolean) => ({
    flex: 1,
    alignItems: "center" as const,
    borderRadius: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: on ? alpha(accent, 0.4) : "transparent",
    backgroundColor: on ? alpha(accent, 0.15) : "transparent",
  });
  return (
    <View style={{ gap: 12 }}>
      <View>
        <Txt
          size={10}
          weight="800"
          tracking={0.05}
          upper
          color="#CBD5E1"
          style={{ marginBottom: 6 }}
        >
          {t("menu.language")}
        </Txt>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              style={btn(language === l.code)}
            >
              <Txt size={12} weight="700" color={language === l.code ? accent : "#CBD5E1"}>
                {l.native}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>
      <View>
        <Txt
          size={10}
          weight={800}
          tracking={0.05}
          upper
          color="#CBD5E1"
          style={{ marginBottom: 6 }}
        >
          {t("menu.theme")}
        </Txt>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <Pressable
            onPress={() => setTheme("dark")}
            style={[
              btn(theme === "dark"),
              { flexDirection: "row", justifyContent: "center", gap: 6 },
            ]}
          >
            <Ionicons name="moon-outline" size={12} color={theme === "dark" ? accent : "#CBD5E1"} />
            <Txt size={12} weight="700" color={theme === "dark" ? accent : "#CBD5E1"}>
              {t("menu.theme.dark")}
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => setTheme("light")}
            style={[
              btn(theme === "light"),
              { flexDirection: "row", justifyContent: "center", gap: 6 },
            ]}
          >
            <Ionicons
              name="sunny-outline"
              size={12}
              color={theme === "light" ? accent : "#CBD5E1"}
            />
            <Txt size={12} weight="700" color={theme === "light" ? accent : "#CBD5E1"}>
              {t("menu.theme.light")}
            </Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
