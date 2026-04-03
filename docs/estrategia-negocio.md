# AGENCIA DE VENTAS DIGITALES
## Estrategia de Negocio
**Infraestructura · Software · DevOps · Agentes IA**

| Modelo de Negocio |
| :--- |
| Identificar profesionales y empresas con presencia digital deficiente mediante scraping u otros métodos automatizados, y venderles los servicios que les faltan: sitio web, agente de ventas IA, agente de atención, presupuestos automáticos, o soporte técnico. |

### KPIs y Objetivos Base
- **Costo infra base:** $6/mes (DigitalOcean Droplet).
- **Crédito DigitalOcean:** $200 gratis (GitHub Student Pack).
- **Capacidad:** 5 agentes IA incluidos por tenant básico.
- **Operación:** 24/7 sin pausa.

---

## 1. Resumen Ejecutivo
El modelo consiste en una agencia de servicios digitales que opera con un pipeline de adquisición completamente automatizado. El sistema identifica oportunidades de venta, establece contacto automatizado y entrega servicios de alta percepción de valor a un costo de producción muy bajo.

La ventaja competitiva es la **velocidad y la escala**: prospectar cientos de empresas por semana y entregar un sitio web en 24 horas.

### Propuesta de Valor
- **Velocidad de entrega:** 24-48hs desde el cierre.
- **Automatización real:** Agentes IA sin intervención humana post-configuración.
- **Precio accesible:** Margenes altos con precios competitivos.
- **Escalabilidad:** Crecimiento sin necesidad de aumentar staff proporcionalmente.

---

## 2. Modelo de Negocio

### 2.1 Servicios Ofrecidos
| Servicio | Descripción | Precio Sugerido | Costo Producción |
| :--- | :--- | :--- | :--- |
| **Sitio Web** | Landing page profesional (Astro/Next.js) | $300–800 | < $20 |
| **Agente Consulta** | FAQ automatizado 24/7 multi-canal | $80–150/mes | $5–10/mes |
| **Agente Recepcionista**| Derivación, agendado, captura de leads | $80–150/mes | $5–10/mes |
| **Agente de Ventas** | Calificación, pitch y cierre automatizado | $120–250/mes | $10–20/mes |
| **Agente Presupuesto** | Cotización automática + PDF + seguimiento | $120–150/mes | $8–15/mes |
| **Agente Técnico** | Soporte y diagnóstico automatizado | $150–200/mes | $10–20/mes |
| **Pack Completo** | Web + 5 agentes + CRM + mantenimiento | $499–600/mes | $40–80/mes |

### 2.2 Estrategia de Adquisición
- **Detección:** Scraping diario de Google Maps, LinkedIn, directorios.
- **Criterios:** Empresas sin web o con sitios obsoletos/lentos.
- **Contacto:** Email frío + WhatsApp automatizado (Make.com + Brevo).
- **CRM:** Gestión centralizada del pipeline (Twenty CRM).

### 2.3 Modelo de Precios
| TIER | INCLUYE | PRECIO/MES |
| :--- | :--- | :--- |
| **Starter** | Web + 1 agente (Consulta) | $120–200 |
| **Growth** | Web + 3 agentes + CRM básico | $300–500 |
| **Enterprise** | Web + 5 agentes + CRM full + soporte | $600–1500 |

---

## 3. Infraestructura Técnica

### 3.1 Arquitectura General
- **Código y CI/CD:** GitHub + GitHub Actions ($0).
- **Servidor/Backend:** Docker, PostgreSQL, Python, Node.js en DigitalOcean Droplet ($6/mes).
- **Hosting Clientes:** Vercel / Cloudflare Pages ($0).
- **Email:** Brevo (SMTP/API).
- **Automatización:** Make.com.
- **IA:** OpenAI / Anthropic API.
- **CRM:** Twenty CRM (Self-hosted).

### 3.2 Flujo de Entrega (Web)
1. Copiar template de GitHub.
2. Personalizar contenido (logo, textos, colores).
3. Push a GitHub → Deploy automático en Vercel.
4. Total estimado: < 60 minutos.

---

## 4. Roadmap de Implementación
- **Fase 1:** Setup de Infraestructura (DigitalOcean + Docker + Base de datos).
- **Fase 2:** Agentes Base (Ventas y Consulta).
- **Fase 3:** Sistema de Scraping y Adquisición.
- **Fase 4:** Portal Multi-Tenant (Webshooks) para gestión de clientes.
