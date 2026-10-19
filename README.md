# Cartera de Valores 📈

> **Gestión integral de carteras de inversión, acciones USA y europeas, plusvalías FIFO, dividendos con retenciones, informes fiscales para IRPF y soporte PWA móvil.**

Diseñado con interfaz profesional y probado con las 12 pantallas de gestión patrimonial:
1. **Pantalla principal / Dashboard**: Valor actual (248.532,75 €), Rentabilidad total (+12,4%), Dividendos anuales (4.892,30 €) y gráfico de evolución y diversificación por sectores.
2. **Cartera actual (posiciones abiertas)**: Tabla interactiva completa con Microsoft, Apple, Meta, Amazon, Alphabet, Siemens, Santander y resto de posiciones con plusvalías latentes.
3. **Detalle de una acción**: Ficha interactiva por valor (resumen, gráfico técnico, operaciones asociadas, dividendos cobrados y noticias de mercado).
4. **Operaciones**: Registro de compras y ventas con cálculo de costes y comisiones.
5. **Carteras cerradas por años**: Rendimientos cerrados organizados por ejercicio con método FIFO.
6. **Dividendos**: Detalle de cobros con desglose de retención en origen (ej. 15% USA / 19% España) y neto percibido.
7. **Análisis y gráficos**: Gráfico donut por sectores, barras de rentabilidad por países y Top 5 posiciones.
8. **Fiscal / IRPF**: Resumen para la declaración de la renta y checklist oficial de la AEAT.
9. **Informes y exportación**: Generación de informes en PDF e importación/exportación a Excel / CSV.
10. **Calendario y previsión de dividendos**: Calendario mensual interactivo con alertas de cobro.
11. **Gestión de brokers y configuración**: Soporte para Interactive Brokers, Trade Republic, ClickTrade y DeGiro.
12. **Menú lateral completo y ventajas**: Responsive para escritorio, tablet y smartphone.

---

## 🚀 Guía Paso a Paso: Subir a GitHub

### 1. Inicializar Git y primer commit
En la carpeta del proyecto en tu ordenador, abre la terminal y ejecuta:

```bash
git init
git add .
git commit -m "feat: Cartera de Valores completa para web y móvil"
```

### 2. Crear el repositorio en GitHub y subirlo
1. Ve a [github.com/new](https://github.com/new) con tu cuenta de GitHub.
2. Nómbralo `cartera-de-valores`.
3. Ejecuta los siguientes comandos (reemplazando `tu-usuario` por tu nombre de usuario de GitHub):

```bash
git branch -M main
git remote add origin https://github.com/tu-usuario/cartera-de-valores.git
git push -u origin main
```

---

## 🌐 Publicar como Aplicación Web (100% Gratis)

### Despliegue en Vercel (Recomendado):
1. Inicia sesión en [Vercel](https://vercel.com) con tu cuenta de GitHub.
2. Pulsa en **"Add New Project"** y selecciona tu repositorio `cartera-de-valores`.
3. Haz clic en **"Deploy"**. En 30 segundos tendrás un enlace seguro con HTTPS.

---

## 📱 Convertir en Aplicación Móvil

### Opción A: Como PWA (Instantáneo sin coste ni tiendas)
La aplicación ya incluye `manifest.json` y diseño responsive táctil:
- **En Android (Chrome):** Abre tu enlace web desplegado, toca el menú de tres puntos verticales y selecciona **"Instalar aplicación"** o **"Añadir a pantalla de inicio"**.
- **En iPhone (Safari):** Abre el enlace, pulsa el botón Compartir y elige **"Añadir a pantalla de inicio"**.
- Se abrirá a pantalla completa como una app nativa con el icono de la Cartera de Valores.

### Opción B: Como APK nativa para Android (con Capacitor)
Para generar un archivo instalable `.apk` para tu móvil o subirlo a Google Play Store:

```bash
# 1. Instalar dependencias de Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Inicializar Capacitor
npx cap init "Cartera de Valores" "com.carteradevalores.app" --web-dir dist

# 3. Compilar la app
npm run build

# 4. Añadir plataforma Android
npx cap add android

# 5. Abrir en Android Studio
npx cap open android
```

En Android Studio: ve al menú superior **Build > Build Bundle(s) / APK(s) > Build APK(s)** para obtener tu archivo instalable.

---

## 🛠️ Tecnologías Utilizadas
- **React 19** + **TypeScript**
- **Vite** para compilación ultrarrápida
- **Tailwind CSS v4** con modo oscuro financiero
- **Lucide React** para iconografía
- **PWA Ready** (Progressive Web Application)
