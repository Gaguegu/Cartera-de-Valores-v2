import React, { useState } from 'react';
import { X, Check, Copy, Github, Smartphone, Globe, Terminal, ShieldCheck, Download, ExternalLink, Sparkles } from 'lucide-react';

interface GitHubMobileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitHubMobileGuideModal({ isOpen, onClose }: GitHubMobileGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'github' | 'web' | 'pwa' | 'android'>('github');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const gitCommands = `# 1. En la carpeta de tu proyecto en tu ordenador, abre la terminal y ejecuta:
git init
git add .
git commit -m "feat: Cartera de Valores completa con soporte web y móvil"

# 2. Crea un repositorio nuevo en GitHub (por ejemplo "cartera-de-valores")
# y vincula tu repositorio local (cambia 'tu-usuario' por tu cuenta de GitHub):
git branch -M main
git remote add origin https://github.com/tu-usuario/cartera-de-valores.git
git push -u origin main`;

  const capacitorCommands = `# 1. Instala Capacitor en la raíz del proyecto:
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Inicializa la configuración móvil nativa:
npx cap init "Cartera de Valores" "com.carteradevalores.app" --web-dir dist

# 3. Compila la aplicación:
npm run build

# 4. Añade la plataforma Android:
npx cap add android

# 5. Abre el proyecto en Android Studio:
npx cap open android

# 6. En Android Studio: Menú 'Build' > 'Build Bundle(s) / APK(s)' > 'Build APK(s)'
# ¡Ya tienes tu archivo .apk para instalar directamente en cualquier móvil Android!`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Guía Paso a Paso: Subir a GitHub y Convertir en App Web & Móvil
              </h2>
              <p className="text-xs text-slate-400">
                Todo lo necesario para publicar y llevar tu Cartera de Valores en el bolsillo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 sm:gap-4 overflow-x-auto text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('github')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'github'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" /> 1. Subir a GitHub
          </button>
          <button
            onClick={() => setActiveTab('web')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'web'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" /> 2. Publicar Web Gratis
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'pwa'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" /> 3. App Móvil (PWA)
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`py-3.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'android'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" /> 4. APK Android Nativa
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-sm">
          {/* TAB 1: GITHUB */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 text-xs text-blue-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-300 block mb-1">
                    Tu código ya está estructurado y optimizado con Vite, React y TypeScript
                  </span>
                  Sigue estos tres sencillos pasos para tener tu copia en GitHub con control de versiones y copia de seguridad en la nube.
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                  Crea un repositorio en GitHub
                </h4>
                <p className="text-xs text-slate-400 pl-8">
                  Entra en <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-blue-400 underline">github.com/new</a> con tu cuenta de GitHub, ponle de nombre <span className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">cartera-de-valores</span> y déjalo como <em>Público</em> o <em>Privado</em>. No marques la casilla de añadir README (ya lo tenemos preparado).
                </p>

                <h4 className="font-bold text-white flex items-center gap-2 text-sm pt-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                  Ejecuta estos comandos en tu ordenador
                </h4>
                
                <div className="relative bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                  <button
                    onClick={() => copyToClipboard(gitCommands, 'git')}
                    className="absolute top-3 right-3 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    {copiedIndex === 'git' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar comandos
                      </>
                    )}
                  </button>
                  <pre className="pr-24">{gitCommands}</pre>
                </div>

                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-400">
                  💡 <strong className="text-slate-200">Consejo:</strong> A partir de ese momento, cada vez que hagas cambios en la aplicación solo tendrás que ejecutar <code className="text-emerald-400 font-mono">git add . && git commit -m "mis cambios" && git push</code>.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEB GRATIS */}
          {activeTab === 'web' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-white">Publica tu cartera en la web en menos de 2 minutos (100% Gratis)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Una vez que tu código esté en GitHub, puedes desplegarlo gratuitamente en plataformas de alta velocidad como Vercel o Netlify con certificado SSL seguro (https://).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Opción A: Vercel (Recomendado)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold">Más fácil</span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pt-1">
                    <li>Entra en <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">vercel.com</a> e inicia sesión con tu GitHub.</li>
                    <li>Haz clic en <strong>"Add New Project"</strong>.</li>
                    <li>Selecciona tu repositorio <span className="font-mono text-slate-200">cartera-de-valores</span>.</li>
                    <li>Haz clic en <strong>"Deploy"</strong>. En 30 segundos tendrás tu enlace público con HTTPS.</li>
                  </ol>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Opción B: Netlify</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-semibold">Alternativa</span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pt-1">
                    <li>Entra en <a href="https://netlify.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">netlify.com</a>.</li>
                    <li>Haz clic en <strong>"Import from Git"</strong>.</li>
                    <li>Elige GitHub y selecciona el repositorio.</li>
                    <li>Netlify detectará automáticamente Vite y creará tu URL instantánea.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PWA MOVIL */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">App Móvil Instantánea (PWA - Progressive Web App)</h3>
                  <p className="text-xs text-slate-400">Sin pasar por Google Play, sin pagar licencias de desarrollador y con actualización automática</p>
                </div>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 text-xs text-emerald-200">
                ✅ <strong>Ya lo hemos dejado configurado en el proyecto:</strong> Incluye <code className="font-mono">manifest.json</code>, metadatos móviles táctiles y pantalla completa standalone para que funcione igual que cualquier app nativa.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    🤖 En Móvil Android (Google Chrome)
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Abre el enlace de tu app en Chrome desde tu móvil.</li>
                    <li>Toca los <strong>3 puntos verticales</strong> de la esquina superior derecha.</li>
                    <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</li>
                    <li>¡Listo! Aparecerá el icono de Cartera de Valores en tu móvil y se abrirá a pantalla completa.</li>
                  </ul>
                </div>

                <div className="bg-slate-800/50 border border-slate-800 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    🍏 En iPhone / iPad (Safari)
                  </h4>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>Abre la app en Safari.</li>
                    <li>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba).</li>
                    <li>Baja y pulsa en <strong>"Añadir a pantalla de inicio"</strong>.</li>
                    <li>Tendrás la aplicación como app independiente sin barras de Safari.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ANDROID NATIVA */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-white">Generar archivo APK nativo para Android (Capacitor)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Si deseas un archivo instalable <span className="font-mono text-emerald-400">.apk</span> para enviar por WhatsApp, instalar manualmente o subir a Google Play Store, Capacitor convierte este mismo proyecto en nativo:
              </p>

              <div className="relative bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
                <button
                  onClick={() => copyToClipboard(capacitorCommands, 'cap')}
                  className="absolute top-3 right-3 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  {copiedIndex === 'cap' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar comandos
                    </>
                  )}
                </button>
                <pre className="pr-24">{capacitorCommands}</pre>
              </div>

              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-white block">Requisitos previos para generar APK:</span>
                <p className="text-slate-400">
                  Tener instalado <strong>Node.js</strong> y <strong>Android Studio</strong> gratuito en tu ordenador.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Cartera de Valores · Gestión Integral de Inversiones
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
          >
            Entendido, continuar en la app
          </button>
        </div>
      </div>
    </div>
  );
}
