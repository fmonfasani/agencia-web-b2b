# 📦 Guía de Portabilidad de Antigravity

Para clonar esta configuración exacta (Skills, MCPs, SSH y contexto) en otra máquina, sigue estos pasos:

## 1. El Repositorio (Código + Skills)
Al haber subido todo a GitHub, ya tienes el 80% resuelto.
- **Qué incluye:** Todo lo que está en `.agents/skills/` y `.agents/workflows/`.
- **Qué hacer:** Simplemente haz `git clone` del repositorio en tu nueva máquina.

## 2. Configuración de MCP Servers
Los servidores MCP (como `firecrawl`, `playwright`, `postgresql`, etc.) no se guardan en el repositorio porque dependen de la instalación local.
- **Ubicación:** Se guardan en el archivo de configuración global de tu extensión de Antigravity/VS Code.
- **Acción:** Copia el contenido de la configuración de MCP desde los ajustes de la extensión en VS Code y pégalo en la nueva máquina.

## 3. El "Cerebro" (Contexto y Artefactos)
Si quieres que el próximo Antigravity sepa *exactamente* lo que hicimos hoy (los archivos en la carpeta `brain`), debes copiar esta carpeta:
- **Ruta en Windows:** `%USERPROFILE%\.gemini\antigravity\brain\68e9c2e3-5d06-4e9d-83ad-29f742cb03a4`
- **Acción:** Comprime esa carpeta y llévala a la misma ruta en la nueva máquina. Esto incluye el `session_handover.md`.

## 4. SSH y Accesos
- **Llaves:** Debes generar una nueva llave SSH en la nueva máquina (`ssh-keygen`).
- **Autorización:** Agrega la *nueva* llave pública al VPS (`~/.ssh/authorized_keys`). No intentes mover la llave privada de una PC a otra por seguridad.

## 5. Variables de Entorno (.env)
- **IMPORTANTE:** El archivo `.env` está en el `.gitignore` por seguridad.
- **Acción:** Debes crear manualmente el archivo `.env` en la nueva máquina con las claves que tienes (Groq, Apify, Database, etc.). Puedes guiarte por el archivo `.env.example` si existe.

---

### Resumen para el "Futuro Yo":
Al abrir el proyecto en la nueva PC, dile a Antigravity:
> "He clonado el repo y copiado la carpeta brain. Lee el archivo `session_handover.md` para continuar."
