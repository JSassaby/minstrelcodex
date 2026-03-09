import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import BootScreen from '@/components/minstrel-codex/BootScreen';
import Editor from '@/components/minstrel-codex/Editor';
import type { EditorHandle } from '@/components/minstrel-codex/Editor';
import MenuBar, { MENUS, getSubmenuItems } from '@/components/minstrel-codex/MenuBar';
import StatusBar from '@/components/minstrel-codex/StatusBar';
import FileBrowser from '@/components/minstrel-codex/FileBrowser';
import HelpText from '@/components/minstrel-codex/HelpText';
import HelpPanel from '@/components/minstrel-codex/HelpPanel';
import { getHelpPage } from '@/components/minstrel-codex/helpContent';
import LiveStats from '@/components/minstrel-codex/LiveStats';
import GoogleDriveModal from '@/components/minstrel-codex/GoogleDriveModal';
import AppleSignInModal from '@/components/minstrel-codex/AppleSignInModal';
import NovelProjectWizard from '@/components/minstrel-codex/NovelProjectWizard';
// StorageMenu removed — Drive access is now via File menu → Google Drive
import type { NovelProjectConfig, StorageLocation } from '@/components/minstrel-codex/NovelProjectWizard';
import ExportModal from '@/components/minstrel-codex/ExportModal';
import ModalShell, { ModalButton, ModalInput } from '@/components/minstrel-codex/ModalShell';
import SettingsPanel from '@/components/minstrel-codex/SettingsPanel';
import MusicPlayer from '@/components/minstrel-codex/MusicPlayer';
import { t } from '@/lib/languages';
import { typingPassages } from '@/lib/typingPassages';
import { useDocumentStorage } from '@/hooks/useDocumentStorage';
import { useFileStructure } from '@/hooks/useFileStructure';
import { useAppTheme } from '@/hooks/useAppTheme';
import ThemePicker from '@/components/minstrel-codex/ThemePicker';
import { useGoogleToken } from '@/hooks/useGoogleToken';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AuthModal from '@/components/minstrel-codex/AuthModal';
import { useSyncEngine, GoogleDriveAdapter, db, useWriterProfile, useStreakEngine, useSessionTracker, useXPEngine, getLevelForXP, useChronicleEngine } from '@minstrelcodex/core';
import type { SessionXPBreakdown, ChronicleDefinition } from '@minstrelcodex/core';
import ChapterOverviewPanel from '@/components/minstrel-codex/ChapterOverviewPanel';
import NotesPanel from '@/components/minstrel-codex/NotesPanel';
import ManuscriptStatsModal from '@/components/minstrel-codex/ManuscriptStatsModal';
import WifiSetupScreen from '@/components/minstrel-codex/WifiSetupScreen';
import FirstBootWizard from '@/components/minstrel-codex/FirstBootWizard';
import SongComplete from '@/components/minstrel-codex/SongComplete';
import WriterDashboard from '@/components/minstrel-codex/WriterDashboard';
import MilestoneNotifier, { emitMilestones } from '@/components/minstrel-codex/MilestoneNotifier';
import { detectStreakMilestones, detectLevelUp } from '@/components/minstrel-codex/milestoneDetection';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { useAccessibility } from '@/hooks/useAccessibility';
import type { ModalType, Language, Difficulty, PinConfig } from '@minstrelcodex/core';

// ── Reading Guide Component ──────────────────────────────────────────
function ReadingGuide({ opacity }: { opacity: number }) {
  const [y, setY] = useState(0);
  useEffect(() => {
    const handler = (e: MouseEvent) => setY(e.clientY);
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return (
    <div
      id="a11y-reading-guide"
      style={{ top: `${y}px`, opacity }}
    />
  );
}


export default function MinstrelCodex() {
  // Core state
  const [booted, setBooted] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('pw-language') as Language) || 'en-GB';
  });

  // PIN lock state
  const [pinConfig, setPinConfig] = useState<PinConfig>(() => {
    const saved = localStorage.getItem('pw-pin');
    return saved ? JSON.parse(saved) : { enabled: false, pin: '', length: 4 };
  });
  const [locked, setLocked] = useState(() => {
    const saved = localStorage.getItem('pw-pin');
    if (saved) {
      const config = JSON.parse(saved);
      return config.enabled;
    }
    return false;
  });
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [pinStep, setPinStep] = useState<'choose' | 'enter' | 'confirm'>('choose');

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [submenuIndex, setSubmenuIndex] = useState(0);

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalButtonIndex, setModalButtonIndex] = useState(0);

  // File browser state
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [fileBrowserFocused, setFileBrowserFocused] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [musicPlayerOpen, setMusicPlayerOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [activeHelpPageId, setActiveHelpPageId] = useState<string | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Help text
  const [helpVisible, setHelpVisible] = useState(true);

  // Network simulation
  const [wifiOn, setWifiOn] = useState(() => navigator.onLine);
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [networkOverride, setNetworkOverride] = useState<boolean | null>(null);
  const [battery, setBattery] = useState(85);

  // Live stats
  const [liveStatsEnabled, setLiveStatsEnabled] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveChars, setLiveChars] = useState(0);
  const liveStatsRef = useRef({ startTime: 0, chars: 0, lastContent: '' });

  // Save modal
  const [saveFilename, setSaveFilename] = useState('');

  // New folder modal
  const [folderName, setFolderName] = useState('');

  // Move to folder
  const [moveFileName, setMoveFileName] = useState('');
  const [moveFilePath, setMoveFilePath] = useState<string[]>([]);
  const [selectedFolderIdx, setSelectedFolderIdx] = useState(-1);

  // Novel project wizard
  const [novelTitle, setNovelTitle] = useState('');
  const [novelWizardOpen, setNovelWizardOpen] = useState(false);

  // Save version

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // First-boot Pi screens
  const [wifiSetupOpen, setWifiSetupOpen] = useState(false);
  const [firstBootWizardOpen, setFirstBootWizardOpen] = useState(false);

  // Focus / Typewriter mode
  const [focusMode, setFocusMode] = useState(() => localStorage.getItem('mc-focus-mode') === 'true');

  // Writing sprint
  const SPRINT_DURATIONS = [15, 25, 30, 45, 60];
  const [sprintSetupOpen, setSprintSetupOpen] = useState(false);
  const [sprintCompleteOpen, setSprintCompleteOpen] = useState(false);
  const [sprintActive, setSprintActive] = useState(false);
  const [sprintPaused, setSprintPaused] = useState(false);
  const [sprintDuration, setSprintDuration] = useState(25);
  const [sprintTimeLeft, setSprintTimeLeft] = useState(0);
  const sprintStartWordsRef = useRef(0);
  const [sprintResult, setSprintResult] = useState({ wordsWritten: 0, minutes: 25, wpm: 0 });
  const [sprintBest, setSprintBest] = useState<{ words: number; wpm: number }>(() =>
    JSON.parse(localStorage.getItem('mc-sprint-best') || '{"words":0,"wpm":0}')
  );

  // Feature 5 — Chapter Overview
  const [chapterOverviewOpen, setChapterOverviewOpen] = useState(false);
  const [wordCountTarget, setWordCountTarget] = useState(() =>
    parseInt(localStorage.getItem('mc-word-count-target') || '80000', 10)
  );

  // Feature 6 — Notes panel
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);

  // Feature 7 — Manuscript stats
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  // Writing stats tracking
  const sessionStartWordsRef = useRef<number | null>(null);
  const lastTrackedWordsRef = useRef(0);

  // Font family
  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem('minstrel_editor_font') || "Georgia, 'Times New Roman', serif";
  });

  // Typing challenge
  const [typingDifficulty, setTypingDifficulty] = useState<Difficulty>('easy');
  const [typingPhase, setTypingPhase] = useState<'start' | 'game' | 'results'>('start');
  const [typingPassage, setTypingPassage] = useState('');
  const [typingInput, setTypingInput] = useState('');
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);
  const [typingWpm, setTypingWpm] = useState(0);
  const [typingAccuracy, setTypingAccuracy] = useState(100);
  const [typingTime, setTypingTime] = useState('00:00');
  const [typingBest, setTypingBest] = useState(() => {
    return JSON.parse(localStorage.getItem('pw-typing-best') || '{"wpm":0,"accuracy":0}');
  });
  const [typingBtnIdx, setTypingBtnIdx] = useState(0);

  // Hooks
  const docStorage = useDocumentStorage();
  const fileStructure = useFileStructure();
  const theme = useAppTheme();
  const { googleToken, isConnected: googleConnected, clearToken: clearGoogleToken, refreshToken } = useGoogleToken();
  const auth = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const getSupabaseToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);
  const driveAdapter = useMemo(
    () => (googleToken ? new GoogleDriveAdapter(googleToken, 'root', getSupabaseToken) : null),
    [googleToken, getSupabaseToken]
  );
  const { syncStatus, lastSyncTime: syncLastTime, triggerSync } = useSyncEngine(driveAdapter, {
    onTokenExpired: () => { refreshToken(); },
    onRemotePaths: (paths) => { fileStructure.mergeRemotePaths(paths); },
  });
  const editorRef = useRef<EditorHandle>(null);
  const musicPlayer = useMusicPlayer();
  const a11y = useAccessibility();

  // Current project ID (first path segment of open file)
  const currentProjectId = docStorage.currentDocument.filename?.split('/')[0] || '';

  // ── Gamification hooks ────────────────────────────────────────────
  const { profile, loaded: profileLoaded, updateProfile, addXP } = useWriterProfile();
  const { currentStreak, quillsRestActive, checkStreak, recordStreak } = useStreakEngine(profile, updateProfile);
  const { awardSessionXP, currentLevel, currentTitle, xpInLevel, xpNeeded, totalXp, streakMultiplier } = useXPEngine(profile, addXP);
  const { checkChronicles, unlockedChronicleIds, unlockedChronicles, allChronicles } = useChronicleEngine(addXP);
  const [songCompleteVisible, setSongCompleteVisible] = useState(false);
  const [lastXPBreakdown, setLastXPBreakdown] = useState<SessionXPBreakdown | null>(null);
  const [lastSessionWords, setLastSessionWords] = useState(0);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);
  const [lastNewChronicles, setLastNewChronicles] = useState<ChronicleDefinition[]>([]);

  const prevStreakRef = useRef(profile.currentStreak);
  const prevLevelRef = useRef(profile.level);

  const { sessionActive, sessionWords, trackActivity, endSession } = useSessionTracker({
    chronicleId: currentProjectId,
    onSessionComplete: (session) => {
      const prevStreak = prevStreakRef.current;
      const prevLevel = prevLevelRef.current;

      const breakdown = awardSessionXP(session.wordCount, session.durationSeconds);
      recordStreak();

      // Detect milestones after state updates (use setTimeout to let React flush)
      setTimeout(async () => {
        const today = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const newStreak = prevStreak + (profile.lastWritingDate !== today ? 1 : 0);
        const newTotalXp = profile.renown + breakdown.totalXp;

        const milestones = [
          ...detectStreakMilestones(prevStreak, newStreak, newTotalXp),
        ];

        // Level-up detection from XP gain
        const { level: newLevel, title: newTitle } = getLevelForXP(newTotalXp);
        const levelUp = detectLevelUp(prevLevel, newLevel, newTitle, newTotalXp);
        if (levelUp) milestones.push(levelUp);

        prevStreakRef.current = newStreak;
        prevLevelRef.current = newLevel;

        emitMilestones(milestones);

        // ── Chronicle checks ─────────────────────────────────────────
        try {
          const [allStats, sessionCount, charNotes] = await Promise.all([
            db.writingStats.toArray(),
            db.writingSessions.count(),
            db.notes.where('type').equals('character').count(),
          ]);

          const currentMonth = today.slice(0, 7); // YYYY-MM
          const totalWordCount = allStats.reduce((acc, r) => acc + (r.words ?? 0), 0);
          const monthWordCount = allStats
            .filter(r => r.date.startsWith(currentMonth))
            .reduce((acc, r) => acc + (r.words ?? 0), 0);
          const todayWords = allStats.find(r => r.date === today)?.words ?? 0;

          const sessionStartHour = new Date(session.startedAt).getHours();
          const sessionMinutes = session.durationSeconds / 60;

          const ctx = {
            totalWords: totalWordCount,
            todayWords,
            monthWords: monthWordCount,
            sessionWords: session.wordCount,
            sessionMinutes,
            streakDays: newStreak,
            totalSessions: sessionCount,
            totalChapters: 0,
            totalProjects: 0,
            totalNovels: 0,
            sprintWords: 0,
            sprintMinutes: 0,
            versionCheckpoints: parseInt(localStorage.getItem('minstrel_version_checkpoints') ?? '0', 10),
            characterNotes: charNotes,
            wpmRecord: parseFloat(localStorage.getItem('minstrel_wpm_record') ?? '0'),
            sessionHour: sessionStartHour,
            offlineSessions: parseInt(localStorage.getItem('minstrel_offline_sessions') ?? '0', 10),
            unlockedChronicleIds,
          };

          const newlyUnlocked = await checkChronicles(ctx);
          setLastNewChronicles(newlyUnlocked);
        } catch {
          // Non-fatal — chronicles will be checked next session
        }
      }, 300);

      setLastXPBreakdown(breakdown);
      setLastSessionWords(session.wordCount);
      setLastSessionDuration(session.durationSeconds);
      setLastNewChronicles([]);
      setSongCompleteVisible(true);
    },
  });

  // Check streak on load
  useEffect(() => { if (profileLoaded) checkStreak(); }, [profileLoaded]);

   // Storage menu removed
  const [_storageMenuOpen, _setStorageMenuOpen] = useState(false); // kept for compat
  // lastSyncTime is now owned by useSyncEngine (syncLastTime)

  // Content state managed locally for editor
  const [editorContent, setEditorContent] = useState('');
  const editorContentRef = useRef(editorContent);

  // Load saved state on mount
  useEffect(() => {
    const saved = docStorage.loadState();
    if (saved) setEditorContent(saved.content);
  }, []);

  // Auto-save is handled inside useDocumentStorage (10 s stable interval).

  // Trigger immediate sync when Google Drive connects
  const prevGoogleToken = useRef<string | null>(null);
  useEffect(() => {
    if (googleToken && !prevGoogleToken.current) {
      triggerSync();
    }
    prevGoogleToken.current = googleToken;
  }, [googleToken, triggerSync]);

  // Reload editor content when remote pull updates the currently open document
  useEffect(() => {
    const handler = (e: Event) => {
      const { updatedIds } = (e as CustomEvent<{ updatedIds: string[] }>).detail;
      const currentId = docStorage.currentDocument.filename;
      if (currentId && updatedIds.includes(currentId)) {
        docStorage.loadDocument(currentId);
      }
    };
    window.addEventListener('minstrel:remote-pull', handler);
    return () => window.removeEventListener('minstrel:remote-pull', handler);
  }, [docStorage]);

  // Sync WiFi with real navigator.onLine
  useEffect(() => {
    const onOnline = () => { if (networkOverride === null) setWifiOn(true); };
    const onOffline = () => { if (networkOverride === null) setWifiOn(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [networkOverride]);

  // Battery drain
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery(prev => (prev > 15 ? prev - 1 : prev));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Help text fade
  useEffect(() => {
    if (booted && !locked) {
      setHelpVisible(true);
      const timeout = setTimeout(() => setHelpVisible(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [booted, locked]);

  // ── First-boot Pi detection ──────────────────────────────────────
  // Only runs if localhost:3001 is reachable (i.e. we are on the Pi kiosk).
  // On Mac/web the fetch will time out or be refused — both are caught and
  // silently ignored so the wizard never appears on non-Pi devices.
  useEffect(() => {
    if (!booted) return;
    (async () => {
      let isPi = false;
      let data: any = null;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1000); // 1 s — fast fail on non-Pi
        const res = await fetch('http://localhost:3001/status', { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) {
          isPi = true;
          data = await res.json();
        }
      } catch { /* connection refused or timed out — not on Pi */ }

      if (!isPi) {
        // Clear any stale wizard flags that might have been set incorrectly
        localStorage.removeItem('minstrel_wifi_configured');
        localStorage.removeItem('minstrel_novel_created');
        return;
      }

      const wifiConfigured = !!localStorage.getItem('minstrel_wifi_configured');
      const novelCreated   = !!localStorage.getItem('minstrel_novel_created');
      if (!data?.wifi?.connected && !wifiConfigured) {
        setWifiSetupOpen(true);
      } else if (!novelCreated) {
        setFirstBootWizardOpen(true);
      }
    })();
  }, [booted]);

  // Keep editorContentRef in sync (for stable effects)
  useEffect(() => { editorContentRef.current = editorContent; }, [editorContent]);

  // Writing stats: track words written per day in Dexie (every 30s)
  useEffect(() => {
    const countWordsInHtml = (html: string) => {
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return text ? text.split(' ').filter((w: string) => w.length > 0).length : 0;
    };
    const interval = setInterval(async () => {
      const current = countWordsInHtml(editorContentRef.current);
      if (sessionStartWordsRef.current === null) {
        sessionStartWordsRef.current = current;
        lastTrackedWordsRef.current = current;
        return;
      }
      if (current > lastTrackedWordsRef.current) {
        const newWords = current - lastTrackedWordsRef.current;
        lastTrackedWordsRef.current = current;
        const today = new Date().toISOString().split('T')[0];
        const existing = await db.writingStats.get(today);
        db.writingStats.put({ date: today, words: (existing?.words || 0) + newWords }).catch(console.error);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []); // stable — reads from refs

  // Sprint countdown timer
  useEffect(() => {
    if (!sprintActive || sprintPaused) return;
    const interval = setInterval(() => {
      setSprintTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const rawText = editorContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const currentWords = rawText ? rawText.split(' ').filter(w => w.length > 0).length : 0;
          const wordsWritten = Math.max(0, currentWords - sprintStartWordsRef.current);
          const wpm = sprintDuration > 0 ? Math.round(wordsWritten / sprintDuration) : 0;
          const result = { wordsWritten, minutes: sprintDuration, wpm };
          setSprintResult(result);
          if (wordsWritten > sprintBest.words || (wordsWritten === sprintBest.words && wpm > sprintBest.wpm)) {
            const newBest = { words: wordsWritten, wpm };
            setSprintBest(newBest);
            localStorage.setItem('mc-sprint-best', JSON.stringify(newBest));
          }
          setSprintActive(false);
          setSprintCompleteOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sprintActive, sprintPaused, sprintDuration, sprintBest, editorContent]);

  // Live stats ticker
  useEffect(() => {
    if (!liveStatsEnabled) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - liveStatsRef.current.startTime) / 1000 / 60;
      const words = liveStatsRef.current.chars / 5;
      setLiveWpm(elapsed > 0 ? Math.round(words / elapsed) : 0);
      setLiveChars(liveStatsRef.current.chars);
    }, 1000);
    return () => clearInterval(interval);
  }, [liveStatsEnabled]);

  // Typing challenge stats ticker
  useEffect(() => {
    if (typingPhase !== 'game' || !typingStartTime) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - typingStartTime) / 1000 / 60;
      const words = typingInput.length / 5;
      setTypingWpm(elapsed > 0 ? Math.round(words / elapsed) : 0);

      let errors = 0;
      for (let i = 0; i < typingInput.length; i++) {
        if (typingInput[i] !== typingPassage[i]) errors++;
      }
      const acc = typingInput.length > 0
        ? Math.round(((typingInput.length - errors) / typingInput.length) * 100)
        : 100;
      setTypingAccuracy(acc);

      const elapsedSec = Math.floor((Date.now() - typingStartTime) / 1000);
      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      setTypingTime(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    }, 100);
    return () => clearInterval(interval);
  }, [typingPhase, typingStartTime, typingInput, typingPassage]);

  // Editor content change handler
  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
    docStorage.updateContent(content);

    // Feed session tracker
    trackActivity(content);

    if (liveStatsEnabled) {
      const diff = content.length - liveStatsRef.current.lastContent.length;
      if (diff > 0) liveStatsRef.current.chars += diff;
      liveStatsRef.current.lastContent = content;
    }
  }, [docStorage, liveStatsEnabled, trackActivity]);

  // Close modal helper
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalButtonIndex(0);
    setPinError('');
    setTimeout(() => editorRef.current?.focus(), 50);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Toast helper (declared early so voice/tts can use it)
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // Word count target handler
  const handleWordCountTargetChange = useCallback((n: number) => {
    setWordCountTarget(n);
    localStorage.setItem('mc-word-count-target', String(n));
  }, []);

  // currentProjectId is declared above (before gamification hooks)

  // Focus mode toggle
  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => {
      const next = !prev;
      localStorage.setItem('mc-focus-mode', String(next));
      return next;
    });
  }, []);

  // Sprint: live word count delta
  const sprintWordsWritten = (() => {
    if (!sprintActive) return 0;
    const rawText = editorContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const current = rawText ? rawText.split(' ').filter((w: string) => w.length > 0).length : 0;
    return Math.max(0, current - sprintStartWordsRef.current);
  })();

  // ── First-boot wizard completion ──────────────────────────────────
  const handleFirstBootNovel = useCallback((title: string, chapterCount: number) => {
    const words = title.trim().split(/\s+/).filter(w => !['the','a','an','of','and','in','to','for'].includes(w.toLowerCase()));
    const abr = (words.length <= 1
      ? (words[0] ?? title).substring(0, 3)
      : words.map(w => w[0]).join('').substring(0, 4)
    ).toUpperCase();

    fileStructure.createNovelProject({
      title: title.trim(),
      abbreviation: abr,
      chapterCount,
      namingFormat: 'ch-abr',
      includeBible: false,
      includeNotes: true,
      includeResearch: false,
      includeWorldbuilding: false,
      includeFrontMatter: false,
    });

    // Open the first chapter
    const firstChapter = `${title.trim()}/Active/Chapters/Chapter 01 - ${abr}.txt`;
    const content = docStorage.loadDocument(firstChapter);
    if (content !== null) {
      setEditorContent(content);
      editorRef.current?.setContent(content);
    }
    setFileBrowserOpen(true);
    localStorage.setItem('minstrel_novel_created', 'true');
    setFirstBootWizardOpen(false);
    showToast(`"${title.trim()}" is ready — start writing!`);
  }, [fileStructure, docStorage, showToast]);

  // H1 blur rename handler
  const handleH1Blur = useCallback((text: string) => {
    const currentFile = docStorage.currentDocument.filename;
    if (!currentFile) return;
    const parts = currentFile.split('/');
    const basename = parts[parts.length - 1];
    const ext = basename.includes('.') ? basename.slice(basename.lastIndexOf('.')) : '';
    const nameWithoutExt = ext ? basename.slice(0, -ext.length) : basename;
    if (nameWithoutExt === text) return; // no change
    const newBasename = text + ext;
    const newFilename = parts.length > 1
      ? [...parts.slice(0, -1), newBasename].join('/')
      : newBasename;
    fileStructure.renameFile(currentFile, newFilename);
    docStorage.setCurrentDocument(prev => ({ ...prev, filename: newFilename }));
    showToast(`File renamed to "${newBasename}"`);
  }, [docStorage, fileStructure, showToast]);

  // Voice input (Web Speech API)
  const voiceRecognitionRef = useRef<any>(null);
  const voiceListeningRef = useRef(false);
  const [voiceListening, setVoiceListening] = useState(false);

  const toggleVoiceInput = useCallback(() => {
    // Stop if currently listening
    if (voiceListeningRef.current && voiceRecognitionRef.current) {
      voiceListeningRef.current = false;
      voiceRecognitionRef.current.stop();
      setVoiceListening(false);
      showToast('🎤 Voice dictation stopped');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('⚠ Voice input not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (!a11y.settings.voiceInputEnabled) {
      showToast('⚠ Enable Voice Input in Settings → Accessibility first');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language === 'af' ? 'af-ZA' : language === 'en-US' ? 'en-US' : 'en-GB';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((r: any) => r[0].transcript)
        .join('');
      if (transcript && editorRef.current) {
        const current = editorRef.current.getHTML();
        const insertion = current.endsWith('</p>')
          ? current.slice(0, -4) + ' ' + transcript + '</p>'
          : current + '<p>' + transcript + '</p>';
        editorRef.current.setContent(insertion);
        setEditorContent(insertion);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        showToast('⚠ Microphone permission denied. Please allow access.');
        voiceListeningRef.current = false;
        setVoiceListening(false);
      } else if (event.error === 'no-speech') {
        // Normal silence timeout — will auto-restart via onend
      } else {
        showToast(`⚠ Voice error: ${event.error}`);
      }
    };

    // Auto-restart on silence timeout (browser stops after ~5-10s silence)
    recognition.onend = () => {
      if (voiceListeningRef.current) {
        try { recognition.start(); } catch { /* already started */ }
      } else {
        setVoiceListening(false);
      }
    };

    try {
      recognition.start();
      voiceRecognitionRef.current = recognition;
      voiceListeningRef.current = true;
      setVoiceListening(true);
      showToast('🎤 Voice dictation active — speak now');
    } catch (err) {
      showToast('⚠ Could not start voice input');
    }
  }, [language, a11y.settings.voiceInputEnabled, showToast]);

  // Clean up voice recognition on unmount
  useEffect(() => {
    return () => {
      voiceListeningRef.current = false;
      voiceRecognitionRef.current?.stop();
    };
  }, []);

  // Text-to-Speech
  const [ttsActive, setTtsActive] = useState(false);

  const toggleTTS = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setTtsActive(false);
      showToast('🔇 Text-to-speech stopped');
      return;
    }
    if (!a11y.settings.ttsEnabled) {
      showToast('⚠ Enable Text-to-Speech in Settings → Accessibility first');
      return;
    }
    const selection = window.getSelection()?.toString();
    const text = selection || editorRef.current?.getHTML().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
    if (!text) {
      showToast('⚠ No text to read aloud');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = a11y.settings.ttsRate;
    const voices = window.speechSynthesis.getVoices();
    if (voices[a11y.settings.ttsVoiceIdx]) {
      utterance.voice = voices[a11y.settings.ttsVoiceIdx];
    }
    utterance.onend = () => setTtsActive(false);
    utterance.onerror = () => setTtsActive(false);
    window.speechSynthesis.speak(utterance);
    setTtsActive(true);
    showToast('🔊 Reading aloud...');
  }, [a11y.settings.ttsRate, a11y.settings.ttsVoiceIdx, a11y.settings.ttsEnabled, showToast]);

  // Apply base font size as CSS custom property for a11y scaling
  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${theme.fontSize}px`);
  }, [theme.fontSize]);

  // Apply color filter
  useEffect(() => {
    const filter = a11y.settings.colorFilter;
    if (filter === 'none') {
      document.body.style.filter = '';
    } else if (filter === 'grayscale') {
      document.body.style.filter = 'grayscale(100%)';
    } else {
      document.body.style.filter = `url(#a11y-${filter})`;
    }
    return () => { document.body.style.filter = ''; };
  }, [a11y.settings.colorFilter]);

  // Sync fullscreen state with actual fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // (showToast declared earlier, before voice/tts functions)

  // Google Drive sync helper — delegates to useSyncEngine
  const syncToGoogleDrive = useCallback(async () => {
    if (!googleToken) {
      showToast('Connect Google Drive first (STORAGE menu)');
      return;
    }
    showToast('Syncing to Google Drive...');
    triggerSync();
  }, [googleToken, triggerSync, showToast]);

  // Execute menu action
  const executeAction = useCallback((action: string) => {
    
    if (action.startsWith('lang-')) {
      const lang = action.replace('lang-', '') as Language;
      setLanguage(lang);
      localStorage.setItem('pw-language', lang);
      return;
    }

    switch (action) {
      case 'new':
        if (!docStorage.currentDocument.saved) {
          setActiveModal('new');
          setModalButtonIndex(0);
        } else {
          docStorage.createNew();
          setEditorContent('');
          editorRef.current?.setContent('');
        }
        break;
      case 'open': {
        setActiveModal('open');
        setModalButtonIndex(0);
        break;
      }
      case 'recent':
        setActiveModal('recent');
        setModalButtonIndex(0);
        break;
      case 'save':
        if (!docStorage.currentDocument.filename) {
          setSaveFilename('');
          setActiveModal('save');
        } else {
          docStorage.saveDocument(docStorage.currentDocument.filename, editorContent);
          fileStructure.addFileToTree(docStorage.currentDocument.filename);
        }
        break;
      case 'saveas':
        setSaveFilename(docStorage.currentDocument.filename);
        setActiveModal('save');
        break;
      case 'undo':
        document.execCommand('undo');
        break;
      case 'redo':
        document.execCommand('redo');
        break;
      case 'increasetext':
        theme.changeFontSize(2);
        break;
      case 'decreasetext':
        theme.changeFontSize(-2);
        break;
      case 'customizecolors':
        setMusicPlayerOpen(false);
        setSettingsPanelOpen(true);
        break;
      case 'opensettings':
        setMusicPlayerOpen(false);
        setHelpPanelOpen(false);
        setSettingsPanelOpen(true);
        break;
      case 'opendashboard':
        setSettingsPanelOpen(false);
        setHelpPanelOpen(false);
        setDashboardOpen(prev => !prev);
        break;
      case 'openmusic':
        setSettingsPanelOpen(false);
        setHelpPanelOpen(false);
        setMusicPlayerOpen(prev => !prev);
        break;
      case 'openhelp':
        setSettingsPanelOpen(false);
        setMusicPlayerOpen(false);
        setHelpPanelOpen(prev => !prev);
        break;
      case 'togglesidebar':
        setFileBrowserOpen(prev => {
          const next = !prev;
          setFileBrowserFocused(next);
          if (!next) setTimeout(() => editorRef.current?.focus(), 50);
          return next;
        });
        break;
      case 'fullscreen':
        toggleFullscreen();
        break;
      case 'typingchallenge':
        setTypingPhase('start');
        setTypingDifficulty('easy');
        setTypingBtnIdx(0);
        setActiveModal('typing');
        break;
      case 'togglelivestats':
        setLiveStatsEnabled(prev => {
          if (!prev) {
            liveStatsRef.current = { startTime: Date.now(), chars: 0, lastContent: editorContent };
          }
          return !prev;
        });
        break;
      case 'wifi':
        setWifiOn(prev => {
          const next = !prev;
          setNetworkOverride(next);
          return next;
        });
        break;
      case 'bluetooth':
        setBluetoothOn(prev => !prev);
        break;
      case 'networksettings':
        setWifiSetupOpen(true);
        break;
      case 'shutdown':
        location.reload();
        break;
      case 'gdrive':
        setActiveModal('gdrive');
        break;
      case 'open-storage-menu':
        // Legacy — now handled via File → Google Drive
        setActiveModal('gdrive');
        break;
      case 'apple-signin':
        setActiveModal('apple-signin');
        break;
      case 'pinsetup':
        setPinStep('choose');
        setPinInput('');
        setPinConfirm('');
        setPinError('');
        setPinLength(pinConfig.length || 4);
        setActiveModal('pin-setup');
        setModalButtonIndex(0);
        break;
      case 'newnovel':
        setNovelWizardOpen(true);
        break;
      case 'saveversion': {
        const novels = fileStructure.getNovelProjects();
        if (novels.length === 0) {
          showToast('No novel projects found. Create one first via FILE → New Novel Project.');
          break;
        }
        const targetNovel = novels[0];
        const existingVersions = fileStructure.structure.root.children?.[targetNovel]?.children?.['Versions']?.children;
        const versionCount = existingVersions ? Object.keys(existingVersions).length + 1 : 1;
        const now = new Date();
        const dateLabel = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeLabel = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const autoVersionName = `v${versionCount} — ${dateLabel}, ${timeLabel}`;
        fileStructure.saveVersion(targetNovel, autoVersionName);
        showToast(`Version checkpoint saved: ${autoVersionName}`);
        break;
      }
      case 'savesnapshot': {
        if (!docStorage.currentDocument.filename) {
          showToast('No file open to snapshot.');
          break;
        }
        fileStructure.saveSnapshot(docStorage.currentDocument.filename);
        const shortName = docStorage.currentDocument.filename.split('/').pop() || docStorage.currentDocument.filename;
        const now = new Date();
        const dateLabel = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const timeLabel = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        showToast(`Quick snapshot saved — ${dateLabel}, ${timeLabel} · ${shortName}`);
        break;
      }
      case 'print': {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const style = getComputedStyle(document.documentElement);
          printWindow.document.write(`<html><head><title>${docStorage.currentDocument.filename || 'Untitled'}</title>
            <style>body { font-family: 'Courier New', monospace; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 2em; border-bottom: 1px solid #333; padding-bottom: 8px; }
            h2 { font-size: 1.6em; } h3 { font-size: 1.3em; }
            blockquote { border-left: 3px solid #333; padding-left: 1em; opacity: 0.8; }
            @media print { body { padding: 20px; } }</style></head>
            <body>${editorContent}</body></html>`);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
        break;
      }
      case 'export':
        setActiveModal('export');
        break;
    }
  }, [docStorage, editorContent, fileStructure, theme, language, pinConfig, toggleFullscreen]);


  // Central keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (locked) {
        if (e.key >= '0' && e.key <= '9') {
          setPinInput(prev => {
            const next = prev + e.key;
            if (next.length > pinConfig.length) return prev;
            return next;
          });
          e.preventDefault();
        } else if (e.key === 'Backspace') {
          setPinInput(prev => prev.slice(0, -1));
          setPinError('');
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (pinInput === pinConfig.pin) {
            setLocked(false);
            setPinInput('');
            setPinError('');
          } else {
            setPinError(t(language, 'pin.incorrect'));
            setPinInput('');
          }
          e.preventDefault();
        }
        return;
      }

      // PIN setup modal
      if (activeModal === 'pin-setup') {
        if (pinStep === 'choose') {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            setModalButtonIndex(prev => {
              if (e.key === 'ArrowLeft') return prev > 0 ? prev - 1 : 2;
              return prev < 2 ? prev + 1 : 0;
            });
            e.preventDefault();
          } else if (e.key === 'Enter') {
            if (modalButtonIndex === 0) { setPinLength(4); setPinStep('enter'); setPinInput(''); }
            else if (modalButtonIndex === 1) { setPinLength(6); setPinStep('enter'); setPinInput(''); }
            else { closeModal(); }
            e.preventDefault();
          } else if (e.key === 'Escape') { closeModal(); e.preventDefault(); }
        } else if (pinStep === 'enter' || pinStep === 'confirm') {
          if (e.key >= '0' && e.key <= '9') {
            if (pinStep === 'enter') {
              setPinInput(prev => prev.length < pinLength ? prev + e.key : prev);
            } else {
              setPinConfirm(prev => prev.length < pinLength ? prev + e.key : prev);
            }
            e.preventDefault();
          } else if (e.key === 'Backspace') {
            if (pinStep === 'enter') setPinInput(prev => prev.slice(0, -1));
            else setPinConfirm(prev => prev.slice(0, -1));
            setPinError('');
            e.preventDefault();
          } else if (e.key === 'Enter') {
            if (pinStep === 'enter' && pinInput.length === pinLength) {
              setPinStep('confirm');
              setPinConfirm('');
              setPinError('');
            } else if (pinStep === 'confirm' && pinConfirm.length === pinLength) {
              if (pinInput === pinConfirm) {
                const config: PinConfig = { enabled: true, pin: pinInput, length: pinLength };
                setPinConfig(config);
                localStorage.setItem('pw-pin', JSON.stringify(config));
                closeModal();
              } else {
                setPinError(t(language, 'pin.mismatch'));
                setPinConfirm('');
              }
            }
            e.preventDefault();
          } else if (e.key === 'Escape') { closeModal(); e.preventDefault(); }
        }
        return;
      }

      // Voice input shortcuts (always available, even with Settings panel open)
      const isAltSpace = e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar');
      const isLegacyVoiceShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd');

      if (isAltSpace || isLegacyVoiceShortcut) {
        e.preventDefault();
        toggleVoiceInput();
        return;
      }

      // Settings panel has its own keyboard handler
      if (settingsPanelOpen) {
        return;
      }

      // File browser sidebar handles its own keys when focused
      // Don't block other keys when sidebar is open but not focused

      // Modal keys
      if (activeModal) {
        handleModalKeys(e);
        return;
      }

      // Menu keys
      if (menuOpen) {
        handleMenuKeys(e);
        return;
      }

      // Global shortcuts
      if (e.key === 'Escape') {
        setMenuOpen(true);
        setMenuIndex(0);
        setSubmenuOpen(false);
        setHelpVisible(false);
        e.preventDefault();
        return;
      }

      if (e.key === 'F11') {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'Enter' || e.key === '\r')) {
        e.preventDefault();
        editorRef.current?.insertSceneBreak();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        executeAction('togglelivestats');
        return;
      }

      // DEV ONLY — preview gamification UI without completing a session
      // Remove this block before shipping to production
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault();
        setLastSessionWords(247);
        setLastSessionDuration(12 * 60);
        setLastXPBreakdown({ baseXp: 124, sessionBonus: 37, focusMultiplier: 1.0, streakMultiplier: 1.2, streakDayBonus: 0, totalXp: 185 });
        setSongCompleteVisible(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setFileBrowserOpen(prev => {
          const next = !prev;
          setFileBrowserFocused(next);
          if (!next) setTimeout(() => editorRef.current?.focus(), 50);
          return next;
        });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        executeAction('opendashboard');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault();
        executeAction('savesnapshot');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        executeAction('openmusic');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault();
        setChapterOverviewOpen(prev => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        setNotesPanelOpen(prev => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'M')) {
        e.preventDefault();
        setStatsModalOpen(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'W' || e.key === 'w')) {
        e.preventDefault();
        setWifiSetupOpen(true);
        return;
      }

      // TTS readback: Ctrl+Shift+R
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        toggleTTS();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        // Ctrl+B/I/U are reserved for text formatting (TipTap handles them)
        if (e.key === 'b' || e.key === 'i' || e.key === 'u') return;
        if (e.key === 's') { e.preventDefault(); executeAction('save'); }
        else if (e.key === 'n') { e.preventDefault(); executeAction('new'); }
        else if (e.key === 'o') { e.preventDefault(); executeAction('open'); }
        else if (e.key === '=') { e.preventDefault(); executeAction('increasetext'); }
        else if (e.key === '-') { e.preventDefault(); executeAction('decreasetext'); }
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [
    locked, pinInput, pinConfig, pinConfirm, pinLength, pinStep,
    activeModal, modalButtonIndex, menuOpen, menuIndex, submenuOpen, submenuIndex,
    fileBrowserOpen, settingsPanelOpen, language,
    saveFilename, folderName, selectedFolderIdx,
    typingPhase, typingBtnIdx, typingDifficulty,
    typingPhase, typingBtnIdx, typingDifficulty,
    docStorage, fileStructure, theme, editorContent, executeAction, closeModal,
    toggleVoiceInput, toggleTTS, toggleFocusMode,
    chapterOverviewOpen, notesPanelOpen,
  ]);

  // Menu key handler
  const handleMenuKeys = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setMenuOpen(false);
      setSubmenuOpen(false);
      editorRef.current?.focus();
      setHelpVisible(true);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      setSubmenuOpen(false);
      setMenuIndex(prev => (prev - 1 + MENUS.length) % MENUS.length);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      setSubmenuOpen(false);
      setMenuIndex(prev => (prev + 1) % MENUS.length);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (!submenuOpen) {
        setSubmenuOpen(true);
        const items = getSubmenuItems(MENUS[menuIndex], language, wifiOn, bluetoothOn);
        const firstAction = items.findIndex(i => i.action !== 'separator');
        setSubmenuIndex(firstAction >= 0 ? firstAction : 0);
      } else {
        const items = getSubmenuItems(MENUS[menuIndex], language, wifiOn, bluetoothOn);
        setSubmenuIndex(prev => {
          let next = (prev + 1) % items.length;
          while (items[next].action === 'separator') next = (next + 1) % items.length;
          return next;
        });
      }
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (submenuOpen) {
        const items = getSubmenuItems(MENUS[menuIndex], language, wifiOn, bluetoothOn);
        setSubmenuIndex(prev => {
          let next = (prev - 1 + items.length) % items.length;
          while (items[next].action === 'separator') next = (next - 1 + items.length) % items.length;
          return next;
        });
      }
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (submenuOpen) {
        const items = getSubmenuItems(MENUS[menuIndex], language, wifiOn, bluetoothOn);
        if (items[submenuIndex].action !== 'separator') executeAction(items[submenuIndex].action);
        setMenuOpen(false);
        setSubmenuOpen(false);
      } else {
        setSubmenuOpen(true);
        setSubmenuIndex(0);
      }
      e.preventDefault();
    }
  }, [menuIndex, submenuOpen, submenuIndex, language, wifiOn, bluetoothOn, executeAction]);

  // Modal key handler
  const handleModalKeys = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      e.preventDefault();
      return;
    }

    // PageUp/PageDown scrolling is handled natively

    switch (activeModal) {
      case 'save':
        if (e.key === 'Enter') {
          if (saveFilename.trim()) {
            docStorage.saveDocument(saveFilename.trim(), editorContent);
            fileStructure.addFileToTree(saveFilename.trim());
            closeModal();
          }
          e.preventDefault();
        } else if (e.key === 'Tab') {
          setModalButtonIndex(prev => (prev + 1) % 2);
          e.preventDefault();
        }
        break;

      case 'open':
      case 'recent': {
        const docs = activeModal === 'open' ? docStorage.getAllDocuments() : (() => {
          const recent = docStorage.getRecentFiles();
          const all = docStorage.getAllDocuments();
          const result: Record<string, any> = {};
          recent.forEach(f => { if (all[f]) result[f] = all[f]; });
          return result;
        })();
        const filenames = Object.keys(docs);
        if (e.key === 'ArrowDown') {
          setModalButtonIndex(prev => Math.min(prev + 1, filenames.length - 1));
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          setModalButtonIndex(prev => Math.max(prev - 1, 0));
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (filenames[modalButtonIndex]) {
            const content = docStorage.loadDocument(filenames[modalButtonIndex]);
            if (content !== null) { setEditorContent(content); editorRef.current?.setContent(content); }
            closeModal();
          }
          e.preventDefault();
        }
        break;
      }

      case 'new':
        if (e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          setModalButtonIndex(prev => (prev + 1) % 3);
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (modalButtonIndex === 0) { // Save & New
            if (docStorage.currentDocument.filename) {
              docStorage.saveDocument(docStorage.currentDocument.filename, editorContent);
            }
            docStorage.createNew();
            setEditorContent('');
            editorRef.current?.setContent('');
            closeModal();
          } else if (modalButtonIndex === 1) { // Discard
            docStorage.createNew();
            setEditorContent('');
            editorRef.current?.setContent('');
            closeModal();
          } else { // Cancel
            closeModal();
          }
          e.preventDefault();
        }
        break;

      case 'new-folder':
        if (e.key === 'Enter') {
          if (folderName.trim()) {
            fileStructure.createFolder(folderName.trim());
            closeModal();
          }
          e.preventDefault();
        }
        break;

      case 'move-to-folder': {
        const folders = fileStructure.getFolders();
        if (e.key === 'ArrowDown') {
          setSelectedFolderIdx(prev => Math.min(prev + 1, folders.length - 1));
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          setSelectedFolderIdx(prev => Math.max(prev - 1, -1));
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (selectedFolderIdx >= 0 && folders[selectedFolderIdx]) {
            fileStructure.moveFile(moveFileName, moveFilePath, folders[selectedFolderIdx].path);
            closeModal();
          }
          e.preventDefault();
        } else if (e.key === 'Tab') {
          setModalButtonIndex(prev => (prev + 1) % 3);
          e.preventDefault();
        }
        break;
      }

      // colors case removed — handled by SettingsPanel

      case 'typing':
        if (typingPhase === 'start') {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
            const btns = ['easy', 'medium', 'hard', 'start'];
            setTypingBtnIdx(prev => (prev + 1) % btns.length);
            e.preventDefault();
          } else if (e.key === 'Enter') {
            if (typingBtnIdx < 3) {
              setTypingDifficulty(['easy', 'medium', 'hard'][typingBtnIdx] as Difficulty);
            } else {
              // Start
              const passages = typingPassages[typingDifficulty];
              setTypingPassage(passages[Math.floor(Math.random() * passages.length)]);
              setTypingInput('');
              setTypingStartTime(null);
              setTypingWpm(0);
              setTypingAccuracy(100);
              setTypingTime('00:00');
              setTypingPhase('game');
            }
            e.preventDefault();
          }
        } else if (typingPhase === 'results') {
          if (e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            setTypingBtnIdx(prev => (prev + 1) % 2);
            e.preventDefault();
          } else if (e.key === 'Enter') {
            if (typingBtnIdx === 0) {
              setTypingPhase('start');
              setTypingBtnIdx(0);
            } else {
              closeModal();
            }
            e.preventDefault();
          }
        }
        // During game, let typing happen naturally
        break;

      // new-novel is now handled by full-screen wizard, not modal

    }
  }, [
    activeModal, modalButtonIndex, saveFilename, folderName, selectedFolderIdx,
    typingPhase, typingBtnIdx, typingDifficulty,
    moveFileName, moveFilePath, novelTitle,
    docStorage, fileStructure, theme, editorContent, closeModal, showToast,
  ]);

  // Typing input handler
  const handleTypingInput = useCallback((value: string) => {
    if (!typingStartTime && value.length > 0) {
      setTypingStartTime(Date.now());
    }
    setTypingInput(value);

    // Check completion
    if (value.length >= typingPassage.length && value === typingPassage) {
      const elapsed = (Date.now() - (typingStartTime || Date.now())) / 1000 / 60;
      const words = value.length / 5;
      const finalWpm = Math.round(words / elapsed);
      let errors = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== typingPassage[i]) errors++;
      }
      const finalAccuracy = Math.round(((value.length - errors) / value.length) * 100);

      if (finalWpm > typingBest.wpm || (finalWpm === typingBest.wpm && finalAccuracy > typingBest.accuracy)) {
        const newBest = { wpm: finalWpm, accuracy: finalAccuracy };
        setTypingBest(newBest);
        localStorage.setItem('pw-typing-best', JSON.stringify(newBest));
      }

      setTypingWpm(finalWpm);
      setTypingAccuracy(finalAccuracy);
      setTypingPhase('results');
      setTypingBtnIdx(0);
    }
  }, [typingStartTime, typingPassage, typingBest]);

  // ==================== RENDER ====================

  // Auto-select modern theme on first launch (no theme picker screen)
  useEffect(() => {
    if (!theme.themeChosen) {
      theme.switchTheme('modern');
    }
  }, [theme.themeChosen]);

  if (!booted) {
    return <BootScreen language={language} onComplete={() => setBooted(true)} />;
  }

  // PIN lock screen
  if (locked) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--terminal-bg)',
          color: 'var(--terminal-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'var(--font-display)',
          zIndex: 9999,
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '10px', textShadow: '0 0 10px var(--terminal-glow)' }}>
          🔒 {t(language, 'pin.lockTitle')}
        </div>
        <div style={{ fontSize: '16px', opacity: 0.7, marginBottom: '30px' }}>
          {t(language, 'pin.lockDesc')}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {Array.from({ length: pinConfig.length }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '40px',
                height: '50px',
                border: '2px solid var(--terminal-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }}
            >
              {pinInput[i] ? '●' : ''}
            </div>
          ))}
        </div>
        {pinError && (
          <div style={{ color: '#ff5555', marginBottom: '10px', fontSize: '16px' }}>{pinError}</div>
        )}
        <div style={{ fontSize: '14px', opacity: 0.5 }}>Type your PIN and press Enter</div>
      </div>
    );
  }

  // File lists for open/recent modals
  const allDocs = docStorage.getAllDocuments();
  const allFilenames = Object.keys(allDocs);
  const recentFiles = docStorage.getRecentFiles();
  const recentDocs = recentFiles.filter(f => allDocs[f]);
  const folders = fileStructure.getFolders();

  // ── First-boot overlays (render over everything) ─────────────────
  const advanceFromWifi = () => {
    localStorage.setItem('minstrel_wifi_configured', 'true');
    setWifiSetupOpen(false);
    if (!localStorage.getItem('minstrel_novel_created')) setFirstBootWizardOpen(true);
  };

  if (wifiSetupOpen) {
    return (
      <WifiSetupScreen
        onComplete={advanceFromWifi}
        onSkip={advanceFromWifi}
      />
    );
  }

  if (firstBootWizardOpen) {
    return (
      <FirstBootWizard
        onComplete={handleFirstBootNovel}
        onSkip={() => {
          localStorage.setItem('minstrel_novel_created', 'true');
          setFirstBootWizardOpen(false);
        }}
      />
    );
  }

  return (
    <div className="minstrel-ui" style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      {/* Reading guide overlay */}
      {a11y.settings.readingGuide && <ReadingGuide opacity={a11y.settings.readingGuideOpacity} />}

      {/* SVG color blindness filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="a11y-protanopia">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" />
          </filter>
          <filter id="a11y-deuteranopia">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" />
          </filter>
          <filter id="a11y-tritanopia">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" />
          </filter>
        </defs>
      </svg>

      {/* ARIA live region for screen reader announcements */}
      {a11y.settings.screenReaderHints && (
        <div role="status" aria-live="polite" className="sr-only" id="a11y-announcer" />
      )}
      <MenuBar
        language={language}
        visible={menuOpen}
        menuIndex={menuIndex}
        submenuOpen={submenuOpen}
        submenuIndex={submenuIndex}
        wifiOn={wifiOn}
        bluetoothOn={bluetoothOn}
        filename={docStorage.currentDocument.filename}
        onAction={(action) => {
          executeAction(action);
          setMenuOpen(false);
          setSubmenuOpen(false);
        }}
      />

      {/* Storage menu removed — Google Drive accessible via File → Google Drive */}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Settings Sidebar */}
        <SettingsPanel
          visible={settingsPanelOpen}
          language={language}
          colors={theme.colors}
          wifiOn={wifiOn}
          bluetoothOn={bluetoothOn}
          pinConfig={pinConfig}
          themeMode={theme.themeMode}
          a11ySettings={a11y.settings}
          onA11yUpdate={a11y.update}
          onA11yReset={a11y.reset}
          onClose={() => {
            setSettingsPanelOpen(false);
            setTimeout(() => editorRef.current?.focus(), 50);
          }}
          onAction={(action) => executeAction(action)}
          onUpdateColors={(c) => theme.updateColors(c)}
          onResetColors={() => theme.resetColors()}
          onSetLanguage={(lang) => {
            setLanguage(lang);
            localStorage.setItem('pw-language', lang);
          }}
          onOpenPinSetup={() => {
            setSettingsPanelOpen(false);
            executeAction('pinsetup');
          }}
          onOpenTypingChallenge={() => {
            setSettingsPanelOpen(false);
            executeAction('typingchallenge');
          }}
          onConnectGoogle={() => {
            setSettingsPanelOpen(false);
            setActiveModal('gdrive');
          }}
          onConnectApple={() => {
            setSettingsPanelOpen(false);
            executeAction('apple-signin');
          }}
          onSwitchTheme={(mode) => theme.switchTheme(mode)}
          onOpenFirstBootWizard={() => {
            setSettingsPanelOpen(false);
            setFirstBootWizardOpen(true);
          }}
        />

        <ChapterOverviewPanel
          visible={chapterOverviewOpen && !focusMode}
          structure={fileStructure.structure}
          allDocuments={allDocs}
          currentFilename={docStorage.currentDocument.filename}
          wordCountTarget={wordCountTarget}
          onWordCountTargetChange={handleWordCountTargetChange}
          onOpenFile={(filename) => {
            const content = docStorage.loadDocument(filename);
            if (content !== null) { setEditorContent(content); editorRef.current?.setContent(content); }
          }}
          onClose={() => setChapterOverviewOpen(false)}
          getNovelProjects={fileStructure.getNovelProjects}
        />

        <NotesPanel
          visible={notesPanelOpen && !focusMode}
          projectId={currentProjectId}
          onClose={() => setNotesPanelOpen(false)}
        />

        <FileBrowser
          visible={fileBrowserOpen}
          focused={fileBrowserFocused}
          rootNode={fileStructure.structure.root}
          allDocuments={allDocs}
          currentFilename={docStorage.currentDocument.filename}
          currentContent={editorContent}
          onClose={() => {
            setFileBrowserOpen(false);
            setTimeout(() => editorRef.current?.focus(), 50);
          }}
          onOpenFile={(filename) => {
            const content = docStorage.loadDocument(filename);
            if (content !== null) { setEditorContent(content); editorRef.current?.setContent(content); }
          }}
          onNewFile={() => executeAction('new')}
          onCreateFile={(filename, folderPath) => {
            fileStructure.createFileInFolder(filename, folderPath, '');
          }}
          onNewFolder={(name) => fileStructure.createFolder(name)}
          onDeleteFile={(filename) => fileStructure.deleteFile(filename)}
          onDeleteFolder={(folderPath) => fileStructure.deleteFolder(folderPath)}
          onRenameFile={(oldName, newName) => fileStructure.renameFile(oldName, newName)}
          onMoveFile={(filename, fromPath, toPath) => fileStructure.moveFile(filename, fromPath, toPath)}
          onMoveFolder={(folderName, fromPath, toPath) => fileStructure.moveFolder(folderName, fromPath, toPath)}
          onReorderItem={(itemName, parentPath, targetName, position) => fileStructure.reorderItem(itemName, parentPath, targetName, position)}
          onToggleFolder={(path) => fileStructure.toggleFolder(path)}
          onRestoreFromDeleted={(itemName) => fileStructure.restoreFromDeleted(itemName)}
          onPermanentlyDeleteItem={(key) => fileStructure.permanentlyDeleteItem(key)}
          onEmptyDeleted={() => fileStructure.emptyDeleted()}
          onFocus={() => setFileBrowserFocused(true)}
          getFolders={() => fileStructure.getFolders()}
          onSyncGoogleDrive={syncToGoogleDrive}
          onSyncICloud={() => showToast('iCloud sync requires Apple CloudKit — coming soon.')}
        />

        <HelpPanel
          visible={helpPanelOpen}
          onClose={() => {
            setHelpPanelOpen(false);
            setActiveHelpPageId(null);
            setTimeout(() => editorRef.current?.focus(), 50);
          }}
          onOpenPage={(pageId) => setActiveHelpPageId(pageId)}
          activePageId={activeHelpPageId}
        />

        <WriterDashboard
          visible={dashboardOpen}
          profile={profile}
          unlockedChronicles={unlockedChronicles}
          allChronicles={allChronicles}
          onClose={() => {
            setDashboardOpen(false);
            setTimeout(() => editorRef.current?.focus(), 50);
          }}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={() => setFileBrowserFocused(false)}>
          {activeHelpPageId && helpPanelOpen ? (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '40px 60px',
                fontFamily: fontFamily || "'EB Garamond', serif",
                fontSize: `${theme.fontSize}px`,
                color: 'var(--terminal-text)',
                lineHeight: 1.8,
                maxWidth: '800px',
                margin: '0 auto',
                width: '100%',
                userSelect: 'text',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontFamily: "var(--font-ui, 'Space Grotesk', sans-serif)",
                  letterSpacing: '0.1em',
                  opacity: 0.35,
                  marginBottom: '24px',
                  textTransform: 'uppercase',
                }}
              >
                HELP & REFERENCE · READ-ONLY
              </div>
              <div
                className="help-page-content"
                dangerouslySetInnerHTML={{ __html: getHelpPage(activeHelpPageId)?.content || '' }}
              />
            </div>
          ) : (
            <Editor
              content={editorContent}
              onChange={handleEditorChange}
              fontSize={theme.fontSize}
              fontFamily={fontFamily}
              placeholder={t(language, 'placeholder')}
              ref={editorRef}
              readOnly={!!activeModal || menuOpen}
              sidebarOpen={fileBrowserOpen}
              focusMode={focusMode}
              documentTitle={(() => {
                const f = docStorage.currentDocument.filename;
                if (!f) return '';
                const base = f.split('/').pop() || f;
                return base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
              })()}
              onTitleBlur={handleH1Blur}
              onChangeFontSize={(delta) => theme.changeFontSize(delta)}
              onChangeFontFamily={(font) => {
                setFontFamily(font);
                localStorage.setItem('minstrel_editor_font', font);
              }}
              onToggleSidebar={() => executeAction('togglesidebar')}
              onToggleFocusMode={toggleFocusMode}
            />
          )}
        </div>
      </div>

      {!focusMode && (
        <HelpText
          visible={helpVisible}
          lines={[
            t(language, 'help.line1'),
            t(language, 'help.line2'),
            t(language, 'help.line3'),
          ]}
        />
      )}

      {!focusMode && (
        <StatusBar
          language={language}
          filename={docStorage.currentDocument.filename}
          saved={docStorage.currentDocument.saved}
          content={editorContent}
          battery={battery}
          wifiOn={wifiOn}
          musicPlaying={musicPlayer.playing}
          musicTrackName={musicPlayer.tracks.find(t => t.id === musicPlayer.currentTrackId)?.name}
          onMusicClick={() => setMusicPlayerOpen(prev => !prev)}
          voiceListening={voiceListening}
          ttsActive={ttsActive}
          a11yVoiceEnabled={a11y.settings.voiceInputEnabled}
          a11yTtsEnabled={a11y.settings.ttsEnabled}
          a11yHighContrast={a11y.settings.highContrast}
          a11yDyslexiaFont={a11y.settings.dyslexiaFont}
          a11yReducedMotion={a11y.settings.reducedMotion}
          a11yReadingGuide={a11y.settings.readingGuide}
          onVoiceClick={toggleVoiceInput}
          syncStatus={syncStatus}
          lastSyncTime={syncLastTime}
          onSyncClick={triggerSync}
          sprintActive={sprintActive}
          sprintPaused={sprintPaused}
          sprintTimeLeft={sprintTimeLeft}
          sprintWordsWritten={sprintWordsWritten}
          onSprintStart={() => setSprintSetupOpen(true)}
          onSprintTogglePause={() => setSprintPaused(prev => !prev)}
          onStatsClick={() => setStatsModalOpen(true)}
        />
      )}

        {/* Music Player Sidebar */}
        <MusicPlayer
          visible={musicPlayerOpen}
          tracks={musicPlayer.tracks}
          currentTrackId={musicPlayer.currentTrackId}
          playing={musicPlayer.playing}
          volume={musicPlayer.volume}
          loop={musicPlayer.loop}
          onPlay={(id) => musicPlayer.play(id)}
          onTogglePlayPause={musicPlayer.togglePlayPause}
          onSetVolume={musicPlayer.setVolume}
          onSetLoop={musicPlayer.setLoop}
          onAddFile={async (file) => { await musicPlayer.addUserFile(file); }}
          onRemoveTrack={async (id) => { await musicPlayer.removeUserTrack(id); }}
          onClose={() => {
            setMusicPlayerOpen(false);
            setTimeout(() => editorRef.current?.focus(), 50);
          }}
        />

      <LiveStats visible={liveStatsEnabled} wpm={liveWpm} chars={liveChars} />

      {/* Save Modal */}
      <ModalShell visible={activeModal === 'save'} title={t(language, 'modals.saveTitle')} onClose={closeModal}>
        <div style={{ margin: '16px 0' }}>
          <ModalInput
            value={saveFilename}
            onChange={setSaveFilename}
            placeholder={t(language, 'modals.savePrompt')}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <ModalButton label={t(language, 'modals.saveButton')} focused={modalButtonIndex === 0} onClick={() => {
            if (saveFilename.trim()) {
              docStorage.saveDocument(saveFilename.trim(), editorContent);
              fileStructure.addFileToTree(saveFilename.trim());
              closeModal();
            }
          }} />
          <ModalButton label={t(language, 'modals.cancel')} focused={modalButtonIndex === 1} onClick={closeModal} />
        </div>
      </ModalShell>

      {/* Open Modal */}
      <ModalShell visible={activeModal === 'open'} title={t(language, 'modals.openTitle')} onClose={closeModal}>
        <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '16px 0' }}>
          {allFilenames.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>{t(language, 'modals.noFiles')}</div>
          ) : allFilenames.map((name, i) => (
            <div
              key={name}
              onClick={() => {
                const content = docStorage.loadDocument(name);
                if (content !== null) { setEditorContent(content); editorRef.current?.setContent(content); }
                closeModal();
              }}
              style={{
                padding: '12px',
                margin: '4px 0',
                border: '1px solid var(--terminal-text)',
                opacity: i === modalButtonIndex ? 1 : 0.4,
                background: i === modalButtonIndex ? 'var(--terminal-text)' : 'transparent',
                color: i === modalButtonIndex ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{name}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>{new Date(allDocs[name].lastModified).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ModalButton label={t(language, 'modals.cancel')} focused onClick={closeModal} />
        </div>
      </ModalShell>

      {/* Recent Modal */}
      <ModalShell visible={activeModal === 'recent'} title={t(language, 'modals.recentTitle')} onClose={closeModal}>
        <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '16px 0' }}>
          {recentDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>{t(language, 'modals.noRecent')}</div>
          ) : recentDocs.map((name, i) => (
            <div
              key={name}
              onClick={() => {
                const content = docStorage.loadDocument(name);
                if (content !== null) { setEditorContent(content); editorRef.current?.setContent(content); }
                closeModal();
              }}
              style={{
                padding: '12px',
                margin: '4px 0',
                border: '1px solid var(--terminal-text)',
                opacity: i === modalButtonIndex ? 1 : 0.4,
                background: i === modalButtonIndex ? 'var(--terminal-text)' : 'transparent',
                color: i === modalButtonIndex ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>{name}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>{new Date(allDocs[name].lastModified).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ModalButton label={t(language, 'modals.cancel')} focused onClick={closeModal} />
        </div>
      </ModalShell>

      {/* New Document Modal */}
      <ModalShell visible={activeModal === 'new'} title={t(language, 'modals.newTitle')} onClose={closeModal}>
        <div style={{ margin: '16px 0' }}>
          <p style={{ marginBottom: '16px' }}>{t(language, 'modals.newMessage1')}</p>
          <p>{t(language, 'modals.newMessage2')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <ModalButton label={t(language, 'modals.saveAndNew')} focused={modalButtonIndex === 0} onClick={() => {
            if (docStorage.currentDocument.filename) {
              docStorage.saveDocument(docStorage.currentDocument.filename, editorContent);
            }
            docStorage.createNew();
            setEditorContent('');
            closeModal();
          }} />
          <ModalButton label={t(language, 'modals.discard')} focused={modalButtonIndex === 1} onClick={() => {
            docStorage.createNew();
            setEditorContent('');
            closeModal();
          }} />
          <ModalButton label={t(language, 'modals.cancel')} focused={modalButtonIndex === 2} onClick={closeModal} />
        </div>
      </ModalShell>

      {/* New Folder Modal */}
      <ModalShell visible={activeModal === 'new-folder'} title="CREATE NEW FOLDER" onClose={closeModal}>
        <div style={{ margin: '16px 0' }}>
          <p style={{ marginBottom: '16px' }}>Enter folder name:</p>
          <ModalInput value={folderName} onChange={setFolderName} placeholder="Folder name..." autoFocus />
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <ModalButton label="CREATE" focused={modalButtonIndex === 0} onClick={() => {
            if (folderName.trim()) {
              fileStructure.createFolder(folderName.trim());
              closeModal();
            }
          }} />
          <ModalButton label={t(language, 'modals.cancel')} focused={modalButtonIndex === 1} onClick={closeModal} />
        </div>
      </ModalShell>

      {/* Move to Folder Modal */}
      <ModalShell visible={activeModal === 'move-to-folder'} title="MOVE FILE TO FOLDER" onClose={closeModal}>
        <div style={{ margin: '16px 0' }}>
          <p style={{ marginBottom: '16px' }}>Moving: <strong>{moveFileName}</strong></p>
          <p style={{ marginBottom: '8px' }}>Select destination folder:</p>
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--terminal-text)', padding: '8px' }}>
            {folders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px', opacity: 0.5 }}>No folders. Create one first.</div>
            ) : folders.map((f, i) => (
              <div
                key={f.path.join('/')}
                onClick={() => setSelectedFolderIdx(i)}
                style={{
                  padding: '8px',
                  border: '1px solid var(--terminal-text)',
                  margin: '4px 0',
                  cursor: 'pointer',
                  opacity: i === selectedFolderIdx ? 1 : 0.6,
                  background: i === selectedFolderIdx ? 'var(--terminal-text)' : 'transparent',
                  color: i === selectedFolderIdx ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                }}
              >
                📁 {f.name}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <ModalButton label="MOVE" focused={modalButtonIndex === 0} onClick={() => {
            if (selectedFolderIdx >= 0 && folders[selectedFolderIdx]) {
              fileStructure.moveFile(moveFileName, moveFilePath, folders[selectedFolderIdx].path);
              closeModal();
            }
          }} />
          <ModalButton label="MOVE TO ROOT" focused={modalButtonIndex === 1} onClick={() => {
            fileStructure.moveFile(moveFileName, moveFilePath, []);
            closeModal();
          }} />
          <ModalButton label={t(language, 'modals.cancel')} focused={modalButtonIndex === 2} onClick={closeModal} />
        </div>
      </ModalShell>


      {/* Typing Challenge Modal */}
      <ModalShell visible={activeModal === 'typing'} title="TYPING CHALLENGE" onClose={closeModal}>
        {typingPhase === 'start' && (
          <div style={{ margin: '16px 0' }}>
            <p style={{ marginBottom: '20px', textAlign: 'center' }}>Test your typing speed and accuracy!</p>
            <div style={{ margin: '20px 0', textAlign: 'center' }}>
              <div style={{ marginBottom: '10px' }}>SELECT DIFFICULTY:</div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d, i) => (
                  <ModalButton
                    key={d}
                    label={d.toUpperCase()}
                    focused={typingBtnIdx === i}
                    selected={typingDifficulty === d}
                    onClick={() => setTypingDifficulty(d)}
                  />
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ModalButton label="START CHALLENGE" focused={typingBtnIdx === 3} onClick={() => {
                const passages = typingPassages[typingDifficulty];
                setTypingPassage(passages[Math.floor(Math.random() * passages.length)]);
                setTypingInput('');
                setTypingStartTime(null);
                setTypingWpm(0);
                setTypingAccuracy(100);
                setTypingTime('00:00');
                setTypingPhase('game');
              }} />
            </div>
          </div>
        )}

        {typingPhase === 'game' && (
          <div style={{ margin: '16px 0' }}>
            <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--terminal-text)', background: 'rgba(0,0,0,0.2)', whiteSpace: 'pre-wrap', fontFamily: "'Courier Prime', monospace", lineHeight: 1.8 }}>
              {typingPassage}
            </div>
            <textarea
              value={typingInput}
              onChange={e => handleTypingInput(e.target.value)}
              autoFocus
              placeholder="Start typing here..."
              style={{
                width: '100%', height: '100px', background: 'var(--terminal-bg)',
                border: '2px solid var(--terminal-text)', color: 'var(--terminal-text)',
                padding: '12px', fontFamily: "'Courier Prime', monospace", fontSize: '16px',
                resize: 'none', outline: 'none',
              }}
            />
            <div style={{ margin: '20px 0' }}>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>PROGRESS</div>
              <div style={{ border: '1px solid var(--terminal-text)', height: '24px', position: 'relative' }}>
                <div style={{ background: 'var(--terminal-text)', height: '100%', width: `${Math.min((typingInput.length / typingPassage.length) * 100, 100)}%`, transition: 'width 0.1s' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ border: '1px solid var(--terminal-text)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>SPEED</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{typingWpm} WPM</div>
              </div>
              <div style={{ border: '1px solid var(--terminal-text)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>ACCURACY</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{typingAccuracy}%</div>
              </div>
              <div style={{ border: '1px solid var(--terminal-text)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>TIME</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{typingTime}</div>
              </div>
            </div>
          </div>
        )}

        {typingPhase === 'results' && (
          <div style={{ margin: '16px 0' }}>
            <div style={{ fontSize: '24px', marginBottom: '24px', textAlign: 'center' }}>CHALLENGE COMPLETE!</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
              <div style={{ border: '2px solid var(--terminal-text)', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>FINAL SPEED</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{typingWpm} WPM</div>
              </div>
              <div style={{ border: '2px solid var(--terminal-text)', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>ACCURACY</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{typingAccuracy}%</div>
              </div>
            </div>
            <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--terminal-text)', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>YOUR BEST</div>
              <div>{typingBest.wpm} WPM • {typingBest.accuracy}% Accuracy</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <ModalButton label="TRY AGAIN" focused={typingBtnIdx === 0} onClick={() => {
                setTypingPhase('start');
                setTypingBtnIdx(0);
              }} />
              <ModalButton label="CLOSE" focused={typingBtnIdx === 1} onClick={closeModal} />
            </div>
          </div>
        )}
      </ModalShell>

      {/* Google Drive Modal */}
      <GoogleDriveModal
        visible={activeModal === 'gdrive'}
        onClose={closeModal}
        onLoadContent={(content, filename) => {
          setEditorContent(content);
          editorRef.current?.setContent(content);
          docStorage.setCurrentDocument({
            filename,
            content,
            saved: true,
            lastModified: new Date().toISOString(),
          });
        }}
        currentContent={editorContent}
        currentFilename={docStorage.currentDocument.filename}
        localFolders={fileStructure.getFolders()}
        onSyncFolder={async (folderPath, _driveFolderId, driveFolderName) => {
          if (!googleToken) {
            showToast('Connect Google Drive first');
            return;
          }
          const files = fileStructure.findFilesInFolder(fileStructure.structure.root, folderPath);
          if (files.length === 0) {
            showToast('No files in this folder to sync.');
            return;
          }
          showToast(`Syncing ${files.length} files to ${driveFolderName}…`);
          const docs = await db.documents.where('id').anyOf(files).toArray();
          const adapter = driveAdapter;
          if (!adapter) return;
          let uploaded = 0;
          let failed = 0;
          for (const doc of docs) {
            try {
              const remoteId = await adapter.push(doc.id, doc.content);
              if (remoteId !== null) {
                await db.documents.update(doc.id, { syncStatus: 'synced' });
                uploaded++;
              } else {
                failed++;
              }
            } catch { failed++; }
          }
          showToast(failed > 0 ? `${uploaded} synced, ${failed} failed.` : `✓ ${uploaded} files synced to ${driveFolderName}`);
        }}
      />

      {/* Apple Sign In Modal */}
      <AppleSignInModal
        visible={activeModal === 'apple-signin'}
        onClose={closeModal}
      />

      {/* Email/Password Auth Modal */}
      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignIn={async (email, password) => {
          const { error } = await auth.signIn(email, password);
          return { error: error ? { message: error.message } : null };
        }}
        onSignUp={async (email, password) => {
          const { error } = await auth.signUp(email, password);
          return { error: error ? { message: error.message } : null };
        }}
      />

      {/* Export Modal */}
      <ExportModal
        visible={activeModal === 'export'}
        onClose={closeModal}
        fileStructure={fileStructure.structure.root}
        getFolders={fileStructure.getFolders}
        findFilesInFolder={fileStructure.findFilesInFolder}
        showToast={showToast}
      />

      {/* PIN Setup Modal */}
      <ModalShell visible={activeModal === 'pin-setup'} title={t(language, 'pin.setupTitle')} onClose={closeModal}>
        <div style={{ margin: '16px 0' }}>
          {pinStep === 'choose' && (
            <>
              <p style={{ textAlign: 'center', marginBottom: '20px' }}>{t(language, 'pin.setupDesc')}</p>
              {pinConfig.enabled && (
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <ModalButton label={t(language, 'pin.remove')} focused={false} onClick={() => {
                    const config: PinConfig = { enabled: false, pin: '', length: 4 };
                    setPinConfig(config);
                    localStorage.setItem('pw-pin', JSON.stringify(config));
                    setLocked(false);
                    closeModal();
                  }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <ModalButton label={t(language, 'pin.choose4')} focused={modalButtonIndex === 0} onClick={() => {
                  setPinLength(4);
                  setPinStep('enter');
                  setPinInput('');
                }} />
                <ModalButton label={t(language, 'pin.choose6')} focused={modalButtonIndex === 1} onClick={() => {
                  setPinLength(6);
                  setPinStep('enter');
                  setPinInput('');
                }} />
                <ModalButton label={t(language, 'pin.skip')} focused={modalButtonIndex === 2} onClick={closeModal} />
              </div>
            </>
          )}

          {(pinStep === 'enter' || pinStep === 'confirm') && (
            <>
              <p style={{ textAlign: 'center', marginBottom: '20px' }}>
                {pinStep === 'enter' ? t(language, 'pin.enterPin') : t(language, 'pin.confirmPin')}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
                {Array.from({ length: pinLength }).map((_, i) => {
                  const val = pinStep === 'enter' ? pinInput : pinConfirm;
                  return (
                    <div
                      key={i}
                      style={{
                        width: '40px', height: '50px',
                        border: '2px solid var(--terminal-text)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '28px',
                      }}
                    >
                      {val[i] ? '●' : ''}
                    </div>
                  );
                })}
              </div>
              {pinError && (
                <div style={{ color: '#ff5555', textAlign: 'center', marginBottom: '10px' }}>{pinError}</div>
              )}
              <div style={{ textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>
                Type digits, then press Enter to {pinStep === 'enter' ? 'continue' : 'confirm'}
              </div>
            </>
          )}
        </div>
      </ModalShell>

      {/* New Novel Project Wizard */}
      <NovelProjectWizard
        visible={novelWizardOpen}
        onClose={() => setNovelWizardOpen(false)}
        onCreate={async (config) => {
          fileStructure.createNovelProject(config);
          setFileBrowserOpen(true);
          setNovelWizardOpen(false);

          if (config.storageLocation === 'google-drive') {
            if (!driveAdapter) {
              showToast(`Project created locally. Connect Google Drive via STORAGE menu to sync.`);
              return;
            }
            showToast(`Uploading "${config.title}" to Google Drive...`);
            const projectDocs = await db.documents
              .filter(d => d.id.startsWith(config.title + '/'))
              .toArray();
            let uploaded = 0;
            let failed = 0;
            for (const doc of projectDocs) {
              try {
                const remoteId = await driveAdapter.push(doc.id, doc.content);
                if (remoteId !== null) {
                  await db.documents.update(doc.id, { syncStatus: 'synced' });
                  uploaded++;
                } else {
                  failed++;
                }
              } catch { failed++; }
            }
            if (failed > 0) {
              showToast(`Project created. ${uploaded} files uploaded, ${failed} failed.`);
            } else {
              showToast(`✓ "${config.title}" uploaded to Google Drive (${uploaded} files)`);
            }
          } else {
            showToast(`Novel project "${config.title}" created!`);
          }
        }}
        onLinkStorage={(location) => {
          if (location === 'google-drive') {
            setNovelWizardOpen(false);
            setActiveModal('gdrive');
          }
        }}
      />


      {/* Manuscript Stats Modal */}
      <ManuscriptStatsModal
        visible={statsModalOpen}
        structure={fileStructure.structure}
        allDocuments={allDocs}
        wordCountTarget={wordCountTarget}
        onClose={() => setStatsModalOpen(false)}
      />

      {/* Sprint Setup Modal */}
      <ModalShell visible={sprintSetupOpen} title="⏱ WRITING SPRINT" onClose={() => setSprintSetupOpen(false)}>
        <div style={{ margin: '16px 0' }}>
          <p style={{ textAlign: 'center', marginBottom: '20px', opacity: 0.8 }}>
            Choose a duration and start writing. The timer counts down in the status bar.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            {SPRINT_DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => setSprintDuration(d)}
                style={{
                  padding: '10px 18px',
                  border: sprintDuration === d ? '2px solid var(--terminal-accent)' : '1px solid var(--terminal-text)',
                  background: sprintDuration === d ? 'var(--terminal-accent)' : 'transparent',
                  color: sprintDuration === d ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                  cursor: 'pointer',
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: '14px',
                }}
              >
                {d} min
              </button>
            ))}
          </div>
          {sprintBest.words > 0 && (
            <div style={{ textAlign: 'center', fontSize: '12px', opacity: 0.6, marginBottom: '16px' }}>
              Personal best: {sprintBest.words} words · {sprintBest.wpm} WPM
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <ModalButton label="START SPRINT" focused onClick={() => {
            const rawText = editorContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const startWords = rawText ? rawText.split(' ').filter((w: string) => w.length > 0).length : 0;
            sprintStartWordsRef.current = startWords;
            setSprintTimeLeft(sprintDuration * 60);
            setSprintPaused(false);
            setSprintActive(true);
            setSprintSetupOpen(false);
          }} />
          <ModalButton label="CANCEL" focused={false} onClick={() => setSprintSetupOpen(false)} />
        </div>
      </ModalShell>

      {/* Sprint Complete Modal */}
      <ModalShell visible={sprintCompleteOpen} title="✓ SPRINT COMPLETE" onClose={() => setSprintCompleteOpen(false)}>
        <div style={{ margin: '16px 0' }}>
          <div style={{ textAlign: 'center', fontSize: '18px', marginBottom: '24px' }}>
            You wrote <strong>{sprintResult.wordsWritten}</strong> words in {sprintResult.minutes} minutes!
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid var(--terminal-text)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>WORDS WRITTEN</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{sprintResult.wordsWritten}</div>
            </div>
            <div style={{ border: '1px solid var(--terminal-text)', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>AVERAGE WPM</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{sprintResult.wpm}</div>
            </div>
          </div>
          {sprintBest.words > 0 && (
            <div style={{ textAlign: 'center', fontSize: '12px', opacity: 0.6, marginBottom: '16px' }}>
              Personal best: {sprintBest.words} words · {sprintBest.wpm} WPM
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <ModalButton label="SPRINT AGAIN" focused onClick={() => {
            setSprintCompleteOpen(false);
            setSprintSetupOpen(true);
          }} />
          <ModalButton label="CLOSE" focused={false} onClick={() => setSprintCompleteOpen(false)} />
        </div>
      </ModalShell>

      {/* Toast Notification */}
      {toastVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            background: 'var(--terminal-bg)',
            border: '2px solid var(--terminal-text)',
            padding: '12px 16px',
            fontFamily: "'Courier Prime', 'Courier New', monospace",
            color: 'var(--terminal-text)',
            zIndex: 10000,
            boxShadow: '0 0 20px var(--terminal-glow)',
            animation: 'fadeIn 0.3s ease',
            maxWidth: '400px',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Song Complete (post-session reward screen) */}
      <SongComplete
        visible={songCompleteVisible}
        wordsWritten={lastSessionWords}
        durationSeconds={lastSessionDuration}
        xpBreakdown={lastXPBreakdown}
        currentStreak={currentStreak}
        currentLevel={currentLevel}
        currentTitle={currentTitle}
        totalXp={totalXp}
        xpInLevel={xpInLevel}
        xpNeeded={xpNeeded}
        newChronicles={lastNewChronicles}
        onClose={() => setSongCompleteVisible(false)}
      />
      {/* Milestone celebration queue (streak/level-up cards) */}
      <MilestoneNotifier />
    </div>
  );
}
