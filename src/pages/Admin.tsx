import React, { useState, useMemo, useEffect } from "react";
import { useProgrammeStore } from "../store/programmeStore";
import { useAuthStore } from "../store/authStore";
import { useScheduleStore } from "../store/scheduleStore";
import { Session, ProgrammeItem, ProgrammeItemType, getSessionItems, Speaker } from "../types/programme";
import { getSpeakerPhoto } from "../utils/speakerImages";
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
  Users,
  LogOut,
  Sparkles,
  X,
  FileSpreadsheet,
  CloudUpload,
  BarChart3,
  ShieldCheck,
  Radio,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Calendar,
  Mic,
  UserCheck,
  Sliders,
  MessageSquare
} from "lucide-react";

export const Admin: React.FC = () => {
  const { darkMode, toggleDarkMode } = useScheduleStore();
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
    speakerPhotos = {},
    fetchSpeakerPhotos,
    uploadSpeakerPhoto,
  } = useProgrammeStore();

  // Active navigation tab (Consolidated 4-tab studio)
  const [activeTab, setActiveTab] = useState<"sessions" | "faculty" | "dashboard" | "sync">("sessions");

  // Auth form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [selectedHall, setSelectedHall] = useState<string>("all");
  const [facultyPhotoFilter, setFacultyPhotoFilter] = useState<"all" | "with_photo" | "without_photo">("all");

  // Single-accordion state: opening one session automatically closes others
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionId((prev) => {
      const next = prev === sessionId ? null : sessionId;
      if (next) {
        setTimeout(() => {
          const el = document.getElementById(`session-card-${next}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
      return next;
    });
  };

  const collapseAllSessions = () => setExpandedSessionId(null);

  // Distinct background & border styles per talk type
  const getTalkStyle = (type: string) => {
    switch (type?.toLowerCase()) {
      case "oration":
        return {
          cardBg: "bg-purple-50/90 dark:bg-purple-950/35 border-purple-200/90 dark:border-purple-800/70 hover:border-purple-400 dark:hover:border-purple-600",
          badge: "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border-purple-300/80 dark:border-purple-700",
          pill: "bg-purple-200/80 dark:bg-purple-900/80 text-purple-950 dark:text-purple-200",
        };
      case "panel":
        return {
          cardBg: "bg-amber-50/90 dark:bg-amber-950/35 border-amber-200/90 dark:border-amber-800/70 hover:border-amber-400 dark:hover:border-amber-600",
          badge: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-700",
          pill: "bg-amber-200/80 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200",
        };
      case "workshop":
        return {
          cardBg: "bg-sky-50/90 dark:bg-sky-950/35 border-sky-200/90 dark:border-sky-800/70 hover:border-sky-400 dark:hover:border-sky-600",
          badge: "bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border-sky-300/80 dark:border-sky-700",
          pill: "bg-sky-200/80 dark:bg-sky-900/80 text-sky-950 dark:text-sky-200",
        };
      case "ceremony":
        return {
          cardBg: "bg-rose-50/90 dark:bg-rose-950/35 border-rose-200/90 dark:border-rose-800/70 hover:border-rose-400 dark:hover:border-rose-600",
          badge: "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-700",
          pill: "bg-rose-200/80 dark:bg-rose-900/80 text-rose-950 dark:text-rose-200",
        };
      case "break":
      case "lunch":
      case "dinner":
      case "registration":
        return {
          cardBg: "bg-slate-100/90 dark:bg-slate-800/60 border-slate-300/80 dark:border-slate-700 hover:border-slate-400",
          badge: "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600",
          pill: "bg-slate-300/80 dark:bg-slate-700 text-slate-900 dark:text-slate-200",
        };
      default: // default standard talk
        return {
          cardBg: "bg-teal-50/85 dark:bg-teal-950/30 border-teal-200/90 dark:border-teal-800/70 hover:border-teal-400 dark:hover:border-teal-600",
          badge: "bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border-teal-300/80 dark:border-teal-700",
          pill: "bg-teal-200/80 dark:bg-teal-900/80 text-teal-950 dark:text-teal-200",
        };
    }
  };

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

  // Fetch dynamic R2/D1 photos on auth
  useEffect(() => {
    if (isAuthenticated && fetchSpeakerPhotos) {
      fetchSpeakerPhotos().catch(() => {});
    }
  }, [isAuthenticated, fetchSpeakerPhotos]);

  // Derived statistics
  const speakers = useMemo(() => getSpeakers(), [sessions, getSpeakers]);
  
  const allTalks = useMemo(() => {
    return sessions.flatMap((s) => getSessionItems(s).map((it) => ({ ...it, sessionVenue: s.venue, sessionTitle: s.title })));
  }, [sessions]);

  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalTalks = allTalks.length;
    const totalSpeakers = speakers.length;
    const speakersWithPhotos = speakers.filter((sp) => Boolean(getSpeakerPhoto(sp.name, speakerPhotos))).length;
    const photoCoverage = totalSpeakers > 0 ? Math.round((speakersWithPhotos / totalSpeakers) * 100) : 0;
    return { totalSessions, totalTalks, totalSpeakers, speakersWithPhotos, photoCoverage };
  }, [sessions, allTalks, speakers, speakerPhotos]);

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
      if (uploadSpeakerPhoto) {
        await uploadSpeakerPhoto(selectedSpeakerForUpload.id, previewImageUrl);
      } else {
        const token = localStorage.getItem("isot2026-admin-auth-token");
        await fetch("/api/speaker-images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            speakerId: selectedSpeakerForUpload.id,
            imageUrl: previewImageUrl,
          }),
        });
      }

      showNotification(`Uploaded portrait for ${selectedSpeakerForUpload.name}!`);
      setIsUploadModalOpen(false);
      setSelectedSpeakerForUpload(null);
      setPreviewImageUrl(null);
    } catch {
      showNotification("Upload failed due to a network error.", "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // CSV Export with all Faculty roles
  const handleExportCsv = () => {
    const headers = ["Session ID", "Session Title", "Date", "Day", "Venue", "Start Time", "End Time", "Talk Title", "Type", "Speakers", "Chairpersons", "Moderators", "Panelists", "Case Presenters"];
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
      `"${(t.moderators || (t.moderator ? [t.moderator] : [])).join("; ").replace(/"/g, '""')}"`,
      `"${(t.panelists || []).join("; ").replace(/"/g, '""')}"`,
      `"${(t.casePresenters || []).join("; ").replace(/"/g, '""')}"`,
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 dark:from-teal-900/20 via-slate-50 dark:via-slate-950 to-slate-100 dark:to-slate-950" />
        
        {/* Theme Toggle Button on Login Screen */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 shadow-sm transition-all cursor-pointer"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>

        <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4">
              <ShieldCheck className="w-9 h-9 text-slate-950" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center">ISOT 2026 Studio</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">Conference Management System</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isAuthLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span>{isAuthLoading ? "Authenticating..." : "Sign In to CMS Studio"}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            Cloudflare D1 SQL &amp; Cloudflare R2 Direct Sync
          </div>
        </div>
      </div>
    );
  }

  // Filtered sessions (matching search for session title, venue, or nested talk title & any faculty role)
  const filteredSessions = sessions.filter((session) => {
    if (selectedDay !== "all" && session.dayName !== selectedDay) return false;
    if (selectedHall !== "all" && session.venue !== selectedHall) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSessionTitle = session.title?.toLowerCase().includes(q);
      const matchVenue = session.venue?.toLowerCase().includes(q);
      const items = getSessionItems(session);
      const matchTalkTitle = items.some((it) => it.title?.toLowerCase().includes(q));
      const matchSpeaker = items.some((it) => it.speakers?.some((sp) => sp.toLowerCase().includes(q)));
      const matchChair = items.some((it) => it.chairpersons?.some((ch) => ch.toLowerCase().includes(q)));
      const matchMod = items.some((it) => it.moderators?.some((m) => m.toLowerCase().includes(q)) || it.moderator?.toLowerCase().includes(q));
      const matchPanel = items.some((it) => it.panelists?.some((p) => p.toLowerCase().includes(q)));
      const matchCase = items.some((it) => it.casePresenters?.some((cp) => cp.toLowerCase().includes(q)));
      if (!matchSessionTitle && !matchVenue && !matchTalkTitle && !matchSpeaker && !matchChair && !matchMod && !matchPanel && !matchCase) return false;
    }
    return true;
  });

  // Filtered faculty
  const filteredFaculty = speakers.filter((sp) => {
    const photoUrl = getSpeakerPhoto(sp.name, speakerPhotos);
    const hasPhoto = Boolean(photoUrl);
    if (facultyPhotoFilter === "with_photo" && !hasPhoto) return false;
    if (facultyPhotoFilter === "without_photo" && hasPhoto) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return sp.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors duration-200 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 transition-all max-w-[90vw] md:max-w-md ${
            notification.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-500/50 text-rose-900 dark:text-rose-200"
              : notification.type === "info"
              ? "bg-sky-50 dark:bg-sky-950/90 border-sky-300 dark:border-sky-500/50 text-sky-900 dark:text-sky-200"
              : "bg-teal-50 dark:bg-teal-950/90 border-teal-300 dark:border-teal-500/50 text-teal-900 dark:text-teal-200"
          }`}
        >
          {notification.type === "error" ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          <span className="text-xs sm:text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20 flex-shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">ISOT 2026 Admin</h1>
              <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                Live
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden xs:block">Cloudflare D1 &amp; R2 CMS</p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer flex items-center gap-1.5"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            <span className="hidden sm:inline">{darkMode ? "Light" : "Dark"}</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSyncToDb}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync D1"}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-slate-200 dark:border-slate-700/60 cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Nav (Consolidated 4 Tabs) */}
        <aside className="hidden md:flex w-64 h-full flex-shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 p-4 flex-col justify-between overflow-y-auto">
          <div className="space-y-1.5">
            <button
              onClick={() => setActiveTab("sessions")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "sessions"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4" />
                <span>Sessions &amp; Talks</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "sessions" ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                {stats.totalSessions}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("faculty")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "faculty"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Faculty Portraits</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "faculty" ? "bg-slate-950/20 text-slate-950 font-bold" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                {stats.photoCoverage}%
              </span>
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard Stats</span>
            </button>

            <button
              onClick={() => setActiveTab("sync")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "sync"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Sheets &amp; Cloud D1</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">D1 Database:</span>
              <span className="text-teal-600 dark:text-teal-400 font-mono font-medium">{isDbConnected ? "Connected" : "Online"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">R2 Bucket:</span>
              <span className="text-teal-600 dark:text-teal-400 font-mono font-medium">isot-2026</span>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate pt-1 border-t border-slate-200 dark:border-slate-800">
              Synced: {lastSynced ? new Date(lastSynced).toLocaleTimeString() : "Ready"}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {/* TAB 1: SESSIONS & EMBEDDED TALKS */}
          {activeTab === "sessions" && (
            <div className="space-y-4 sm:space-y-6 max-w-6xl">
              {/* Header with Search and Create Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sessions &amp; Scientific Schedule</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    Click any session to view its talks, speakers, chairpersons, moderators, and panelists.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingSession(null);
                      setIsSessionModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Session</span>
                  </button>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setSelectedDay("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      selectedDay === "all"
                        ? "bg-teal-500 text-slate-950 font-bold shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    All Days ({sessions.length})
                  </button>
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDay(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        selectedDay === d
                          ? "bg-teal-500 text-slate-950 font-bold shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {d} ({sessions.filter((s) => s.dayName === d).length})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedHall}
                    onChange={(e) => setSelectedHall(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="all">All Halls ({venues.length})</option>
                    {venues.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>

                  {expandedSessionId && (
                    <button
                      onClick={collapseAllSessions}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-semibold cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      Collapse
                    </button>
                  )}
                </div>
              </div>

              {/* Search input bar */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search sessions, talks, speakers, chairpersons, moderators, panelists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
                />
              </div>

              {/* Sessions List with Nested Talks (Collapsed by default) */}
              <div className="space-y-4">
                {filteredSessions.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400">
                    No sessions match the selected filters.
                  </div>
                ) : (
                  filteredSessions.map((session) => {
                    const items = getSessionItems(session);
                    const isExpanded = expandedSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        id={`session-card-${session.id}`}
                        className={`rounded-2xl border transition-all duration-200 overflow-hidden scroll-mt-20 ${
                          isExpanded
                            ? "bg-slate-100/80 dark:bg-slate-900/95 border-teal-500/40 dark:border-teal-500/30 shadow-md ring-1 ring-teal-500/20"
                            : "bg-slate-50/90 dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                        }`}
                      >
                        {/* Session Header Card (Clickable to toggle expand) */}
                        <div
                          onClick={() => toggleSessionExpand(session.id)}
                          className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-all ${
                            isExpanded
                              ? "bg-slate-200/60 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800"
                              : "bg-transparent"
                          }`}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                                {session.venue}
                              </span>
                              <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                                {session.startTime} - {session.endTime}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                • {session.dayName}, {session.date}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                {items.length} {items.length === 1 ? "Talk" : "Talks"}
                              </span>
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                              {session.title}
                            </h3>

                            {session.sessionInCharge && session.sessionInCharge.length > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Session In-Charge / Chairpersons:</span>
                                <span className="text-slate-800 dark:text-slate-200 font-medium">{session.sessionInCharge.join(", ")}</span>
                              </p>
                            )}
                          </div>

                          {/* Session Action Controls */}
                          <div className="flex items-center gap-1.5 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setTargetSessionId(session.id);
                                setEditingItem(null);
                                setIsItemModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Talk</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingSession(session);
                                setIsSessionModalOpen(true);
                              }}
                              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
                              title="Edit Session"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Delete session "${session.title}" and its ${items.length} talks?`)) {
                                  deleteSession(session.id);
                                  showNotification("Session deleted.");
                                }
                              }}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                              title="Delete Session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => toggleSessionExpand(session.id)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 ml-1"
                              title={isExpanded ? "Collapse Talks" : "Expand Talks"}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Nested Talks Container with Full Faculty Roles & Distinct Type-Based Backgrounds */}
                        {isExpanded && (
                          <div className="p-3 sm:p-5 space-y-2.5 bg-slate-50/40 dark:bg-slate-900/30">
                            {items.length === 0 ? (
                              <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                                No talks scheduled in this session yet. Click <span className="text-teal-600 dark:text-teal-400 font-semibold cursor-pointer" onClick={() => { setTargetSessionId(session.id); setEditingItem(null); setIsItemModalOpen(true); }}>"+ Add Talk"</span> to add one.
                              </div>
                            ) : (
                              items.map((item, idx) => {
                                const style = getTalkStyle(item.type);
                                const moderators = item.moderators || (item.moderator ? [item.moderator] : []);

                                return (
                                  <div
                                    key={item.id || idx}
                                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-start justify-between gap-3 shadow-xs ${style.cardBg}`}
                                  >
                                    <div className="flex-1 space-y-2">
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${style.pill}`}>
                                          {item.startTime} - {item.endTime}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${style.badge}`}>
                                          {item.type}
                                        </span>
                                      </div>

                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                        {item.title}
                                      </h4>

                                      {/* Faculty Roles Breakdown (Speakers, Chairpersons, Moderators, Panelists, Case Presenters) */}
                                      <div className="space-y-1 pt-1 text-xs">
                                        {/* Speakers */}
                                        {item.speakers && item.speakers.length > 0 && (
                                          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-200">
                                            <span className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-300 min-w-[90px]">
                                              <Mic className="w-3 h-3" />
                                              <span>Speaker(s):</span>
                                            </span>
                                            <span className="font-medium">{item.speakers.join(", ")}</span>
                                          </div>
                                        )}

                                        {/* Chairpersons */}
                                        {item.chairpersons && item.chairpersons.length > 0 && (
                                          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-200">
                                            <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300 min-w-[90px]">
                                              <UserCheck className="w-3 h-3" />
                                              <span>Chairpersons:</span>
                                            </span>
                                            <span className="font-medium">{item.chairpersons.join(", ")}</span>
                                          </div>
                                        )}

                                        {/* Moderators */}
                                        {moderators.length > 0 && (
                                          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-200">
                                            <span className="inline-flex items-center gap-1 font-semibold text-purple-700 dark:text-purple-300 min-w-[90px]">
                                              <Sliders className="w-3 h-3" />
                                              <span>Moderator(s):</span>
                                            </span>
                                            <span className="font-medium">{moderators.join(", ")}</span>
                                          </div>
                                        )}

                                        {/* Panelists */}
                                        {item.panelists && item.panelists.length > 0 && (
                                          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-200">
                                            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 min-w-[90px]">
                                              <Users className="w-3 h-3" />
                                              <span>Panelists:</span>
                                            </span>
                                            <span className="font-medium">{item.panelists.join(", ")}</span>
                                          </div>
                                        )}

                                        {/* Case Presenters */}
                                        {item.casePresenters && item.casePresenters.length > 0 && (
                                          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-200">
                                            <span className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-300 min-w-[90px]">
                                              <MessageSquare className="w-3 h-3" />
                                              <span>Case Presenter:</span>
                                            </span>
                                            <span className="font-medium">{item.casePresenters.join(", ")}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Talk Action Buttons */}
                                    <div className="flex items-center gap-1.5 self-end md:self-center mt-2 md:mt-0">
                                      <button
                                        onClick={() => {
                                          setTargetSessionId(session.id);
                                          setEditingItem({ sessionId: session.id, item });
                                          setIsItemModalOpen(true);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                                        title="Edit Talk"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          if (confirm(`Delete talk "${item.title}"?`)) {
                                            deleteTalk(item.id);
                                            showNotification("Talk removed.");
                                          }
                                        }}
                                        className="p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                                        title="Delete Talk"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FACULTY PORTRAIT STUDIO */}
          {activeTab === "faculty" && (
            <div className="space-y-4 sm:space-y-6 max-w-6xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Faculty Portrait Studio</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Live direct upload to Cloudflare R2 with automatic 500x500 center-cropping</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search faculty..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
                    />
                  </div>
                  <select
                    value={facultyPhotoFilter}
                    onChange={(e) => setFacultyPhotoFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="all">All ({speakers.length})</option>
                    <option value="with_photo">With Photo ({stats.speakersWithPhotos})</option>
                    <option value="without_photo">Missing ({stats.totalSpeakers - stats.speakersWithPhotos})</option>
                  </select>
                </div>
              </div>

              {/* Faculty Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {filteredFaculty.map((sp) => {
                  const photoUrl = getSpeakerPhoto(sp.name, speakerPhotos);
                  const hasPhoto = Boolean(photoUrl);
                  const initial = sp.name.replace(/^dr\.?\s*/i, "").trim().slice(0, 2).toUpperCase() || "SP";
                  const roleSummary = sp.roles && sp.roles.length > 0
                    ? Array.from(new Set(sp.roles.map((r: any) => typeof r === "string" ? r : r.role))).map((r: string) => r.charAt(0).toUpperCase() + r.slice(1)).join(" • ")
                    : "Faculty";

                  return (
                    <div
                      key={sp.id}
                      className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col items-center text-center group relative"
                    >
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 relative mb-2.5 sm:mb-3 flex items-center justify-center shrink-0">
                        {hasPhoto ? (
                          <img
                            src={photoUrl!}
                            alt={sp.name}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-lg sm:text-xl font-bold text-teal-600 dark:text-teal-400">
                            {initial}
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
                          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>{hasPhoto ? "Update" : "Upload"}</span>
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2" title={sp.name}>{sp.name}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-full">{roleSummary}</p>

                      <div className="mt-2.5 sm:mt-3">
                        {hasPhoto ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20">
                            Photo Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            No Photo
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSpeakerForUpload(sp);
                          setPreviewImageUrl(null);
                          setIsUploadModalOpen(true);
                        }}
                        className="mt-2 w-full py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-slate-100 dark:bg-slate-800 rounded-lg md:hidden cursor-pointer"
                      >
                        {hasPhoto ? "Update Photo" : "Upload Photo"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DASHBOARD STATS */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 sm:space-y-8 max-w-6xl">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Conference Analytics</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Live metrics across the scientific programme schedule</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Sessions</span>
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.totalSessions}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">3 Days • 5 Halls</div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Talks</span>
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.totalTalks}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">Scheduled slots</div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Faculty</span>
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.totalSpeakers}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">Speakers roster</div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Photos</span>
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.photoCoverage}%</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">{stats.speakersWithPhotos} / {stats.totalSpeakers} R2 synced</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYNC & GOOGLE SHEETS */}
          {activeTab === "sync" && (
            <div className="space-y-6 sm:space-y-8 max-w-4xl">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Database &amp; Spreadsheet Synchronization</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
                  1-Click push to Cloudflare D1 SQL, Google Sheets CSV exports, and full JSON database backups
                </p>
              </div>

              {/* Cloudflare D1 Status Box */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Cloudflare D1 Production Database</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Database: `isot2026` • Table: `programme_state`</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncToDb}
                    disabled={isSyncing}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? "Pushing Changes..." : "Push State to D1"}</span>
                  </button>
                </div>
              </div>

              {/* Google Sheets / CSV Studio */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Google Sheets &amp; CSV Tools</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Download formatted CSV ready for Google Sheets or Excel import</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2.5 sm:gap-3">
                  <button
                    onClick={handleExportCsv}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Backup JSON</span>
                  </button>
                  <label className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700">
                    <CloudUpload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Import JSON</span>
                    <input type="file" accept=".json" onChange={handleJsonFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-5 sm:p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-300">Reset to Verified Master Schedule</h3>
                    <p className="text-xs text-rose-700 dark:text-rose-400/80">Restores all sessions to verified conference master data</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to reset all programme data to master default?")) {
                        await resetToDefaultProgramme();
                        showNotification("Programme reset to verified master schedule.");
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 dark:border dark:border-rose-500/40 transition-all cursor-pointer text-center"
                  >
                    Reset Programme
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (Consolidated 4 Tabs) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === "sessions" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab("faculty")}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === "faculty" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Faculty</span>
        </button>

        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === "dashboard" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Stats</span>
        </button>

        <button
          onClick={() => setActiveTab("sync")}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all cursor-pointer ${
            activeTab === "sync" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Database className="w-5 h-5" />
          <span className="text-[10px]">Sync</span>
        </button>
      </nav>

      {/* MODAL 1: CREATE / EDIT SESSION */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{editingSession ? "Edit Session" : "Create New Session"}</h3>
              <button onClick={() => setIsSessionModalOpen(false)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer">
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
                const sessionInChargeRaw = (form.elements.namedItem("sessionInCharge") as HTMLInputElement).value;
                const sessionInCharge = sessionInChargeRaw ? sessionInChargeRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];

                if (editingSession) {
                  updateSession(editingSession.id, { title, venue, date, dayName, startTime, endTime, sessionInCharge });
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
                    sessionInCharge,
                    sections: [{ id: `sec-${Date.now()}`, title: "Main Section", items: [] }],
                  });
                  showNotification("New session created!");
                }
                setIsSessionModalOpen(false);
              }}
              className="space-y-3.5 sm:space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Session Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingSession?.title || ""}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Venue / Hall</label>
                  <input
                    type="text"
                    name="venue"
                    required
                    defaultValue={editingSession?.venue || "Hall A"}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Day Name</label>
                  <input
                    type="text"
                    name="dayName"
                    required
                    defaultValue={editingSession?.dayName || "Friday"}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Date</label>
                  <input
                    type="text"
                    name="date"
                    required
                    defaultValue={editingSession?.date || "2026-10-09"}
                    className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start</label>
                  <input
                    type="text"
                    name="startTime"
                    required
                    defaultValue={editingSession?.startTime || "09:00"}
                    className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End</label>
                  <input
                    type="text"
                    name="endTime"
                    required
                    defaultValue={editingSession?.endTime || "10:00"}
                    className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Session In-Charge / Chairpersons (comma-separated)</label>
                <input
                  type="text"
                  name="sessionInCharge"
                  defaultValue={editingSession?.sessionInCharge?.join(", ") || ""}
                  placeholder="e.g. Dr. A. Kumar, Dr. B. Sharma"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT TALK ITEM (With Speakers, Chairpersons, Moderators, Panelists, Case Presenters) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{editingItem ? "Edit Presentation / Talk" : "Add Talk to Session"}</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer">
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
                
                // Parse comma-separated role fields
                const parseList = (fieldName: string) => {
                  const val = (form.elements.namedItem(fieldName) as HTMLInputElement)?.value;
                  return val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [];
                };

                const speakers = parseList("speakers");
                const chairpersons = parseList("chairpersons");
                const moderators = parseList("moderators");
                const panelists = parseList("panelists");
                const casePresenters = parseList("casePresenters");

                if (editingItem) {
                  updateTalk(editingItem.item.id, {
                    title,
                    startTime,
                    endTime,
                    type,
                    speakers,
                    chairpersons,
                    moderators,
                    moderator: moderators[0] || undefined,
                    panelists,
                    casePresenters,
                  });
                  showNotification("Talk updated!");
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
                    chairpersons,
                    moderators,
                    moderator: moderators[0] || undefined,
                    panelists,
                    casePresenters,
                  });
                  showNotification("Talk added to session!");
                }
                setIsItemModalOpen(false);
              }}
              className="space-y-3 sm:space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Talk / Presentation Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingItem?.item.title || ""}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Format Type</label>
                  <select
                    name="type"
                    defaultValue={editingItem?.item.type || "talk"}
                    className="w-full px-2 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm cursor-pointer"
                  >
                    <option value="talk">Talk / Presentation</option>
                    <option value="oration">Oration</option>
                    <option value="panel">Panel Discussion</option>
                    <option value="workshop">Workshop</option>
                    <option value="ceremony">Ceremony / Keynote</option>
                    <option value="break">Break / Lunch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
                  <input
                    type="text"
                    name="startTime"
                    required
                    defaultValue={editingItem?.item.startTime || "09:00"}
                    className="w-full px-2 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                  <input
                    type="text"
                    name="endTime"
                    required
                    defaultValue={editingItem?.item.endTime || "09:15"}
                    className="w-full px-2 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Faculty Roles Inputs */}
              <div className="pt-1 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1 flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Faculty Speakers (comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    name="speakers"
                    defaultValue={editingItem?.item.speakers?.join(", ") || ""}
                    placeholder="e.g. Dr. John Doe, Dr. Jane Smith"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Chairpersons (comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    name="chairpersons"
                    defaultValue={editingItem?.item.chairpersons?.join(", ") || ""}
                    placeholder="e.g. Dr. Rajesh Kumar, Dr. Sarah Lee"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Moderator(s)</span>
                    </label>
                    <input
                      type="text"
                      name="moderators"
                      defaultValue={(editingItem?.item.moderators || (editingItem?.item.moderator ? [editingItem.item.moderator] : []))?.join(", ") || ""}
                      placeholder="e.g. Dr. Amit Sharma"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>Panelists</span>
                    </label>
                    <input
                      type="text"
                      name="panelists"
                      defaultValue={editingItem?.item.panelists?.join(", ") || ""}
                      placeholder="e.g. Dr. V. Rao, Dr. K. Patel"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-sky-700 dark:text-sky-400 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Case Presenter(s)</span>
                  </label>
                  <input
                    type="text"
                    name="casePresenters"
                    defaultValue={editingItem?.item.casePresenters?.join(", ") || ""}
                    placeholder="e.g. Dr. R. Gupta"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Upload Faculty Portrait</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedSpeakerForUpload.name}</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-5 sm:p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950/40">
              {(() => {
                const currentPhoto = getSpeakerPhoto(selectedSpeakerForUpload.name, speakerPhotos);
                const displayPhoto = previewImageUrl || currentPhoto;
                if (displayPhoto) {
                  return (
                    <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-teal-500 shadow-xl mb-3">
                      <img src={displayPhoto} alt="Faculty Portrait" className="w-full h-full object-cover" />
                    </div>
                  );
                }
                return (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                    <Camera className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                );
              })()}

              <label className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm">
                <span>{previewImageUrl ? "Choose Different Image" : "Select Image from Device"}</span>
                <input type="file" accept="image/*" onChange={handlePhotoFileChange} className="hidden" />
              </label>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Auto-cropped to 500x500 square for Cloudflare R2</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!previewImageUrl || isUploadingPhoto}
                onClick={handleUploadCroppedPhoto}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
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
