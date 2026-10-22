import React, { useState, useEffect } from 'react';
import { Broker } from '../types/portfolio';
import {
  Plus,
  Edit2,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Sliders,
  Database,
  RotateCcw,
  Lock,
  Unlock,
  KeyRound,
  Download,
  Upload,
  FileKey,
  Shield,
  Briefcase,
  FileSpreadsheet,
  Clock,
  HelpCircle,
  AlertTriangle,
  Info,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getStoredFxRates, saveStoredFxRates, fetchLiveFxRates } from '../services/quotesService';

interface BrokersConfigViewProps {
  brokers: Broker[];
  onAddBroker: (broker: Omit<Broker, 'id'>) => void;
  onToggleBroker: (id: string) => void;
  onResetToDefaults: () => void;
  onClearAllDataToZero?: () => void;
  onOpenSecurityModal?: (tab?: 'backup' | 'import' | 'password' | 'inspect') => void;
  hasPassword?: boolean;
  onLockApp?: () => void;
  autoLockMinutes?: number;
  onUpdateAutoLock?: (minutes: number) => void;
  securityHint?: string;
  onUpdateHint?: (hint: string) => void;
  onRefreshQuotesOnline?: () => Promise<any>;
}

export function BrokersConfigView({
  brokers,
  onAddBroker,
  onToggleBroker,
  onResetToDefaults,
  onClearAllDataToZero,
  onOpenSecurityModal,
  hasPassword = false,
  onLockApp,
  autoLockMinutes = 15,
  onUpdateAutoLock,
  securityHint,
  onUpdateHint,
  onRefreshQuotesOnline,
}: BrokersConfigViewProps) {
  const [activeTab, setActiveTab] = useState<'seguridad' | 'copias' | 'brokers' | 'impuestos' | 'divisas' | 'general'>('seguridad');
  const [showZeroConfirmModal, setShowZeroConfirmModal] = useState(false);
  const [zeroSuccessMsg, setZeroSuccessMsg] = useState(false);

  // Password Hint state
  const [hintInput, setHintInput] = useState(securityHint || '');
  const [hintSavedToast, setHintSavedToast] = useState(false);

  useEffect(() => {
    setHintInput(securityHint || '');
  }, [securityHint]);

  const handleSaveHint = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onUpdateHint) {
      onUpdateHint(hintInput);
      setHintSavedToast(true);
      setTimeout(() => setHintSavedToast(false), 4000);
    }
  };

  // Broker creation modal state
  const [isAdding, setIsAdding] = useState(false);
  const [newBrokerName, setNewBrokerName] = useState('');
  const [newBrokerType, setNewBrokerType] = useState('USA / Europa');

  // Tax rates
  const [usWithholding, setUsWithholding] = useState(15);
  const [esWithholding, setEsWithholding] = useState(19);

  // FX rates
  const [usdEurRate, setUsdEurRate] = useState(() => getStoredFxRates().usdEur);
  const [gbpEurRate, setGbpEurRate] = useState(() => getStoredFxRates().gbpEur);
  const [isUpdatingFx, setIsUpdatingFx] = useState(false);
  const [fxToast, setFxToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lastFxUpdatedAt, setLastFxUpdatedAt] = useState<string | null>(() => getStoredFxRates().updatedAt || null);

  const handleUpdateFxLive = async () => {
    setIsUpdatingFx(true);
    setFxToast(null);
    try {
      const live = await fetchLiveFxRates();
      if (live && live.usdEur > 0) {
        setUsdEurRate(live.usdEur);
        setGbpEurRate(live.gbpEur);
        const timeNow = live.updatedAt || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastFxUpdatedAt(timeNow);
        setFxToast({
          type: 'success',
          message: `¡Divisas sincronizadas con éxito al mercado en vivo! 1 € = ${live.usdEur.toFixed(4)} $ USD · 1 € = ${live.gbpEur.toFixed(4)} £ GBP (${timeNow})`
        });
        if (onRefreshQuotesOnline) {
          await onRefreshQuotesOnline();
        }
      } else {
        setFxToast({
          type: 'error',
          message: 'No se pudo obtener el tipo de cambio en tiempo real. Se mantienen los valores guardados.'
        });
      }
    } catch (e) {
      console.warn(e);
      setFxToast({
        type: 'error',
        message: 'Error de conexión al consultar el tipo de cambio de divisas.'
      });
    } finally {
      setIsUpdatingFx(false);
      setTimeout(() => setFxToast(null), 6000);
    }
  };

  const handleSaveManualFx = () => {
    const timeNow = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    saveStoredFxRates({
      usdEur: usdEurRate,
      gbpEur: gbpEurRate,
      updatedAt: timeNow,
    });
    setLastFxUpdatedAt(timeNow);
    setFxToast({
      type: 'success',
      message: `Tipos de cambio guardados manualmente: 1 € = ${usdEurRate.toFixed(4)} $ · 1 € = ${gbpEurRate.toFixed(4)} £`
    });
    setTimeout(() => setFxToast(null), 4000);
  };

  const handleSaveBroker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrokerName.trim()) return;
    onAddBroker({
      name: newBrokerName.trim(),
      type: newBrokerType,
      active: true,
      notes: 'Broker configurado por el usuario',
    });
    setNewBrokerName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Configuration Header & Navigation */}
      <div className="bg-[#12233f] border border-slate-700/70 p-5 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Configuración y Seguridad</span>
              </h2>
              <p className="text-xs text-slate-400">
                Contraseña de acceso, copias de seguridad cifradas, intermediarios (brokers), impuestos y divisas
              </p>
            </div>
          </div>

          {/* Badge de seguridad global */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                hasPassword
                  ? 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-600/50 text-amber-300'
              }`}
            >
              {hasPassword ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{hasPassword ? 'Protegida con contraseña' : 'Sin contraseña (acceso libre)'}</span>
            </span>
          </div>
        </div>

        {/* 6 Tabs */}
        <div className="flex border-b border-slate-800 gap-1 sm:gap-2 overflow-x-auto text-xs sm:text-sm font-semibold pb-1 scrollbar-none">
          {[
            { id: 'seguridad', label: 'Seguridad y Acceso', icon: <Lock className="w-3.5 h-3.5" /> },
            { id: 'copias', label: 'Copias de Seguridad', icon: <Database className="w-3.5 h-3.5" /> },
            { id: 'brokers', label: 'Brokers y Cuentas', icon: <Briefcase className="w-3.5 h-3.5" /> },
            { id: 'impuestos', label: 'Fiscalidad / IRPF', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
            { id: 'divisas', label: 'Divisas (€/$)', icon: <DollarSign className="w-3.5 h-3.5" /> },
            { id: 'general', label: 'General / Reset', icon: <Sliders className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3 sm:px-4 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SEGURIDAD Y ACCESO */}
      {activeTab === 'seguridad' && (
        <div className="space-y-6">
          {/* Main Security Card */}
          <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-start sm:items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
                    hasPassword
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-950/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-950/40'
                  }`}
                >
                  {hasPassword ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">
                      {hasPassword ? 'Contraseña de la Aplicación Activada' : 'Contraseña de Acceso Desactivada'}
                    </h3>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        hasPassword
                          ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                          : 'bg-amber-950 border border-amber-700 text-amber-300'
                      }`}
                    >
                      {hasPassword ? 'Protegido' : 'Acceso Libre'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    {hasPassword
                      ? 'La aplicación solicita la contraseña obligatoria (máximo 20 dígitos) antes de entrar a la cartera. Si deseas bloquearla en cualquier momento, dispones del botón rojo «Bloquear» en la barra superior (accesible desde todas las pantallas).'
                      : 'Cualquier persona puede ver la cartera en este dispositivo. Te recomendamos configurar una contraseña de protección (máximo 20 caracteres o dígitos) para blindar tus datos sensibles y proteger el acceso.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                <button
                  onClick={() => onOpenSecurityModal && onOpenSecurityModal('password')}
                  className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-950/40 cursor-pointer active:scale-95"
                >
                  <KeyRound className="w-4 h-4 text-amber-300" />
                  <span>{hasPassword ? '🔑 Cambiar Contraseña (máx. 20 dígitos)' : 'Crear Contraseña (máx. 20 dígitos)'}</span>
                </button>
              </div>
            </div>

            {/* Guía muy visible: ¿Dónde cambiar tu contraseña? */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/70 via-indigo-950/40 to-slate-900 border border-blue-500/40 text-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Gestión de tu contraseña de acceso</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-900/80 text-cyan-300 border border-blue-700">
                  Máximo 20 dígitos
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Para cambiar tu contraseña o crear una nueva en cualquier momento, pulsa el botón azul <strong>«🔑 Cambiar Contraseña»</strong> situado justo arriba.
              </p>
              <p className="text-cyan-300 text-[11px] font-medium pt-0.5">
                Al pulsar, introduce tu contraseña actual y la nueva contraseña de hasta 20 dígitos o caracteres. También dispones de generadores automáticos de 20 dígitos y copiado al portapapeles.
              </p>
            </div>

            {/* SECCIÓN DESTACADA: Poner Toda la Aplicación a Cero */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-900 border-2 border-rose-500/50 space-y-3 shadow-lg">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Poner Toda la Aplicación a Cero</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700">
                        Para introducir tus datos reales
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Limpia todas las acciones, compras, ventas, dividendos y valores de seguimiento de prueba. El saldo se reinicia a <strong>0,00 €</strong>.
                      <strong className="text-white block mt-0.5">
                        Tu contraseña de acceso y tus brokers se conservarán intactos.
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              {zeroSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">
                    ¡Aplicación puesta a cero con éxito! Toda la cartera está en 0,00 € lista para registrar tus inversiones reales.
                  </span>
                </div>
              )}

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowZeroConfirmModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-rose-950/50 cursor-pointer transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Poner Toda la Aplicación a Cero</span>
                </button>

                <button
                  type="button"
                  onClick={onResetToDefaults}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                  title="Restaurar de nuevo los datos de demostración si deseas volver a probarlos"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Recargar datos de prueba (Demo)</span>
                </button>
              </div>
            </div>

            {/* Inactivity Auto-Lock Setting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Bloqueo automático por inactividad</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Si dejas la pestaña abierta sin interactuar durante este tiempo, la pantalla se bloqueará automáticamente solicitando de nuevo la contraseña.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <select
                    value={autoLockMinutes}
                    onChange={e => onUpdateAutoLock && onUpdateAutoLock(Number(e.target.value))}
                    disabled={!hasPassword}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value={2}>2 minutos</option>
                    <option value={5}>5 minutos</option>
                    <option value={15}>15 minutos (recomendado)</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={0}>Desactivado (nunca bloquear por inactividad)</option>
                  </select>
                  {!hasPassword && (
                    <span className="text-[11px] text-amber-400 italic">
                      (Requiere tener contraseña activa)
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <span>Pista o recordatorio de contraseña</span>
                  </div>
                  {hintSavedToast && (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" /> ¡Pista guardada!
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Pista visible en la pantalla de bloqueo si pulsas «¿Olvidaste la clave?».
                </p>
                <form onSubmit={handleSaveHint} className="pt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={hintInput}
                    onChange={e => setHintInput(e.target.value)}
                    placeholder="Escribe tu pista aquí (ej: nombre de mi perro, fecha boda...)"
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm transition-all active:scale-95 whitespace-nowrap"
                  >
                    Guardar
                  </button>
                </form>
                {securityHint ? (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <span>Pista activa:</span>
                    <strong className="text-cyan-300 font-mono">"{securityHint}"</strong>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 italic pt-0.5">
                    Escribe tu pista arriba y pulsa Guardar para registrarla.
                  </p>
                )}
              </div>
            </div>

            {/* Information note about security */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40 text-blue-200 text-xs flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold text-white">Seguridad local de conocimiento cero (Zero-Knowledge)</p>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Tu contraseña nunca viaja a ningún servidor externo. El hash se calcula directamente en tu navegador usando la API criptográfica nativa PBKDF2 (SHA-256 con 100.000 iteraciones). Si cambias de contraseña, podrás descifrar tus copias anteriores introduciendo la clave con la que fueron creadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COPIAS DE SEGURIDAD CIFRADAS (.cartera) */}
      {activeTab === 'copias' && (
        <div className="space-y-6">
          <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                Copias de Seguridad Cifradas con Fecha y Hora
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                Tus datos de inversiones se guardan en un archivo con formato <code>.cartera</code> con la <strong>fecha y hora exacta en el nombre</strong> (ej: <code>copia_cartera_2026-10-10_12-30-00.cartera</code>). El archivo está totalmente cifrado mediante <strong>AES-256-GCM</strong> y <strong>es imposible de abrir o leer sin la contraseña</strong>.
              </p>
            </div>

            {/* 3 Main Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Card 1: Descargar Copia */}
              <div className="bg-slate-900/90 border border-cyan-800/60 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-cyan-500 transition-colors">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-sm">1. Guardar Copia Cifrada</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Descarga tu archivo <code>.cartera</code> protegido con contraseña. Contiene todos tus valores, operaciones, dividendos, brokers y configuraciones.
                  </p>
                </div>
                <button
                  onClick={() => onOpenSecurityModal && onOpenSecurityModal('backup')}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Crear Copia Cifrada</span>
                </button>
              </div>

              {/* Card 2: Importar y Restaurar */}
              <div className="bg-slate-900/90 border border-emerald-800/60 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-emerald-500 transition-colors">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-sm">2. Importar Copia de Seguridad</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Carga un archivo de respaldo. La aplicación te <strong>pedirá la contraseña</strong> para descifrarlo, validará su integridad y restaurará tu cartera.
                  </p>
                </div>
                <button
                  onClick={() => onOpenSecurityModal && onOpenSecurityModal('import')}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileKey className="w-4 h-4" />
                  <span>Importar (Pedirá Contraseña)</span>
                </button>
              </div>

              {/* Card 3: Visor Seguro */}
              <div className="bg-slate-900/90 border border-amber-800/60 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-amber-500 transition-colors">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <FileKey className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-sm">3. Examinar Archivo Cifrado</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Introduce la contraseña para inspeccionar y ver el contenido de cualquier copia sin modificar ni alterar tus datos actuales en la aplicación.
                  </p>
                </div>
                <button
                  onClick={() => onOpenSecurityModal && onOpenSecurityModal('inspect')}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Examinar Archivo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BROKERS TABLE */}
      {activeTab === 'brokers' && (
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl shadow-xl overflow-hidden p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Brokers y Cuentas de Inversión</h3>
              <p className="text-xs text-slate-400">Entidades financieras donde operas tus compras, ventas y cobro de dividendos.</p>
            </div>
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir broker</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0e1b30] text-slate-400 font-semibold border-b border-slate-700/80">
                <tr>
                  <th className="py-3 px-4">Broker</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {brokers.map(brk => (
                  <tr key={brk.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>{brk.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{brk.type}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onToggleBroker(brk.id)}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                          brk.active
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {brk.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onToggleBroker(brk.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Cambiar estado"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Broker form */}
          {isAdding && (
            <form onSubmit={handleSaveBroker} className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
              <h4 className="text-xs font-bold text-white">Nuevo Broker</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newBrokerName}
                  onChange={e => setNewBrokerName(e.target.value)}
                  placeholder="Nombre del broker (ej. MyInvestor, Scalable, Degiro)"
                  required
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
                <select
                  value={newBrokerType}
                  onChange={e => setNewBrokerType(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="USA / Europa">USA / Europa</option>
                  <option value="España">España</option>
                  <option value="Europa">Europa</option>
                  <option value="Global">Global</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Guardar Broker
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 4: IMPUESTOS */}
      {activeTab === 'impuestos' && (
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white">Configuración Fiscal & Retenciones</h3>
          <p className="text-xs text-slate-400">Porcentajes de retención aplicados por defecto al calcular dividendos netos e informes fiscales.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="font-semibold text-slate-300 block">Retención en Origen USA (W-8BEN):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={usWithholding}
                  onChange={e => setUsWithholding(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono w-24"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500">Convenio de doble imposición internacional España - Estados Unidos.</p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="font-semibold text-slate-300 block">Retención Estatal en España (AEAT):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={esWithholding}
                  onChange={e => setEsWithholding(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono w-24"
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500">Tipo de retención estándar a cuenta del IRPF sobre el capital mobiliario.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DIVISAS */}
      {activeTab === 'divisas' && (
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Tipos de Cambio Oficiales respecto al Euro (€)</h3>
                {lastFxUpdatedAt && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                    Última sinc: {lastFxUpdatedAt}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Conversión de activos en dólares estadounidenses (USD) o libras esterlinas (GBP) a la moneda base de la cartera (EUR).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveManualFx}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600/70 text-slate-200 hover:text-white flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
                title="Guardar tipos de cambio introducidos manualmente"
              >
                <Check className="w-3.5 h-3.5 text-slate-300" />
                <span>Guardar manual</span>
              </button>
              <button
                type="button"
                onClick={handleUpdateFxLive}
                disabled={isUpdatingFx}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-200 hover:text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-60"
                title="Consultar tipos de cambio en vivo desde los mercados financieros internacionales"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isUpdatingFx ? 'animate-spin' : ''}`} />
                <span>{isUpdatingFx ? 'Actualizando divisas...' : 'Actualizar con mercado en vivo'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Toast / Alert inside Divisas */}
          {fxToast && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 ${
                fxToast.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-amber-950/80 border-amber-500/50 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {fxToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-medium">{fxToast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFxToast(null)}
                className="text-slate-400 hover:text-white px-1 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="font-semibold text-slate-300 block">Dólar Estadounidense (EUR / USD):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={usdEurRate}
                  onChange={e => setUsdEurRate(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono w-32 focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-slate-400 font-bold">$ / €</span>
              </div>
              <p className="text-[11px] text-slate-400">
                1 € = {(usdEurRate).toFixed(4)} USD (aprox. {(usdEurRate > 0 ? (1 / usdEurRate).toFixed(4) : 0)} € por dólar)
              </p>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="font-semibold text-slate-300 block">Libra Esterlina (EUR / GBP):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={gbpEurRate}
                  onChange={e => setGbpEurRate(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono w-32 focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-slate-400 font-bold">£ / €</span>
              </div>
              <p className="text-[11px] text-slate-400">
                1 € = {(gbpEurRate).toFixed(4)} GBP (aprox. {(gbpEurRate > 0 ? (1 / gbpEurRate).toFixed(4) : 0)} € por libra)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: GENERAL & RESET */}
      {activeTab === 'general' && (
        <div className="bg-[#12233f] border border-slate-700/70 rounded-2xl p-6 shadow-xl space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Copia de Seguridad Rápida</h3>
            <p className="text-slate-400 leading-relaxed">
              Exporta todos tus datos o restaura copias anteriores protegidas por contraseña.
            </p>

            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={() => onOpenSecurityModal && onOpenSecurityModal('backup')}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Descargar copia de seguridad cifrada (.cartera)</span>
              </button>

              <button
                onClick={() => onOpenSecurityModal && onOpenSecurityModal('import')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Restaurar copia (pedirá contraseña)</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2 text-rose-300">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Poner Toda la Aplicación a Cero (Limpiar Datos de Prueba)</span>
              </h3>
              <p className="text-slate-400 leading-relaxed mb-3">
                Vacía la cartera completamente para empezar a meter tus datos reales. Se eliminan las acciones, operaciones, dividendos y seguimiento de prueba. El saldo pasa a 0,00 €. Los brokers configurados y la contraseña se mantienen.
              </p>

              <button
                type="button"
                onClick={() => setShowZeroConfirmModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-rose-950/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>Poner Toda la Aplicación a Cero</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2 text-slate-300">
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>Cargar Datos de Demostración (Demo Inicial)</span>
              </h3>
              <p className="text-slate-400 leading-relaxed mb-3">
                Si alguna vez deseas volver a cargar los datos de ejemplo iniciales para probar funciones, puedes pulsar aquí.
              </p>

              <button
                type="button"
                onClick={onResetToDefaults}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                <span>Recargar datos de fábrica (Demo)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN: PONER A CERO */}
      {showZeroConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0d1a2d] border-2 border-rose-500/70 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  ¿Poner toda la aplicación a cero?
                </h3>
                <p className="text-xs text-rose-300 font-semibold">
                  Preparación para introducir tus propios datos e inversiones
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs leading-relaxed">
              <p className="text-white font-bold">
                Esta acción realizará lo siguiente:
              </p>
              <ul className="text-slate-300 space-y-1 list-disc list-inside">
                <li>Eliminará todas las posiciones abiertas y cerradas de prueba.</li>
                <li>Eliminará el historial de operaciones y dividendos de prueba.</li>
                <li>Limpiará la lista de seguimiento.</li>
                <li>Reiniciará el saldo de efectivo en cartera a <strong>0,00 €</strong>.</li>
              </ul>
              <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0" />
                <span>Tu contraseña de acceso y tus brokers configurados se conservarán.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowZeroConfirmModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs cursor-pointer border border-slate-700 transition-all text-center"
              >
                Cancelar (Mantener datos)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllDataToZero) {
                    onClearAllDataToZero();
                  }
                  setShowZeroConfirmModal(false);
                  setZeroSuccessMsg(true);
                  setTimeout(() => setZeroSuccessMsg(false), 8000);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-rose-950/60 transition-all text-center active:scale-95"
              >
                Sí, poner todo a cero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
