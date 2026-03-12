<div align="center">
  <!-- Reemplaza la siguiente imagen con el logo de tu proyecto -->
  <img src="https://via.placeholder.com/150?text=PowerLink+Logo" alt="PowerLink Logo" width="150" />
  <h1>PowerLink IoT Smart Home Platform</h1>
  <p>Plataforma avanzada de Internet de las Cosas para el monitoreo de energía en tiempo real, control de dispositivos en el hogar y proyecciones dinámicas de costos, construida mediante Supabase y microcontroladores ESP32.</p>
  
  [![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Supabase](https://img.shields.io/badge/Supabase-Enabled-42ce9f?logo=supabase&logoColor=white)](https://supabase.com)
  [![JavaScript Vanilla](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
</div>

---

## 📖 Acerca del Proyecto

**PowerLink** es una plataforma integral de hogar inteligente que une el software y el hardware para darte control total sobre el consumo eléctrico de tu casa. Permite emparejar múltiples módulos como el ESP32, ingerir de manera segura la lectura de los consumos, generar previsiones del costo eléctrico mensual con analítica, e integrarse con ecosistemas de terceros como Alexa o Google Assistant mediante OAuth 2.0 nativo. 

## ✨ Características Principales

- 📊 **Dashboard Analítico:** Visualización en tiempo real del consumo en kWh y calculadoras en vivo proyectando el costo mensual total.
- 🔌 **Gestión Avanzada de Dispositivos:** Descubrimiento pasivo de hardware en la misma red, asignación manual de IPs, cruce de grupos (ej: "Oficina", "Sala") e interruptor en tiempo real (relés).
- 🚨 **Detección Dinámica de Anomalías:** Motor backend automatizado que compara tu uso de hardware histórico y lanza alertas precisas (uso continuo excesivo, 'vampiros', picos anómalos).
- 🎙️ **Integración Asistente de Voz (V6.2):** Servidor OAuth2 propio integrado para crear tus _Custom Skills_ e interactuar directamente (Ej: "Apaga la refrigeradora").
- ⚡ **Tiempo Real Real:** Aprovechando los WebSockets y RPC de Supabase, PowerLink te refleja los cambios de dispositivo instantáneamente, sin necesidad de refrescar para conocer el estado actual.

## 🏗️ Arquitectura del Sistema

El ecosistema entero está compuesto de 3 componentes tecnológicos muy específicos:

1. **Frontend "One-Page" (SPA)**
   - App diseñada a medida con **Vanilla JavaScript** y DOM dinámico para ser lo más ligera posible, utilizando **Chart.js** para renderizado avanzado y comparativas de datos temporales (Hoy, Semana y Mes).
   - Componentes principales integrados en módulos modulares (AppShell principal, Modales, Vistas).

2. **Backend "Serverless" (Supabase)**
   - Toda la lógica se delega al BaaS: PostgreSQL, WebSockets para publicación de estado en tiempo real (Supabase Realtime) y Edge Functions.
   - Cron Jobs integrados para la agregación de métricas nocturnas y creación de históricos al largo plazo.

3. **Edge IoT Network (Hardware)**
   - C/C++ en plataformas empotradas (ESP32/ESP8266).
   - Capa TCP/IP manejando conexiones MQTT ó endpoints HTTP a `/ingest` donde se autentica al equipo con su propia huella y encriptación.

## 🚀 Guía de Instalación y Uso Local

### Prerrequisitos
- Node.js o extensión de Servidor Web (ej: Live Server en VSCode).
- Tu propia instancia (en la nube o en docker local) de **Supabase**.
- Módulos de Hardware ESP32 para las pruebas físicas.

### Configuración del Panel Web (Frontend)

1. **Clona este repositorio localmente**:
   ```bash
   git clone https://github.com/tu-usuario/PowerLink-2.git
   cd PowerLink-2
   ```

2. **Conecta las credenciales de tu DB**:
   Deberás proveer a la app (generalmente en `supabase.js`) con las llaves extraídas de tu entorno:
   ```javascript
   const supabaseUrl = 'TU_URL_AQUI_SUPABASE';
   const supabaseKey = 'TU_LLAVE_ANONIMA_AQUI';
   ```

3. **Despliega la app**:
   PowerLink está hecho con JS nativo sin requerir de entornos bundlers complicados, lánzalo estáticamente:
   ```bash
   npx serve .
   ```
   > Y dirígete a `http://localhost:3000` en tu navegador.

## 📂 Organización del Arbol de Archivos (Frontend Stack)

```text
/assets
  ├── /js
  │   ├── app.js             (Flujos PWA, layout, guardias de sesión)
  │   ├── supabase.js        (Cliente y conexión DB BaaS)
  │   └── /views
  │       ├── dashboard.js   (Módulo Resumen y Tarjetas analíticas)
  │       ├── devices.js     (Listados y control lógico de relés)
  │       ├── deviceDetail.js(Detalles profundos, control por fechas)
  │       └── settings.js    (Formularios y ajustes de costos kWh)
```

## 🤝 ¿Cómo Contribuir?
Las Pull Requests son 100% bienvenidas. Para proponer mayores novedades al core, por favor abre un _issue_ con anticipación para poder dialogar del cambio exacto a incorporar. 

1. Haz un Fork y clona tu repositorio en el PC.
2. Crea tu rama para una nueva característica (`git checkout -b feature/MiCaracteristicaMortal`).
3. Comitea el estado con convención clara (`git commit -m 'feat: Añadir analítica avanzada'`).
4. Súbelo (`git push origin feature/MiCaracteristicaMortal`) y abre el respectivo Pull Request.

---
**PowerLink IoT 2026** - Construyendo cimientos accesibles para la energía inteligente, una línea de código a la vez.
