import { useState, useEffect, useRef, useCallback } from 'react';
import BootScreen from '@/components/private-writer/BootScreen';
import Editor from '@/components/private-writer/Editor';
import type { EditorHandle } from '@/components/private-writer/Editor';
import MenuBar, { MENUS, getSubmenuItems } from '@/components/private-writer/MenuBar';
import StatusBar from '@/components/private-writer/StatusBar';
import FileBrowser from '@/components/private-writer/FileBrowser';
import HelpText from '@/components/private-writer/HelpText';
import LiveStats from '@/components/private-writer/LiveStats';
import GoogleDriveModal from '@/components/private-writer/GoogleDriveModal';
import AppleSignInModal from '@/components/private-writer/AppleSignInModal';
import NovelProjectWizard from '@/components/private-writer/NovelProjectWizard';
import type { NovelProjectConfig, StorageLocation } from '@/components/private-writer/NovelProjectWizard';
import ModalShell, { ModalButton, ModalInput } from '@/components/private-writer/ModalShell';
import SettingsPanel from '@/components/private-writer/SettingsPanel';
import { t } from '@/lib/languages';
import { typingPassages } from '@/lib/typingPassages';
import { useDocumentStorage } from '@/hooks/useDocumentStorage';
import { useFileStructure } from '@/hooks/useFileStructure';
import { useTerminalTheme } from '@/hooks/useTerminalTheme';
import type { ModalType, Language, Difficulty, PinConfig } from '@/lib/types';



export default function PrivateWriter() {
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
  const [versionName, setVersionName] = useState('');
  const [selectedNovelIdx, setSelectedNovelIdx] = useState(0);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Font family
  const [fontFamily, setFontFamily] = useState(() => {
    return localStorage.getItem('pw-font-family') || "'Courier Prime', 'Courier New', monospace";
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
  const theme = useTerminalTheme();
  const editorRef = useRef<EditorHandle>(null);

  // Content state managed locally for editor
  const [editorContent, setEditorContent] = useState('');

  // Load saved state on mount
  useEffect(() => {
    const saved = docStorage.loadState();
    if (saved) setEditorContent(saved.content);
  }, []);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      docStorage.saveState(editorContent);
      if (!docStorage.currentDocument.saved && docStorage.currentDocument.filename) {
        docStorage.saveDocument(docStorage.currentDocument.filename, editorContent);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [editorContent, docStorage]);

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

    if (liveStatsEnabled) {
      const diff = content.length - liveStatsRef.current.lastContent.length;
      if (diff > 0) liveStatsRef.current.chars += diff;
      liveStatsRef.current.lastContent = content;
    }
  }, [docStorage, liveStatsEnabled]);

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

  // Sync fullscreen state with actual fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

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
        setSettingsPanelOpen(true);
        break;
      case 'opensettings':
        setSettingsPanelOpen(true);
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
      case 'shutdown':
        if (confirm(t(language, 'shutdownConfirm'))) {
          location.reload();
        }
        break;
      case 'gdrive':
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
        setSelectedNovelIdx(0);
        setVersionName('v1.0 - ');
        setActiveModal('save-version');
        setModalButtonIndex(0);
        break;
      }
      case 'savesnapshot': {
        if (!docStorage.currentDocument.filename) {
          showToast('No file open to snapshot.');
          break;
        }
        fileStructure.saveSnapshot(docStorage.currentDocument.filename);
        const shortName = docStorage.currentDocument.filename.split('/').pop() || docStorage.currentDocument.filename;
        const dateStr = new Date().toISOString().split('T')[0];
        showToast(`Snapshot saved: ${dateStr} - ${shortName}`);
        break;
      }
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
        executeAction('fullscreen');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        executeAction('togglelivestats');
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

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault();
        executeAction('savesnapshot');
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

      case 'save-version': {
        const novels = fileStructure.getNovelProjects();
        if (e.key === 'Tab') {
          setModalButtonIndex(prev => (prev + 1) % 3);
          e.preventDefault();
        } else if (e.key === 'ArrowUp' && modalButtonIndex === 0) {
          setSelectedNovelIdx(prev => Math.max(prev - 1, 0));
          e.preventDefault();
        } else if (e.key === 'ArrowDown' && modalButtonIndex === 0) {
          setSelectedNovelIdx(prev => Math.min(prev + 1, novels.length - 1));
          e.preventDefault();
        } else if (e.key === 'Enter') {
          if (modalButtonIndex === 1 || (modalButtonIndex === 2 && false)) {
            // Save button
            if (versionName.trim() && novels[selectedNovelIdx]) {
              fileStructure.saveVersion(novels[selectedNovelIdx], versionName.trim());
              showToast(`Version saved: ${versionName.trim()}`);
              closeModal();
            }
          } else if (modalButtonIndex === 2) {
            closeModal();
          }
          e.preventDefault();
        }
        break;
      }
    }
  }, [
    activeModal, modalButtonIndex, saveFilename, folderName, selectedFolderIdx,
    typingPhase, typingBtnIdx, typingDifficulty,
    moveFileName, moveFilePath, novelTitle, versionName, selectedNovelIdx,
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
          background: '#000',
          color: '#33ff33',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: "'VT323', monospace",
          zIndex: 9999,
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '10px', textShadow: '0 0 10px rgba(51,255,51,0.8)' }}>
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
                border: '2px solid #33ff33',
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
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

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <FileBrowser
          visible={fileBrowserOpen}
          focused={fileBrowserFocused}
          rootNode={fileStructure.structure.root}
          allDocuments={allDocs}
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
            fileStructure.createFileInFolder(filename, folderPath);
          }}
          onNewFolder={(name) => fileStructure.createFolder(name)}
          onDeleteFile={(filename) => fileStructure.deleteFile(filename)}
          onDeleteFolder={(folderPath) => fileStructure.deleteFolder(folderPath)}
          onRenameFile={(oldName, newName) => fileStructure.renameFile(oldName, newName)}
          onMoveFile={(filename, fromPath, toPath) => fileStructure.moveFile(filename, fromPath, toPath)}
          onToggleFolder={(path) => fileStructure.toggleFolder(path)}
          onRestoreFromDeleted={(itemName) => fileStructure.restoreFromDeleted(itemName)}
          onEmptyDeleted={() => fileStructure.emptyDeleted()}
          onFocus={() => setFileBrowserFocused(true)}
          getFolders={() => fileStructure.getFolders()}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={() => setFileBrowserFocused(false)}>
          <Editor
            content={editorContent}
            onChange={handleEditorChange}
            fontSize={theme.fontSize}
            fontFamily={fontFamily}
            placeholder={t(language, 'placeholder')}
            ref={editorRef}
            readOnly={settingsPanelOpen || !!activeModal || menuOpen}
            onChangeFontSize={(delta) => theme.changeFontSize(delta)}
            onChangeFontFamily={(font) => {
              setFontFamily(font);
              localStorage.setItem('pw-font-family', font);
            }}
          />
        </div>
      </div>

      <HelpText
        visible={helpVisible}
        lines={[
          t(language, 'help.line1'),
          t(language, 'help.line2'),
          t(language, 'help.line3'),
        ]}
      />

      <StatusBar
        language={language}
        filename={docStorage.currentDocument.filename}
        saved={docStorage.currentDocument.saved}
        content={editorContent}
        battery={battery}
        wifiOn={wifiOn}
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

      {/* Settings Panel */}
      <SettingsPanel
        visible={settingsPanelOpen}
        language={language}
        colors={theme.colors}
        wifiOn={wifiOn}
        bluetoothOn={bluetoothOn}
        pinConfig={pinConfig}
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
          executeAction('gdrive');
        }}
        onConnectApple={() => {
          setSettingsPanelOpen(false);
          executeAction('apple-signin');
        }}
      />

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
      />

      {/* Apple Sign In Modal */}
      <AppleSignInModal
        visible={activeModal === 'apple-signin'}
        onClose={closeModal}
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
        onCreate={(config) => {
          fileStructure.createNovelProject(config);
          showToast(`Novel project "${config.title}" created!`);
          setFileBrowserOpen(true);
          setNovelWizardOpen(false);
        }}
        onLinkStorage={(location) => {
          if (location === 'google-drive') {
            setNovelWizardOpen(false);
            setActiveModal('gdrive');
          } else if (location === 'icloud') {
            setNovelWizardOpen(false);
            setActiveModal('apple-signin');
          } else {
            showToast(`${location} integration coming soon.`);
          }
        }}
      />

      {/* Save Version Modal */}
      <ModalShell visible={activeModal === 'save-version'} title="📋 SAVE VERSION" onClose={closeModal}>
        <div style={{ margin: '16px 0' }}>
          {(() => {
            const novels = fileStructure.getNovelProjects();
            return (
              <>
                <p style={{ marginBottom: '16px', textAlign: 'center' }}>
                  Copy all files from Active/Chapters/ to a new version folder.
                </p>
                {novels.length > 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>SELECT NOVEL:</div>
                    {novels.map((name, i) => (
                      <div
                        key={name}
                        onClick={() => setSelectedNovelIdx(i)}
                        style={{
                          padding: '8px 12px',
                          margin: '4px 0',
                          border: '1px solid var(--terminal-text)',
                          background: i === selectedNovelIdx ? 'var(--terminal-text)' : 'transparent',
                          color: i === selectedNovelIdx ? 'var(--terminal-bg)' : 'var(--terminal-text)',
                          cursor: 'pointer',
                        }}
                      >
                        📖 {name}
                      </div>
                    ))}
                  </div>
                )}
                {novels.length === 1 && (
                  <div style={{ marginBottom: '16px', textAlign: 'center', opacity: 0.8 }}>
                    Novel: <strong>{novels[0]}</strong>
                  </div>
                )}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>VERSION NAME:</div>
                  <ModalInput
                    value={versionName}
                    onChange={setVersionName}
                    placeholder="e.g. v1.0 - First Draft Complete"
                    autoFocus
                  />
                </div>
              </>
            );
          })()}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <ModalButton label="SAVE VERSION" focused={modalButtonIndex === 1} onClick={() => {
            const novels = fileStructure.getNovelProjects();
            if (versionName.trim() && novels[selectedNovelIdx]) {
              fileStructure.saveVersion(novels[selectedNovelIdx], versionName.trim());
              showToast(`Version saved: ${versionName.trim()}`);
              closeModal();
            }
          }} />
          <ModalButton label="CANCEL" focused={modalButtonIndex === 2} onClick={closeModal} />
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
    </div>
  );
}
