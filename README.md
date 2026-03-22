<div align="center">
  <img src="/assets/img/favicon.png" alt="PowerLink Logo" width="150" />
  <h1>PowerLink | Smart Home Energy Platform</h1>
  <p>Plataforma integral de Internet de las Cosas (IoT) para el monitoreo eléctrico en tiempo real, gestión de dispositivos y proyecciones dinámicas de consumo.</p>
  
  [![Licencia: Propietaria](https://img.shields.io/badge/Licencia-Propietaria-red.svg)](https://choosealicense.com/no-permission/)
  [![Supabase](https://img.shields.io/badge/Supabase-Enabled-42ce9f?logo=supabase&logoColor=white)](https://supabase.com)
  [![JavaScript Vanilla](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
</div>

---

## 📖 Acerca del Producto

**PowerLink** es una solución de hardware y software diseñada para otorgar a los usuarios control total y visibilidad sobre su consumo eléctrico. A través de una arquitectura IoT robusta, la plataforma ingiere lecturas de energía con alta precisión, genera analíticas de costos proyectados y permite la gestión remota de los espacios del hogar.

Más que un simple monitor, PowerLink es un ecosistema inteligente que centraliza la telemetría eléctrica y la automatización del hogar en un panel de control accesible y de baja latencia.

## ✨ Características Principales

- 📊 **Dashboard Analítico:** Visualización en tiempo real del consumo en kWh y calculadoras en vivo proyectando el costo mensual total.
- 🔌 **Hardware de Precisión:** Integración de microcontroladores con sensores especializados para lecturas eléctricas exactas y sin interrupciones.
- 🚨 **Detección Dinámica de Anomalías:** Motor backend automatizado que compara tu uso de hardware histórico y lanza alertas precisas (uso continuo excesivo, 'vampiros', picos anómalos).
- ⚡ **Sincronización en Tiempo Real:** Aprovechando los WebSockets y RPC de Supabase, PowerLink te refleja los cambios de dispositivo instantáneamente, sin necesidad de refrescar para conocer el estado actual.
- 🎙️ **Integración de Asistentes:** Capacidad de conexión con ecosistemas de terceros (Alexa/Google Assistant) mediante un servidor OAuth 2.0 nativo.

## 🏗️ Arquitectura del Sistema

El ecosistema de PowerLink está construido sobre una arquitectura moderna, escalable y dividida en tres capas principales:

### 1. Edge IoT Network (Capa de Hardware)
El cerebro físico del sistema opera en la red local del usuario.
- **Microcontrolador:** ESP32 programado en C/C++ para garantizar una ejecución eficiente y conectividad Wi-Fi estable.
- **Telemetría:** Integración de sensores para la medición no invasiva y de alta precisión de voltaje, corriente, potencia activa y energía consumida.
- **Comunicación:** Capa TCP/IP manejando conexiones MQTT ó endpoints HTTP a `/ingest` donde se autentica al equipo con su propia huella y encriptación.

### 2. Backend "Serverless" (Capa de Datos y Lógica)
Gestionado a través de **Supabase**, proporcionando una infraestructura BaaS (Backend-as-a-Service) de alto rendimiento.
- **Base de Datos:** PostgreSQL para el almacenamiento relacional de usuarios, dispositivos y el histórico de métricas.
- **Tiempo Real:** WebSockets para publicación de estado en tiempo real (Supabase Realtime) y Edge Functions.
- **Procesamiento Asíncrono:** Cron Jobs integrados para la agregación de métricas nocturnas y creación de históricos al largo plazo.

### 3. Frontend Web (Capa de Presentación)
Una Single Page Application (SPA) ligera, enfocada en la experiencia de usuario.
- **Tecnologías:** App diseñada a medida con **Vanilla JavaScript** y DOM dinámico para ser lo más ligera posible, utilizando **Chart.js** para renderizado avanzado y comparativas de datos temporales (Hoy, Semana y Mes).
- **Diseño Modular:** Componentes principales integrados en módulos modulares (AppShell principal, Modales, Vistas).

## 🛡️ Enfoque en Ciberseguridad

La protección de los datos del hogar es una prioridad en la arquitectura de PowerLink. La plataforma implementa:

- **Autenticación de Hardware:** Cada nodo posee una huella de identidad única, asegurando que solo dispositivos autorizados puedan enviar datos.
- **Protección de Datos en Tránsito:** Toda la comunicación entre el hardware, el backend y el cliente web está encriptada.
- **Gestión de Sesiones:** Autenticación segura para los usuarios finales a través de políticas estrictas de base de datos.