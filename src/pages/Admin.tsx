import React, { useState, useMemo, useEffect } from "react";
import { useProgrammeStore, slugify } from "../store/programmeStore";
import { useAuthStore } from "../store/authStore";
import { Session, ProgrammeItem, ProgrammeItemType, getSessionItems, Speaker } from "../types/programme";
import {
  Database,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Edit2,
  Download,
  AlertCircle,
  CheckCircle2,
  Camera,
  Layers,
  Mic,
  Users,
  LogOut,
  Sparkles,
  X,
  FileSpreadsheet,
  CloudUpload,
  BarChart3,
  ShieldCheck,
  Radio
} from "lucide-react";

export const Admin: React.FC = () => {
  const { login, logout, isAuthenticated, isLoading: isAuthLoading, error: authError, clearError } = useAuthStore();
  const {
    sessions,
    updateSession,
    addSession,
    deleteSession,
    updateTalk,
    addTalk,
    deleteTalk,
    importProgrammeJson,
    resetToDefaultProgramme,
    syncWithBackend,
    getSpeakers,
    isSyncing,
    syncError,
    lastSynced,
    isDbConnected,
  } = useProgrammeStore();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "sessions" | "talks" | "faculty" | "sync">("dashboard");

  // Auth form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [selectedHall, setSelectedHall] = useState<string>("all");
  const [facultyPhotoFilter, setFacultyPhotoFilter] = useState<"all" | "with_photo" | "without_photo">("all");

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ sessionId: string; item: ProgrammeItem } | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string>("");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSpeakerForUpload, setSelectedSpeakerForUpload] = useState<Speaker | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoKeys, setPhotoKeys] = useState<Set<string>>(new Set());

  // Check R2 Photo availability
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch("/api/speakers");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const keys = new Set<string>();
            data.forEach((sp: { id?: string; name?: string; imageKey?: string }) => {
              if (sp.id) keys.add(sp.id);
              if (sp.imageKey) keys.add(sp.imageKey);
              if (sp.name) keys.add(slugify(sp.name));
            });
            setPhotoKeys(keys);
          }
        }
      } catch {
        // quiet fallback
      }
    };
    if (isAuthenticated) {
      fetchPhotos();
    }
  }, [isAuthenticated]);

  // Derived statistics
  const speakers = useMemo(() => getSpeakers(), [sessions, getSpeakers]);
  
  const allTalks = useMemo(() => {
    return sessions.flatMap((s) => getSessionItems(s).map((it) => ({ ...it, sessionVenue: s.venue, sessionTitle: s.title })));
  }, [sessions]);

  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalTalks = allTalks.length;
    const totalSpeakers = speakers.length;
    const speakersWithPhotos = speakers.filter((sp) => photoKeys.has(sp.id) || photoKeys.has(slugify(sp.name))).length;
    const photoCoverage = totalSpeakers > 0 ? Math.round((speakersWithPhotos / totalSpeakers) * 100) : 0;
    return { totalSessions, totalTalks, totalSpeakers, speakersWithPhotos, photoCoverage };
  }, [sessions, allTalks, speakers, photoKeys]);

  // Unique venues and days
  const venues = useMemo(() => Array.from(new Set(sessions.map((s) => s.venue).filter(Boolean))), [sessions]);
  const days = useMemo(() => Array.from(new Set(sessions.map((s) => s.dayName).filter(Boolean))), [sessions]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const ok = await login(username, password);
    if (ok) {
      showNotification("Welcome to ISOT 2026 CMS Studio!");
    }
  };

  // Sync handler
  const handleSyncToDb = async () => {
    const success = await syncWithBackend();
    if (success) {
      showNotification("Successfully synced changes to Cloudflare D1 Database!");
    } else {
      showNotification(syncError || "Failed to sync to database.", "error");
    }
  };

  // Photo Crop & Upload to Cloudflare R2
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 500;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
          setPreviewImageUrl(croppedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadCroppedPhoto = async () => {
    if (!selectedSpeakerForUpload || !previewImageUrl) return;
    setIsUploadingPhoto(true);

    try {
      const token = localStorage.getItem("isot2026-admin-auth-token");
      const res = await fetch("/api/upload-speaker-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          speakerId: selectedSpeakerForUpload.id,
          speakerName: selectedSpeakerForUpload.name,
          imageData: previewImageUrl,
        }),
      });

      if (res.ok) {
        showNotification(`Uploaded photo for ${selectedSpeakerForUpload.name} directly to Cloudflare R2!`);
        setPhotoKeys((prev) => new Set([...prev, selectedSpeakerForUpload.id, slugify(selectedSpeakerForUpload.name)]));
        setIsUploadModalOpen(false);
        setSelectedSpeakerForUpload(null);
        setPreviewImageUrl(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification(err.error || "Failed to upload photo to R2.", "error");
      }
    } catch {
      showNotification("Upload failed due to a network error.", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ["Session ID", "Session Title", "Date", "Day", "Venue", "Start Time", "End Time", "Talk Title", "Type", "Speakers", "Chairpersons"];
    const rows = allTalks.map((t) => [
      t.sessionId,
      `"${(t.sessionTitle || "").replace(/"/g, '""')}"`,
      t.date,
      t.dayName,
      `"${(t.venue || "").replace(/"/g, '""')}"`,
      t.startTime,
      t.endTime,
      `"${(t.title || "").replace(/"/g, '""')}"`,
      t.type,
      `"${(t.speakers || []).join("; ").replace(/"/g, '""')}"`,
      `"${(t.chairpersons || []).join("; ").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ISOT_2026_Programme_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Downloaded programme CSV spreadsheet!");
  };

  // JSON Export / Backup
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ISOT_2026_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("Downloaded complete JSON database backup!");
  };

  // JSON Import
  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importProgrammeJson(content);
      if (ok) {
        showNotification("Imported programme database successfully!");
      } else {
        showNotification("Invalid JSON schema. Could not import.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-slate-950" />
        
        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4">
              <ShieldCheck className="w-9 h-9 text-slate-950" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">ISOT 2026 Studio</h1>
            <p className="text-sm text-slate-400 mt-1">Conference Management System</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAuthLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span>{isAuthLoading ? "Authenticating..." : "Sign In to CMS Studio"}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
            Backed by Cloudflare D1 SQL &amp; Cloudflare R2
          </div>
        </div>
      </div>
    );
  }

  // Filtered talks
  const filteredTalks = allTalks.filter((talk) => {
    if (selectedDay !== "all" && talk.dayName !== selectedDay) return false;
    if (selectedHall !== "all" && talk.venue !== selectedHall) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = talk.title?.toLowerCase().includes(q);
      const matchSpeakers = talk.speakers?.some((s) => s.toLowerCase().includes(q));
      const matchSession = talk.sessionTitle?.toLowerCase().includes(q);
      if (!matchTitle && !matchSpeakers && !matchSession) return false;
    }
    return true;
  });

  // Filtered faculty
  const filteredFaculty = speakers.filter((sp) => {
    const hasPhoto = photoKeys.has(sp.id) || photoKeys.has(slugify(sp.name));
    if (facultyPhotoFilter === "with_photo" && !hasPhoto) return false;
    if (facultyPhotoFilter === "without_photo" && hasPhoto) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return sp.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 transition-all ${
            notification.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : notification.type === "info"
              ? "bg-sky-950/90 border-sky-500/50 text-sky-200"
              : "bg-teal-950/90 border-teal-500/50 text-teal-200"
          }`}
        >
          {notification.type === "error" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20">
            <Radio className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">ISOT 2026 Admin CMS</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Live Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">Cloudflare D1 &amp; R2 Direct Sync</p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncToDb}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync to Cloud D1"}</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-slate-700/60 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 p-4 flex flex-col justify-between">
          <div className="space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Studio Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("sessions")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "sessions"
                  ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                <span>Sessions Planner</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "sessions" ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"}`}>
                {stats.totalSessions}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("talks")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "talks"
                  ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4" />
                <span>Talks &amp; Items</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "talks" ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"}`}>
                {stats.totalTalks}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("faculty")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "faculty"
                  ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Faculty Portrait Studio</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "faculty" ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"}`}>
                {stats.photoCoverage}%
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sync")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "sync"
                  ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Sheets &amp; Cloud D1</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">D1 Database:</span>
              <span className="text-teal-400 font-mono font-medium">{isDbConnected ? "Connected" : "Online"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">R2 Storage:</span>
              <span className="text-teal-400 font-mono font-medium">isot-2026</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-800">
              Synced: {lastSynced ? new Date(lastSynced).toLocaleTimeString() : "Ready"}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 max-w-6xl">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Conference Overview</h2>
                <p className="text-slate-400 text-sm mt-1">Live metrics across the scientific programme schedule</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Sessions</span>
                    <Layers className="w-5 h-5 text-teal-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.totalSessions}</div>
                  <div className="text-xs text-slate-500 mt-2">Across 3 Days &amp; 5 Halls</div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Talks &amp; Orations</span>
                    <Mic className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.totalTalks}</div>
                  <div className="text-xs text-slate-500 mt-2">Scheduled time-slots</div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Faculty Members</span>
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.totalSpeakers}</div>
                  <div className="text-xs text-slate-500 mt-2">Distinguished Speakers</div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">R2 Photo Coverage</span>
                    <Camera className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-3xl font-bold text-white">{stats.photoCoverage}%</div>
                  <div className="text-xs text-slate-500 mt-2">{stats.speakersWithPhotos} of {stats.totalSpeakers} uploaded</div>
                </div>
              </div>

              {/* Quick Launchpad */}
              <div className="p-6 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-900/80 to-teal-950/20 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Cloud Database &amp; Portrait Studio</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-xl">
                    Edit sessions, update faculty bio portraits with live Cloudflare R2 auto-cropping, or export/import CSV spreadsheets with 1 click.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab("faculty")}
                    className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-white transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-teal-400" />
                    <span>Upload Portraits</span>
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SESSIONS PLANNER */}
          {activeTab === "sessions" && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Sessions Planner</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Manage scientific blocks, halls, and timings</p>
                </div>
                <button
                  onClick={() => {
                    setEditingSession(null);
                    setIsSessionModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20 transition-all flex items-center gap-2 cursor-pointer self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Session</span>
                </button>
              </div>

              {/* Day filter pills */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedDay("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedDay === "all" ? "bg-teal-500 text-slate-950 font-bold" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All Days ({sessions.length})
                </button>
                {days.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedDay === d ? "bg-teal-500 text-slate-950 font-bold" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {d} ({sessions.filter((s) => s.dayName === d).length})
                  </button>
                ))}
              </div>

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions
                  .filter((s) => selectedDay === "all" || s.dayName === selectedDay)
                  .map((session) => {
                    const items = getSessionItems(session);
                    return (
                      <div key={session.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-teal-400 border border-slate-700">
                                  {session.venue}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  {session.startTime} - {session.endTime}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-white line-clamp-2">{session.title}</h3>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingSession(session);
                                  setIsSessionModalOpen(true);
                                }}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                                title="Edit Session"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete session "${session.title}"?`)) {
                                    deleteSession(session.id);
                                    showNotification("Session deleted.");
                                  }
                                }}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                                title="Delete Session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                            <span>{session.dayName} • {session.date}</span>
                            <span className="font-semibold text-teal-400">{items.length} Items</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setTargetSessionId(session.id);
                              setEditingItem(null);
                              setIsItemModalOpen(true);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-teal-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Talk / Item</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 3: TALKS & ITEMS */}
          {activeTab === "talks" && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Talks &amp; Scientific Items</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Explore, search, and update individual talks and orations</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search talks or speakers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">All Days</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">All Halls / Venues</option>
                  {venues.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Talks List */}
              <div className="space-y-3">
                {filteredTalks.map((talk) => (
                  <div
                    key={talk.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          {talk.type}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {talk.startTime} - {talk.endTime}
                        </span>
                        <span className="text-xs text-slate-500">• {talk.venue || talk.sessionVenue}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{talk.title}</h4>
                      {talk.speakers && talk.speakers.length > 0 && (
                        <p className="text-xs text-slate-400">
                          <span className="text-slate-500">Speakers:</span> {talk.speakers.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => {
                          setTargetSessionId(talk.sessionId);
                          setEditingItem({ sessionId: talk.sessionId, item: talk });
                          setIsItemModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete talk "${talk.title}"?`)) {
                            deleteTalk(talk.id);
                            showNotification("Talk deleted.");
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FACULTY PORTRAIT STUDIO */}
          {activeTab === "faculty" && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Faculty Portrait Studio</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Live direct upload to Cloudflare R2 with automatic 500x500 center-cropping</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search faculty..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <select
                    value={facultyPhotoFilter}
                    onChange={(e) => setFacultyPhotoFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="all">All Faculty ({speakers.length})</option>
                    <option value="with_photo">With Photo ({stats.speakersWithPhotos})</option>
                    <option value="without_photo">Missing Photo ({stats.totalSpeakers - stats.speakersWithPhotos})</option>
                  </select>
                </div>
              </div>

              {/* Faculty Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredFaculty.map((sp) => {
                  const hasPhoto = photoKeys.has(sp.id) || photoKeys.has(slugify(sp.name));
                  const imageUrl = `/api/speaker-image/${sp.id}`;

                  return (
                    <div
                      key={sp.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col items-center text-center group relative"
                    >
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-700 relative mb-3 flex items-center justify-center">
                        {hasPhoto ? (
                          <img
                            src={imageUrl}
                            alt={sp.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-xl font-bold text-teal-400">
                            {sp.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSpeakerForUpload(sp);
                            setPreviewImageUrl(null);
                            setIsUploadModalOpen(true);
                          }}
                          className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-teal-300 text-[10px] font-bold gap-1 cursor-pointer"
                        >
                          <Camera className="w-5 h-5" />
                          <span>Change Photo</span>
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-2">{sp.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1">{sp.roles?.join(" • ") || "Speaker"}</p>

                      <div className="mt-3">
                        {hasPhoto ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            R2 Photo Synced
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Photo Missing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: SYNC & GOOGLE SHEETS */}
          {activeTab === "sync" && (
            <div className="space-y-8 max-w-4xl">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Database &amp; Spreadsheet Synchronization</h2>
                <p className="text-slate-400 text-sm mt-1">
                  1-Click push to Cloudflare D1 SQL, Google Sheets CSV exports, and full JSON database backups
                </p>
              </div>

              {/* Cloudflare D1 Status Box */}
              <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                      <Database className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Cloudflare D1 Production Database</h3>
                      <p className="text-xs text-slate-400">Database: `isot2026` • Table: `programme_state`</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncToDb}
                    disabled={isSyncing}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "Pushing Changes..." : "Push State to D1"}</span>
                  </button>
                </div>
              </div>

              {/* Google Sheets / CSV Studio */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Google Sheets &amp; CSV Tools</h3>
                    <p className="text-xs text-slate-400">Download formatted CSV ready for Google Sheets or Excel import</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={handleExportCsv}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Export Programme CSV</span>
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-indigo-400" />
                    <span>Backup Database (JSON)</span>
                  </button>
                  <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer">
                    <CloudUpload className="w-4 h-4 text-teal-400" />
                    <span>Import JSON Backup</span>
                    <input type="file" accept=".json" onChange={handleJsonFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-rose-300">Reset to Verified Master Programme</h3>
                    <p className="text-xs text-rose-400/80">Restores all sessions to verified conference master data</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to reset all programme data to master default?")) {
                        await resetToDefaultProgramme();
                        showNotification("Programme reset to verified master schedule.");
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all cursor-pointer"
                  >
                    Reset Programme
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: CREATE / EDIT SESSION */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editingSession ? "Edit Session" : "Create New Session"}</h3>
              <button onClick={() => setIsSessionModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const title = (form.elements.namedItem("title") as HTMLInputElement).value;
                const venue = (form.elements.namedItem("venue") as HTMLInputElement).value;
                const date = (form.elements.namedItem("date") as HTMLInputElement).value;
                const dayName = (form.elements.namedItem("dayName") as HTMLInputElement).value;
                const startTime = (form.elements.namedItem("startTime") as HTMLInputElement).value;
                const endTime = (form.elements.namedItem("endTime") as HTMLInputElement).value;

                if (editingSession) {
                  updateSession(editingSession.id, { title, venue, date, dayName, startTime, endTime });
                  showNotification("Session updated!");
                } else {
                  const newId = `session-${Date.now()}`;
                  addSession({
                    id: newId,
                    index: sessions.length + 1,
                    title,
                    venue,
                    date,
                    dayName,
                    dayDisplay: dayName === "Friday" ? "09 October 2026" : dayName === "Saturday" ? "10 October 2026" : "11 October 2026",
                    startTime,
                    endTime,
                    sections: [{ id: `sec-${Date.now()}`, title: "Main Section", items: [] }],
                  });
                  showNotification("New session created!");
                }
                setIsSessionModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Session Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingSession?.title || ""}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Venue / Hall</label>
                  <input
                    type="text"
                    name="venue"
                    required
                    defaultValue={editingSession?.venue || "Hall A"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Day Name</label>
                  <input
                    type="text"
                    name="dayName"
                    required
                    defaultValue={editingSession?.dayName || "Friday"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
                  <input
                    type="text"
                    name="date"
                    required
                    defaultValue={editingSession?.date || "2026-10-09"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Time</label>
                  <input
                    type="text"
                    name="startTime"
                    required
                    defaultValue={editingSession?.startTime || "09:00"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Time</label>
                  <input
                    type="text"
                    name="endTime"
                    required
                    defaultValue={editingSession?.endTime || "10:00"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT TALK ITEM */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editingItem ? "Edit Talk / Item" : "Add Talk to Session"}</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const title = (form.elements.namedItem("title") as HTMLInputElement).value;
                const startTime = (form.elements.namedItem("startTime") as HTMLInputElement).value;
                const endTime = (form.elements.namedItem("endTime") as HTMLInputElement).value;
                const type = (form.elements.namedItem("type") as HTMLSelectElement).value as ProgrammeItemType;
                const speakersRaw = (form.elements.namedItem("speakers") as HTMLInputElement).value;
                const speakers = speakersRaw ? speakersRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

                if (editingItem) {
                  updateTalk(editingItem.item.id, { title, startTime, endTime, type, speakers });
                  showNotification("Item updated!");
                } else if (targetSessionId) {
                  const targetSession = sessions.find((s) => s.id === targetSessionId);
                  const newItemId = `item-${Date.now()}`;
                  addTalk(targetSessionId, {
                    id: newItemId,
                    sessionId: targetSessionId,
                    sessionTitle: targetSession?.title || "",
                    date: targetSession?.date || "2026-10-09",
                    dayName: targetSession?.dayName || "Friday",
                    venue: targetSession?.venue || "Hall A",
                    title,
                    startTime,
                    endTime,
                    type,
                    speakers,
                  });
                  showNotification("Talk added to session!");
                }
                setIsItemModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Talk Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingItem?.item.title || ""}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
                  <select
                    name="type"
                    defaultValue={editingItem?.item.type || "talk"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="talk">Talk</option>
                    <option value="oration">Oration</option>
                    <option value="panel">Panel</option>
                    <option value="workshop">Workshop</option>
                    <option value="ceremony">Ceremony</option>
                    <option value="break">Break</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Time</label>
                  <input
                    type="text"
                    name="startTime"
                    required
                    defaultValue={editingItem?.item.startTime || "09:00"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Time</label>
                  <input
                    type="text"
                    name="endTime"
                    required
                    defaultValue={editingItem?.item.endTime || "09:15"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Speakers (comma-separated)</label>
                <input
                  type="text"
                  name="speakers"
                  defaultValue={editingItem?.item.speakers?.join(", ") || ""}
                  placeholder="e.g. Dr. Jane Doe, Dr. John Smith"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Talk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PORTRAIT UPLOAD & CROP MODAL */}
      {isUploadModalOpen && selectedSpeakerForUpload && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Upload Faculty Portrait</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedSpeakerForUpload.name}</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
              {previewImageUrl ? (
                <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-teal-500 shadow-xl mb-3">
                  <img src={previewImageUrl} alt="Cropped Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <Camera className="w-10 h-10" />
                </div>
              )}

              <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold transition-all cursor-pointer">
                <span>Select Image File</span>
                <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="hidden" />
              </label>
              <p className="text-[11px] text-slate-500 mt-2">Auto-cropped to 500x500 square for Cloudflare R2</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!previewImageUrl || isUploadingPhoto}
                onClick={handleUploadCroppedPhoto}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
              >
                {isUploadingPhoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                <span>{isUploadingPhoto ? "Uploading..." : "Save to Cloud R2"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
