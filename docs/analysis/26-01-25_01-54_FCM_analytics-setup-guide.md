# Guía de Configuración de Analytics - Agencia Web B2B

Este documento detalla los pasos para configurar y verificar el seguimiento de Google Analytics 4 (GA4) y Google Tag Manager (GTM) en el proyecto.

---

## 1. Requisitos Previos

1.  **Cuenta de Google Analytics**: Tener una propiedad GA4 creada.
2.  **Cuenta de Google Tag Manager**: Tener un contenedor web creado.

---

## 2. Variables de Entorno

El proyecto lee los IDs de seguimiento desde el archivo `.env.local`. Asegúrate de tener las siguientes variables configuradas:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

> [!IMPORTANTE]
> Nunca subas el archivo `.env.local` al repositorio Git. Utiliza `.env.example` como plantilla para nuevos despliegues.

---

## 3. Estructura de Tracking

El sistema utiliza una biblioteca personalizada ubicada en `src/lib/analytics.ts`.

### Eventos Trackeados Automáticamente

- **Page Views**: Se trackean automáticamente en cada cambio de ruta mediante el componente `<Analytics />` en `layout.tsx`.

### Eventos Manuales Implementados

| Evento               | Parámetros                   | Ubicación                           |
| :------------------- | :--------------------------- | :---------------------------------- |
| `cta_click`          | `location`, `text`           | Header, Hero, CTAs generales        |
| `navigation`         | `destination`, `source`      | Menú de navegación (links internos) |
| `form_submit`        | `form_name`, `form_location` | Formulario de contacto (Footer)     |
| `pricing_plan_click` | `plan_name`, `plan_price`    | Tabla de precios                    |
| `whatsapp_click`     | `source`                     | Botón flotante de WhatsApp          |

---

## 4. Verificación de Implementación

### Localmente (Capa de Datos)

1. Inicia el servidor de desarrollo: `npm run dev`.
2. Abre las Herramientas de Desarrollador (F12) en tu navegador.
3. Ve a la **Consola**.
4. Escribe `dataLayer` y presiona Enter.
5. Deberías ver un array de objetos. Cada acción (click, navegación, envío de form) añadirá un nuevo objeto al array.

### En Google Analytics (Tiempo Real)

1. Entra a tu panel de Google Analytics.
2. Ve a **Informes > Tiempo real**.
3. Realiza acciones en tu sitio local (asegúrate de que el `Measurement ID` sea el correcto).
4. Verás aparecer los eventos en el widget de "Recuento de eventos por nombre de evento".

---

## 5. Gestión de Consentimiento (GDPR)

El componente `CookieConsent.tsx` gestiona el estado de consentimiento.

- **Al Aceptar**: Se actualiza el consent de GTM a `granted`.
- **Al Rechazar**: Se actualiza el consent de GTM a `denied`, bloqueando el tracking de GA4.

---

**Última actualización:** 26-01-25 01:54 AM (ART)  
**Autor:** Antigravity AI  
**Versión:** 1.0
