"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  ShieldCheck,
  Lock,
  Key,
  User,
  Server,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  ChevronRight,
  Bot,
  Sparkles,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  Database,
  Terminal,
  Zap,
  Globe,
  Radio,
  SlidersHorizontal,
  X,
} from "@/lib/admincenter-icons";
import {
  CANONICAL_59_AGENTS,
  AgentCard,
  AgentTier,
  AgentState,
  QuotaDomainId,
} from "@/data/ai-agency-canonical";

interface RuntimeAgent {
  id: string;
  enabled?: boolean | null;
  health_status?: string | null;
  metadata?: { verification_status?: string | null } | null;
  configuration?: { runtime_dispatch_enabled?: boolean | null } | null;
}

interface LiveRuntimeAgent {
  id?: string; role?: string; provider?: string; state?: string;
  taskId?: string; stage?: string; lastAction?: string; nextAction?: string;
}
interface A2AEvent {
  sequence?: number; taskId?: string; stage?: string; ownerAgent?: string; status?: string;
  completedWork?: string; nextStep?: string; createdAt?: string; checkpointId?: string;
}
interface A2AHandoff {
  sequence?: number; taskId?: string; fromAgent?: string; toAgent?: string;
  fromStage?: string; toStage?: string; timestamp?: string; status?: string;
}
interface ProviderAttempt {
  sequence?: number; taskId?: string; provider?: string; role?: string;
  stage?: string; status?: string; timestamp?: string; checkpointId?: string;
}

interface SystemStatus {
  timestamp?: string;
  snapshotStatus?: string | null;
  status?: string | null;
  aiFleet?: {
    totalAgents?: number;
    verifiedAgents?: number;
    activeAgents?: number;
    standbyAgents?: number;
    unverifiedAgents?: number;
  };
  queue?: {
    pendingTasks?: number;
    runningTasks?: number;
    completedTasks?: number;
    failedTasks?: number;
    totalTasks?: number;
    dispatcherStatus?: string | null;
  };
  runtime?: {
    sourceOfTruth?: string | null;
    supervisorState?: string | null;
    providerHealth?: Record<string, unknown> | null;
    backlogTaskStatuses?: Record<string, unknown> | null;
    latestBottleneck?: string | null;
    runtimeDispatchEnabled?: boolean | null;
    runtimeAgents?: LiveRuntimeAgent[];
    a2aTimeline?: A2AEvent[];
    handoffs?: A2AHandoff[];
    providerAttempts?: ProviderAttempt[];
    checkpointHistory?: A2AEvent[];
    currentOwner?: string | null;
    lastAction?: string | null;
    nextAction?: string | null;
    workExecution?: { currentTask?: string; stage?: string; checkpointStatus?: string; lastAction?: string; nextAction?: string } | null;
    nodeMetrics?: { cpu?: number | null; ram?: number | null; disk?: number | null; queue?: number | null } | null;
    telemetryErrors?: string[] | null;
  };
  agents?: RuntimeAgent[];
  topology?: {
    controlPlane?: { node?: string; role?: string; status?: string; storagePolicy?: string };
    authoritativeAnchor?: {
      node?: string | null;
      name?: string | null;
      status?: string | null;
      hostname?: string | null;
      specs?: Record<string, unknown> | string | null;
      storageRoots?: {
        canonicalProjects?: string;
        directivesAndPayloads?: string;
        stagingSpool?: string;
        protectedZone?: string;
      };
    };
  };
  realAuditLogs?: Array<{
    id: string;
    timestamp?: string;
    event?: string;
    actor?: string;
    details?: string;
    level?: string;
  }>;
}

function telemetry(value: unknown): string {
  if (value == null || (typeof value === "string" && !value.trim()) ||
      (typeof value === "object" && Object.keys(value).length === 0)) return "TELEMETRY_PENDING";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}

function TelemetryFields({ fields }: { fields: Record<string, unknown> }) {
  return <dl className="space-y-3 text-xs">
    {Object.entries(fields).map(([label, value]) => (
      <div key={label} className="border-b border-white/5 pb-2">
        <dt className="text-slate-400 mb-1">{label}</dt>
        <dd className="text-slate-200 font-mono whitespace-pre-wrap break-words">{telemetry(value)}</dd>
      </div>
    ))}
  </dl>;
}

export default function AdminCenterPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Login form state
  const [loginUsername, setLoginUsername] = useState<string>("SuperAdmin");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Password change modal state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [passwordChangeError, setPasswordChangeError] = useState<string>("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"agents" | "quotas" | "hierarchy" | "node01" | "audit" | "runtime">("agents");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBU, setSelectedBU] = useState<string>("ALL");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedAgent, setSelectedAgent] = useState<AgentCard | null>(null);
  const [dispatchAgent, setDispatchAgent] = useState<AgentCard | null>(null);
  const [dispatchPrompt, setDispatchPrompt] = useState<string>("");
  const [dispatchMessage, setDispatchMessage] = useState<string>("");

  // System status
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  // Check auth session on load
  const checkSession = async () => {
    try {
      setCheckingAuth(true);
      const res = await fetch("/api/admincenter/auth");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          setMustChangePassword(data.mustChangePassword);
          if (data.mustChangePassword) {
            setShowChangePasswordModal(true);
          }
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch (err) {
      console.error("Session check error:", err);
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch("/api/admincenter/system", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      } else {
        setSystemStatus(null);
      }
    } catch (err) {
      setSystemStatus(null);
      console.error("Fetch status error:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setSystemStatus(null);
      setDispatchAgent(null);
      return;
    }
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 15_000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/admincenter/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setMustChangePassword(data.mustChangePassword);
        if (data.mustChangePassword) {
          setCurrentPassword(loginPassword);
          setShowChangePasswordModal(true);
        }
        setLoginPassword("");
      } else {
        setLoginError(data.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (err: any) {
      setLoginError("Không thể kết nối máy chủ xác thực: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/admincenter/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      setIsAuthenticated(false);
      setMustChangePassword(false);
      setShowChangePasswordModal(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError("");
    setPasswordChangeSuccess("");

    if (newPassword.length < 8) {
      setPasswordChangeError("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch("/api/admincenter/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPasswordChangeSuccess(data.message || "Đổi mật khẩu thành công!");
        setMustChangePassword(false);
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setPasswordChangeSuccess("");
          setNewPassword("");
          setConfirmPassword("");
          setCurrentPassword("");
        }, 1500);
      } else {
        setPasswordChangeError(data.error || "Đổi mật khẩu thất bại.");
      }
    } catch (err: any) {
      setPasswordChangeError("Lỗi hệ thống khi đổi mật khẩu: " + err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDispatchAction = (agent: AgentCard) => {
    const runtimeAgent = systemStatus?.agents?.find((row) => row.id === agent.id);
    if (systemStatus?.runtime?.runtimeDispatchEnabled !== true ||
        runtimeAgent?.enabled !== true || runtimeAgent.health_status !== "healthy" ||
        runtimeAgent.metadata?.verification_status !== "VERIFIED" ||
        runtimeAgent.configuration?.runtime_dispatch_enabled !== true) {
      setDispatchAgent(null);
      setDispatchMessage("Dispatch bị khóa: agent chưa VERIFIED hoặc runtime dispatch chưa bật.");
      return;
    }
    setDispatchAgent(agent);
    setDispatchPrompt("");
    setDispatchMessage("");
  };

  const fleet = systemStatus?.aiFleet;
  const runtime = systemStatus?.runtime;
  const liveRuntimeAgents = runtime?.runtimeAgents ?? [];
  const a2aTimeline = runtime?.a2aTimeline ?? [];
  const handoffs = runtime?.handoffs ?? [];
  const providerAttempts = runtime?.providerAttempts ?? [];
  const anchor = systemStatus?.topology?.authoritativeAnchor;
  const metrics = runtime?.nodeMetrics;
  const metricFields = { "CPU (%)": metrics?.cpu, "RAM (%)": metrics?.ram, "Disk (%)": metrics?.disk, "Queue": metrics?.queue };

  // Filtered Agents
  const filteredAgents = useMemo(() => {
    return CANONICAL_59_AGENTS.filter((agent) => {
      const matchesSearch =
        searchQuery === "" ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.framework.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.businessUnit.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBU = selectedBU === "ALL" || agent.businessUnit.toLowerCase().includes(selectedBU.toLowerCase());
      const matchesTier = selectedTier === "ALL" || agent.tier === selectedTier;
      const matchesState = selectedState === "ALL" || agent.state === selectedState;

      return matchesSearch && matchesBU && matchesTier && matchesState;
    });
  }, [searchQuery, selectedBU, selectedTier, selectedState]);

  // If checking session initially
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse mb-4">
          <Shield className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold tracking-wider text-cyan-400">HUY AI CENTER</h2>
        <p className="text-xs text-slate-400 mt-2 font-mono">Đang xác thực thông tin quyền quản trị SuperAdmin...</p>
      </div>
    );
  }

  // 1. LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0F172A]/90 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
              <Lock className="w-8 h-8" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold tracking-widest uppercase mb-2">
              Bảo Mật Cấp Doanh Nghiệp
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">HUY AI CENTER</h1>
            <p className="text-xs text-slate-400 mt-1">Cổng Quản Trị Hệ Thống AI Agency (AdminCenter)</p>
          </div>

          {loginError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="SuperAdmin"
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Đăng Nhập SuperAdmin</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Điểm neo máy chủ: Dell Precision M4800 (huy-node01)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Chính sách Human Gate R4 / Zero-Backdoor tuân thủ</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD MAIN VIEW
  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 border-b border-white/10 backdrop-blur-md px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">HUY AI CENTER</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest">
                AdminCenter
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Trung Tâm Điều Hành 59 AI Agency Doanh Nghiệp</p>
          </div>
        </div>

        {/* Live Network & Hardware Status */}
        <div className="hidden md:flex items-center gap-4 bg-[#070B14]/80 border border-white/10 rounded-xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="w-2 h-2 rounded-full bg-slate-500 -ml-4" />
            <span className="text-slate-300 font-mono">Node-01: {telemetry(anchor?.status)}</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lenovo: Remote Control Plane</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>/mnt/data2: R4 Protected</span>
          </div>
        </div>

        {/* User profile & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">SuperAdmin</span>
            {mustChangePassword && (
              <span className="w-2 h-2 rounded-full bg-amber-400" title="Cần đổi mật khẩu mặc định" />
            )}
          </div>

          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
            title="Đổi mật khẩu tài khoản"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Đổi Mật Khẩu</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 transition-colors flex items-center gap-1.5"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đăng Xuất</span>
          </button>
        </div>
      </header>

      {/* TOP KPI METRICS STRIP (Sạch 100% dữ liệu test, sẵn sàng đón nhận tải thật) */}
      <section className="px-4 lg:px-8 py-6 border-b border-white/5 bg-[#0A1124]/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Tổng Lực Lượng AI", value: `${telemetry(fleet?.activeAgents)}/${telemetry(fleet?.verifiedAgents)} verified`, detail: `Catalog ${fleet?.totalAgents ?? 59} | ${telemetry(fleet?.unverifiedAgents)} unverified`, icon: Bot },
            { label: "Trạng Thái Tiếp Nhận", value: `${telemetry(fleet?.activeAgents)}/${telemetry(fleet?.verifiedAgents)} verified`, detail: `Standby: ${telemetry(fleet?.standbyAgents)} | ${telemetry(systemStatus?.snapshotStatus || systemStatus?.status)}`, icon: Activity },
            { label: "Node01 authoritative", value: telemetry(anchor?.status), detail: telemetry(anchor?.hostname), icon: Server },
            { label: "Hàng Đợi Nhiệm Vụ", value: telemetry(systemStatus?.queue?.pendingTasks), detail: `Pending | ${telemetry(systemStatus?.queue?.runningTasks)} running | ${telemetry(systemStatus?.queue?.failedTasks)} failed`, icon: Zap },
          ].map(({ label, value, detail, icon: Icon }) => (
            <div key={label} className="bg-[#0F172A]/80 border border-white/10 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-xl font-extrabold text-white break-words">{value}</div>
              <p className="text-[11px] text-slate-400 mt-2">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TABS NAVIGATION */}
      <nav className="px-4 lg:px-8 border-b border-white/10 bg-[#0F172A]/40 flex items-center gap-2 overflow-x-auto py-2">
        <button
          onClick={() => setActiveTab("agents")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "agents"
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Danh Sách 59 AI Agency</span>
        </button>

        <button
          onClick={() => setActiveTab("quotas")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "quotas"
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Quản Lý Quota Đa Nền Tảng</span>
        </button>

        <button
          onClick={() => setActiveTab("hierarchy")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "hierarchy"
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Cây Phân Cấp & Chuỗi Báo Cáo</span>
        </button>

        <button
          onClick={() => setActiveTab("node01")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "node01"
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Cụm Node-01 & Lưu Trữ</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "audit"
              ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Nhật Ký Kiểm Toán Thực Tế</span>
        </button>
        <button onClick={() => setActiveTab("runtime")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === "runtime" ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-slate-300 hover:text-white hover:bg-white/5"}`}>
          <Activity className="w-4 h-4" />Runtime & Watchdog
        </button>
        <button onClick={fetchSystemStatus} disabled={loadingStatus} className="ml-auto px-4 py-2 text-xs text-cyan-300 flex items-center gap-2 shrink-0 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`} />Làm mới
        </button>
      </nav>

      {/* CONTENT AREA */}
      <main className="flex-1 p-4 lg:p-8">
        {dispatchMessage && <p role="status" className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">{dispatchMessage}</p>}
        {activeTab === "runtime" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                ["Catalog Agents", fleet?.totalAgents ?? 59],
                ["Runtime Active Agents", liveRuntimeAgents.filter(agent => agent.state === "RUNNING").length],
                ["Providers", runtime?.providerHealth ? Object.keys(runtime.providerHealth).length : 0],
                ["A2A Flow", a2aTimeline.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-[#0F172A]/80 border border-white/10 rounded-2xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
                  <div className="text-2xl font-black text-cyan-300 mt-1">{telemetry(value)}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#0F172A]/80 border border-cyan-500/20 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">A2A Flow</h2>
                  <p className="text-xs text-slate-400">Logical agents và handoff từ checkpoint thật, không phải catalog.</p>
                </div>
                <span className="text-xs font-mono text-cyan-300">Owner: {telemetry(runtime?.currentOwner)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {["COORDINATOR","PLANNER","TEST_DESIGNER","IMPLEMENTER","REVIEWER","DELIVERY"].map((role, index, roles) => {
                  const agent = liveRuntimeAgents.find(item => item.role === role);
                  return <React.Fragment key={role}>
                    <div className={`px-3 py-2 rounded-xl border text-xs font-bold ${agent?.state === "RUNNING" ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300" : agent?.state === "READY" ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300" : "border-white/10 bg-white/5 text-slate-400"}`}>
                      {role.replaceAll("_"," ")} · {agent?.state ?? "IDLE"}
                    </div>
                    {index < roles.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600" />}
                  </React.Fragment>;
                })}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {a2aTimeline.slice(-8).map((event, index) => (
                  <div key={event.checkpointId ?? index} className="rounded-xl bg-[#070B14] border border-white/10 p-3 text-xs">
                    <div className="flex justify-between gap-2"><b className="text-cyan-300">{telemetry(event.stage)}</b><span className="text-emerald-400">{telemetry(event.status)}</span></div>
                    <div className="text-slate-300 mt-1">{telemetry(event.ownerAgent)} → {telemetry(event.nextStep)}</div>
                    <div className="text-slate-500 mt-1">{telemetry(event.completedWork)}</div>
                  </div>
                ))}
                {a2aTimeline.length === 0 && <p className="text-xs text-slate-400">Chưa có A2A checkpoint telemetry.</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0F172A]/80 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold mb-4">Runtime & Watchdog</h3>
                <TelemetryFields fields={{
                  "Supervisor state": runtime?.supervisorState, "Current task": runtime?.workExecution?.currentTask,
                  "Stage": runtime?.workExecution?.stage, "Checkpoint": runtime?.workExecution?.checkpointStatus,
                  "Last action": runtime?.lastAction, "Next action": runtime?.nextAction,
                  "Handoffs": handoffs, "Provider attempts": providerAttempts,
                  "Latest bottleneck": runtime?.latestBottleneck, "Telemetry errors": runtime?.telemetryErrors,
                }} />
              </div>
              <div className="bg-[#0F172A]/80 border border-white/10 rounded-2xl p-6 space-y-6">
                <h3 className="font-bold">Node metrics</h3>
                <TelemetryFields fields={metricFields} />
                <h3 className="font-bold">Providers</h3>
                {runtime?.providerHealth && Object.keys(runtime.providerHealth).length > 0
                  ? <TelemetryFields fields={runtime.providerHealth} />
                  : <p className="text-xs text-slate-400">Chưa có telemetry</p>}
              </div>
            </div>
          </div>
        )}
        {/* TAB 1: 59 AI AGENTS */}
        {activeTab === "agents" && (
          <div className="space-y-6">
            {/* Search & Filters Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#0F172A]/80 border border-white/10 rounded-2xl p-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm theo ID, tên AI, mô hình, vai trò hoặc đơn vị..."
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* BU Filter */}
                <select
                  value={selectedBU}
                  onChange={(e) => setSelectedBU(e.target.value)}
                  className="bg-[#070B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="ALL">Tất Cả Đơn Vị (6 BUs)</option>
                  <option value="HUY TECHNOLOGY AI">HUY TECHNOLOGY AI</option>
                  <option value="HUY AI SCHOOL">HUY AI SCHOOL</option>
                  <option value="HUY SMART TAX">HUY SMART TAX & ACCOUNTING</option>
                  <option value="HUY CREATIVE LABS">HUY CREATIVE LABS</option>
                  <option value="HUY CYBER DEFENSE">HUY CYBER DEFENSE</option>
                  <option value="HUY EXECUTIVE GOVERNANCE">HUY EXECUTIVE GOVERNANCE</option>
                  <option value="DỰ PHÒNG TOÀN CẦU">DỰ PHÒNG TOÀN CẦU (Reserve)</option>
                </select>

                {/* Tier Filter */}
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="bg-[#070B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="ALL">Tất Cả Cấp Bậc (L0 - L4)</option>
                  <option value="L0">L0 - Human Owner</option>
                  <option value="L1">L1 - Senior Management</option>
                  <option value="L2">L2 - Middle Management</option>
                  <option value="L3">L3 - Workforce Pods</option>
                  <option value="SEC">SEC - Security Red/Blue</option>
                  <option value="HR">HR - AI Recruitment</option>
                  <option value="RESERVE">RESERVE - Dự Phòng Nóng/Nguội</option>
                </select>

                {/* State Filter */}
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-[#070B14] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="ALL">Trạng thái catalog</option>
                  <option value="ACTIVE">ACTIVE (catalog)</option>
                  <option value="STANDBY">STANDBY (catalog)</option>
                  <option value="WARM_STANDBY">WARM_STANDBY (Dự phòng nóng)</option>
                  <option value="COLD_STANDBY">COLD_STANDBY (Dự phòng nguội)</option>
                </select>
              </div>
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Catalog 59 | {telemetry(fleet?.verifiedAgents)} verified | {telemetry(fleet?.activeAgents)} active | {telemetry(fleet?.unverifiedAgents)} unverified</span>
              <span className="text-[11px] text-emerald-400 font-mono">Hiển thị {filteredAgents.length} mục catalog</span>
            </div>

            {/* Agents Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-[#0F172A]/70 hover:bg-[#0F172A] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between group"
                >
                  <div>
                    {/* Header line: ID, Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white/10 text-cyan-300 border border-white/10">
                          {agent.id}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                          {(() => {
                            const row = systemStatus?.agents?.find((item) => item.id === agent.id);
                            return row
                              ? `${telemetry(row.metadata?.verification_status)} / ${telemetry(row.health_status)} / ${typeof row.enabled === "boolean" ? (row.enabled ? "ENABLED" : "DISABLED") : "TELEMETRY_PENDING"}`
                              : "UNVERIFIED / CATALOG";
                          })()}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                        {agent.riskLevel}
                      </span>
                    </div>

                    {/* Agent Name & Role */}
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{agent.role}</p>

                    {/* Tech details (Provider / Model / Framework) */}
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Nhà cung cấp / Model:</span>
                        <span className="font-semibold text-slate-200">
                          {agent.provider} ({agent.model})
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Framework:</span>
                        <span className="font-mono text-cyan-300">{agent.framework}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Đơn vị trực thuộc:</span>
                        <span className="text-slate-300 truncate max-w-[180px]">{agent.businessUnit}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Hạn mức Token:</span>
                        <span className="font-mono text-slate-200">{agent.tokensLimit}</span>
                      </div>
                    </div>

                    {/* Current Task (Clean standby task) */}
                    <div className="mt-3 p-2.5 rounded-xl bg-[#070B14] border border-white/5 text-[11px]">
                      <span className="text-slate-500 font-semibold block mb-0.5">Nhiệm vụ catalog:</span>
                      <span className="text-slate-300 leading-snug">{agent.currentTask}</span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chi tiết</span>
                    </button>

                    <button
                      onClick={() => handleDispatchAction(agent)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black text-[11px] font-bold transition-all flex items-center gap-1.5 border border-cyan-500/30"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Kích Hoạt Tác Vụ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: QUOTA GOVERNANCE */}
        {activeTab === "quotas" && (
          <div className="space-y-6">
            <div className="bg-[#0F172A]/80 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-1">Cơ Cấu Hạn Ngạch Quota 6 Nền Tảng (Multi-Cloud Quota Pools)</h2>
              <p className="text-xs text-slate-400 mb-6">
                Chính sách phân bổ ngân sách mô hình AI cho toàn bộ 59 AI Agency. Dữ liệu đã được làm sạch và chuẩn bị cho tải sản xuất thực tế.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: "anthropic-prod", name: "Anthropic Claude Prod", limit: "10,000,000 Tokens", used: "0", pct: 0, color: "text-amber-400", bar: "bg-amber-400" },
                  { id: "openai-tier4", name: "OpenAI Tier-4 Cluster", limit: "10,000,000 Tokens", used: "0", pct: 0, color: "text-emerald-400", bar: "bg-emerald-400" },
                  { id: "google-vertex", name: "Google Vertex AI Enterprise", limit: "10,000,000 Tokens", used: "0", pct: 0, color: "text-blue-400", bar: "bg-blue-400" },
                  { id: "deepseek-api", name: "DeepSeek API High-Throughput", limit: "10,000,000 Tokens", used: "0", pct: 0, color: "text-cyan-400", bar: "bg-cyan-400" },
                  { id: "groq-ultra", name: "Groq Ultra LPU (500 t/s)", limit: "10,000,000 Tokens", used: "0", pct: 0, color: "text-orange-400", bar: "bg-orange-400" },
                  { id: "local-node01", name: "Dell M4800 Node-01 On-Prem", limit: "Không giới hạn (Local GPU/CPU)", used: "0", pct: 0, color: "text-purple-400", bar: "bg-purple-400" },
                ].map((pool) => (
                  <div key={pool.id} className="bg-[#070B14] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold ${pool.color}`}>{pool.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                        {pool.pct}% Đang dùng
                      </span>
                    </div>

                    <div className="text-2xl font-black text-white font-mono">{pool.used}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Hạn mức: {pool.limit}</div>

                    <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
                      <div className={`h-2 rounded-full ${pool.bar}`} style={{ width: `${pool.pct}%` }} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Cảnh báo ngưỡng: 80%</span>
                      <span className="text-emerald-400 font-semibold">Tình trạng: TỐI ƯU</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HIERARCHY DAG */}
        {activeTab === "hierarchy" && (
          <div className="space-y-6">
            <div className="bg-[#0F172A]/80 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-1">Cây Phân Cấp & Chuỗi Báo Cáo Điều Hành (Canonical Hierarchy)</h2>
              <p className="text-xs text-slate-400 mb-6">
                Mô hình chỉ huy nghiêm ngặt: Root of Trust L0 Owner trực tiếp phê duyệt Human Gate; L1 điều phối; L2 phụ trách Business Units; L3 thực thi.
              </p>

              <div className="space-y-4">
                {/* L0 Level */}
                <div className="border border-cyan-500/40 rounded-2xl bg-cyan-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-sm font-bold text-cyan-300">CẤP L0: HUMAN OWNER (ROOT OF TRUST)</span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">R4 SOVEREIGN</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 pl-6">
                    Quyền tối thượng toàn bộ 6 Business Units, phê duyệt các cổng kiểm tra an toàn (Human Gate), kiểm soát hạ tầng lưu trữ Node-01.
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />
                </div>

                {/* L1 Level */}
                <div className="border border-white/10 rounded-2xl bg-[#070B14] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">CẤP L1: BAN ĐIỀU HÀNH CẤP CAO (SENIOR MANAGEMENT)</span>
                    <span className="text-xs text-slate-400">5 Primary + 5 Standby</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
                    {["L1-P01 Strategy (CSAO)", "L1-P02 Technology (CTO)", "L1-P03 Security (CSO)", "L1-P04 Quota (CRO)", "L1-P05 Compliance (CCO)"].map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-semibold text-slate-200">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />
                </div>

                {/* L2 Level */}
                <div className="border border-white/10 rounded-2xl bg-[#070B14] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">CẤP L2: GIÁM ĐỐC VẬN HÀNH 6 BUSINESS UNITS</span>
                    <span className="text-xs text-slate-400">5 Primary + 5 Standby</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mt-3">
                    {["L2-P01 HuyTech AI Core", "L2-P02 AISchool EdTech", "L2-P03 SmartTax Finance", "L2-P04 Creative Labs", "L2-P05 DevOps & Node-01"].map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-semibold text-slate-200">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-500 rotate-90" />
                </div>

                {/* L3 & Specialized */}
                <div className="border border-white/10 rounded-2xl bg-[#070B14] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">CẤP L3 & ĐỘI NGŨ CHUYÊN BIỆT</span>
                    <span className="text-xs text-slate-400">38 AI Agents</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300">
                      10 L3 Workforce (Coder, Researcher, E2E)
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300">
                      10 Security (5 Red Team + 5 Blue Team)
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-300">
                      5 AI HR & Tuyển Dụng Tự Động
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-purple-300">
                      14 Global Floating Reserve Slots
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NODE-01 CLUSTER */}
        {activeTab === "node01" && (
          <div className="bg-[#0F172A]/80 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Cụm Node-01 & Lưu Trữ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#070B14] border border-emerald-500/30 rounded-2xl p-5">
                <h3 className="text-emerald-400 font-bold mb-4">Node01 authoritative — AUTHORITATIVE ANCHOR</h3>
                <TelemetryFields fields={{
                  "Node": anchor?.node,
                  "Name": anchor?.name,
                  "Status": anchor?.status,
                  "Hostname": anchor?.hostname,
                  "Specs": anchor?.specs,
                  ...metricFields,
                  "Root dự án": anchor?.storageRoots?.canonicalProjects,
                  "Root tài liệu & payloads": anchor?.storageRoots?.directivesAndPayloads,
                  "Staging spool": anchor?.storageRoots?.stagingSpool,
                  "Protected zone": anchor?.storageRoots?.protectedZone,
                }} />
              </div>
              <div className="bg-[#070B14] border border-cyan-500/30 rounded-2xl p-5">
                <h3 className="text-cyan-400 font-bold mb-4">Lenovo remote-control-only</h3>
                <p className="text-xs text-slate-300 mb-4">REMOTE_CONTROL_PLANE_ONLY • ZERO_PERMANENT_STORAGE</p>
                <TelemetryFields fields={{ "Status": systemStatus?.topology?.controlPlane?.status }} />
                <p className="text-xs text-slate-400 mt-4">Kết nối / đồng bộ: Chưa có telemetry</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: REAL AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div className="bg-[#0F172A]/80 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-1">Nhật Ký Kiểm Toán Hệ Thống Thực Tế (System Real Audit Trail)</h2>
              <p className="text-xs text-slate-400 mb-6">
                Dữ liệu audit thực tế từ Supabase.
              </p>

              <div className="space-y-3 font-mono text-xs">
                {!systemStatus?.realAuditLogs?.length && <p className="text-slate-400">Chưa có audit log thực tế từ Supabase.</p>}
                {(systemStatus?.realAuditLogs ?? []).map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-[#070B14] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.level === "SECURITY"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : log.level === "AUTH"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}>
                        {log.event}
                      </span>
                      <span className="text-slate-300 text-xs font-sans">{log.details}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 shrink-0">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString("vi-VN") : "TELEMETRY_PENDING"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CHANGE PASSWORD (FIRST-TIME OR ON-DEMAND) */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            {!mustChangePassword && (
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
                <Key className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {mustChangePassword ? "ĐỔI MẬT KHẨU LẦN ĐẦU TIÊN" : "THAY ĐỔI MẬT KHẨU SUPERADMIN"}
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {mustChangePassword
                  ? "Bạn đang sử dụng mật khẩu khởi tạo mặc định (admin2026). Để bảo vệ 59 AI Agency, vui lòng tự thiết lập mật khẩu cá nhân mới để tiếp tục."
                  : "Thiết lập mật khẩu bảo mật mới cho phiên làm việc của bạn."}
              </p>
            </div>

            {passwordChangeError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passwordChangeError}</span>
              </div>
            )}

            {passwordChangeSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordChangeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={mustChangePassword ? "admin2026" : "Nhập mật khẩu hiện tại..."}
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự..."
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang lưu mật khẩu...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Lưu & Kích Hoạt Mật Khẩu Mới</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AGENT DETAIL MODAL */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAgent(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="px-2.5 py-1 rounded-lg text-sm font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {selectedAgent.id}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-white/5 text-slate-300">
                Tier: {selectedAgent.tier}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-white/5 text-slate-300">
                Risk: {selectedAgent.riskLevel}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white">{selectedAgent.name}</h2>
            <p className="text-xs text-slate-300 mt-1">{selectedAgent.role}</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#070B14] border border-white/5">
                <span className="text-slate-500 block mb-1">Mô hình AI:</span>
                <span className="font-bold text-white">{selectedAgent.model}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#070B14] border border-white/5">
                <span className="text-slate-500 block mb-1">Nhà cung cấp:</span>
                <span className="font-bold text-white">{selectedAgent.provider}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#070B14] border border-white/5">
                <span className="text-slate-500 block mb-1">Framework điều phối:</span>
                <span className="font-bold text-cyan-300 font-mono">{selectedAgent.framework}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#070B14] border border-white/5">
                <span className="text-slate-500 block mb-1">Quota Domain:</span>
                <span className="font-bold text-slate-200">{selectedAgent.quotaDomain}</span>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-[#070B14] border border-white/5 text-xs">
              <span className="text-slate-500 block mb-1 font-semibold">Tác vụ chuẩn bị tiếp nhận:</span>
              <p className="text-slate-200 leading-relaxed">{selectedAgent.currentTask}</p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const a = selectedAgent;
                  setSelectedAgent(null);
                  handleDispatchAction(a);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-black transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Kích hoạt tác vụ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DISPATCH / TASK ACTIVATION MODAL */}
      {dispatchAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F172A] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setDispatchAgent(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">CHUẨN BỊ TÁC VỤ AI</h2>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Xem chỉ thị dự kiến cho Agent <span className="text-cyan-400 font-bold">{dispatchAgent.id}</span> ({dispatchAgent.name}).
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Môi trường thực thi:</label>
                <div className="p-2.5 rounded-xl bg-[#070B14] border border-white/5 text-slate-200 font-mono">
                  {telemetry(anchor?.hostname)} / Dispatch API chưa kích hoạt
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Chỉ thị điều phối (Prompt/Payload):</label>
                <textarea
                  rows={4}
                  value={dispatchPrompt}
                  onChange={(e) => setDispatchPrompt(e.target.value)}
                  placeholder={`Ví dụ: Bắt đầu kiểm tra dữ liệu hoặc khởi chạy chu trình cho ${dispatchAgent.name}...`}
                  className="w-full bg-[#070B14] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchAgent(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Dispatch API chưa kích hoạt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}