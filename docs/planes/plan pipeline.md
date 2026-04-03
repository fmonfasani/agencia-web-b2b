---
title: Pipeline End-to-End B2B Lead Management
status: 🔄 EN EVOLUCIÓN ESTRATÉGICA
last_update: 2026-03-08
---

# 🛡️ EVOLUCIÓN ESTRATÉGICA: Auditoría 4x4
Se ha reorientado el pipeline original hacia un modelo **Premium Linear Flow**. En lugar de 10 estados complejos, ahora utilizamos un flujo de **Auditoría de IA en 4 ejes** que alimenta directamente la venta.

🚀 PROMPT COMPLETO - Pipeline End-to-End B2B Lead Management📊 VISIÓN GENERAL DEL PROYECTOSistema completo de automatización de prospección B2B para agencias de marketing digital, desde la búsqueda de leads hasta el cierre de ventas.Stack tecnológico:

Frontend/Backend: Next.js 16 App Router + TypeScript strict
Base de datos: PostgreSQL + Prisma 6 (multi-tenant)
IA: OpenAI GPT-4 para scoring, briefs y propuestas
Email: Resend para outreach y notificaciones
Scraping: FastAPI (Python) + Playwright
Auth: NextAuth v5 beta
Infraestructura: VPS Ubuntu 24 + Docker
🗺️ ROADMAP COMPLETO - 8 SEMANAS┌─────────────────────────────────────────────────────────────┐
│                    EPICA 1: FUNDACIÓN                       │
│                    Semanas 1-2 (COMPLETADO ✅)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              EPICA 2: INTELIGENCIA Y PIPELINE               │
│                    Semanas 3-4 (COMPLETADO ✅)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           EPICA 3: AUTOMATIZACIÓN DE VENTAS                 │
│                    Semanas 5-6 (EN CURSO 🔄)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          EPICA 4: OPTIMIZACIÓN Y ESCALADO                   │
│                    Semanas 7-8 (PENDIENTE ⏸️)               │
└─────────────────────────────────────────────────────────────┘📋 ÉPICA 1: FUNDACIÓN (Semanas 1-2) ✅ COMPLETADOObjetivo: Infraestructura base + captura de leadsSEMANA 1: Infraestructura CoreFase 1.1: Setup Base (Días 1-2)Entregables:

✅ Proyecto Next.js 16 con App Router
✅ Prisma 6 configurado con PostgreSQL
✅ Schema inicial multi-tenant:

prisma   model Tenant {
     id        String   @id @default(cuid())
     name      String
     domain    String   @unique
     createdAt DateTime @default(now())
   }

   model User {
     id        String   @id @default(cuid())
     tenantId  String
     email     String   @unique
     role      UserRole @default(MEMBER)
     tenant    Tenant   @relation(fields: [tenantId], references: [id])
   }

   enum UserRole { OWNER, ADMIN, MEMBER }
✅ NextAuth v5 con multi-tenancy
✅ Variables de entorno (DATABASE_URL, NEXTAUTH_SECRET, etc.)
Comandos:
bashnpx create-next-app@latest agencia-web-b2b --typescript --tailwind --app
npm install prisma @prisma/client next-auth@beta
npx prisma init
npx prisma migrate dev --name initCommit: feat(core): initialize Next.js 16 project with Prisma and NextAuthFase 1.2: VPS y Deploy (Días 3-4)Entregables:

✅ VPS Ubuntu 24 configurado (DigitalOcean/Linode)
✅ Docker + Docker Compose instalado
✅ PostgreSQL en container
✅ Nginx como reverse proxy
✅ Certificados SSL (Let's Encrypt)
✅ CI/CD básico con GitHub Actions
Script de setup VPS:
bash# En VPS
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: agencia_web_b2b
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/agencia_web_b2bCommit: feat(infra): configure VPS with Docker and PostgreSQLSEMANA 2: Captura de LeadsFase 2.1: Schema de Leads (Días 1-2)Entregables:

✅ Modelo Lead en Prisma:

prisma   model Lead {
     id                    String         @id @default(cuid())
     tenantId              String
     name                  String?
     companyName           String
     website               String?
     email                 String?
     phone                 String?
     industry              String?
     estimatedCompanySize  String?
     location              String?
     linkedinUrl           String?
     
     // Enrichment
     enrichmentStatus      EnrichmentStatus @default(PENDING)
     enrichedAt            DateTime?
     enrichmentData        Json?
     
     // Scoring
     fitScore              Int?            @default(0)
     intentScore           Int?            @default(0)
     overallScore          Int?            @default(0)
     scoringReason         String?
     
     // Pipeline
     pipelineStatus        PipelineStatus  @default(NUEVO)
     assignedTo            String?
     
     // Metadata
     source                String?
     tags                  String[]
     notes                 String?
     createdAt             DateTime        @default(now())
     updatedAt             DateTime        @updatedAt
     
     tenant                Tenant          @relation(fields: [tenantId], references: [id])
   }

   enum EnrichmentStatus { PENDING, IN_PROGRESS, COMPLETED, FAILED }
   enum PipelineStatus {
     NUEVO
     ENRIQUECIDO
     SCORED
     INVESTIGADO
     CITADO
     LLAMADO
     PROPUESTA_ENVIADA
     CERRADO_GANADO
     CERRADO_PERDIDO
     DESCARTADO
   }
✅ CRUD API routes:

POST /api/leads - Crear lead
GET /api/leads - Listar con filtros
GET /api/leads/[id] - Detalle
PATCH /api/leads/[id] - Actualizar
DELETE /api/leads/[id] - Eliminar


Commit: feat(leads): implement lead schema and CRUD APIFase 2.2: Scraper Service (Días 3-5)Entregables:

✅ FastAPI service en agent-service/
✅ Scraper de Google Maps:

python   # agent-service/scrapers/google_maps.py
   from playwright.async_api import async_playwright
   
   async def scrape_google_maps(query: str, location: str, max_results: int = 50):
       async with async_playwright() as p:
           browser = await p.chromium.launch(headless=True)
           page = await browser.new_page()
           
           url = f"https://www.google.com/maps/search/{query}+{location}"
           await page.goto(url)
           
           # Scroll para cargar resultados
           for _ in range(10):
               await page.evaluate("window.scrollBy(0, 500)")
               await page.wait_for_timeout(1000)
           
           results = await page.query_selector_all('[role="article"]')
           leads = []
           
           for result in results[:max_results]:
               name = await result.query_selector('[aria-label]')
               leads.append({
                   'companyName': await name.inner_text() if name else None,
                   'source': 'google_maps',
                   'query': query,
                   'location': location
               })
           
           await browser.close()
           return leads
✅ Endpoints FastAPI:

POST /scraper/google-maps - Iniciar scraping
GET /scraper/jobs/{job_id} - Status de job
GET /scraper/results/{job_id} - Resultados



✅ Queue con Celery/Redis para jobs pesados
Commit: feat(scraper): implement Google Maps scraper with FastAPIFase 2.3: Enriquecimiento de Leads (Día 5)Entregables:

✅ Servicio de enrichment:

typescript   // src/lib/leads/enrichment/enrichment.service.ts
   export const EnrichmentService = {
     async enrichLead(leadId: string) {
       const lead = await prisma.lead.findUnique({ where: { id: leadId } })
       
       // 1. Buscar website si no existe
       if (!lead.website && lead.companyName) {
         lead.website = await searchWebsite(lead.companyName)
       }
       
       // 2. Scrape website para info
       if (lead.website) {
         const siteData = await scrapeWebsite(lead.website)
         lead.industry = siteData.industry
         lead.estimatedCompanySize = siteData.employeeCount
       }
       
       // 3. Buscar en LinkedIn
       if (lead.companyName) {
         const linkedinData = await searchLinkedIn(lead.companyName)
         lead.linkedinUrl = linkedinData.url
       }
       
       // 4. Buscar emails con Hunter.io
       if (lead.website) {
         const contacts = await findEmails(lead.website)
         lead.email = contacts[0]?.email
       }
       
       await prisma.lead.update({
         where: { id: leadId },
         data: {
           ...lead,
           enrichmentStatus: 'COMPLETED',
           enrichedAt: new Date(),
           pipelineStatus: 'ENRIQUECIDO'
         }
       })
     }
   }
✅ API endpoint: POST /api/leads/[id]/enrich
Commit: feat(enrichment): implement lead enrichment service📋 ÉPICA 2: INTELIGENCIA Y PIPELINE (Semanas 3-4) 🔄 EN CURSOObjetivo: Scoring con IA + Pipeline automático + ProposalsSEMANA 3: Pipeline InteligenteFase 3.1: Scoring con IA (Días 1-2)Entregables:

✅ Sistema de scoring dual (FIT + INTENT):

typescript   // src/lib/leads/scoring/scoring.service.ts
   import OpenAI from 'openai'
   
   const SCORING_PROMPT = `
   Analiza este lead B2B y asigna scores del 0-100:
   
   FIT SCORE (0-100): ¿Qué tan bien encaja con nuestro ICP?
   - Industria target: SaaS, E-commerce, Servicios B2B
   - Tamaño ideal: 10-500 empleados
   - Tiene website funcional
   - Ubicación: LATAM o España
   
   INTENT SCORE (0-100): ¿Qué tan probable es que necesiten marketing ahora?
   - Website desactualizado = alta intención
   - Sin presencia en redes = alta intención
   - Industria en crecimiento = alta intención
   - Contratando = alta intención
   
   Lead data: {LEAD_DATA}
   
   Responde SOLO en JSON:
   {
     "fitScore": 85,
     "intentScore": 72,
     "reasoning": "Empresa SaaS de 50 empleados con website desactualizado..."
   }
   `
   
   export const ScoringService = {
     async scoreLead(leadId: string) {
       const lead = await prisma.lead.findUnique({ where: { id: leadId } })
       
       const response = await openai.chat.completions.create({
         model: 'gpt-4',
         messages: [{
           role: 'user',
           content: SCORING_PROMPT.replace('{LEAD_DATA}', JSON.stringify(lead))
         }],
         temperature: 0.3
       })
       
       const scores = JSON.parse(response.choices[0].message.content)
       
       await prisma.lead.update({
         where: { id: leadId },
         data: {
           fitScore: scores.fitScore,
           intentScore: scores.intentScore,
           overallScore: (scores.fitScore + scores.intentScore) / 2,
           scoringReason: scores.reasoning,
           pipelineStatus: 'SCORED'
         }
       })
     }
   }
✅ Tests unitarios
✅ API endpoint: POST /api/leads/[id]/score
Commit: feat(scoring): implement AI-powered lead scoringFase 3.2: Brief Generator (Días 2-3)Entregables:

✅ Generador de briefs de investigación:

typescript   // src/lib/leads/brief/brief.service.ts
   const BRIEF_PROMPT = `
   Genera un brief de investigación comercial para este lead:
   
   Empresa: {COMPANY_NAME}
   Industria: {INDUSTRY}
   Website: {WEBSITE}
   Score: {OVERALL_SCORE}/100
   
   El brief debe incluir:
   1. Resumen ejecutivo (2-3 líneas)
   2. Análisis de su presencia digital actual
   3. Pain points detectados (3-5 puntos)
   4. Oportunidades de mejora
   5. Propuesta de valor inicial
   6. Próximos pasos recomendados
   
   Formato: Markdown, profesional, en español argentino.
   `
   
   export const BriefService = {
     async generateBrief(leadId: string) {
       const lead = await prisma.lead.findUnique({ where: { id: leadId } })
       
       const response = await openai.chat.completions.create({
         model: 'gpt-4',
         messages: [{ role: 'user', content: BRIEF_PROMPT }],
         temperature: 0.7
       })
       
       const brief = response.choices[0].message.content
       
       await prisma.lead.update({
         where: { id: leadId },
         data: {
           brief,
           pipelineStatus: 'INVESTIGADO'
         }
       })
       
       return brief
     }
   }
✅ API endpoint: POST /api/leads/[id]/brief
Commit: feat(brief): implement AI brief generatorFase 3.3: Pipeline State Machine (Días 3-4)Entregables:

✅ Servicio de pipeline con validaciones:

typescript   // src/lib/leads/pipeline/pipeline.service.ts
   
   const VALID_TRANSITIONS = {
     NUEVO: ['ENRIQUECIDO', 'DESCARTADO'],
     ENRIQUECIDO: ['SCORED', 'DESCARTADO'],
     SCORED: ['INVESTIGADO', 'DESCARTADO'],
     INVESTIGADO: ['CITADO', 'DESCARTADO'],
     CITADO: ['LLAMADO', 'DESCARTADO'],
     LLAMADO: ['PROPUESTA_ENVIADA', 'DESCARTADO'],
     PROPUESTA_ENVIADA: ['CERRADO_GANADO', 'CERRADO_PERDIDO', 'DESCARTADO'],
   }
   
   export const LeadPipelineService = {
     async advancePipeline(
       tenantId: string,
       leadId: string,
       newStatus: PipelineStatus,
       metadata?: Record<string, any>
     ) {
       const lead = await getTenantPrisma(tenantId).lead.findUnique({
         where: { id: leadId }
       })
       
       if (!lead) throw new Error('LEAD_NOT_FOUND')
       
       // Validar transición
       const validNext = VALID_TRANSITIONS[lead.pipelineStatus]
       if (!validNext?.includes(newStatus)) {
         throw new Error('INVALID_PIPELINE_TRANSITION')
       }
       
       // Actualizar
       return await getTenantPrisma(tenantId).lead.update({
         where: { id: leadId },
         data: {
           pipelineStatus: newStatus,
           updatedAt: new Date(),
           ...(metadata && { notes: JSON.stringify(metadata) })
         }
       })
     },
     
     async getPipelineStats(tenantId: string) {
       const leads = await getTenantPrisma(tenantId).lead.groupBy({
         by: ['pipelineStatus'],
         _count: true
       })
       
       return leads.reduce((acc, { pipelineStatus, _count }) => ({
         ...acc,
         [pipelineStatus]: _count
       }), {})
     }
   }
✅ API routes:

GET /api/leads/pipeline - Stats
PATCH /api/leads/[id]/pipeline - Avanzar estado
GET /api/leads/pipeline/[status] - Leads por estado



✅ Tests de transiciones válidas/inválidas
Commit: feat(pipeline): implement state machine with validationFase 3.4: Sistema de Citas (Días 4-5)Entregables:

✅ Modelo Appointment:

prisma   model Appointment {
     id          String            @id @default(cuid())
     leadId      String
     tenantId    String
     scheduledAt DateTime
     duration    Int               @default(30)
     type        AppointmentType   @default(CALL)
     status      AppointmentStatus @default(PENDING)
     notes       String?
     outcome     String?           // Resultado de la llamada
     createdAt   DateTime          @default(now())
     updatedAt   DateTime          @updatedAt
     lead        Lead              @relation(fields: [leadId], references: [id])
   }

   enum AppointmentType { CALL, VIDEO_CALL, IN_PERSON }
   enum AppointmentStatus { PENDING, CONFIRMED, COMPLETED, NO_SHOW, RESCHEDULED, CANCELLED }
✅ Servicio de appointments:

typescript   // src/lib/appointments/appointments.service.ts
   export const AppointmentsService = {
     async createAppointment(data: CreateAppointmentInput) {
       const appointment = await prisma.appointment.create({ data })
       
       // Avanzar pipeline a CITADO
       await LeadPipelineService.advancePipeline(
         data.tenantId,
         data.leadId,
         'CITADO',
         { appointmentId: appointment.id }
       )
       
       // Enviar email de confirmación
       await sendAppointmentEmail(appointment)
       
       return appointment
     },
     
     async completeAppointment(id: string, outcome: string) {
       const appointment = await prisma.appointment.update({
         where: { id },
         data: { status: 'COMPLETED', outcome }
       })
       
       // Avanzar a LLAMADO
       await LeadPipelineService.advancePipeline(
         appointment.tenantId,
         appointment.leadId,
         'LLAMADO',
         { outcome }
       )
     }
   }
✅ API routes + Tests
Commit: feat(appointments): implement appointment management systemSEMANA 4: Generación de Propuestas 🔄 EN CURSOFase 4.1: Schema Proposal (Día 1) ⚠️ URGENTEEntregables:

❌ Modelo Proposal (BLOQUEANTE):

prisma   model Proposal {
     id           String         @id @default(cuid())
     leadId       String         @unique
     tenantId     String
     title        String
     problem      String
     solution     String
     deliverables Json
     timeline     String
     investment   String
     roi          String?
     content      String         @db.Text
     slug         String         @unique
     viewedAt     DateTime?
     viewCount    Int            @default(0)
     sentAt       DateTime?
     status       ProposalStatus @default(DRAFT)
     createdAt    DateTime       @default(now())
     lead         Lead           @relation(fields: [leadId], references: [id])
   }

   enum ProposalStatus { DRAFT, SENT, VIEWED, ACCEPTED, REJECTED }
❌ Migración y extensión Prisma
Comandos:
bashnpx prisma migrate dev --name add_proposals
npx prisma generateCommit: feat(schema): add Proposal model with ProposalStatus enumFase 4.2: Generador de Propuestas con IA (Días 2-3)Entregables:

❌ Sistema de prompts:

typescript   // src/lib/proposals/proposal.prompts.ts
   export const PROPOSAL_SYSTEM_PROMPT = `
   Sos un consultor comercial senior de una agencia argentina de marketing digital y desarrollo web.
   
   Servicios que ofrecemos:
   - Desarrollo web (landing pages, e-commerce, aplicaciones web)
   - Marketing digital (SEO, Google Ads, Meta Ads, LinkedIn Ads)
   - Branding y diseño (identidad corporativa, UX/UI)
   - Consultoría estratégica (growth marketing, CRO)
   
   Estilo de comunicación:
   - Profesional pero cercano
   - Orientado a resultados medibles
   - Enfocado en ROI y crecimiento
   - Usa casos de éxito cuando sea relevante
   
   Formato de respuesta:
   - SOLO JSON, sin markdown ni explicaciones
   - Números en formato argentino (ej: "USD 10.000")
   - Fechas en español (ej: "8-10 semanas")
   `

   export const PROPOSAL_USER_PROMPT = (data: ProposalInput) => `
   Genera una propuesta comercial personalizada con estos datos:
   
   LEAD:
   - Empresa: ${data.companyName}
   - Industria: ${data.industry}
   - Tamaño: ${data.estimatedCompanySize || 'No especificado'}
   - Website: ${data.website || 'Sin website'}
   
   BRIEF DE INVESTIGACIÓN:
   ${data.brief}
   
   NOTAS DE LA LLAMADA:
   ${data.callNotes}
   
   SCORE DEL LEAD:
   - Fit: ${data.fitScore}/100
   - Intent: ${data.intentScore}/100
   
   Genera una propuesta que incluya:
   
   {
     "title": "Propuesta para [Empresa]: [Servicio Principal]",
     "problem": "Descripción del problema detectado en 2-3 oraciones",
     "solution": "Cómo nuestra agencia lo resuelve en 3-4 oraciones",
     "deliverables": [
       "Entregable específico 1",
       "Entregable específico 2",
       "Entregable específico 3"
     ],
     "timeline": "X-Y semanas (sé específico según complejidad)",
     "investment": "USD X.XXX - XX.XXX (rango realista)",
     "roi": "Retorno esperado o beneficio clave medible",
     "content": "Propuesta completa en markdown (500-800 palabras) con secciones: Contexto, Desafíos, Solución Propuesta, Entregables Detallados, Metodología, Inversión y ROI"
   }
   `
❌ Servicio de generación:

typescript   // src/lib/proposals/proposal.service.ts
   export const ProposalService = {
     async generateProposal(
       tenantId: string,
       leadId: string,
       callNotes: string
     ) {
       const lead = await getTenantPrisma(tenantId).lead.findFirst({
         where: { id: leadId }
       })
       
       if (lead.pipelineStatus !== 'LLAMADO') {
         throw new Error('Lead must be in LLAMADO status')
       }
       
       const prompt = PROPOSAL_USER_PROMPT({
         companyName: lead.companyName,
         industry: lead.industry,
         estimatedCompanySize: lead.estimatedCompanySize,
         website: lead.website,
         brief: lead.brief,
         callNotes,
         fitScore: lead.fitScore,
         intentScore: lead.intentScore
       })
       
       const response = await openai.chat.completions.create({
         model: 'gpt-4',
         messages: [
           { role: 'system', content: PROPOSAL_SYSTEM_PROMPT },
           { role: 'user', content: prompt }
         ],
         temperature: 0.7
       })
       
       const proposalData = JSON.parse(response.choices[0].message.content)
       
       const proposal = await getTenantPrisma(tenantId).proposal.upsert({
         where: { leadId },
         create: {
           leadId,
           tenantId,
           ...proposalData,
           slug: generateSlug(proposalData.title),
           status: 'DRAFT'
         },
         update: proposalData
       })
       
       return proposal
     },
     
     async sendProposal(tenantId: string, proposalId: string) {
       const proposal = await getTenantPrisma(tenantId).proposal.findFirst({
         where: { id: proposalId },
         include: { lead: true }
       })
       
       // Enviar email con Resend
       await resend.emails.send({
         from: 'ops@agencia.com',
         to: proposal.lead.email,
         subject: `Propuesta lista: ${proposal.title}`,
         html: renderProposalEmail(proposal)
       })
       
       // Actualizar estado
       await getTenantPrisma(tenantId).proposal.update({
         where: { id: proposalId },
         data: {
           status: 'SENT',
           sentAt: new Date()
         }
       })
       
       // Avanzar pipeline
       await LeadPipelineService.advancePipeline(
         tenantId,
         proposal.leadId,
         'PROPUESTA_ENVIADA',
         { proposalId }
       )
     }
   }
❌ API routes:

POST /api/proposals - Generar propuesta
GET /api/proposals - Listar propuestas
GET /api/proposals/[id] - Detalle
POST /api/proposals/[id]/send - Enviar propuesta


Commit: feat(proposals): implement AI-powered proposal generatorFase 4.3: PDF Generation (Días 3-4)Entregables:

❌ Componente React-PDF:

typescript   // src/lib/proposals/proposal.pdf.tsx
   import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
   
   const styles = StyleSheet.create({
     page: {
       padding: 40,
       fontFamily: 'Helvetica'
     },
     header: {
       marginBottom: 30,
       borderBottom: '2px solid #3B82F6',
       paddingBottom: 20
     },
     title: {
       fontSize: 24,
       fontWeight: 'bold',
       color: '#1E40AF'
     },
     section: {
       marginBottom: 20
     },
     sectionTitle: {
       fontSize: 16,
       fontWeight: 'bold',
       marginBottom: 10,
       color: '#1E40AF'
     },
     text: {
       fontSize: 11,
       lineHeight: 1.5
     },
     deliverable: {
       fontSize: 10,
       marginLeft: 15,
       marginBottom: 5
     }
   })
   
   export const ProposalPdfDocument = ({ proposal, tenant }) => (
     <Document>
       <Page size="A4" style={styles.page}>
         {/* Header */}
         <View style={styles.header}>
           <Text style={styles.title}>{proposal.title}</Text>
           <Text style={styles.text}>
             Preparado para: {proposal.lead.companyName}
           </Text>
           <Text style={styles.text}>
             Fecha: {new Date().toLocaleDateString('es-AR')}
           </Text>
         </View>
         
         {/* Problema */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Contexto y Desafíos</Text>
           <Text style={styles.text}>{proposal.problem}</Text>
         </View>
         
         {/* Solución */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Solución Propuesta</Text>
           <Text style={styles.text}>{proposal.solution}</Text>
         </View>
         
         {/* Entregables */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Entregables</Text>
           {proposal.deliverables.map((item, i) => (
             <Text key={i} style={styles.deliverable}>• {item}</Text>
           ))}
         </View>
         
         {/* Timeline e Inversión */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Timeline e Inversión</Text>
           <Text style={styles.text}>Duración: {proposal.timeline}</Text>
           <Text style={styles.text}>Inversión: {proposal.investment}</Text>
           {proposal.roi && (
             <Text style={styles.text}>ROI Esperado: {proposal.roi}</Text>
           )}
         </View>
         
         {/* Footer */}
         <View style={{ position: 'absolute', bottom: 40, left: 40, right: 40 }}>
           <Text style={{ fontSize: 9, color: '#6B7280' }}>
             {tenant.name} • {tenant.contactEmail} • {tenant.website}
           </Text>
         </View>
       </Page>
     </Document>
   )
❌ API endpoint para generar PDF:

typescript   // src/app/api/proposals/[id]/pdf/route.ts
   import { renderToBuffer } from '@react-pdf/renderer'
   
   export async function GET(
     req: Request,
     { params }: { params: { id: string } }
   ) {
     const tenantId = req.headers.get('x-tenant-id')
     
     const proposal = await getTenantPrisma(tenantId).proposal.findFirst({
       where: { id: params.id },
       include: { lead: true }
     })
     
     const tenant = await prisma.tenant.findUnique({
       where: { id: tenantId }
     })
     
     const pdfDoc = ProposalPdfDocument({ proposal, tenant })
     const pdfBuffer = await renderToBuffer(pdfDoc)
     
     return new Response(pdfBuffer, {
       headers: {
         'Content-Type': 'application/pdf',
         'Content-Disposition': `attachment; filename="propuesta-${proposal.slug}.pdf"`
       }
     })
   }Comandos:
bashnpm install @react-pdf/rendererCommit: feat(proposals): add PDF generation for proposalsFase 4.4: Tracking de Propuestas (Día 5)Entregables:

❌ Landing page pública para propuestas:

typescript   // src/app/p/[slug]/page.tsx
   export default async function ProposalPage({ params }: { params: { slug: string } }) {
     const proposal = await prisma.proposal.findUnique({
       where: { slug: params.slug },
       include: { lead: true }
     })
     
     // Trackear vista
     await prisma.proposal.update({
       where: { id: proposal.id },
       data: {
         viewedAt: new Date(),
         viewCount: { increment: 1 },
         status: proposal.status === 'SENT' ? 'VIEWED' : proposal.status
       }
     })
     
     return (
       <div className="max-w-4xl mx-auto p-8">
         <h1>{proposal.title}</h1>
         <ReactMarkdown>{proposal.content}</ReactMarkdown>
         
         <div className="mt-12 flex gap-4">
           <button onClick={() => acceptProposal(proposal.id)}>
             Aceptar Propuesta
           </button>
           <button onClick={() => downloadPDF(proposal.id)}>
             Descargar PDF
           </button>
         </div>
       </div>
     )
   }
❌ Webhooks para tracking:

Vista de propuesta → Actualiza viewedAt, viewCount
Aceptación → Cambia status a ACCEPTED, avanza pipeline a CERRADO_GANADO
Rechazo → Cambia status a REJECTED, avanza pipeline a CERRADO_PERDIDO


Commit: feat(proposals): add proposal tracking and public landing page📋 ÉPICA 3: AUTOMATIZACIÓN DE VENTAS (Semanas 5-6) ⏸️ PENDIENTEObjetivo: Outreach automático + Follow-ups + AnalyticsSEMANA 5: Outreach AutomationFase 5.1: Email Templates (Días 1-2)Entregables:

⏸️ Sistema de templates:

prisma   model EmailTemplate {
     id          String   @id @default(cuid())
     tenantId    String
     name        String
     subject     String
     body        String   @db.Text
     variables   String[] // ["companyName", "firstName", "painPoint"]
     category    TemplateCategory
     createdAt   DateTime @default(now())
     tenant      Tenant   @relation(fields: [tenantId], references: [id])
   }

   enum TemplateCategory { COLD_OUTREACH, FOLLOW_UP, PROPOSAL, MEETING_CONFIRM }
⏸️ Templates por defecto:

typescript   const DEFAULT_TEMPLATES = [
     {
       name: 'Cold Outreach - SaaS',
       subject: '{{companyName}}: Oportunidad de crecimiento digital',
       body: `
       Hola {{firstName}},
       
       Vi que {{companyName}} está en {{industry}} y noté que {{painPoint}}.
       
       Ayudamos a empresas como la tuya a {{solution}}.
       
       ¿Te interesa una charla de 15 minutos?
       
       Saludos,
       {{senderName}}
       `,
       category: 'COLD_OUTREACH'
     },
     // ... más templates
   ]
⏸️ Motor de variables:

typescript   function renderTemplate(template: string, variables: Record<string, any>) {
     return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')
   }Commit: feat(outreach): implement email template systemFase 5.2: Campañas de Outreach (Días 2-4)Entregables:

⏸️ Modelo de campaña:

prisma   model OutreachCampaign {
     id          String    @id @default(cuid())
     tenantId    String
     name        String
     templateId  String
     status      CampaignStatus @default(DRAFT)
     scheduledAt DateTime?
     sentAt      DateTime?
     createdAt   DateTime  @default(now())
     
     template    EmailTemplate @relation(fields: [templateId], references: [id])
     messages    OutreachMessage[]
   }

   model OutreachMessage {
     id         String   @id @default(cuid())
     campaignId String
     leadId     String
     subject    String
     body       String   @db.Text
     status     MessageStatus @default(PENDING)
     sentAt     DateTime?
     openedAt   DateTime?
     clickedAt  DateTime?
     repliedAt  DateTime?
     
     campaign   OutreachCampaign @relation(fields: [campaignId], references: [id])
     lead       Lead             @relation(fields: [leadId], references: [id])
   }

   enum CampaignStatus { DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED }
   enum MessageStatus { PENDING, SENT, OPENED, CLICKED, REPLIED, BOUNCED, FAILED }
⏸️ Servicio de campaña:

typescript   export const OutreachService = {
     async createCampaign(data: CreateCampaignInput) {
       const campaign = await prisma.outreachCampaign.create({ data })
       
       // Generar mensajes para cada lead
       for (const leadId of data.leadIds) {
         const lead = await prisma.lead.findUnique({ where: { id: leadId } })
         const message = await this.prepareMessage(campaign, lead)
         
         await prisma.outreachMessage.create({
           data: {
             campaignId: campaign.id,
             leadId: lead.id,
             ...message
           }
         })
       }
       
       return campaign
     },
     
     async sendCampaign(campaignId: string) {
       const campaign = await prisma.outreachCampaign.findUnique({
         where: { id: campaignId },
         include: { messages: true }
       })
       
       for (const message of campaign.messages) {
         await this.sendMessage(message.id)
         await sleep(5000) // Rate limiting: 5seg entre emails
       }
     },
     
     async sendMessage(messageId: string) {
       const message = await prisma.outreachMessage.findUnique({
         where: { id: messageId },
         include: { lead: true }
       })
       
       await resend.emails.send({
         from: 'outreach@agencia.com',
         to: message.lead.email,
         subject: message.subject,
         html: message.body,
         headers: {
           'X-Message-ID': message.id // Para tracking
         }
       })
       
       await prisma.outreachMessage.update({
         where: { id: messageId },
         data: {
           status: 'SENT',
           sentAt: new Date()
         }
       })
     }
   }
⏸️ API routes + Cron jobs para envío programado
Commit: feat(outreach): implement email campaign systemFase 5.3: Follow-up Automático (Días 4-5)Entregables:

⏸️ Sistema de secuencias:

prisma   model FollowUpSequence {
     id          String   @id @default(cuid())
     tenantId    String
     name        String
     steps       Json     // [{ delay: 3, templateId: "..." }, ...]
     isActive    Boolean  @default(true)
     
     campaigns   OutreachCampaign[]
   }
⏸️ Lógica de follow-up:

typescript   // Cron job que corre cada hora
   export async function processFollowUps() {
     const messages = await prisma.outreachMessage.findMany({
       where: {
         status: 'SENT',
         repliedAt: null,
         campaign: {
           sequence: { isActive: true }
         }
       },
       include: { campaign: { include: { sequence: true } } }
     })
     
     for (const message of messages) {
       const daysSinceSent = daysBetween(message.sentAt, new Date())
       const sequence = message.campaign.sequence.steps
       
       const nextStep = sequence.find(step => 
         step.delay === daysSinceSent && !message.followUpsSent?.includes(step.id)
       )
       
       if (nextStep) {
         await OutreachService.sendFollowUp(message.id, nextStep.templateId)
       }
     }
   }Commit: feat(outreach): implement automated follow-up sequencesSEMANA 6: Analytics y OptimizaciónFase 6.1: Dashboard Analytics (Días 1-3)Entregables:

⏸️ Métricas del pipeline:

typescript   // src/lib/analytics/pipeline-analytics.ts
   export const PipelineAnalytics = {
     async getConversionRates(tenantId: string, dateRange: DateRange) {
       const leads = await getTenantPrisma(tenantId).lead.findMany({
         where: {
           createdAt: { gte: dateRange.from, lte: dateRange.to }
         }
       })
       
       return {
         nuevo_to_enriquecido: calculateConversion(leads, 'NUEVO', 'ENRIQUECIDO'),
         enriquecido_to_scored: calculateConversion(leads, 'ENRIQUECIDO', 'SCORED'),
         scored_to_investigado: calculateConversion(leads, 'SCORED', 'INVESTIGADO'),
         investigado_to_citado: calculateConversion(leads, 'INVESTIGADO', 'CITADO'),
         citado_to_llamado: calculateConversion(leads, 'CITADO', 'LLAMADO'),
         llamado_to_propuesta: calculateConversion(leads, 'LLAMADO', 'PROPUESTA_ENVIADA'),
         propuesta_to_ganado: calculateConversion(leads, 'PROPUESTA_ENVIADA', 'CERRADO_GANADO'),
         overall_conversion: (
           leads.filter(l => l.pipelineStatus === 'CERRADO_GANADO').length / leads.length
         ) * 100
       }
     },
     
     async getAverageTimeInStage(tenantId: string) {
       // Calcular tiempo promedio en cada etapa del pipeline
     },
     
     async getScoreDistribution(tenantId: string) {
       // Distribución de fit/intent scores
     }
   }
⏸️ Métricas de outreach:

typescript   export const OutreachAnalytics = {
     async getCampaignMetrics(campaignId: string) {
       const messages = await prisma.outreachMessage.findMany({
         where: { campaignId }
       })
       
       return {
         sent: messages.filter(m => m.status === 'SENT').length,
         opened: messages.filter(m => m.openedAt).length,
         clicked: messages.filter(m => m.clickedAt).length,
         replied: messages.filter(m => m.repliedAt).length,
         bounced: messages.filter(m => m.status === 'BOUNCED').length,
         openRate: (messages.filter(m => m.openedAt).length / messages.length) * 100,
         replyRate: (messages.filter(m => m.repliedAt).length / messages.length) * 100
       }
     }
   }
⏸️ Dashboard en Next.js con Recharts/Chart.js
Commit: feat(analytics): implement pipeline and outreach analytics dashboardFase 6.2: Reportes Automáticos (Días 3-4)Entregables:

⏸️ Generador de reportes semanales:

typescript   export async function generateWeeklyReport(tenantId: string) {
     const lastWeek = {
       from: subDays(new Date(), 7),
       to: new Date()
     }
     
     const report = {
       period: lastWeek,
       leadsAdded: await countNewLeads(tenantId, lastWeek),
       leadsEnriched: await countEnrichedLeads(tenantId, lastWeek),
       appointmentsScheduled: await countAppointments(tenantId, lastWeek),
       proposalsSent: await countProposals(tenantId, lastWeek),
       dealsWon: await countWonDeals(tenantId, lastWeek),
       conversionRate: await PipelineAnalytics.getConversionRates(tenantId, lastWeek),
       topPerformingCampaigns: await getTopCampaigns(tenantId, lastWeek)
     }
     
     // Enviar por email
     await resend.emails.send({
       to: tenant.ownerEmail,
       subject: `Reporte Semanal - ${format(lastWeek.from, 'dd/MM')} al ${format(lastWeek.to, 'dd/MM')}`,
       html: renderReportEmail(report)
     })
   }
⏸️ Cron job semanal (todos los lunes 9am)
Commit: feat(analytics): implement automated weekly reportingFase 6.3: A/B Testing (Días 4-5)Entregables:

⏸️ Sistema de variantes:

prisma   model ABTest {
     id          String   @id @default(cuid())
     tenantId    String
     name        String
     variants    Json     // [{ id: "A", templateId: "...", weight: 50 }, ...]
     status      TestStatus @default(RUNNING)
     startedAt   DateTime @default(now())
     endedAt     DateTime?
     winner      String?  // Variant ID ganador
     
     campaigns   OutreachCampaign[]
   }

   enum TestStatus { DRAFT, RUNNING, COMPLETED }
⏸️ Distribución de tráfico:

typescript   function assignVariant(test: ABTest): string {
     const random = Math.random() * 100
     let cumulative = 0
     
     for (const variant of test.variants) {
       cumulative += variant.weight
       if (random <= cumulative) return variant.id
     }
   }
⏸️ Análisis estadístico de resultados
Commit: feat(outreach): implement A/B testing for email campaigns📋 ÉPICA 4: OPTIMIZACIÓN Y ESCALADO (Semanas 7-8) ⏸️ PENDIENTEObjetivo: Performance, seguridad, monitoreoSEMANA 7: Seguridad y ComplianceFase 7.1: Hardening de Seguridad (Días 1-2)Entregables:

⏸️ FIX-04: scoped-prisma fail-closed ✅ YA IMPLEMENTADO

⏸️ FIX-05: Protección de endpoints observability

typescript   // src/lib/api-auth.ts
   export function requireInternalSecret(request: Request): void {
     const secret = request.headers.get('x-internal-secret')
     if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
       throw Object.assign(new Error('UNAUTHORIZED'), { status: 401 })
     }
   }
   
   // Aplicar en:
   // - /api/observability/traces
   // - /api/observability/metrics
   // - /api/observability/health
   // - /api/admin/metrics/vpsCommit: fix(authz): protect observability and admin endpoints
⏸️ FIX-06: Auth en schedules router (Python)

python   # agent-service/routers/schedules.py
   @router.post("/", dependencies=[Depends(require_admin)])
   async def create_schedule(...):
       pass
   
   @router.get("/", dependencies=[Depends(require_internal_secret)])
   async def list_schedules(...):
       passCommit: fix(agent-service): enforce admin auth on schedules router
⏸️ FIX-07: Rate limiting

typescript   // src/middleware.ts
   import { Ratelimit } from '@upstash/ratelimit'
   
   const rateLimits = {
     '/api/auth': new Ratelimit({ limiter: Ratelimit.slidingWindow(20, '1 m') }),
     '/api/admin': new Ratelimit({ limiter: Ratelimit.slidingWindow(50, '1 m') }),
     '/api': new Ratelimit({ limiter: Ratelimit.slidingWindow(100, '1 m') })
   }Commit: fix(rate-limit): apply tiered API rate limiting
⏸️ Auditoría de endpoints públicos
⏸️ Sanitización de inputs con Zod
⏸️ CORS configurado correctamente
⏸️ Secrets rotation policy
Commit: feat(security): implement comprehensive security hardeningFase 7.2: GDPR Compliance (Días 2-3)Entregables:

⏸️ Modelo de consentimientos:

prisma   model Consent {
     id          String   @id @default(cuid())
     leadId      String
     type        ConsentType
     granted     Boolean
     grantedAt   DateTime?
     revokedAt   DateTime?
     ipAddress   String?
     userAgent   String?
     
     lead        Lead     @relation(fields: [leadId], references: [id])
   }

   enum ConsentType { EMAIL_MARKETING, DATA_PROCESSING, THIRD_PARTY_SHARING }
⏸️ Endpoints de privacidad:

POST /api/privacy/request-data - Exportar datos del lead
POST /api/privacy/delete-data - Right to be forgotten
POST /api/privacy/opt-out - Unsubscribe de comunicaciones



⏸️ Cookie consent banner
⏸️ Privacy policy generator
⏸️ Data retention policy (auto-delete después de 2 años)
Commit: feat(compliance): implement GDPR compliance featuresFase 7.3: Logging y Auditoría (Días 3-5)Entregables:

⏸️ Sistema de audit logs:

prisma   model AuditLog {
     id          String   @id @default(cuid())
     tenantId    String
     userId      String
     action      AuditAction
     resource    String   // "Lead", "Proposal", etc.
     resourceId  String
     metadata    Json?
     ipAddress   String?
     createdAt   DateTime @default(now())
     
     tenant      Tenant   @relation(fields: [tenantId], references: [id])
     user        User     @relation(fields: [userId], references: [id])
   }

   enum AuditAction {
     CREATE, READ, UPDATE, DELETE,
     LOGIN, LOGOUT,
     EXPORT, IMPORT,
     PERMISSION_CHANGE
   }
⏸️ Middleware de auditoría automática:

typescript   export function auditMiddleware(action: AuditAction) {
     return async (req: Request, context: any) => {
       const result = await context.next()
       
       await prisma.auditLog.create({
         data: {
           tenantId: req.headers.get('x-tenant-id'),
           userId: context.session.userId,
           action,
           resource: context.resource,
           resourceId: context.resourceId,
           ipAddress: req.headers.get('x-forwarded-for')
         }
       })
       
       return result
     }
   }
⏸️ Logs estructurados con Pino/Winston
⏸️ Log aggregation con Logtail/Axiom
Commit: feat(audit): implement comprehensive audit logging system
SEMANA 8: Performance y Monitoreo
Fase 8.1: Optimización de Performance (Días 1-3)
Entregables:

⏸️ Database optimization:

prisma   model Lead {
     // ... campos
     
     @@index([tenantId, pipelineStatus])
     @@index([tenantId, createdAt])
     @@index([email])
     @@index([overallScore])
   }
   
   model OutreachMessage {
     @@index([campaignId, status])
     @@index([leadId])
     @@index([sentAt])
   }

⏸️ Query optimization:

typescript   // ANTES: N+1 query
   const leads = await prisma.lead.findMany()
   for (const lead of leads) {
     lead.proposals = await prisma.proposal.findMany({ where: { leadId: lead.id } })
   }
   
   // DESPUÉS: Single query con include
   const leads = await prisma.lead.findMany({
     include: { proposals: true }
   })

⏸️ Caching con Redis:

typescript   // src/lib/cache.ts
   export async function getCached<T>(
     key: string,
     fetcher: () => Promise<T>,
     ttl: number = 300
   ): Promise<T> {
     const cached = await redis.get(key)
     if (cached) return JSON.parse(cached)
     
     const fresh = await fetcher()
     await redis.setex(key, ttl, JSON.stringify(fresh))
     return fresh
   }
   
   // Uso:
   const pipelineStats = await getCached(
     `pipeline:stats:${tenantId}`,
     () => PipelineAnalytics.getStats(tenantId),
     600 // 10 minutos
   )

⏸️ API response caching con unstable_cache
⏸️ Image optimization con Next.js Image
⏸️ Bundle analysis y code splitting

Commit: perf: implement database indexing and Redis caching

Fase 8.2: Observability (Días 3-4)
Entregables:

⏸️ APM con Sentry:

typescript   // src/instrumentation.ts
   import * as Sentry from '@sentry/nextjs'
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     tracesSampleRate: 0.1,
     profilesSampleRate: 0.1,
     integrations: [
       new Sentry.Integrations.Prisma({ client: prisma })
     ]
   })

⏸️ Métricas de negocio:

typescript   // src/lib/metrics.ts
   export const metrics = {
     leadsProcessed: new Counter({
       name: 'leads_processed_total',
       help: 'Total leads processed'
     }),
     
     enrichmentDuration: new Histogram({
       name: 'enrichment_duration_seconds',
       help: 'Time to enrich a lead',
       buckets: [1, 2, 5, 10, 30]
     }),
     
     pipelineConversion: new Gauge({
       name: 'pipeline_conversion_rate',
       help: 'Conversion rate per stage'
     })
   }

⏸️ Health checks:

typescript   // src/app/api/health/route.ts
   export async function GET() {
     const checks = {
       database: await checkDatabase(),
       redis: await checkRedis(),
       openai: await checkOpenAI(),
       resend: await checkResend()
     }
     
     const healthy = Object.values(checks).every(c => c.status === 'ok')
     
     return Response.json(checks, { status: healthy ? 200 : 503 })
   }

⏸️ Uptime monitoring con Better Stack
⏸️ Dashboards en Grafana/Datadog

Commit: feat(observability): implement APM and health monitoring

Fase 8.3: Disaster Recovery (Día 4)
Entregables:

⏸️ Backups automáticos:

bash   # Cron daily: 2am
   0 2 * * * pg_dump agencia_web_b2b | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
   
   # Retention: 30 días
   find /backups -name "db-*.sql.gz" -mtime +30 -delete

⏸️ Backup de archivos a S3:

typescript   export async function backupUploads() {
     const files = await fs.readdir('./uploads')
     
     for (const file of files) {
       await s3.upload({
         Bucket: 'agencia-backups',
         Key: `uploads/${file}`,
         Body: fs.createReadStream(`./uploads/${file}`)
       })
     }
   }

⏸️ Restore procedures documentados
⏸️ Failover database (replica read-only)

Commit: feat(dr): implement automated backup and restore procedures

Fase 8.4: Documentación Final (Día 5)
Entregables:

⏸️ README completo con:

Setup instructions
Architecture diagrams
Environment variables
Development workflow
Deployment guide


⏸️ API documentation con OpenAPI/Swagger
⏸️ Runbook de operaciones:

Cómo hacer deploy
Cómo rollback
Troubleshooting común
Escalation procedures


⏸️ User manual para el equipo de ventas

Commit: docs: add comprehensive project documentation

🎯 RESUMEN EJECUTIVO
Estado Actual (Semana 4, Día 1)
✅ Completado (Semanas 1-3)

Infraestructura: VPS, DB, Docker, CI/CD
Captura de leads: Schema, CRUD, scraper Google Maps
Enriquecimiento: Website search, email finding
Scoring con IA: Dual score (FIT + INTENT)
Brief generator con GPT-4
Pipeline state machine con validaciones
Sistema de citas (Appointments)
Tests de Proposal creados

🔄 En Progreso (Semana 4)

BLOQUEADO: Schema Proposal no agregado
Generador de propuestas con IA
PDF generation
Tracking de propuestas

⏸️ Pendiente (Semanas 5-8)

Outreach automation
Follow-up sequences
Analytics dashboard
A/B testing
Seguridad (FIX-05, 06, 07)
GDPR compliance
Performance optimization
Observability
Disaster recovery


Próximos Pasos Inmediatos
PASO 1: Desbloquear Semana 4 (URGENTE)
bash# Agregar schema Proposal
notepad prisma/schema.prisma
# (copiar modelo Proposal del Fase 4.1)

npx prisma migrate dev --name add_proposals
npx prisma generate
git commit -m "feat(schema): add Proposal model"
PASO 2: Completar Semana 4 (2-3 días)

Implementar proposal.service.ts
Implementar API routes
Generar PDFs
Landing pages de tracking

PASO 3: Semana 5 - Outreach (5 días)

Templates de email
Campañas automáticas
Follow-up sequences

PASO 4: Semanas 6-8 - Optimización (15 días)

Analytics
Seguridad
Performance
Monitoreo


Métricas de Éxito
MétricaTargetActualLeads capturados/mes500+TBDTasa de enriquecimiento>90%TBDLeads con score >70>30%TBDConversion rate (lead → cita)>15%TBDConversion rate (cita → propuesta)>60%TBDConversion rate (propuesta → cierre)>25%TBDTiempo promedio: lead → propuesta<7 díasTBDEmail open rate>25%TBDEmail reply rate>5%TBD
¿Necesitás que expanda alguna fase específica o ajuste el roadmap?