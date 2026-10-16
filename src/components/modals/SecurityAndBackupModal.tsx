import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Download,
  Upload,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileKey,
  Database,
  Calendar,
  Clock,
  Briefcase,
  ArrowLeftRight,
  Coins,
  DollarSign,
  HelpCircle,
  Layers,
  FileCheck2,
  Copy,
  Sparkles,
  Check,
  Shuffle,
  FolderDown,
} from 'lucide-react';
import {
  StockPosition,
  Operation,
  ClosedPosition,
  DividendRecord,
  UpcomingDividend,
  Broker,
  WatchlistItem,
} from '../../types/portfolio';
import {
  createEncryptedBackup,
  decryptAndValidateBackup,
  AppPortfolioBackupData,
  formatBackupDateTime,
  generateSecurePassword,
} from '../../utils/cryptoService';

interface SecurityAndBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Security Hook State
  hasPassword: boolean;
  hint: string;
  autoLockMinutes: number;
  sessionPassword: string | null;
  onSetupPassword: (password: string, hint?: string) => Promise<{ success: boolean; error?: string }>;
  onChangePassword: (current: string, newPass: string, hint?: string) => Promise<{ success: boolean; error?: string }>;
  onRemovePassword: (current: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateAutoLock: (minutes: number) => void;
  onLockApp: () => void;
  // Current app data for backup
  portfolioData: {
    positions: StockPosition[];
    operations: Operation[];
    closedPositions: ClosedPosition[];
    dividends: DividendRecord[];
    upcomingDividends: UpcomingDividend[];
    brokers: Broker[];
    watchlist: WatchlistItem[];
    cashEUR: number;
  };
  onRestoreData: (restored: AppPortfolioBackupData) => void;
  currentVersion?: string;
  initialTab?: 'backup' | 'import' | 'password' | 'inspect';
}

export function SecurityAndBackupModal({
  isOpen,
  onClose,
  hasPassword,
  hint,
  autoLockMinutes,
  sessionPassword,
  onSetupPassword,
  onChangePassword,
  onRemovePassword,
  onUpdateAutoLock,
  onLockApp,
  portfolioData,
  onRestoreData,
  currentVersion = 'v1.0.0',
  initialTab = 'backup',
}: SecurityAndBackupModalProps) {
  const [activeTab, setActiveTab] = useState<'backup' | 'import' | 'password' | 'inspect'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // --- TAB 1: BACKUP STATES ---
  const [backupPassword, setBackupPassword] = useState(sessionPassword || '');
  const [backupConfirmPassword, setBackupConfirmPassword] = useState(sessionPassword || '');
  const [showBackupPass, setShowBackupPass] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [savedFolderNote, setSavedFolderNote] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // --- TAB 2 & 3: IMPORT & INSPECTION STATES ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPass, setShowImportPass] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedResult, setDecryptedResult] = useState<{
    data: AppPortfolioBackupData;
    metadata: {
      createdAt: string;
      createdAtFormatted: string;
      version: string;
      summary: any;
    };
  } | null>(null);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);

  // --- TAB 4: PASSWORD MANAGEMENT STATES ---
  const [setupPassInput, setSetupPassInput] = useState('');
  const [setupPassConfirm, setSetupPassConfirm] = useState('');
  const [setupHintInput, setSetupHintInput] = useState('');
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [newPassConfirm, setNewPassConfirm] = useState('');
  const [newHintInput, setNewHintInput] = useState(hint || '');
  const [showPassToggles, setShowPassToggles] = useState<{ [k: string]: boolean }>({});
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessingPass, setIsProcessingPass] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleGeneratePassword = (
    type: 'mixed' | 'numeric' | 'alphanumeric' = 'mixed',
    target: 'setup' | 'new' | 'backup' = 'setup'
  ) => {
    const generated = generateSecurePassword(20, type);
    if (target === 'setup') {
      setSetupPassInput(generated);
      setSetupPassConfirm(generated);
    } else if (target === 'new') {
      setNewPassInput(generated);
      setNewPassConfirm(generated);
    } else if (target === 'backup') {
      setBackupPassword(generated);
      setBackupConfirmPassword(generated);
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(generated).then(() => {
        setCopyToast(`¡Generada clave de 20 ${type === 'numeric' ? 'dígitos' : 'caracteres'} y copiada al portapapeles!`);
        setTimeout(() => setCopyToast(null), 4000);
      }).catch(() => {
        setCopyToast(`¡Generada clave de 20 ${type === 'numeric' ? 'dígitos' : 'caracteres'}!`);
        setTimeout(() => setCopyToast(null), 3000);
      });
    } else {
      setCopyToast(`¡Generada clave de 20 ${type === 'numeric' ? 'dígitos' : 'caracteres'}!`);
      setTimeout(() => setCopyToast(null), 3000);
    }
  };

  const handleCopyToClipboard = (text: string, label = 'Contraseña') => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopyToast(`¡${label} copiada al portapapeles!`);
      setTimeout(() => setCopyToast(null), 2500);
    }
  };

  if (!isOpen) return null;

  // Handler: Export encrypted backup
  const handleExportEncryptedBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackupError(null);
    setBackupSuccess(null);

    let passToUse = sessionPassword || backupPassword;
    if (!passToUse || passToUse.trim().length === 0) {
      if (hasPassword) {
        const promptPass = window.prompt('Introduce la contraseña de la aplicación para confirmar la copia cifrada:');
        if (!promptPass) return;
        passToUse = promptPass;
      } else {
        setBackupError('Debes indicar una contraseña para proteger y cifrar el archivo de copia.');
        return;
      }
    }

    if (!hasPassword && !sessionPassword && backupPassword !== backupConfirmPassword) {
      setBackupError('Las contraseñas no coinciden. Asegúrate de escribirlas idénticas.');
      return;
    }

    setIsExporting(true);
    try {
      const { blob, filename, packageData } = await createEncryptedBackup(
        {
          positions: portfolioData.positions,
          operations: portfolioData.operations,
          closedPositions: portfolioData.closedPositions,
          dividends: portfolioData.dividends,
          upcomingDividends: portfolioData.upcomingDividends,
          brokers: portfolioData.brokers,
          watchlist: portfolioData.watchlist,
          cashEUR: portfolioData.cashEUR,
          exportedAt: new Date().toISOString(),
          exportedAtFormatted: '',
        },
        passToUse,
        currentVersion
      );

      // 1. Intentar permitir al usuario elegir la carpeta de destino mediante el diálogo nativo "Guardar como..."
      let savedWithPicker = false;
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'Copia de Seguridad Cifrada (.cartera)',
                accept: {
                  'application/json': ['.cartera', '.json'],
                },
              },
            ],
          });

          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          savedWithPicker = true;
          setSavedFolderNote(false);

          setBackupSuccess(
            `¡Copia guardada con éxito en la carpeta seleccionada! Archivo: ${fileHandle.name || filename} (${packageData.createdAtFormatted}). Protegida con la misma contraseña de la aplicación.`
          );
        } catch (pickerErr: any) {
          // Si el usuario canceló voluntariamente el diálogo de carpetas
          if (pickerErr.name === 'AbortError') {
            setIsExporting(false);
            return;
          }
          console.warn('showSaveFilePicker no disponible o denegado, utilizando descarga estándar:', pickerErr);
        }
      }

      // 2. Fallback estándar si el navegador no soporta showSaveFilePicker o bloquea el diálogo por permisos
      if (!savedWithPicker) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSavedFolderNote(true);
        setBackupSuccess(
          `¡Copia cifrada descargada con éxito! Archivo: ${filename} (${packageData.createdAtFormatted}). Guardada en tu carpeta de Descargas.`
        );
      }
    } catch (err: any) {
      setBackupError(err?.message || 'Error al generar la copia cifrada.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handler: File picked for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setDecryptedResult(null);
    setRestoreConfirmed(false);

    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    // Por seguridad obligatoria, NO auto-rellenar la contraseña: el usuario debe teclearla explícitamente
    setImportPassword('');
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setFileContent(content);
    };
    reader.onerror = () => {
      setImportError('No se pudo leer el archivo seleccionado.');
    };
    reader.readAsText(file);
  };

  // Handler: Decrypt backup file
  const handleDecryptFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileContent) {
      setImportError('Por favor selecciona un archivo de copia de seguridad primero.');
      return;
    }

    setImportError(null);
    setIsDecrypting(true);

    try {
      const result = await decryptAndValidateBackup(fileContent, importPassword);
      if (!result.success || !result.data) {
        setImportError(result.error || 'No se pudo descifrar el archivo.');
        setDecryptedResult(null);
      } else {
        setDecryptedResult({
          data: result.data,
          metadata: result.metadata as any,
        });
      }
    } catch (err: any) {
      setImportError(err?.message || 'Error al intentar descifrar el archivo.');
      setDecryptedResult(null);
    } finally {
      setIsDecrypting(false);
    }
  };

  // Handler: Confirm and apply restoration
  const handleApplyRestore = () => {
    if (!decryptedResult?.data) return;

    onRestoreData(decryptedResult.data);
    setRestoreConfirmed(true);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  // Handler: Setup initial password
  const handleSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);

    if (!setupPassInput || setupPassInput.length < 4) {
      setPasswordStatusMsg({
        type: 'error',
        text: 'La contraseña debe tener al menos 4 caracteres.',
      });
      return;
    }

    if (setupPassInput.length > 20) {
      setPasswordStatusMsg({
        type: 'error',
        text: 'La contraseña no puede superar un máximo de 20 dígitos o caracteres.',
      });
      return;
    }

    if (setupPassInput !== setupPassConfirm) {
      setPasswordStatusMsg({ type: 'error', text: 'Las contraseñas no coinciden. Asegúrate de que coincidan exactamente.' });
      return;
    }

    setIsProcessingPass(true);
    const res = await onSetupPassword(setupPassInput, setupHintInput);
    setIsProcessingPass(false);

    if (res.success) {
      setPasswordStatusMsg({ type: 'success', text: '¡Contraseña de acceso configurada correctamente!' });
      setSetupPassInput('');
      setSetupPassConfirm('');
      setSetupHintInput('');
    } else {
      setPasswordStatusMsg({ type: 'error', text: res.error || 'Error al configurar contraseña.' });
    }
  };

  // Handler: Change password
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);

    if (!newPassInput || newPassInput.length < 4) {
      setPasswordStatusMsg({
        type: 'error',
        text: 'La nueva contraseña debe tener al menos 4 caracteres.',
      });
      return;
    }

    if (newPassInput.length > 20) {
      setPasswordStatusMsg({
        type: 'error',
        text: 'La nueva contraseña no puede superar un máximo de 20 dígitos o caracteres.',
      });
      return;
    }

    if (newPassInput !== newPassConfirm) {
      setPasswordStatusMsg({ type: 'error', text: 'La nueva contraseña y su confirmación no coinciden.' });
      return;
    }

    setIsProcessingPass(true);
    const res = await onChangePassword(currentPassInput, newPassInput, newHintInput);
    setIsProcessingPass(false);

    if (res.success) {
      setPasswordStatusMsg({ type: 'success', text: '¡Contraseña modificada con éxito!' });
      setCurrentPassInput('');
      setNewPassInput('');
      setNewPassConfirm('');
    } else {
      setPasswordStatusMsg({ type: 'error', text: res.error || 'Error al cambiar contraseña.' });
    }
  };

  // Handler: Remove password
  const handleRemovePasswordSubmit = async () => {
    if (!window.confirm('¿Seguro que deseas desactivar la protección por contraseña?')) return;
    const current = window.prompt('Introduce tu contraseña actual para confirmar la desactivación:');
    if (!current) return;

    setIsProcessingPass(true);
    const res = await onRemovePassword(current);
    setIsProcessingPass(false);

    if (res.success) {
      setPasswordStatusMsg({ type: 'success', text: 'Protección por contraseña desactivada.' });
    } else {
      setPasswordStatusMsg({ type: 'error', text: res.error || 'Contraseña incorrecta.' });
    }
  };

  const togglePass = (key: string) => {
    setShowPassToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#0c182b] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-[#0e1d34]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-900/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Seguridad y Copias de Seguridad
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300">
                  AES-256 Cifrado
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Protección con contraseña antes de entrar y respaldos cifrados con fecha y hora
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/80 bg-[#091322] px-4 sm:px-6 gap-2 sm:gap-4 overflow-x-auto text-xs sm:text-sm font-semibold">
          {[
            { id: 'backup', label: '1. Crear copia cifrada', icon: <Download className="w-4 h-4 text-cyan-400" /> },
            { id: 'import', label: '2. Importar copia', icon: <Upload className="w-4 h-4 text-emerald-400" /> },
            { id: 'inspect', label: '3. Abrir / Examinar copia', icon: <FileKey className="w-4 h-4 text-amber-400" /> },
            {
              id: 'password',
              label: hasPassword ? '4. Cambiar Contraseña' : '4. Configurar Contraseña',
              icon: <KeyRound className="w-4 h-4 text-amber-400" />,
            },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-300 bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs sm:text-sm">
          {/* =========================================================================
              TAB 1: CREAR COPIA CIFRADA CON FECHA Y HORA
             ========================================================================= */}
          {activeTab === 'backup' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Informative Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 to-slate-900 border border-blue-900/60 flex items-start gap-3.5">
                <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">Copia de seguridad protegida con contraseña</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El archivo generado contiene la <strong>indicación exacta de fecha y hora</strong> y está{' '}
                    <strong>100% cifrado con AES-256 militar</strong>. Nadie podrá abrir el archivo ni ver tus compras,
                    ventas o dividendos sin introducir la contraseña.
                  </p>
                </div>
              </div>

              {/* Data Summary to be Included */}
              <div className="bg-[#101e33] border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Contenido incluido en la copia:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-[#0a1424] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-blue-400" /> Posiciones
                    </span>
                    <span className="text-lg font-black text-white">{portfolioData.positions.length}</span>
                  </div>
                  <div className="bg-[#0a1424] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                      <ArrowLeftRight className="w-3 h-3 text-cyan-400" /> Operaciones
                    </span>
                    <span className="text-lg font-black text-white">{portfolioData.operations.length}</span>
                  </div>
                  <div className="bg-[#0a1424] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                      <Coins className="w-3 h-3 text-emerald-400" /> Dividendos
                    </span>
                    <span className="text-lg font-black text-white">{portfolioData.dividends.length}</span>
                  </div>
                  <div className="bg-[#0a1424] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-400" /> Cerradas
                    </span>
                    <span className="text-lg font-black text-white">{portfolioData.closedPositions.length}</span>
                  </div>
                </div>
              </div>

              {/* Export Form */}
              <form onSubmit={handleExportEncryptedBackup} className="space-y-4">
                {hasPassword ? (
                  /* Modo Integrado: Utiliza automáticamente la contraseña de la aplicación */
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/20 to-[#0e1d34] border border-emerald-500/40 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-sm">
                            Cifrado Automático con la Contraseña de la Aplicación
                          </h5>
                          <span className="text-[11px] text-emerald-400 font-semibold">
                            Contraseña integrada automáticamente · No necesitas escribir nada
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                        AES-256 Integrado
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed pt-1">
                      Esta copia de seguridad se cifrará de forma directa con la <strong>misma contraseña que utilizas para entrar a la aplicación</strong>. Cada vez que descargues una copia, estará blindada con esa misma clave sin tener que escribirla de nuevo.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                        Contraseña para cifrar el archivo de copia
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleGeneratePassword('mixed', 'backup')}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-cyan-300 border border-blue-700/60 font-semibold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generar 20 car.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGeneratePassword('numeric', 'backup')}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <span>20 dígitos</span>
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type={showBackupPass ? 'text' : 'password'}
                        value={backupPassword}
                        onChange={e => setBackupPassword(e.target.value)}
                        placeholder="Introduce la contraseña (máximo 20 caracteres)..."
                        required
                        minLength={4}
                        maxLength={20}
                        className="w-full bg-[#0a1424] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 pr-11 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowBackupPass(!showBackupPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showBackupPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Repite la contraseña para confirmar
                      </label>
                      <input
                        type={showBackupPass ? 'text' : 'password'}
                        value={backupConfirmPassword}
                        onChange={e => setBackupConfirmPassword(e.target.value)}
                        placeholder="Confirmar contraseña..."
                        required
                        className="w-full bg-[#0a1424] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                      />
                    </div>
                  </div>
                )}

                {backupError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{backupError}</span>
                  </div>
                )}

                {backupSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{backupSuccess}</span>
                  </div>
                )}

                {savedFolderNote && (
                  <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <FolderDown className="w-4 h-4" />
                      <span>¿Cómo elegir en qué carpeta guardar la copia en tu ordenador?</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      El navegador ha descargado el archivo directamente en tu carpeta de <strong>Descargas</strong>. Si quieres que tu navegador (Chrome, Edge o Firefox) te pregunte <strong>siempre en qué carpeta guardarlo</strong> cada vez que hagas una copia:
                    </p>
                    <div className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800 text-[11px] text-cyan-300">
                      <strong>Menú del navegador (tres puntos ⋮)</strong> ➔ <strong>Configuración</strong> ➔ <strong>Descargas</strong> ➔ Activa: <span className="underline font-bold">"Preguntar dónde guardar cada archivo antes de descargarlo"</span>.
                    </div>
                    <p className="text-slate-400 text-[10px]">
                      Con esa opción activada, cada vez que pulses guardar una copia se abrirá automáticamente el explorador de Windows o Mac para que elijas la carpeta exacta que prefieras (Documentos, Escritorio, disco externo, etc.).
                    </p>
                  </div>
                )}

                {/* Indicador de elección de carpeta */}
                <div className="p-3.5 bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/40 rounded-xl text-xs flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                    <FolderDown className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-white block">Elección de carpeta de destino en tu ordenador</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Al pulsar el botón se abrirá la ventana del sistema operativo <strong>"Guardar como..."</strong> para que puedas navegar y elegir exactamente la carpeta que prefieras (Documentos, Escritorio, Google Drive, OneDrive, disco USB, etc.).
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center">
                  <button
                    type="submit"
                    disabled={isExporting}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 active:scale-95"
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <FolderDown className="w-4 h-4" />
                        <span>Elegir Carpeta y Guardar Copia</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Nombre sugerido con fecha y hora (ej: <code>copia_cartera_...cartera</code>).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <span className="text-amber-400 shrink-0 font-bold">💡</span>
                  <div>
                    <span className="text-slate-300 font-semibold">Consejo para navegadores: </span>
                    Si utilizas Chrome, Edge o Firefox y quieres que siempre te pregunte la carpeta de destino en cualquier descarga, puedes activar en su menú:{' '}
                    <span className="text-cyan-300 font-medium">Configuración ➔ Descargas ➔ "Preguntar dónde guardar cada archivo antes de descargarlo"</span>.
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================================
              TAB 2: IMPORTAR Y RESTAURAR COPIA (PIDE CONTRASEÑA OBLIGATORIA)
             ========================================================================= */}
          {activeTab === 'import' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-800/50 flex items-start gap-3">
                <FileKey className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">Importación y Restauración Segura</h4>
                  <p className="text-xs text-slate-300">
                    Selecciona tu archivo de copia de seguridad (<code>.cartera</code> o <code>.json</code>). La
                    aplicación te pedirá la contraseña correspondiente antes de permitir abrirlo o restaurarlo.
                  </p>
                </div>
              </div>

              {/* Step 1: Select File */}
              <div className="bg-[#101e33] border border-slate-700/80 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Paso 1: Seleccionar archivo de copia de seguridad
                </span>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#0a1424]/60 hover:bg-[#0a1424]"
                >
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="font-semibold text-white text-sm">
                    {selectedFile ? selectedFile.name : 'Haz clic para seleccionar el archivo de respaldo'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedFile
                      ? `Tamaño: ${(selectedFile.size / 1024).toFixed(1)} KB`
                      : 'Formatos admitidos: .cartera, .json, .carterasafe'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".cartera,.json,.enc,.carterasafe"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Step 2: Enter Password to Decrypt */}
              {fileContent && !decryptedResult && (
                <form onSubmit={handleDecryptFile} className="bg-[#101e33] border border-cyan-500/40 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Paso 2: Introduce la contraseña obligatoria para descifrar este archivo
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Verificación obligatoria
                    </span>
                  </div>

                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                    <strong>Aviso de seguridad:</strong> Se solicita siempre la contraseña para impedir que terceros no autorizados puedan restaurar copias ajenas en una aplicación limpia o vacía. Escribe la clave con la que fue protegida la copia.
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Contraseña del archivo de copia de seguridad (máx. 20 caracteres):
                    </label>
                    <div className="relative">
                      <input
                        type={showImportPass ? 'text' : 'password'}
                        value={importPassword}
                        onChange={e => setImportPassword(e.target.value)}
                        placeholder="Escribe aquí la contraseña para descifrar..."
                        required
                        maxLength={20}
                        autoFocus
                        className="w-full bg-[#0a1424] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 pr-11 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowImportPass(!showImportPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showImportPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {importError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{importError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isDecrypting || !importPassword}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDecrypting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Validar Contraseña y Descifrar Copia</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 3: Decrypted Preview & Confirmation */}
              {decryptedResult && (
                <div className="bg-[#101e33] border border-emerald-500/50 rounded-2xl p-5 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Archivo descifrado correctamente con la clave válida</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {decryptedResult.metadata.version}
                    </span>
                  </div>

                  {/* Metadata: Date and Time */}
                  <div className="p-3 bg-[#0a1424] rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span><strong>Fecha y hora de creación:</strong> {decryptedResult.metadata.createdAtFormatted}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(decryptedResult.metadata.createdAt).toLocaleTimeString('es-ES')}</span>
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-[#0a1424] p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[11px]">Posiciones</span>
                      <span className="text-base font-black text-white">{decryptedResult.data.positions?.length || 0}</span>
                    </div>
                    <div className="bg-[#0a1424] p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[11px]">Operaciones</span>
                      <span className="text-base font-black text-white">{decryptedResult.data.operations?.length || 0}</span>
                    </div>
                    <div className="bg-[#0a1424] p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[11px]">Dividendos</span>
                      <span className="text-base font-black text-white">{decryptedResult.data.dividends?.length || 0}</span>
                    </div>
                    <div className="bg-[#0a1424] p-3 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[11px]">Cerradas</span>
                      <span className="text-base font-black text-white">{decryptedResult.data.closedPositions?.length || 0}</span>
                    </div>
                  </div>

                  {restoreConfirmed ? (
                    <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-200 text-center font-bold text-sm">
                      ¡Datos restaurados con éxito en la aplicación! Actualizando vista...
                    </div>
                  ) : (
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleApplyRestore}
                        className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <FileCheck2 className="w-4 h-4" />
                        <span>Restaurar y Reemplazar Datos en la Cartera</span>
                      </button>

                      <button
                        onClick={() => {
                          setDecryptedResult(null);
                          setSelectedFile(null);
                          setFileContent(null);
                        }}
                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 3: ABRIR / EXAMINAR COPIA SIN RESTAURAR (AUDITORÍA & LECTURA)
             ========================================================================= */}
          {activeTab === 'inspect' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-800/50 flex items-start gap-3">
                <FileKey className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">Inspeccionar archivo cifrado sin modificar tu cartera actual</h4>
                  <p className="text-xs text-slate-300">
                    Comprueba que el archivo de copia no se puede abrir sin la contraseña y examina su contenido detallado (valores, fechas y precios) de forma segura en modo solo lectura.
                  </p>
                </div>
              </div>

              {!decryptedResult ? (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#0a1424]/60 hover:bg-[#0a1424]"
                  >
                    <FileKey className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="font-semibold text-white text-sm">
                      {selectedFile ? selectedFile.name : 'Selecciona el archivo para examinar'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Si lo abres con bloc de notas solo verás caracteres cifrados AES-256.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".cartera,.json,.enc,.carterasafe"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {fileContent && (
                    <form onSubmit={handleDecryptFile} className="space-y-3 bg-[#101e33] p-4 rounded-2xl border border-slate-700">
                      <label className="block text-xs font-semibold text-slate-300">
                        Introduce la contraseña para descifrar y visualizar:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={showImportPass ? 'text' : 'password'}
                          value={importPassword}
                          onChange={e => setImportPassword(e.target.value)}
                          placeholder="Contraseña..."
                          required
                          className="flex-1 bg-[#0a1424] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white"
                        />
                        <button
                          type="submit"
                          disabled={isDecrypting}
                          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          {isDecrypting ? 'Descifrando...' : 'Examinar'}
                        </button>
                      </div>
                      {importError && (
                        <p className="text-rose-400 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {importError}
                        </p>
                      )}
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-[#0a1424] rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300">
                      <strong>Fecha de la copia:</strong> {decryptedResult.metadata.createdAtFormatted}
                    </span>
                    <button
                      onClick={() => setDecryptedResult(null)}
                      className="text-cyan-400 hover:underline"
                    >
                      Examinar otro archivo
                    </button>
                  </div>

                  {/* List of positions in the backup */}
                  <div className="bg-[#101e33] p-4 rounded-2xl border border-slate-750 space-y-3">
                    <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                      Posiciones guardadas ({decryptedResult.data.positions?.length || 0}):
                    </h5>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 text-xs">
                      {decryptedResult.data.positions?.map(pos => (
                        <div key={pos.id} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white">{pos.symbol}</span>
                            <span className="text-slate-400 ml-2">{pos.company}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-white">{pos.shares} accs.</span>
                            <span className="text-slate-400 ml-2">a {pos.buyPrice} €</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 4: CONFIGURACIÓN DE CONTRASEÑA DE LA APLICACIÓN
             ========================================================================= */}
          {activeTab === 'password' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Status Header */}
              <div className="p-4 rounded-2xl bg-[#101e33] border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      hasPassword ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {hasPassword ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {hasPassword ? 'Protección por contraseña ACTIVADA' : 'Sin contraseña de acceso'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {hasPassword
                        ? 'Se solicitará la contraseña cada vez que se inicie la aplicación o se bloquee.'
                        : 'Establece una contraseña para proteger la entrada a la aplicación.'}
                    </p>
                  </div>
                </div>

                {hasPassword && (
                  <button
                    onClick={onLockApp}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer"
                    title="Bloquear la aplicación de inmediato"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Bloquear ahora</span>
                  </button>
                )}
              </div>

              {/* Copy Toast Notification */}
              {copyToast && (
                <div className="p-3 rounded-xl bg-cyan-950/90 border border-cyan-500/60 text-cyan-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold">{copyToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCopyToast(null)}
                    className="text-cyan-400 hover:text-white text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Status Messages */}
              {passwordStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    passwordStatusMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {passwordStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{passwordStatusMsg.text}</span>
                </div>
              )}

              {/* Form A: Initial Password Setup (if hasPassword === false) */}
              {!hasPassword ? (
                <form onSubmit={handleSetupPasswordSubmit} className="bg-[#101e33] border border-slate-700/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      Crear contraseña de acceso de la aplicación
                    </h4>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Máximo 20 dígitos / caracteres
                    </span>
                  </div>

                  {/* Fast Generator Box */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Generador rápido (hasta 20 dígitos / caracteres)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Puedes escribir tu propia clave (de 4 a 20 dígitos) o pulsar un botón para generarla al instante:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleGeneratePassword('mixed', 'setup')}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                        <span>⚡ Generar clave segura (20 car.)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGeneratePassword('numeric', 'setup')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all active:scale-95"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>🔢 Generar 20 dígitos numéricos</span>
                      </button>
                      {setupPassInput && (
                        <button
                          type="button"
                          onClick={() => handleCopyToClipboard(setupPassInput, 'Contraseña')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer transition-all"
                          title="Copiar contraseña generada al portapapeles"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar clave</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        Contraseña nueva (máximo 20 dígitos o caracteres)
                      </label>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          setupPassInput.length >= 4 && setupPassInput.length <= 20
                            ? 'text-emerald-400'
                            : setupPassInput.length > 20
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {setupPassInput.length}/20 car. {setupPassInput.length >= 4 && setupPassInput.length <= 20 ? '✓ (Válida)' : setupPassInput.length > 20 ? '⚠️ Excede 20' : '(mín. 4)'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassToggles['setup'] ? 'text' : 'password'}
                        value={setupPassInput}
                        onChange={e => setSetupPassInput(e.target.value.slice(0, 20))}
                        placeholder="Introduce tu clave (máximo 20 dígitos)..."
                        required
                        minLength={4}
                        maxLength={20}
                        className="w-full bg-[#0a1424] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white pr-11 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => togglePass('setup')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showPassToggles['setup'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        Confirmar contraseña
                      </label>
                      {setupPassConfirm && setupPassInput === setupPassConfirm && setupPassConfirm.length >= 4 && (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Coinciden
                        </span>
                      )}
                    </div>
                    <input
                      type={showPassToggles['setup'] ? 'text' : 'password'}
                      value={setupPassConfirm}
                      onChange={e => setSetupPassConfirm(e.target.value.slice(0, 20))}
                      placeholder="Repite la contraseña idéntica..."
                      required
                      minLength={4}
                      maxLength={20}
                      className="w-full bg-[#0a1424] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      Pista de contraseña (opcional para ayudarte a recordarla)
                    </label>
                    <input
                      type="text"
                      value={setupHintInput}
                      onChange={e => setSetupHintInput(e.target.value)}
                      placeholder="Ej. Guardada en gestor de claves o clave personal..."
                      className="w-full bg-[#0a1424] border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isProcessingPass ||
                      setupPassInput.length < 4 ||
                      setupPassInput.length > 20 ||
                      setupPassInput !== setupPassConfirm
                    }
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl text-sm shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingPass
                      ? 'Configurando...'
                      : setupPassInput.length < 4
                      ? `Introduce al menos 4 caracteres (llevas ${setupPassInput.length})`
                      : setupPassInput.length > 20
                      ? 'Máximo 20 caracteres permitido'
                      : 'Activar Protección con Contraseña'}
                  </button>
                </form>
              ) : (
                /* Form B: Change Password (if hasPassword === true) */
                <form onSubmit={handleChangePasswordSubmit} className="bg-[#101e33] border border-slate-700/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      Cambiar contraseña de acceso
                    </h4>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Máximo 20 caracteres
                    </span>
                  </div>

                  {/* Fast Generator Box for Change */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Generador rápido (máximo 20 caracteres)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleGeneratePassword('mixed', 'new')}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                        <span>⚡ Generar clave de 20 caracteres</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGeneratePassword('numeric', 'new')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all active:scale-95"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>🔢 Generar 20 dígitos numéricos</span>
                      </button>
                      {newPassInput && (
                        <button
                          type="button"
                          onClick={() => handleCopyToClipboard(newPassInput, 'Nueva contraseña')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Contraseña actual
                    </label>
                    <div className="relative">
                      <input
                        type={showPassToggles['current'] ? 'text' : 'password'}
                        value={currentPassInput}
                        onChange={e => setCurrentPassInput(e.target.value)}
                        placeholder="Contraseña actual..."
                        required
                        maxLength={20}
                        className="w-full bg-[#0a1424] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white pr-11 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => togglePass('current')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showPassToggles['current'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-300">
                          Nueva contraseña
                        </label>
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            newPassInput.length >= 4 && newPassInput.length <= 20
                              ? 'text-emerald-400'
                              : newPassInput.length > 20
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {newPassInput.length}/20 car.
                        </span>
                      </div>
                      <input
                        type={showPassToggles['current'] ? 'text' : 'password'}
                        value={newPassInput}
                        onChange={e => setNewPassInput(e.target.value.slice(0, 20))}
                        placeholder="Máximo 20 caracteres..."
                        required
                        minLength={4}
                        maxLength={20}
                        className="w-full bg-[#0a1424] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-300">
                          Confirmar nueva contraseña
                        </label>
                        {newPassConfirm && newPassInput === newPassConfirm && newPassConfirm.length >= 4 && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Coinciden
                          </span>
                        )}
                      </div>
                      <input
                        type={showPassToggles['current'] ? 'text' : 'password'}
                        value={newPassConfirm}
                        onChange={e => setNewPassConfirm(e.target.value.slice(0, 20))}
                        placeholder="Repetir nueva..."
                        required
                        minLength={4}
                        maxLength={20}
                        className="w-full bg-[#0a1424] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      Pista de contraseña (opcional)
                    </label>
                    <input
                      type="text"
                      value={newHintInput}
                      onChange={e => setNewHintInput(e.target.value)}
                      placeholder="Pista para recordar..."
                      className="w-full bg-[#0a1424] border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={
                        isProcessingPass ||
                        newPassInput.length < 4 ||
                        newPassInput.length > 20 ||
                        newPassInput !== newPassConfirm
                      }
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingPass
                        ? 'Guardando...'
                        : newPassInput.length < 4
                        ? `Mínimo 4 caracteres (llevas ${newPassInput.length})`
                        : newPassInput.length > 20
                        ? 'Máximo 20 caracteres permitido'
                        : 'Actualizar Contraseña'}
                    </button>

                    <button
                      type="button"
                      onClick={handleRemovePasswordSubmit}
                      disabled={isProcessingPass}
                      className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500 border border-rose-500/30 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Desactivar Contraseña
                    </button>
                  </div>
                </form>
              )}

              {/* Inactivity Auto-Lock settings */}
              {hasPassword && (
                <div className="bg-[#101e33] border border-slate-700/80 rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Auto-bloqueo por inactividad
                  </h4>
                  <p className="text-xs text-slate-400">
                    Bloquea la pantalla automáticamente si no realizas acciones durante este tiempo:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { val: 5, label: '5 minutos' },
                      { val: 15, label: '15 minutos' },
                      { val: 30, label: '30 minutos' },
                      { val: 60, label: '1 hora' },
                      { val: 0, label: 'Desactivado' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => onUpdateAutoLock(opt.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          autoLockMinutes === opt.val
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0a1424] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Cifrado nativo AES-256-GCM con derivación de clave PBKDF2</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
