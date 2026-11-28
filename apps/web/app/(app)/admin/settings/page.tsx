"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { usePreferences } from "@/lib/preferences";
import {
  Settings,
  Shield,
  Server,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building,
  Mail,
  Globe,
  Clock,
  ShieldAlert,
  Lock,
  UserX,
  ShieldCheck,
  LayoutGrid,
  CheckSquare,
  Inbox,
  ClipboardCheck,
  Gauge,
  BarChart3,
  Image as ImageIcon,
  Palette,
  HardDrive,
  Upload,
  Users,
  Building2,
  Tag,
  ScrollText,
  Ticket,
  Link as LinkIcon,
} from "lucide-react";

const PAGES = [
  { key: "/board", label: "Board", icon: LayoutGrid },
  { key: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { key: "/delegations", label: "Delegations", icon: Inbox },
  { key: "/review", label: "Review Queue", icon: ClipboardCheck },
  { key: "/dashboard", label: "Dashboard", icon: Gauge },
  { key: "/reports", label: "Reports", icon: BarChart3 },
  { key: "/admin/users", label: "Users", icon: Users },
  { key: "/admin/offices", label: "Offices", icon: Building2 },
  { key: "/admin/categories", label: "Categories", icon: Tag },
  { key: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { key: "/support", label: "Support", icon: Ticket },
];

const ROLES = [
  { key: "DEAN", label: "Dean" },
  { key: "DEPUTY", label: "Deputy" },
  { key: "FACULTY_COORDINATOR", label: "Faculty Coord." },
  { key: "LABS_COORDINATOR", label: "Labs Coord." },
  { key: "LAB_TECHNICIAN", label: "Lab Technician" },
];

interface SystemSettings {
  universityName: string;
  supportEmail: string;
  timezone: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  emailNotifications: boolean;
  storageLimitMb: number;
  enforce2FA: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  pagePermissions?: Record<string, Record<string, boolean>>;
}

export default function GlobalSettingsPage() {
  const { t } = usePreferences();
  const [data, setData] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [activeTab, setActiveTab] = useState<"general" | "security" | "system" | "permissions">(
    "general",
  );

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api<{ data: SystemSettings }>("/admin/settings");
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleTogglePermission = (role: string, page: string) => {
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        pagePermissions: {
          ...prev.pagePermissions,
          [role]: {
            ...prev.pagePermissions?.[role],
            [page]: !prev.pagePermissions?.[role]?.[page],
          },
        },
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        universityName: data.universityName,
        supportEmail: data.supportEmail,
        timezone: data.timezone,
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
        maintenanceMode: data.maintenanceMode,
        allowRegistration: data.allowRegistration,
        emailNotifications: data.emailNotifications,
        storageLimitMb: data.storageLimitMb,
        enforce2FA: data.enforce2FA,
        maxLoginAttempts: data.maxLoginAttempts,
        sessionTimeout: data.sessionTimeout,
        pagePermissions: data.pagePermissions,
      };

      await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      // USE NATIVE FETCH TO PREVENT JSON CONTENT-TYPE HEADER CONFLICT
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/admin/settings/logo`,
        {
          method: "POST",
          body: formData,
          credentials: "include", // send cookies
        },
      );

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const json = await res.json();
      setData((prev) => (prev ? { ...prev, logoUrl: json.data.logoUrl } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  if (!data) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6 pb-12">
      <header className="rounded-2xl border border-border bg-gradient-to-br from-panel via-panel to-app p-4 sm:p-6 md:p-8 relative overflow-hidden shadow-sm">
        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.22em] text-accent truncate flex items-center gap-2">
              <Settings size={14} /> System Configuration
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-black text-primary leading-tight break-words">
              {t("settings.title") || "Global Settings"}
            </h1>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-secondary">
              {t("settings.subtitle") ||
                "Manage institution configuration, security policies, and system behavior."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 mt-2 xl:mt-0">
            <button
              type="submit"
              form="settings-form"
              disabled={saving || uploadingLogo}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {t("settings.save_changes") || "Save Changes"}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-500 flex items-center gap-2 animate-in slide-in-from-top-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-500 flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 size={18} /> {t("settings.saved") || "Settings updated successfully."}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-1">
          <TabButton
            active={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            icon={Building}
            label="General & Branding"
          />
          <TabButton
            active={activeTab === "security"}
            onClick={() => setActiveTab("security")}
            icon={Shield}
            label="Security & Access"
          />
          <TabButton
            active={activeTab === "permissions"}
            onClick={() => setActiveTab("permissions")}
            icon={ShieldCheck}
            label="Role Permissions"
          />
          <TabButton
            active={activeTab === "system"}
            onClick={() => setActiveTab("system")}
            icon={Server}
            label="System & Limits"
          />
        </div>

        <div className="flex-1 w-full rounded-2xl border border-border bg-panel shadow-sm overflow-hidden">
          <form id="settings-form" onSubmit={handleSave} className="flex flex-col h-full">
            <div className="p-6 md:p-8 flex-1 space-y-8 min-h-[450px]">
              {activeTab === "general" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader
                    title="Institution Details"
                    desc="Core identity and branding for the platform."
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormGroup label="University Name" icon={Building}>
                      <input
                        type="text"
                        required
                        value={data.universityName}
                        onChange={(e) => setData({ ...data, universityName: e.target.value })}
                        className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none focus:border-accent"
                      />
                    </FormGroup>
                    <FormGroup label="Support Email" icon={Mail}>
                      <input
                        type="email"
                        required
                        value={data.supportEmail}
                        onChange={(e) => setData({ ...data, supportEmail: e.target.value })}
                        className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none focus:border-accent"
                      />
                    </FormGroup>
                    <FormGroup label="Timezone" icon={Globe}>
                      <select
                        value={data.timezone}
                        onChange={(e) => setData({ ...data, timezone: e.target.value })}
                        className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none focus:border-accent"
                      >
                        <option value="Africa/Mogadishu">Africa/Mogadishu (EAT)</option>
                        <option value="UTC">UTC</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="America/New_York">America/New_York</option>
                      </select>
                    </FormGroup>
                  </div>

                  <div className="h-px bg-border w-full my-6" />
                  <SectionHeader title="Branding" desc="Customize the look and feel of the app." />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormGroup label="App Logo" icon={ImageIcon}>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-xl border border-border bg-app flex items-center justify-center overflow-hidden shrink-0">
                            {data.logoUrl ? (
                              <img
                                src={data.logoUrl}
                                alt="Logo"
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <ImageIcon className="text-muted" size={24} />
                            )}
                          </div>
                          <div className="flex-1">
                            <label
                              className={`cursor-pointer inline-flex items-center gap-2 rounded-xl border border-border bg-app px-4 py-2.5 text-sm font-bold text-primary transition ${uploadingLogo ? "opacity-50" : "hover:bg-panel"}`}
                            >
                              {uploadingLogo ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Upload size={16} />
                              )}
                              <span>{uploadingLogo ? "Uploading..." : "Upload File"}</span>
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                className="hidden"
                                disabled={uploadingLogo}
                                onChange={handleLogoUpload}
                              />
                            </label>
                          </div>
                        </div>
                        {/* FALLBACK: PASTE URL */}
                        <div className="relative">
                          <LinkIcon
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                            size={16}
                          />
                          <input
                            type="url"
                            placeholder="Or paste an image URL (works on Render)"
                            value={data.logoUrl || ""}
                            onChange={(e) => setData({ ...data, logoUrl: e.target.value })}
                            className="w-full rounded-xl border border-border bg-app py-2.5 pl-10 pr-4 text-sm text-primary outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    </FormGroup>

                    <FormGroup label="Primary Color" icon={Palette}>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={data.primaryColor || "#e8bc69"}
                          onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                          className="h-10 w-14 cursor-pointer rounded border border-border bg-app p-1"
                        />
                        <input
                          type="text"
                          value={data.primaryColor || "#e8bc69"}
                          onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                          className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm font-mono text-primary outline-none focus:border-accent"
                        />
                      </div>
                    </FormGroup>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader
                    title="Authentication & Access"
                    desc="Configure security policies and session management."
                  />
                  <ToggleGroup
                    title="Enforce Two-Factor Authentication"
                    desc="Require all users to set up 2FA before accessing the system."
                    icon={Lock}
                    checked={data.enforce2FA}
                    onChange={(v: boolean) => setData({ ...data, enforce2FA: v })}
                  />
                  <ToggleGroup
                    title="Allow Public Registration"
                    desc="If disabled, users can only join via email invitations."
                    icon={UserX}
                    checked={data.allowRegistration}
                    onChange={(v: boolean) => setData({ ...data, allowRegistration: v })}
                  />
                  <div className="h-px bg-border w-full my-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormGroup label="Max Login Attempts" icon={UserX}>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        required
                        value={data.maxLoginAttempts}
                        onChange={(e) =>
                          setData({ ...data, maxLoginAttempts: parseInt(e.target.value) || 5 })
                        }
                        className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none focus:border-accent"
                      />
                    </FormGroup>
                    <FormGroup label="Session Timeout" icon={Clock}>
                      <div className="relative">
                        <input
                          type="number"
                          min={5}
                          max={1440}
                          required
                          value={data.sessionTimeout}
                          onChange={(e) =>
                            setData({ ...data, sessionTimeout: parseInt(e.target.value) || 60 })
                          }
                          className="w-full rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none focus:border-accent"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                          mins
                        </span>
                      </div>
                    </FormGroup>
                  </div>
                </div>
              )}

              {activeTab === "permissions" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader
                    title="Role Access Matrix"
                    desc="Select which modules appear in the navigation bar for each role. Administrators always have full access."
                  />
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-app-soft/50 border-b border-border">
                          <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted sticky left-0 bg-panel z-10">
                            Role
                          </th>
                          {PAGES.map((p) => (
                            <th
                              key={p.key}
                              className="p-4 text-xs font-bold uppercase tracking-wider text-muted text-center"
                            >
                              {p.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-panel">
                        {ROLES.map((role) => (
                          <tr key={role.key} className="hover:bg-panel-hover transition-colors">
                            <td className="p-4 text-sm font-bold text-primary sticky left-0 bg-panel">
                              {role.label}
                            </td>
                            {PAGES.map((page) => (
                              <td key={page.key} className="p-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={data.pagePermissions?.[role.key]?.[page.key] || false}
                                  onChange={() => handleTogglePermission(role.key, page.key)}
                                  className="w-5 h-5 accent-accent rounded cursor-pointer"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "system" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader
                    title="System Controls & Limits"
                    desc="Global switches affecting platform availability and storage."
                  />
                  <ToggleGroup
                    title="Maintenance Mode"
                    desc="Blocks all non-admin access to the platform. Use only during critical upgrades."
                    icon={ShieldAlert}
                    checked={data.maintenanceMode}
                    onChange={(v: boolean) => setData({ ...data, maintenanceMode: v })}
                    danger
                  />
                  <ToggleGroup
                    title="Email Notifications"
                    desc="Send transactional emails for assignments, alerts, and security events."
                    icon={Mail}
                    checked={data.emailNotifications}
                    onChange={(v: boolean) => setData({ ...data, emailNotifications: v })}
                  />
                  <div className="h-px bg-border w-full my-6" />
                  <FormGroup label="Global Storage Limit (MB)" icon={HardDrive}>
                    <input
                      type="number"
                      min={100}
                      max={1048576}
                      required
                      value={data.storageLimitMb}
                      onChange={(e) =>
                        setData({ ...data, storageLimitMb: parseInt(e.target.value) || 10240 })
                      }
                      className="w-full max-w-sm rounded-xl border border-border bg-app px-4 py-2.5 text-sm text-primary outline-none focus:border-accent"
                    />
                    <p className="text-xs text-muted mt-1">
                      Maximum total storage allowed for all task attachments.
                    </p>
                  </FormGroup>
                </div>
              )}
            </div>

            <div className="p-4 md:px-8 border-t border-border bg-app/30 flex justify-end">
              <button
                type="submit"
                disabled={saving || uploadingLogo}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-text hover:bg-accent-hover transition shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t("settings.save_changes") || "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active ? "bg-accent/10 text-accent border border-accent/20" : "text-secondary hover:bg-app hover:text-primary border border-transparent"}`}
    >
      <Icon size={18} className={active ? "text-accent" : "text-muted"} /> {label}
    </button>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-primary">{title}</h2>
      <p className="text-sm text-secondary mt-1">{desc}</p>
    </div>
  );
}

function FormGroup({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        <Icon size={14} /> {label}
      </label>
      {children}
    </div>
  );
}

function ToggleGroup({
  title,
  desc,
  icon: Icon,
  checked,
  onChange,
  danger,
}: {
  title: string;
  desc: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-app/50">
      <div className="flex gap-3">
        <div
          className={`p-2 rounded-lg mt-0.5 ${danger ? "bg-red-500/10 text-red-500" : "bg-accent/10 text-accent"}`}
        >
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-primary">{title}</p>
          <p className="text-xs text-secondary mt-1 max-w-md">{desc}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? (danger ? "bg-red-500" : "bg-accent") : "bg-border"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}
