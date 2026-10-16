import React, { useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, Shield, AlertCircle, HelpCircle, ArrowRight, Upload } from 'lucide-react';

interface LockScreenProps {
  onUnlock: (password: string) => Promise<{ success: boolean; error?: string }>;
  hint?: string;
  onOpenRestoreFromLock?: () => void;
}

export function LockScreen({ onUnlock, hint, onOpenRestoreFromLock }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await onUnlock(password);
      if (!res.success) {
        setError(res.error || 'Contraseña incorrecta');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al validar la contraseña');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070e1c] p-4 text-slate-100 overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div
        className={`relative w-full max-w-md bg-[#0f1d33] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-transform ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Top Vault / Lock Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-900/50">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-[#0f1d33]">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Cartera de Valores
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Acceso protegido con cifrado AES-256 local
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Contraseña de acceso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value.slice(0, 20));
                  if (error) setError(null);
                }}
                autoFocus
                placeholder="Introduce tu contraseña (máximo 20 dígitos)..."
                maxLength={20}
                className="w-full bg-[#0a1424] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 pr-11 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 px-1">
                <span>Dígitos introducidos:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {password.length}/20 (máx. 20)
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Hint disclosure */}
          {hint && (
            <div className="text-right">
              {showHint ? (
                <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-left text-xs text-cyan-300">
                  <HelpCircle className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-slate-300">Pista configurada:</span>
                    <span className="text-slate-200 font-mono text-[11px]">{hint}</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 ml-auto"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Olvidaste la clave? Ver pista
                </button>
              )}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-900/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Desbloquear Cartera</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info & restore option */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] text-slate-400">
            Tus datos de inversiones se guardan de forma privada y cifrada en tu dispositivo.
          </p>

          {onOpenRestoreFromLock && (
            <button
              onClick={onOpenRestoreFromLock}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 mt-1"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar copia de seguridad con su contraseña</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
