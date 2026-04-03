# STRUCTURED.md

**Generado:** 2026-03-29 18:44:11

---

## 📂 Estructura de Directorios

```
agencia-web-b2b/
├── _archived_scripts/
│   ├── check-logs.ts (52 líneas)
│   ├── check_do.js (24 líneas)
│   ├── check_supabase.js (23 líneas)
│   ├── check_user.sql (5 líneas)
│   ├── db_audit.sql (23 líneas)
│   ├── fetch_leads.js (36 líneas)
│   ├── fix-citado.js (11 líneas)
│   ├── fix-leadsdatatable-locale.js (14 líneas)
│   ├── fix-next-route-await.js (23 líneas)
│   ├── fix-next15-route-params.js (34 líneas)
│   ├── fix-pipeline-enum.js (40 líneas)
│   ├── fix-pipeline-final.js (40 líneas)
│   ├── fix-pipeline-status.js (11 líneas)
│   ├── fix_db.js (28 líneas)
│   ├── list_dbs.js (18 líneas)
│   ├── list_dbs_prisma.js (21 líneas)
│   ├── list_tables_postgres.js (21 líneas)
│   ├── save_intelligence.js (56 líneas)
│   ├── test-finops-logic.ts (49 líneas)
│   ├── test-insert.ts (41 líneas)
│   ├── test-internal-auth.mjs (82 líneas)
│   ├── test-single.mjs (20 líneas)
│   ├── test_business_roi.js (80 líneas)
│   ├── test_business_roi.ts (80 líneas)
│   ├── test_fallback.py (36 líneas)
│   ├── test_observability.ts (52 líneas)
│   ├── test_scraper_direct.py (29 líneas)
│   ├── tmp_fetch_leads.js (35 líneas)
│   └── tmp_update_leads.js (57 líneas)
├── _migration_backup_20260323_150733/
│   └── src_backup/
│       ├── app/
│       │   ├── [locale]/
│       │   │   ├── accept-invitation/
│       │   │   │   └── page.tsx (24 líneas)
│       │   │   ├── admin/
│       │   │   │   ├── agents/
│       │   │   │   │   └── page.tsx (15 líneas)
│       │   │   │   ├── dashboard/
│       │   │   │   │   ├── ingest/
│       │   │   │   │   │   └── page.tsx (43 líneas)
│       │   │   │   │   ├── scraper/
│       │   │   │   │   │   └── page.tsx (72 líneas)
│       │   │   │   │   └── page.tsx (298 líneas)
│       │   │   │   ├── deals/
│       │   │   │   │   └── page.tsx (52 líneas)
│       │   │   │   ├── intelligence/
│       │   │   │   │   ├── intelligence.module.css (409 líneas)
│       │   │   │   │   └── page.tsx (421 líneas)
│       │   │   │   ├── leads/
│       │   │   │   │   └── page.tsx (112 líneas)
│       │   │   │   ├── observability/
│       │   │   │   │   └── page.tsx (6 líneas)
│       │   │   │   ├── onboarding/
│       │   │   │   │   └── page.tsx (209 líneas)
│       │   │   │   ├── operations/
│       │   │   │   │   └── team/
│       │   │   │   │       └── page.tsx (309 líneas)
│       │   │   │   ├── outreach/
│       │   │   │   │   ├── new/
│       │   │   │   │   │   └── page.tsx (19 líneas)
│       │   │   │   │   └── page.tsx (200 líneas)
│       │   │   │   ├── pipeline/
│       │   │   │   │   └── page.tsx (227 líneas)
│       │   │   │   ├── revenue/
│       │   │   │   │   └── page.tsx (458 líneas)
│       │   │   │   ├── security/
│       │   │   │   │   └── iam/
│       │   │   │   │       └── page.tsx (350 líneas)
│       │   │   │   ├── select-tenant/
│       │   │   │   │   └── page.tsx (52 líneas)
│       │   │   │   ├── settings/
│       │   │   │   │   └── branding/
│       │   │   │   │       └── page.tsx (60 líneas)
│       │   │   │   └── layout.tsx (207 líneas)
│       │   │   ├── api/
│       │   │   │   ├── admin/
│       │   │   │   │   ├── actions/
│       │   │   │   │   │   └── route.ts (39 líneas)
│       │   │   │   │   ├── agents/
│       │   │   │   │   │   ├── [id]/
│       │   │   │   │   │   │   └── route.ts (67 líneas)
│       │   │   │   │   │   └── route.ts (59 líneas)
│       │   │   │   │   ├── onboarding/
│       │   │   │   │   │   └── route.ts (63 líneas)
│       │   │   │   │   └── scrapers/
│       │   │   │   │       ├── run/
│       │   │   │   │       │   └── route.ts (51 líneas)
│       │   │   │   │       ├── schedules/
│       │   │   │   │       │   └── route.ts (59 líneas)
│       │   │   │   │       ├── status/
│       │   │   │   │       │   └── [jobId]/
│       │   │   │   │       │       └── route.ts (32 líneas)
│       │   │   │   │       └── trigger/
│       │   │   │   │           └── route.ts (52 líneas)
│       │   │   │   ├── auth/
│       │   │   │   │   ├── change-password/
│       │   │   │   │   │   └── route.ts (45 líneas)
│       │   │   │   │   ├── logout/
│       │   │   │   │   │   └── route.ts (7 líneas)
│       │   │   │   │   ├── register-company/
│       │   │   │   │   │   └── route.ts (177 líneas)
│       │   │   │   │   ├── register-invite/
│       │   │   │   │   │   └── route.ts (99 líneas)
│       │   │   │   │   ├── switch-tenant/
│       │   │   │   │   │   ├── route.test.ts (79 líneas)
│       │   │   │   │   │   └── route.ts (51 líneas)
│       │   │   │   │   └── tenant/
│       │   │   │   │       └── route.ts (66 líneas)
│       │   │   │   ├── contact/
│       │   │   │   │   └── route.ts (103 líneas)
│       │   │   │   ├── leads/
│       │   │   │   │   ├── [id]/
│       │   │   │   │   │   └── status/
│       │   │   │   │   │       └── route.ts (83 líneas)
│       │   │   │   │   └── ingest/
│       │   │   │   │       ├── route.test.ts (94 líneas)
│       │   │   │   │       └── route.ts (195 líneas)
│       │   │   │   └── v1/
│       │   │   │       └── whatsapp/
│       │   │   │           └── route.ts (185 líneas)
│       │   │   ├── auth/
│       │   │   │   ├── accept-invite/
│       │   │   │   │   └── page.tsx (128 líneas)
│       │   │   │   ├── forgot-password/
│       │   │   │   │   └── page.tsx (17 líneas)
│       │   │   │   ├── register-company/
│       │   │   │   │   └── page.tsx (152 líneas)
│       │   │   │   ├── sign-in/
│       │   │   │   │   └── page.tsx (150 líneas)
│       │   │   │   └── sign-up/
│       │   │   │       └── page.tsx (33 líneas)
│       │   │   ├── p/
│       │   │   │   └── [slug]/
│       │   │   │       └── page.tsx (113 líneas)
│       │   │   ├── pricing/
│       │   │   │   └── page.tsx (48 líneas)
│       │   │   ├── privacy/
│       │   │   │   └── page.tsx (21 líneas)
│       │   │   ├── sign-out/
│       │   │   │   └── page.tsx (36 líneas)
│       │   │   ├── layout.tsx (152 líneas)
│       │   │   ├── loading.tsx (38 líneas)
│       │   │   ├── not-found.tsx (71 líneas)
│       │   │   └── page.tsx (52 líneas)
│       │   ├── actions/
│       │   │   ├── tenant/
│       │   │   │   └── branding.ts (29 líneas)
│       │   │   └── deals.ts (33 líneas)
│       │   ├── api/
│       │   │   ├── admin/
│       │   │   │   ├── auditor/
│       │   │   │   │   └── route.ts (45 líneas)
│       │   │   │   ├── finops/
│       │   │   │   │   ├── finops.test.ts (91 líneas)
│       │   │   │   │   └── route.ts (154 líneas)
│       │   │   │   ├── invitations/
│       │   │   │   │   └── route.ts (117 líneas)
│       │   │   │   └── metrics/
│       │   │   │       ├── log/
│       │   │   │       │   └── route.ts (45 líneas)
│       │   │   │       └── vps/
│       │   │   │           └── route.ts (102 líneas)
│       │   │   ├── agents/
│       │   │   │   └── route.ts (106 líneas)
│       │   │   ├── analytics/
│       │   │   │   └── heatmap/
│       │   │   │       └── route.ts (15 líneas)
│       │   │   ├── appointments/
│       │   │   │   ├── [id]/
│       │   │   │   │   └── route.ts (94 líneas)
│       │   │   │   └── route.ts (131 líneas)
│       │   │   ├── auth/
│       │   │   │   └── [...nextauth]/
│       │   │   │       └── route.ts (16 líneas)
│       │   │   ├── auth-internal/
│       │   │   │   └── route.ts (33 líneas)
│       │   │   ├── bridge/
│       │   │   │   └── lead-intelligence/
│       │   │   │       └── route.ts (64 líneas)
│       │   │   ├── chat/
│       │   │   │   └── sales/
│       │   │   │       └── route.ts (68 líneas)
│       │   │   ├── finops/
│       │   │   │   ├── budget/
│       │   │   │   │   └── route.ts (37 líneas)
│       │   │   │   └── report/
│       │   │   │       └── route.ts (49 líneas)
│       │   │   ├── health/
│       │   │   │   └── route.ts (62 líneas)
│       │   │   ├── invitations/
│       │   │   │   └── accept/
│       │   │   │       └── route.ts (184 líneas)
│       │   │   ├── leads/
│       │   │   │   ├── [id]/
│       │   │   │   │   └── intelligence/
│       │   │   │   │       └── route.ts (42 líneas)
│       │   │   │   ├── brief/
│       │   │   │   │   ├── [leadId]/
│       │   │   │   │   │   └── route.ts (29 líneas)
│       │   │   │   │   └── route.ts (61 líneas)
│       │   │   │   ├── ingest/
│       │   │   │   │   └── route.ts (122 líneas)
│       │   │   │   ├── intelligence/
│       │   │   │   │   └── pending/
│       │   │   │   │       └── route.ts (50 líneas)
│       │   │   │   ├── pipeline/
│       │   │   │   │   ├── [status]/
│       │   │   │   │   │   └── route.ts (33 líneas)
│       │   │   │   │   └── route.ts (77 líneas)
│       │   │   │   └── score/
│       │   │   │       └── route.ts (60 líneas)
│       │   │   ├── metrics/
│       │   │   │   └── route.ts (144 líneas)
│       │   │   ├── observability/
│       │   │   │   ├── health/
│       │   │   │   │   └── route.ts (78 líneas)
│       │   │   │   ├── metrics/
│       │   │   │   │   └── route.ts (33 líneas)
│       │   │   │   └── traces/
│       │   │   │       └── route.ts (33 líneas)
│       │   │   ├── outreach/
│       │   │   │   └── campaigns/
│       │   │   │       ├── [id]/
│       │   │   │       │   ├── enroll/
│       │   │   │       │   │   └── route.ts (27 líneas)
│       │   │   │       │   ├── process/
│       │   │   │       │   │   └── route.ts (20 líneas)
│       │   │   │       │   └── stats/
│       │   │   │       │       └── route.ts (16 líneas)
│       │   │   │       └── route.ts (50 líneas)
│       │   │   ├── payments/
│       │   │   │   ├── cancel-subscription/
│       │   │   │   │   └── route.ts (45 líneas)
│       │   │   │   ├── change-plan/
│       │   │   │   │   └── route.ts (51 líneas)
│       │   │   │   ├── create-subscription/
│       │   │   │   │   └── route.ts (64 líneas)
│       │   │   │   └── subscription-status/
│       │   │   │       └── route.ts (55 líneas)
│       │   │   ├── proposals/
│       │   │   │   ├── [id]/
│       │   │   │   │   ├── pdf/
│       │   │   │   │   │   └── route.ts (92 líneas)
│       │   │   │   │   ├── send/
│       │   │   │   │   │   └── route.ts (26 líneas)
│       │   │   │   │   └── route.ts (89 líneas)
│       │   │   │   └── route.ts (73 líneas)
│       │   │   ├── rum/
│       │   │   │   ├── events/
│       │   │   │   │   └── route.ts (29 líneas)
│       │   │   │   └── summary/
│       │   │   │       └── route.ts (45 líneas)
│       │   │   └── webhooks/
│       │   │       └── mercadopago/
│       │   │           └── route.ts (72 líneas)
│       │   ├── favicon.ico (77 líneas)
│       │   ├── globals.css (199 líneas)
│       │   ├── icon.png (1134 líneas)
│       │   ├── layout.tsx (17 líneas)
│       │   ├── observability.css (68 líneas)
│       │   ├── page.tsx (5 líneas)
│       │   ├── robots.ts (12 líneas)
│       │   └── sitemap.ts (22 líneas)
│       ├── components/
│       │   ├── __tests__/
│       │   │   ├── Footer.test.tsx (111 líneas)
│       │   │   ├── Header.test.tsx (53 líneas)
│       │   │   └── WhatsAppButton.test.tsx (38 líneas)
│       │   ├── admin/
│       │   │   ├── agents/
│       │   │   │   ├── AgentConfigModal.tsx (213 líneas)
│       │   │   │   └── AgentsPanel.tsx (182 líneas)
│       │   │   ├── AuditorTab.tsx (272 líneas)
│       │   │   ├── BrandingSettingsForm.tsx (239 líneas)
│       │   │   ├── CopyInviteButton.tsx (37 líneas)
│       │   │   ├── DeleteInviteButton.tsx (55 líneas)
│       │   │   ├── IAM_Dashboard_Mockup.tsx (173 líneas)
│       │   │   ├── IntelligenceMarkdown.tsx (43 líneas)
│       │   │   ├── LeadContactButton.tsx (205 líneas)
│       │   │   ├── LeadIngestForm.tsx (415 líneas)
│       │   │   ├── LeadIntelligenceModal.tsx (439 líneas)
│       │   │   ├── LeadsDataTable.tsx (691 líneas)
│       │   │   ├── LeadStatusControl.tsx (71 líneas)
│       │   │   ├── LogoutButton.tsx (37 líneas)
│       │   │   ├── ObservabilityCommandCenter.tsx (436 líneas)
│       │   │   ├── ObservabilityDashboard.tsx (159 líneas)
│       │   │   ├── ObservabilityOverview.tsx (222 líneas)
│       │   │   ├── OutreachEnrollmentModal.tsx (166 líneas)
│       │   │   ├── OutreachNewCampaign.tsx (224 líneas)
│       │   │   ├── ProposalPreview.tsx (173 líneas)
│       │   │   ├── RumMetrics.tsx (137 líneas)
│       │   │   ├── ScraperForm.tsx (599 líneas)
│       │   │   ├── SendInviteEmailButton.tsx (61 líneas)
│       │   │   ├── SidebarCategory.tsx (96 líneas)
│       │   │   ├── SidebarNavItem.tsx (76 líneas)
│       │   │   └── VpsMetricsCharts.tsx (284 líneas)
│       │   ├── auth/
│       │   │   ├── CompanySignUpForm.tsx (423 líneas)
│       │   │   ├── GoogleSignInButton.tsx (44 líneas)
│       │   │   ├── LoginForm.tsx (257 líneas)
│       │   │   ├── SignUpForm.tsx (150 líneas)
│       │   │   └── TenantSelector.tsx (69 líneas)
│       │   ├── billing/
│       │   │   ├── BillingPortal.tsx (219 líneas)
│       │   │   ├── PlanLimitWarning.tsx (75 líneas)
│       │   │   ├── SubscriptionButton.tsx (88 líneas)
│       │   │   └── SubscriptionStatus.tsx (102 líneas)
│       │   ├── deals/
│       │   │   └── DealKanban.tsx (141 líneas)
│       │   ├── invitations/
│       │   │   └── AcceptInvitationForm.tsx (175 líneas)
│       │   ├── leads/
│       │   │   └── StrategicBrief.tsx (39 líneas)
│       │   ├── pricing/
│       │   │   ├── PricingCTA.tsx (43 líneas)
│       │   │   ├── PricingHero.tsx (55 líneas)
│       │   │   ├── PricingMaintenance.tsx (73 líneas)
│       │   │   └── PricingTable.tsx (130 líneas)
│       │   ├── providers/
│       │   │   └── RumProvider.tsx (30 líneas)
│       │   ├── Analytics.tsx (19 líneas)
│       │   ├── BrandingProvider.tsx (74 líneas)
│       │   ├── CookieConsent.tsx (108 líneas)
│       │   ├── Footer.tsx (315 líneas)
│       │   ├── GoogleTagManager.tsx (29 líneas)
│       │   ├── Header.tsx (183 líneas)
│       │   ├── Hero.tsx (251 líneas)
│       │   ├── PainPoints.tsx (80 líneas)
│       │   ├── Process.tsx (87 líneas)
│       │   ├── Qualification.tsx (76 líneas)
│       │   ├── SalesChatWidget.tsx (226 líneas)
│       │   ├── Services.tsx (165 líneas)
│       │   ├── StructuredData.tsx (32 líneas)
│       │   └── WhatsAppButton.tsx (39 líneas)
│       ├── hooks/
│       │   ├── useLeadsTable.ts (112 líneas)
│       │   └── useRumTracker.ts (28 líneas)
│       ├── i18n/
│       │   ├── request.ts (21 líneas)
│       │   └── routing.ts (15 líneas)
│       ├── lib/
│       │   ├── __tests__/
│       │   │   ├── authz.test.ts (109 líneas)
│       │   │   ├── lead-conversion.test.ts (103 líneas)
│       │   │   └── lead-multitenancy.test.ts (117 líneas)
│       │   ├── agent-service/
│       │   │   └── client.ts (82 líneas)
│       │   ├── ai/
│       │   │   ├── providers/
│       │   │   │   └── openai-generic.ts (52 líneas)
│       │   │   ├── engine.ts (90 líneas)
│       │   │   ├── knowledge.ts (34 líneas)
│       │   │   └── types.ts (15 líneas)
│       │   ├── appointments/
│       │   │   └── appointments.service.ts (202 líneas)
│       │   ├── auth/
│       │   │   ├── __tests__/
│       │   │   │   ├── password.test.ts (27 líneas)
│       │   │   │   └── session.test.ts (100 líneas)
│       │   │   ├── actions.ts (7 líneas)
│       │   │   ├── admin-session.ts (71 líneas)
│       │   │   ├── hash.ts (13 líneas)
│       │   │   ├── password-recovery.ts (96 líneas)
│       │   │   ├── password.ts (23 líneas)
│       │   │   ├── request-auth.ts (43 líneas)
│       │   │   ├── server.ts (26 líneas)
│       │   │   └── session.ts (93 líneas)
│       │   ├── billing/
│       │   │   ├── alerts.ts (46 líneas)
│       │   │   └── plan-limits.ts (50 líneas)
│       │   ├── bot/
│       │   │   ├── ai-manager.ts (108 líneas)
│       │   │   ├── lead-manager.ts (106 líneas)
│       │   │   ├── notification-manager.ts (42 líneas)
│       │   │   └── redis-context.ts (89 líneas)
│       │   ├── economics/
│       │   │   ├── tracker.test.ts (107 líneas)
│       │   │   └── tracker.ts (85 líneas)
│       │   ├── iam/
│       │   │   ├── iam.service.ts (110 líneas)
│       │   │   └── rbac.ts (59 líneas)
│       │   ├── leads/
│       │   │   ├── brief/
│       │   │   │   ├── brief.prompts.ts (41 líneas)
│       │   │   │   └── brief.service.ts (301 líneas)
│       │   │   ├── pipeline/
│       │   │   │   └── pipeline.service.ts (189 líneas)
│       │   │   ├── scoring/
│       │   │   │   ├── scoring.prompts.ts (24 líneas)
│       │   │   │   └── scoring.service.ts (236 líneas)
│       │   │   ├── classifier.ts (85 líneas)
│       │   │   ├── conversion-service.ts (69 líneas)
│       │   │   ├── ingest.service.ts (147 líneas)
│       │   │   ├── intelligence-service.ts (121 líneas)
│       │   │   ├── lead-automation-service.ts (74 líneas)
│       │   │   ├── normalizer.ts (84 líneas)
│       │   │   └── scoring.ts (59 líneas)
│       │   ├── meta/
│       │   │   ├── signature-validator.ts (35 líneas)
│       │   │   └── whatsapp-client.ts (179 líneas)
│       │   ├── observability/
│       │   │   ├── analytics/
│       │   │   │   └── PerformanceAnalytics.ts (90 líneas)
│       │   │   ├── finops/
│       │   │   │   └── FinOpsIntelligence.ts (90 líneas)
│       │   │   ├── rum/
│       │   │   │   ├── rum-sdk.ts (94 líneas)
│       │   │   │   └── vitals-handler.ts (22 líneas)
│       │   │   ├── logger.ts (53 líneas)
│       │   │   ├── metrics.ts (45 líneas)
│       │   │   ├── openai-client.ts (66 líneas)
│       │   │   ├── otel.ts (70 líneas)
│       │   │   ├── places-client.ts (57 líneas)
│       │   │   ├── sentry-utils.ts (32 líneas)
│       │   │   ├── tracing.ts (42 líneas)
│       │   │   └── types.ts (25 líneas)
│       │   ├── outreach/
│       │   │   └── outreach-service.ts (156 líneas)
│       │   ├── payments/
│       │   │   ├── mercadopago.ts (209 líneas)
│       │   │   ├── subscription-service.ts (244 líneas)
│       │   │   ├── types.ts (88 líneas)
│       │   │   └── webhook-handlers.ts (184 líneas)
│       │   ├── proposals/
│       │   │   ├── proposal.pdf.tsx (141 líneas)
│       │   │   ├── proposal.prompts.ts (67 líneas)
│       │   │   └── proposal.service.ts (469 líneas)
│       │   ├── scrapers/
│       │   │   └── google-places.ts (64 líneas)
│       │   ├── security/
│       │   │   ├── audit.ts (20 líneas)
│       │   │   ├── cookies.ts (25 líneas)
│       │   │   └── rate-limit.ts (53 líneas)
│       │   ├── sre/
│       │   │   └── metrics.ts (77 líneas)
│       │   ├── analytics.ts (120 líneas)
│       │   ├── api-auth.ts (58 líneas)
│       │   ├── auth.ts (25 líneas)
│       │   ├── authz.ts (125 líneas)
│       │   ├── bridge-client.ts (27 líneas)
│       │   ├── design-tokens.ts (31 líneas)
│       │   ├── lead-repository.ts (57 líneas)
│       │   ├── logger.ts (35 líneas)
│       │   ├── mail.ts (142 líneas)
│       │   ├── plan-guard.ts (60 líneas)
│       │   ├── prisma.ts (227 líneas)
│       │   ├── ratelimit.ts (29 líneas)
│       │   ├── scoped-prisma.ts (29 líneas)
│       │   ├── tenant-context.ts (33 líneas)
│       │   └── whatsapp.ts (74 líneas)
│       ├── types/
│       │   ├── leads.ts (57 líneas)
│       │   └── next-auth.d.ts (24 líneas)
│       ├── auth.config.ts (149 líneas)
│       ├── instrumentation.ts (13 líneas)
│       └── proxy.ts (109 líneas)
├── _migration_backup_20260323_151358/
│   └── src_backup/
│       ├── app/
│       │   ├── [locale]/
│       │   │   ├── accept-invitation/
│       │   │   │   └── page.tsx (24 líneas)
│       │   │   ├── admin/
│       │   │   │   ├── agents/
│       │   │   │   │   └── page.tsx (15 líneas)
│       │   │   │   ├── dashboard/
│       │   │   │   │   ├── ingest/
│       │   │   │   │   │   └── page.tsx (43 líneas)
│       │   │   │   │   ├── scraper/
│       │   │   │   │   │   └── page.tsx (72 líneas)
│       │   │   │   │   └── page.tsx (298 líneas)
│       │   │   │   ├── deals/
│       │   │   │   │   └── page.tsx (52 líneas)
│       │   │   │   ├── intelligence/
│       │   │   │   │   ├── intelligence.module.css (409 líneas)
│       │   │   │   │   └── page.tsx (421 líneas)
│       │   │   │   ├── leads/
│       │   │   │   │   └── page.tsx (112 líneas)
│       │   │   │   ├── observability/
│       │   │   │   │   └── page.tsx (6 líneas)
│       │   │   │   ├── onboarding/
│       │   │   │   │   └── page.tsx (209 líneas)
│       │   │   │   ├── operations/
│       │   │   │   │   └── team/
│       │   │   │   │       └── page.tsx (309 líneas)
│       │   │   │   ├── outreach/
│       │   │   │   │   ├── new/
│       │   │   │   │   │   └── page.tsx (19 líneas)
│       │   │   │   │   └── page.tsx (200 líneas)
│       │   │   │   ├── pipeline/
│       │   │   │   │   └── page.tsx (227 líneas)
│       │   │   │   ├── revenue/
│       │   │   │   │   └── page.tsx (458 líneas)
│       │   │   │   ├── security/
│       │   │   │   │   └── iam/
│       │   │   │   │       └── page.tsx (350 líneas)
│       │   │   │   ├── select-tenant/
│       │   │   │   │   └── page.tsx (52 líneas)
│       │   │   │   ├── settings/
│       │   │   │   │   └── branding/
│       │   │   │   │       └── page.tsx (60 líneas)
│       │   │   │   └── layout.tsx (207 líneas)
│       │   │   ├── api/
│       │   │   │   ├── admin/
│       │   │   │   │   ├── actions/
│       │   │   │   │   │   └── route.ts (39 líneas)
│       │   │   │   │   ├── agents/
│       │   │   │   │   │   ├── [id]/
│       │   │   │   │   │   │   └── route.ts (67 líneas)
│       │   │   │   │   │   └── route.ts (59 líneas)
│       │   │   │   │   ├── onboarding/
│       │   │   │   │   │   └── route.ts (63 líneas)
│       │   │   │   │   └── scrapers/
│       │   │   │   │       ├── run/
│       │   │   │   │       │   └── route.ts (51 líneas)
│       │   │   │   │       ├── schedules/
│       │   │   │   │       │   └── route.ts (59 líneas)
│       │   │   │   │       ├── status/
│       │   │   │   │       │   └── [jobId]/
│       │   │   │   │       │       └── route.ts (32 líneas)
│       │   │   │   │       └── trigger/
│       │   │   │   │           └── route.ts (52 líneas)
│       │   │   │   ├── auth/
│       │   │   │   │   ├── change-password/
│       │   │   │   │   │   └── route.ts (45 líneas)
│       │   │   │   │   ├── logout/
│       │   │   │   │   │   └── route.ts (7 líneas)
│       │   │   │   │   ├── register-company/
│       │   │   │   │   │   └── route.ts (177 líneas)
│       │   │   │   │   ├── register-invite/
│       │   │   │   │   │   └── route.ts (99 líneas)
│       │   │   │   │   ├── switch-tenant/
│       │   │   │   │   │   ├── route.test.ts (79 líneas)
│       │   │   │   │   │   └── route.ts (51 líneas)
│       │   │   │   │   └── tenant/
│       │   │   │   │       └── route.ts (66 líneas)
│       │   │   │   ├── contact/
│       │   │   │   │   └── route.ts (103 líneas)
│       │   │   │   ├── leads/
│       │   │   │   │   ├── [id]/
│       │   │   │   │   │   └── status/
│       │   │   │   │   │       └── route.ts (83 líneas)
│       │   │   │   │   └── ingest/
│       │   │   │   │       ├── route.test.ts (94 líneas)
│       │   │   │   │       └── route.ts (195 líneas)
│       │   │   │   └── v1/
│       │   │   │       └── whatsapp/
│       │   │   │           └── route.ts (185 líneas)
│       │   │   ├── auth/
│       │   │   │   ├── accept-invite/
│       │   │   │   │   └── page.tsx (128 líneas)
│       │   │   │   ├── forgot-password/
│       │   │   │   │   └── page.tsx (17 líneas)
│       │   │   │   ├── register-company/
│       │   │   │   │   └── page.tsx (152 líneas)
│       │   │   │   ├── sign-in/
│       │   │   │   │   └── page.tsx (150 líneas)
│       │   │   │   └── sign-up/
│       │   │   │       └── page.tsx (33 líneas)
│       │   │   ├── p/
│       │   │   │   └── [slug]/
│       │   │   │       └── page.tsx (113 líneas)
│       │   │   ├── pricing/
│       │   │   │   └── page.tsx (48 líneas)
│       │   │   ├── privacy/
│       │   │   │   └── page.tsx (21 líneas)
│       │   │   ├── sign-out/
│       │   │   │   └── page.tsx (36 líneas)
│       │   │   ├── layout.tsx (152 líneas)
│       │   │   ├── loading.tsx (38 líneas)
│       │   │   ├── not-found.tsx (71 líneas)
│       │   │   └── page.tsx (52 líneas)
│       │   ├── actions/
│       │   │   ├── tenant/
│       │   │   │   └── branding.ts (29 líneas)
│       │   │   └── deals.ts (33 líneas)
│       │   ├── api/
│       │   │   ├── admin/
│       │   │   │   ├── auditor/
│       │   │   │   │   └── route.ts (45 líneas)
│       │   │   │   ├── finops/
│       │   │   │   │   ├── finops.test.ts (91 líneas)
│       │   │   │   │   └── route.ts (154 líneas)
│       │   │   │   ├── invitations/
│       │   │   │   │   └── route.ts (117 líneas)
│       │   │   │   └── metrics/
│       │   │   │       ├── log/
│       │   │   │       │   └── route.ts (45 líneas)
│       │   │   │       └── vps/
│       │   │   │           └── route.ts (102 líneas)
│       │   │   ├── agents/
│       │   │   │   └── route.ts (106 líneas)
│       │   │   ├── analytics/
│       │   │   │   └── heatmap/
│       │   │   │       └── route.ts (15 líneas)
│       │   │   ├── appointments/
│       │   │   │   ├── [id]/
│       │   │   │   │   └── route.ts (94 líneas)
│       │   │   │   └── route.ts (131 líneas)
│       │   │   ├── auth/
│       │   │   │   └── [...nextauth]/
│       │   │   │       └── route.ts (16 líneas)
│       │   │   ├── auth-internal/
│       │   │   │   └── route.ts (33 líneas)
│       │   │   ├── bridge/
│       │   │   │   └── lead-intelligence/
│       │   │   │       └── route.ts (64 líneas)
│       │   │   ├── chat/
│       │   │   │   └── sales/
│       │   │   │       └── route.ts (68 líneas)
│       │   │   ├── finops/
│       │   │   │   ├── budget/
│       │   │   │   │   └── route.ts (37 líneas)
│       │   │   │   └── report/
│       │   │   │       └── route.ts (49 líneas)
│       │   │   ├── health/
│       │   │   │   └── route.ts (62 líneas)
│       │   │   ├── invitations/
│       │   │   │   └── accept/
│       │   │   │       └── route.ts (184 líneas)
│       │   │   ├── leads/
│       │   │   │   ├── [id]/
│       │   │   │   │   └── intelligence/
│       │   │   │   │       └── route.ts (42 líneas)
│       │   │   │   ├── brief/
│       │   │   │   │   ├── [leadId]/
│       │   │   │   │   │   └── route.ts (29 líneas)
│       │   │   │   │   └── route.ts (61 líneas)
│       │   │   │   ├── ingest/
│       │   │   │   │   └── route.ts (122 líneas)
│       │   │   │   ├── intelligence/
│       │   │   │   │   └── pending/
│       │   │   │   │       └── route.ts (50 líneas)
│       │   │   │   ├── pipeline/
│       │   │   │   │   ├── [status]/
│       │   │   │   │   │   └── route.ts (33 líneas)
│       │   │   │   │   └── route.ts (77 líneas)
│       │   │   │   └── score/
│       │   │   │       └── route.ts (60 líneas)
│       │   │   ├── metrics/
│       │   │   │   └── route.ts (144 líneas)
│       │   │   ├── observability/
│       │   │   │   ├── health/
│       │   │   │   │   └── route.ts (78 líneas)
│       │   │   │   ├── metrics/
│       │   │   │   │   └── route.ts (33 líneas)
│       │   │   │   └── traces/
│       │   │   │       └── route.ts (33 líneas)
│       │   │   ├── outreach/
│       │   │   │   └── campaigns/
│       │   │   │       ├── [id]/
│       │   │   │       │   ├── enroll/
│       │   │   │       │   │   └── route.ts (27 líneas)
│       │   │   │       │   ├── process/
│       │   │   │       │   │   └── route.ts (20 líneas)
│       │   │   │       │   └── stats/
│       │   │   │       │       └── route.ts (16 líneas)
│       │   │   │       └── route.ts (50 líneas)
│       │   │   ├── payments/
│       │   │   │   ├── cancel-subscription/
│       │   │   │   │   └── route.ts (45 líneas)
│       │   │   │   ├── change-plan/
│       │   │   │   │   └── route.ts (51 líneas)
│       │   │   │   ├── create-subscription/
│       │   │   │   │   └── route.ts (64 líneas)
│       │   │   │   └── subscription-status/
│       │   │   │       └── route.ts (55 líneas)
│       │   │   ├── proposals/
│       │   │   │   ├── [id]/
│       │   │   │   │   ├── pdf/
│       │   │   │   │   │   └── route.ts (92 líneas)
│       │   │   │   │   ├── send/
│       │   │   │   │   │   └── route.ts (26 líneas)
│       │   │   │   │   └── route.ts (89 líneas)
│       │   │   │   └── route.ts (73 líneas)
│       │   │   ├── rum/
│       │   │   │   ├── events/
│       │   │   │   │   └── route.ts (29 líneas)
│       │   │   │   └── summary/
│       │   │   │       └── route.ts (45 líneas)
│       │   │   └── webhooks/
│       │   │       └── mercadopago/
│       │   │           └── route.ts (72 líneas)
│       │   ├── favicon.ico (77 líneas)
│       │   ├── globals.css (199 líneas)
│       │   ├── icon.png (1134 líneas)
│       │   ├── layout.tsx (17 líneas)
│       │   ├── observability.css (68 líneas)
│       │   ├── page.tsx (5 líneas)
│       │   ├── robots.ts (12 líneas)
│       │   └── sitemap.ts (22 líneas)
│       ├── components/
│       │   ├── __tests__/
│       │   │   ├── Footer.test.tsx (111 líneas)
│       │   │   ├── Header.test.tsx (53 líneas)
│       │   │   └── WhatsAppButton.test.tsx (38 líneas)
│       │   ├── admin/
│       │   │   ├── agents/
│       │   │   │   ├── AgentConfigModal.tsx (213 líneas)
│       │   │   │   └── AgentsPanel.tsx (182 líneas)
│       │   │   ├── AuditorTab.tsx (272 líneas)
│       │   │   ├── BrandingSettingsForm.tsx (239 líneas)
│       │   │   ├── CopyInviteButton.tsx (37 líneas)
│       │   │   ├── DeleteInviteButton.tsx (55 líneas)
│       │   │   ├── IAM_Dashboard_Mockup.tsx (173 líneas)
│       │   │   ├── IntelligenceMarkdown.tsx (43 líneas)
│       │   │   ├── LeadContactButton.tsx (205 líneas)
│       │   │   ├── LeadIngestForm.tsx (415 líneas)
│       │   │   ├── LeadIntelligenceModal.tsx (439 líneas)
│       │   │   ├── LeadsDataTable.tsx (691 líneas)
│       │   │   ├── LeadStatusControl.tsx (71 líneas)
│       │   │   ├── LogoutButton.tsx (37 líneas)
│       │   │   ├── ObservabilityCommandCenter.tsx (436 líneas)
│       │   │   ├── ObservabilityDashboard.tsx (159 líneas)
│       │   │   ├── ObservabilityOverview.tsx (222 líneas)
│       │   │   ├── OutreachEnrollmentModal.tsx (166 líneas)
│       │   │   ├── OutreachNewCampaign.tsx (224 líneas)
│       │   │   ├── ProposalPreview.tsx (173 líneas)
│       │   │   ├── RumMetrics.tsx (137 líneas)
│       │   │   ├── ScraperForm.tsx (599 líneas)
│       │   │   ├── SendInviteEmailButton.tsx (61 líneas)
│       │   │   ├── SidebarCategory.tsx (96 líneas)
│       │   │   ├── SidebarNavItem.tsx (76 líneas)
│       │   │   └── VpsMetricsCharts.tsx (284 líneas)
│       │   ├── auth/
│       │   │   ├── CompanySignUpForm.tsx (423 líneas)
│       │   │   ├── GoogleSignInButton.tsx (44 líneas)
│       │   │   ├── LoginForm.tsx (257 líneas)
│       │   │   ├── SignUpForm.tsx (150 líneas)
│       │   │   └── TenantSelector.tsx (69 líneas)
│       │   ├── billing/
│       │   │   ├── BillingPortal.tsx (219 líneas)
│       │   │   ├── PlanLimitWarning.tsx (75 líneas)
│       │   │   ├── SubscriptionButton.tsx (88 líneas)
│       │   │   └── SubscriptionStatus.tsx (102 líneas)
│       │   ├── deals/
│       │   │   └── DealKanban.tsx (141 líneas)
│       │   ├── invitations/
│       │   │   └── AcceptInvitationForm.tsx (175 líneas)
│       │   ├── leads/
│       │   │   └── StrategicBrief.tsx (39 líneas)
│       │   ├── pricing/
│       │   │   ├── PricingCTA.tsx (43 líneas)
│       │   │   ├── PricingHero.tsx (55 líneas)
│       │   │   ├── PricingMaintenance.tsx (73 líneas)
│       │   │   └── PricingTable.tsx (130 líneas)
│       │   ├── providers/
│       │   │   └── RumProvider.tsx (30 líneas)
│       │   ├── Analytics.tsx (19 líneas)
│       │   ├── BrandingProvider.tsx (74 líneas)
│       │   ├── CookieConsent.tsx (108 líneas)
│       │   ├── Footer.tsx (315 líneas)
│       │   ├── GoogleTagManager.tsx (29 líneas)
│       │   ├── Header.tsx (183 líneas)
│       │   ├── Hero.tsx (251 líneas)
│       │   ├── PainPoints.tsx (80 líneas)
│       │   ├── Process.tsx (87 líneas)
│       │   ├── Qualification.tsx (76 líneas)
│       │   ├── SalesChatWidget.tsx (226 líneas)
│       │   ├── Services.tsx (165 líneas)
│       │   ├── StructuredData.tsx (32 líneas)
│       │   └── WhatsAppButton.tsx (39 líneas)
│       ├── hooks/
│       │   ├── useLeadsTable.ts (112 líneas)
│       │   └── useRumTracker.ts (28 líneas)
│       ├── i18n/
│       │   ├── request.ts (21 líneas)
│       │   └── routing.ts (15 líneas)
│       ├── lib/
│       │   ├── __tests__/
│       │   │   ├── authz.test.ts (109 líneas)
│       │   │   ├── lead-conversion.test.ts (103 líneas)
│       │   │   └── lead-multitenancy.test.ts (117 líneas)
│       │   ├── agent-service/
│       │   │   └── client.ts (82 líneas)
│       │   ├── ai/
│       │   │   ├── providers/
│       │   │   │   └── openai-generic.ts (52 líneas)
│       │   │   ├── engine.ts (90 líneas)
│       │   │   ├── knowledge.ts (34 líneas)
│       │   │   └── types.ts (15 líneas)
│       │   ├── appointments/
│       │   │   └── appointments.service.ts (202 líneas)
│       │   ├── auth/
│       │   │   ├── __tests__/
│       │   │   │   ├── password.test.ts (27 líneas)
│       │   │   │   └── session.test.ts (100 líneas)
│       │   │   ├── actions.ts (7 líneas)
│       │   │   ├── admin-session.ts (71 líneas)
│       │   │   ├── hash.ts (13 líneas)
│       │   │   ├── password-recovery.ts (96 líneas)
│       │   │   ├── password.ts (23 líneas)
│       │   │   ├── request-auth.ts (43 líneas)
│       │   │   ├── server.ts (26 líneas)
│       │   │   └── session.ts (93 líneas)
│       │   ├── billing/
│       │   │   ├── alerts.ts (46 líneas)
│       │   │   └── plan-limits.ts (50 líneas)
│       │   ├── bot/
│       │   │   ├── ai-manager.ts (108 líneas)
│       │   │   ├── lead-manager.ts (106 líneas)
│       │   │   ├── notification-manager.ts (42 líneas)
│       │   │   └── redis-context.ts (89 líneas)
│       │   ├── config/
│       │   │   └── api.ts (4 líneas)
│       │   ├── economics/
│       │   │   ├── tracker.test.ts (107 líneas)
│       │   │   └── tracker.ts (85 líneas)
│       │   ├── iam/
│       │   │   ├── iam.service.ts (110 líneas)
│       │   │   └── rbac.ts (59 líneas)
│       │   ├── leads/
│       │   │   ├── brief/
│       │   │   │   ├── brief.prompts.ts (41 líneas)
│       │   │   │   └── brief.service.ts (301 líneas)
│       │   │   ├── pipeline/
│       │   │   │   └── pipeline.service.ts (189 líneas)
│       │   │   ├── scoring/
│       │   │   │   ├── scoring.prompts.ts (24 líneas)
│       │   │   │   └── scoring.service.ts (236 líneas)
│       │   │   ├── classifier.ts (85 líneas)
│       │   │   ├── conversion-service.ts (69 líneas)
│       │   │   ├── ingest.service.ts (147 líneas)
│       │   │   ├── intelligence-service.ts (121 líneas)
│       │   │   ├── lead-automation-service.ts (74 líneas)
│       │   │   ├── normalizer.ts (84 líneas)
│       │   │   └── scoring.ts (59 líneas)
│       │   ├── meta/
│       │   │   ├── signature-validator.ts (35 líneas)
│       │   │   └── whatsapp-client.ts (179 líneas)
│       │   ├── observability/
│       │   │   ├── analytics/
│       │   │   │   └── PerformanceAnalytics.ts (90 líneas)
│       │   │   ├── finops/
│       │   │   │   └── FinOpsIntelligence.ts (90 líneas)
│       │   │   ├── rum/
│       │   │   │   ├── rum-sdk.ts (94 líneas)
│       │   │   │   └── vitals-handler.ts (22 líneas)
│       │   │   ├── logger.ts (53 líneas)
│       │   │   ├── metrics.ts (45 líneas)
│       │   │   ├── openai-client.ts (66 líneas)
│       │   │   ├── otel.ts (70 líneas)
│       │   │   ├── places-client.ts (57 líneas)
│       │   │   ├── sentry-utils.ts (32 líneas)
│       │   │   ├── tracing.ts (42 líneas)
│       │   │   └── types.ts (25 líneas)
│       │   ├── outreach/
│       │   │   └── outreach-service.ts (156 líneas)
│       │   ├── payments/
│       │   │   ├── mercadopago.ts (209 líneas)
│       │   │   ├── subscription-service.ts (244 líneas)
│       │   │   ├── types.ts (88 líneas)
│       │   │   └── webhook-handlers.ts (184 líneas)
│       │   ├── proposals/
│       │   │   ├── proposal.pdf.tsx (141 líneas)
│       │   │   ├── proposal.prompts.ts (67 líneas)
│       │   │   └── proposal.service.ts (469 líneas)
│       │   ├── scrapers/
│       │   │   └── google-places.ts (64 líneas)
│       │   ├── security/
│       │   │   ├── audit.ts (20 líneas)
│       │   │   ├── cookies.ts (25 líneas)
│       │   │   └── rate-limit.ts (53 líneas)
│       │   ├── sre/
│       │   │   └── metrics.ts (77 líneas)
│       │   ├── analytics.ts (120 líneas)
│       │   ├── api-auth.ts (58 líneas)
│       │   ├── auth.ts (25 líneas)
│       │   ├── authz.ts (125 líneas)
│       │   ├── bridge-client.ts (27 líneas)
│       │   ├── design-tokens.ts (31 líneas)
│       │   ├── lead-repository.ts (57 líneas)
│       │   ├── logger.ts (35 líneas)
│       │   ├── mail.ts (142 líneas)
│       │   ├── plan-guard.ts (60 líneas)
│       │   ├── prisma.ts (227 líneas)
│       │   ├── ratelimit.ts (29 líneas)
│       │   ├── scoped-prisma.ts (29 líneas)
│       │   ├── tenant-context.ts (33 líneas)
│       │   └── whatsapp.ts (74 líneas)
│       ├── types/
│       │   ├── leads.ts (57 líneas)
│       │   └── next-auth.d.ts (24 líneas)
│       ├── auth.config.ts (149 líneas)
│       ├── instrumentation.ts (13 líneas)
│       └── proxy.ts (109 líneas)
├── agent-service/
│   ├── core/
│   │   ├── __init__.py (0 líneas)
│   │   ├── auth.py (40 líneas)
│   │   ├── config.py (28 líneas)
│   │   ├── database.py (53 líneas)
│   │   ├── job_store.py (197 líneas)
│   │   ├── metrics_collector.py (73 líneas)
│   │   ├── observability.py (52 líneas)
│   │   ├── rate_limit.py (4 líneas)
│   │   └── scheduler.py (166 líneas)
│   ├── llm/
│   │   ├── __init__.py (12 líneas)
│   │   ├── base.py (6 líneas)
│   │   ├── groq_provider.py (20 líneas)
│   │   └── ollama_provider.py (14 líneas)
│   ├── models/
│   │   ├── __init__.py (0 líneas)
│   │   └── schemas.py (21 líneas)
│   ├── routers/
│   │   ├── __init__.py (0 líneas)
│   │   ├── agents.py (25 líneas)
│   │   ├── chat.py (27 líneas)
│   │   ├── intelligence.py (202 líneas)
│   │   ├── keys.py (26 líneas)
│   │   ├── schedules.py (95 líneas)
│   │   └── scraper.py (105 líneas)
│   ├── services/
│   │   ├── __init__.py (1 líneas)
│   │   ├── ai_service.py (229 líneas)
│   │   ├── intelligence_service.py (371 líneas)
│   │   └── scraper_service.py (321 líneas)
│   ├── tests/
│   │   └── test_schedules_auth.py (72 líneas)
│   ├── widget/
│   │   └── chat-widget.js (74 líneas)
│   ├── __init__.py (0 líneas)
│   ├── deploy-vps.ps1 (20 líneas)
│   ├── deploy-vps.sh (28 líneas)
│   ├── docker-compose.yml (15 líneas)
│   ├── Dockerfile (7 líneas)
│   ├── main.py (64 líneas)
│   ├── nginx.conf (30 líneas)
│   └── requirements.txt (19 líneas)
├── agents-platform/
│   ├── ai-engine/
│   │   ├── tools/
│   │   ├── agent.py (0 líneas)
│   │   └── orchestrator.py (0 líneas)
│   ├── api/
│   ├── context/
│   │   ├── memory.json (0 líneas)
│   │   └── project.json (0 líneas)
│   └── docker-compose.yml (0 líneas)
├── auditor/
│   ├── ai/
│   │   ├── __init__.py (0 líneas)
│   │   ├── audit_agent.py (54 líneas)
│   │   └── prompt_builder.py (33 líneas)
│   ├── analyzers/
│   │   ├── __init__.py (0 líneas)
│   │   ├── complexity_analyzer.py (53 líneas)
│   │   └── security_analyzer.py (51 líneas)
│   ├── queue/
│   │   └── __init__.py (0 líneas)
│   ├── reports/
│   │   ├── __init__.py (0 líneas)
│   │   └── report_generator.py (67 líneas)
│   ├── scanners/
│   │   ├── __init__.py (0 líneas)
│   │   ├── architecture_scanner.py (37 líneas)
│   │   ├── dependency_scanner.py (62 líneas)
│   │   └── repo_scanner.py (75 líneas)
│   ├── __init__.py (0 líneas)
│   ├── database.py (52 líneas)
│   ├── main.py (51 líneas)
│   └── requirements.txt (10 líneas)
├── backend-agents/
│   └── app/
│       ├── qdrant/
│       │   ├── __init__.py (0 líneas)
│       │   └── client.py (87 líneas)
│       ├── routers/
│       │   ├── __init__.py (0 líneas)
│       │   └── rag.py (11 líneas)
│       ├── tools/
│       │   ├── __init__.py (0 líneas)
│       │   └── rag.py (44 líneas)
│       ├── __init__.py (0 líneas)
│       ├── embedding_utils.py (28 líneas)
│       └── main.py (10 líneas)
├── backend-saas/
│   ├── app/
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   ├── 001_agent_traces.sql (37 líneas)
│   │   │   │   └── 002_add_trace_timing_columns.sql (16 líneas)
│   │   │   ├── __init__.py (11 líneas)
│   │   │   ├── models.py (48 líneas)
│   │   │   ├── queries.py (7 líneas)
│   │   │   └── trace_service.py (151 líneas)
│   │   ├── engine/
│   │   │   ├── __init__.py (1 líneas)
│   │   │   ├── adapters.py (175 líneas)
│   │   │   ├── langgraph_engine.py (27 líneas)
│   │   │   ├── planner.py (393 líneas)
│   │   │   ├── prompts.py (89 líneas)
│   │   │   └── state.py (82 líneas)
│   │   ├── lib/
│   │   │   ├── auth_utils.py (40 líneas)
│   │   │   └── logging_utils.py (57 líneas)
│   │   ├── llm/
│   │   │   └── ollama_client.py (63 líneas)
│   │   ├── models/
│   │   │   ├── __init__.py (34 líneas)
│   │   │   ├── agent_request_model.py (331 líneas)
│   │   │   └── tracing_context.py (370 líneas)
│   │   ├── observability/
│   │   ├── qdrant/
│   │   │   ├── __init__.py (5 líneas)
│   │   │   └── client.py (87 líneas)
│   │   ├── routers/
│   │   ├── tools/
│   │   │   ├── rag.py (129 líneas)
│   │   │   ├── registry.py (54 líneas)
│   │   │   └── scrape.py (11 líneas)
│   │   ├── __init__.py (1 líneas)
│   │   ├── auth_models.py (48 líneas)
│   │   ├── auth_router.py (213 líneas)
│   │   ├── auth_service.py (215 líneas)
│   │   ├── embedding_utils.py (28 líneas)
│   │   ├── main.py (396 líneas)
│   │   ├── onboarding_models.py (157 líneas)
│   │   ├── onboarding_router.py (329 líneas)
│   │   └── onboarding_service.py (593 líneas)
│   ├── docs/
│   │   └── observability.sql (129 líneas)
│   ├── tests/
│   │   ├── __init__.py (1 líneas)
│   │   ├── conftest.py (8 líneas)
│   │   ├── test_agent_e2e.py (169 líneas)
│   │   ├── test_agent_flow.py (14 líneas)
│   │   ├── test_agent_tracing_complete.py (555 líneas)
│   │   ├── test_db.py (180 líneas)
│   │   ├── test_embeddings.py (75 líneas)
│   │   ├── test_multi_tenant_security.py (179 líneas)
│   │   ├── test_observability.py (35 líneas)
│   │   ├── test_phase2_db_integrity.py (136 líneas)
│   │   ├── test_rag.py (147 líneas)
│   │   ├── test_rag_real.py (71 líneas)
│   │   └── test_tenant_isolation_qdrant.py (502 líneas)
│   ├── uploads/
│   ├── create_audit_logs.sql (35 líneas)
│   ├── docker-compose.yml (21 líneas)
│   ├── Dockerfile (6 líneas)
│   ├── output.txt (175 líneas)
│   ├── README.md (31 líneas)
│   ├── requirements.txt (21 líneas)
│   └── seed_admin.py (59 líneas)
├── docs/
│   ├── dbs/
│   │   ├── roles-definition.md (49 líneas)
│   │   └── schema-report.md (55 líneas)
│   ├── docx_temp/
│   │   ├── _rels/
│   │   ├── docProps/
│   │   │   ├── app.xml (2 líneas)
│   │   │   └── core.xml (2 líneas)
│   │   ├── word/
│   │   │   ├── _rels/
│   │   │   │   └── document.xml.rels (2 líneas)
│   │   │   ├── theme/
│   │   │   │   └── theme1.xml (2 líneas)
│   │   │   ├── document.xml (2 líneas)
│   │   │   ├── endnotes.xml (2 líneas)
│   │   │   ├── fontTable.xml (2 líneas)
│   │   │   ├── footer1.xml (2 líneas)
│   │   │   ├── footnotes.xml (2 líneas)
│   │   │   ├── header1.xml (2 líneas)
│   │   │   ├── numbering.xml (2 líneas)
│   │   │   ├── settings.xml (2 líneas)
│   │   │   ├── styles.xml (2 líneas)
│   │   │   └── webSettings.xml (2 líneas)
│   │   └── [Content_Types].xml (2 líneas)
│   ├── planes/
│   │   └── plan pipeline.md (1493 líneas)
│   ├── Reports/
│   │   ├── production_fix_plan.md.resolved (36 líneas)
│   │   └── remote_integration_plan.md.resolved (34 líneas)
│   ├── Security/
│   │   ├── Revenue OS Dashboard UI walkthrough_dashboard_ui.md.resolved (56 líneas)
│   │   ├── secret-rotation.md (22 líneas)
│   │   ├── session_handover.md.resolved (24 líneas)
│   │   └── ssh_security_guide.md.resolved (41 líneas)
│   ├── tracing/
│   │   ├── integration_example.py (373 líneas)
│   │   ├── README_TRACING_SYSTEM.md (540 líneas)
│   │   └── tracing_examples.py (545 líneas)
│   ├── architecture-audit.md (651 líneas)
│   ├── CLAUDE_SKILLS_AND_AGENTS_ARCHITECTURE.md (95 líneas)
│   ├── estrategia-negocio.docx (276 líneas)
│   ├── estrategia-negocio.md (81 líneas)
│   ├── estrategia-negocio.zip (276 líneas)
│   ├── guia_ia_local.md (46 líneas)
│   ├── Infraestructura.md (107 líneas)
│   ├── Jobsflow.md (90 líneas)
│   ├── MCP_AUDITOR_SETUP.md (19 líneas)
│   ├── task.md (38 líneas)
│   └── walkthrough.md (25 líneas)
├── frontend/
│   ├── messages/
│   │   ├── en.json (282 líneas)
│   │   └── es.json (282 líneas)
│   ├── prisma/
│   │   ├── migrations/
│   │   │   ├── 0_init/
│   │   │   │   └── migration.sql (2003 líneas)
│   │   │   ├── 20260307203000_add_lead_enrichment_and_dedup/
│   │   │   │   └── migration.sql (56 líneas)
│   │   │   ├── 20260307211000_add_lead_scoring_pipeline_fields/
│   │   │   │   └── migration.sql (25 líneas)
│   │   │   ├── 20260307225500_add_enrichment_fields_to_lead/
│   │   │   │   └── migration.sql (21 líneas)
│   │   │   ├── 20260307232000_add_appointments/
│   │   │   │   └── migration.sql (37 líneas)
│   │   │   ├── 20260308003000_fix_audit_event_enum/
│   │   │   │   └── migration.sql (5 líneas)
│   │   │   └── migration_lock.toml (1 líneas)
│   │   ├── migrations_sqlite_backup/
│   │   │   ├── 20260125160314_init_sqlite/
│   │   │   │   └── migration.sql (40 líneas)
│   │   │   ├── 20260222090000_add_multi_tenant_auth/
│   │   │   │   └── migration.sql (49 líneas)
│   │   │   ├── 20260222110000_add_invitation_flow/
│   │   │   │   └── migration.sql (132 líneas)
│   │   │   └── migration_lock.toml (3 líneas)
│   │   ├── dev.db (52 líneas)
│   │   ├── schema.prisma (1094 líneas)
│   │   ├── seed-plans.ts (135 líneas)
│   │   └── seed.mjs (186 líneas)
│   ├── public/
│   │   ├── file.svg (1 líneas)
│   │   ├── globe.svg (1 líneas)
│   │   ├── next.svg (1 líneas)
│   │   ├── robots.txt (4 líneas)
│   │   ├── signin-hero.png (210 líneas)
│   │   ├── signup-hero.png (365 líneas)
│   │   ├── vercel.svg (1 líneas)
│   │   └── window.svg (1 líneas)
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── accept-invitation/
│   │   │   │   │   └── page.tsx (24 líneas)
│   │   │   │   ├── admin/
│   │   │   │   │   ├── agents/
│   │   │   │   │   │   └── page.tsx (15 líneas)
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── ingest/
│   │   │   │   │   │   │   └── page.tsx (43 líneas)
│   │   │   │   │   │   ├── scraper/
│   │   │   │   │   │   │   └── page.tsx (72 líneas)
│   │   │   │   │   │   └── page.tsx (298 líneas)
│   │   │   │   │   ├── deals/
│   │   │   │   │   │   └── page.tsx (52 líneas)
│   │   │   │   │   ├── intelligence/
│   │   │   │   │   │   ├── intelligence.module.css (409 líneas)
│   │   │   │   │   │   └── page.tsx (421 líneas)
│   │   │   │   │   ├── leads/
│   │   │   │   │   │   └── page.tsx (112 líneas)
│   │   │   │   │   ├── observability/
│   │   │   │   │   │   └── page.tsx (6 líneas)
│   │   │   │   │   ├── onboarding/
│   │   │   │   │   │   └── page.tsx (209 líneas)
│   │   │   │   │   ├── operations/
│   │   │   │   │   │   └── team/
│   │   │   │   │   │       └── page.tsx (309 líneas)
│   │   │   │   │   ├── outreach/
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx (19 líneas)
│   │   │   │   │   │   └── page.tsx (200 líneas)
│   │   │   │   │   ├── pipeline/
│   │   │   │   │   │   └── page.tsx (227 líneas)
│   │   │   │   │   ├── revenue/
│   │   │   │   │   │   └── page.tsx (458 líneas)
│   │   │   │   │   ├── security/
│   │   │   │   │   │   └── iam/
│   │   │   │   │   │       └── page.tsx (350 líneas)
│   │   │   │   │   ├── select-tenant/
│   │   │   │   │   │   └── page.tsx (52 líneas)
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   └── branding/
│   │   │   │   │   │       └── page.tsx (60 líneas)
│   │   │   │   │   └── layout.tsx (207 líneas)
│   │   │   │   ├── api/
│   │   │   │   │   ├── admin/
│   │   │   │   │   │   ├── actions/
│   │   │   │   │   │   │   └── route.ts (39 líneas)
│   │   │   │   │   │   ├── agents/
│   │   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   │   └── route.ts (67 líneas)
│   │   │   │   │   │   │   └── route.ts (59 líneas)
│   │   │   │   │   │   ├── onboarding/
│   │   │   │   │   │   │   └── route.ts (63 líneas)
│   │   │   │   │   │   └── scrapers/
│   │   │   │   │   │       ├── run/
│   │   │   │   │   │       │   └── route.ts (57 líneas)
│   │   │   │   │   │       ├── schedules/
│   │   │   │   │   │       │   └── route.ts (65 líneas)
│   │   │   │   │   │       ├── status/
│   │   │   │   │   │       │   └── [jobId]/
│   │   │   │   │   │       │       └── route.ts (32 líneas)
│   │   │   │   │   │       └── trigger/
│   │   │   │   │   │           └── route.ts (52 líneas)
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── change-password/
│   │   │   │   │   │   │   └── route.ts (45 líneas)
│   │   │   │   │   │   ├── logout/
│   │   │   │   │   │   │   └── route.ts (7 líneas)
│   │   │   │   │   │   ├── register-company/
│   │   │   │   │   │   │   └── route.ts (190 líneas)
│   │   │   │   │   │   ├── register-invite/
│   │   │   │   │   │   │   └── route.ts (109 líneas)
│   │   │   │   │   │   ├── switch-tenant/
│   │   │   │   │   │   │   ├── route.test.ts (79 líneas)
│   │   │   │   │   │   │   └── route.ts (51 líneas)
│   │   │   │   │   │   └── tenant/
│   │   │   │   │   │       └── route.ts (66 líneas)
│   │   │   │   │   ├── contact/
│   │   │   │   │   │   └── route.ts (103 líneas)
│   │   │   │   │   ├── leads/
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   └── status/
│   │   │   │   │   │   │       └── route.ts (83 líneas)
│   │   │   │   │   │   └── ingest/
│   │   │   │   │   │       ├── route.test.ts (94 líneas)
│   │   │   │   │   │       └── route.ts (195 líneas)
│   │   │   │   │   └── v1/
│   │   │   │   │       └── whatsapp/
│   │   │   │   │           └── route.ts (185 líneas)
│   │   │   │   ├── auth/
│   │   │   │   │   ├── accept-invite/
│   │   │   │   │   │   └── page.tsx (128 líneas)
│   │   │   │   │   ├── forgot-password/
│   │   │   │   │   │   └── page.tsx (17 líneas)
│   │   │   │   │   ├── register-company/
│   │   │   │   │   │   └── page.tsx (153 líneas)
│   │   │   │   │   ├── sign-in/
│   │   │   │   │   │   └── page.tsx (151 líneas)
│   │   │   │   │   └── sign-up/
│   │   │   │   │       └── page.tsx (33 líneas)
│   │   │   │   ├── p/
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── page.tsx (113 líneas)
│   │   │   │   ├── pricing/
│   │   │   │   │   └── page.tsx (48 líneas)
│   │   │   │   ├── privacy/
│   │   │   │   │   └── page.tsx (21 líneas)
│   │   │   │   ├── sign-out/
│   │   │   │   │   └── page.tsx (36 líneas)
│   │   │   │   ├── layout.tsx (149 líneas)
│   │   │   │   ├── loading.tsx (38 líneas)
│   │   │   │   ├── not-found.tsx (71 líneas)
│   │   │   │   └── page.tsx (52 líneas)
│   │   │   ├── actions/
│   │   │   │   ├── tenant/
│   │   │   │   │   └── branding.ts (29 líneas)
│   │   │   │   └── deals.ts (33 líneas)
│   │   │   ├── api/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── auditor/
│   │   │   │   │   │   └── route.ts (45 líneas)
│   │   │   │   │   ├── finops/
│   │   │   │   │   │   ├── finops.test.ts (91 líneas)
│   │   │   │   │   │   └── route.ts (154 líneas)
│   │   │   │   │   ├── invitations/
│   │   │   │   │   │   └── route.ts (117 líneas)
│   │   │   │   │   └── metrics/
│   │   │   │   │       ├── log/
│   │   │   │   │       │   └── route.ts (45 líneas)
│   │   │   │   │       └── vps/
│   │   │   │   │           └── route.ts (102 líneas)
│   │   │   │   ├── agents/
│   │   │   │   │   └── route.ts (106 líneas)
│   │   │   │   ├── analytics/
│   │   │   │   │   └── heatmap/
│   │   │   │   │       └── route.ts (15 líneas)
│   │   │   │   ├── appointments/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── route.ts (94 líneas)
│   │   │   │   │   └── route.ts (131 líneas)
│   │   │   │   ├── auth/
│   │   │   │   │   └── [...nextauth]/
│   │   │   │   │       └── route.ts (16 líneas)
│   │   │   │   ├── auth-internal/
│   │   │   │   │   └── route.ts (33 líneas)
│   │   │   │   ├── bridge/
│   │   │   │   │   └── lead-intelligence/
│   │   │   │   │       └── route.ts (64 líneas)
│   │   │   │   ├── chat/
│   │   │   │   │   └── sales/
│   │   │   │   │       └── route.ts (68 líneas)
│   │   │   │   ├── finops/
│   │   │   │   │   ├── budget/
│   │   │   │   │   │   └── route.ts (37 líneas)
│   │   │   │   │   └── report/
│   │   │   │   │       └── route.ts (49 líneas)
│   │   │   │   ├── health/
│   │   │   │   │   └── route.ts (62 líneas)
│   │   │   │   ├── invitations/
│   │   │   │   │   └── accept/
│   │   │   │   │       └── route.ts (184 líneas)
│   │   │   │   ├── leads/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── intelligence/
│   │   │   │   │   │       └── route.ts (42 líneas)
│   │   │   │   │   ├── brief/
│   │   │   │   │   │   ├── [leadId]/
│   │   │   │   │   │   │   └── route.ts (29 líneas)
│   │   │   │   │   │   └── route.ts (61 líneas)
│   │   │   │   │   ├── ingest/
│   │   │   │   │   │   └── route.ts (122 líneas)
│   │   │   │   │   ├── intelligence/
│   │   │   │   │   │   └── pending/
│   │   │   │   │   │       └── route.ts (50 líneas)
│   │   │   │   │   ├── pipeline/
│   │   │   │   │   │   ├── [status]/
│   │   │   │   │   │   │   └── route.ts (33 líneas)
│   │   │   │   │   │   └── route.ts (77 líneas)
│   │   │   │   │   └── score/
│   │   │   │   │       └── route.ts (60 líneas)
│   │   │   │   ├── metrics/
│   │   │   │   │   └── route.ts (144 líneas)
│   │   │   │   ├── observability/
│   │   │   │   │   ├── health/
│   │   │   │   │   │   └── route.ts (78 líneas)
│   │   │   │   │   ├── metrics/
│   │   │   │   │   │   └── route.ts (33 líneas)
│   │   │   │   │   └── traces/
│   │   │   │   │       └── route.ts (33 líneas)
│   │   │   │   ├── outreach/
│   │   │   │   │   └── campaigns/
│   │   │   │   │       ├── [id]/
│   │   │   │   │       │   ├── enroll/
│   │   │   │   │       │   │   └── route.ts (27 líneas)
│   │   │   │   │       │   ├── process/
│   │   │   │   │       │   │   └── route.ts (20 líneas)
│   │   │   │   │       │   └── stats/
│   │   │   │   │       │       └── route.ts (16 líneas)
│   │   │   │   │       └── route.ts (50 líneas)
│   │   │   │   ├── payments/
│   │   │   │   │   ├── cancel-subscription/
│   │   │   │   │   │   └── route.ts (45 líneas)
│   │   │   │   │   ├── change-plan/
│   │   │   │   │   │   └── route.ts (51 líneas)
│   │   │   │   │   ├── create-subscription/
│   │   │   │   │   │   └── route.ts (64 líneas)
│   │   │   │   │   └── subscription-status/
│   │   │   │   │       └── route.ts (55 líneas)
│   │   │   │   ├── proposals/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── pdf/
│   │   │   │   │   │   │   └── route.ts (92 líneas)
│   │   │   │   │   │   ├── send/
│   │   │   │   │   │   │   └── route.ts (26 líneas)
│   │   │   │   │   │   └── route.ts (89 líneas)
│   │   │   │   │   └── route.ts (73 líneas)
│   │   │   │   ├── rum/
│   │   │   │   │   ├── events/
│   │   │   │   │   │   └── route.ts (29 líneas)
│   │   │   │   │   └── summary/
│   │   │   │   │       └── route.ts (45 líneas)
│   │   │   │   └── webhooks/
│   │   │   │       └── mercadopago/
│   │   │   │           └── route.ts (72 líneas)
│   │   │   ├── favicon.ico (77 líneas)
│   │   │   ├── globals.css (199 líneas)
│   │   │   ├── icon.png (1134 líneas)
│   │   │   ├── layout.tsx (17 líneas)
│   │   │   ├── observability.css (68 líneas)
│   │   │   ├── page.tsx (5 líneas)
│   │   │   ├── robots.ts (12 líneas)
│   │   │   └── sitemap.ts (22 líneas)
│   │   ├── components/
│   │   │   ├── __tests__/
│   │   │   │   ├── Footer.test.tsx (111 líneas)
│   │   │   │   ├── Header.test.tsx (53 líneas)
│   │   │   │   └── WhatsAppButton.test.tsx (38 líneas)
│   │   │   ├── admin/
│   │   │   │   ├── agents/
│   │   │   │   │   ├── AgentConfigModal.tsx (213 líneas)
│   │   │   │   │   └── AgentsPanel.tsx (182 líneas)
│   │   │   │   ├── AuditorTab.tsx (272 líneas)
│   │   │   │   ├── BrandingSettingsForm.tsx (239 líneas)
│   │   │   │   ├── CopyInviteButton.tsx (37 líneas)
│   │   │   │   ├── DeleteInviteButton.tsx (55 líneas)
│   │   │   │   ├── IAM_Dashboard_Mockup.tsx (173 líneas)
│   │   │   │   ├── IntelligenceMarkdown.tsx (43 líneas)
│   │   │   │   ├── LeadContactButton.tsx (205 líneas)
│   │   │   │   ├── LeadIngestForm.tsx (415 líneas)
│   │   │   │   ├── LeadIntelligenceModal.tsx (439 líneas)
│   │   │   │   ├── LeadsDataTable.tsx (691 líneas)
│   │   │   │   ├── LeadStatusControl.tsx (71 líneas)
│   │   │   │   ├── LogoutButton.tsx (37 líneas)
│   │   │   │   ├── ObservabilityCommandCenter.tsx (436 líneas)
│   │   │   │   ├── ObservabilityDashboard.tsx (159 líneas)
│   │   │   │   ├── ObservabilityOverview.tsx (222 líneas)
│   │   │   │   ├── OutreachEnrollmentModal.tsx (166 líneas)
│   │   │   │   ├── OutreachNewCampaign.tsx (224 líneas)
│   │   │   │   ├── ProposalPreview.tsx (173 líneas)
│   │   │   │   ├── RumMetrics.tsx (137 líneas)
│   │   │   │   ├── ScraperForm.tsx (599 líneas)
│   │   │   │   ├── SendInviteEmailButton.tsx (61 líneas)
│   │   │   │   ├── SidebarCategory.tsx (96 líneas)
│   │   │   │   ├── SidebarNavItem.tsx (76 líneas)
│   │   │   │   └── VpsMetricsCharts.tsx (284 líneas)
│   │   │   ├── auth/
│   │   │   │   ├── CompanySignUpForm.tsx (423 líneas)
│   │   │   │   ├── GoogleSignInButton.tsx (44 líneas)
│   │   │   │   ├── LoginForm.tsx (257 líneas)
│   │   │   │   ├── SignUpForm.tsx (150 líneas)
│   │   │   │   └── TenantSelector.tsx (69 líneas)
│   │   │   ├── billing/
│   │   │   │   ├── BillingPortal.tsx (219 líneas)
│   │   │   │   ├── PlanLimitWarning.tsx (75 líneas)
│   │   │   │   ├── SubscriptionButton.tsx (88 líneas)
│   │   │   │   └── SubscriptionStatus.tsx (102 líneas)
│   │   │   ├── deals/
│   │   │   │   └── DealKanban.tsx (141 líneas)
│   │   │   ├── invitations/
│   │   │   │   └── AcceptInvitationForm.tsx (175 líneas)
│   │   │   ├── leads/
│   │   │   │   └── StrategicBrief.tsx (39 líneas)
│   │   │   ├── pricing/
│   │   │   │   ├── PricingCTA.tsx (43 líneas)
│   │   │   │   ├── PricingHero.tsx (55 líneas)
│   │   │   │   ├── PricingMaintenance.tsx (73 líneas)
│   │   │   │   └── PricingTable.tsx (130 líneas)
│   │   │   ├── providers/
│   │   │   │   └── RumProvider.tsx (30 líneas)
│   │   │   ├── Analytics.tsx (19 líneas)
│   │   │   ├── BrandingProvider.tsx (74 líneas)
│   │   │   ├── CookieConsent.tsx (108 líneas)
│   │   │   ├── Footer.tsx (315 líneas)
│   │   │   ├── GoogleTagManager.tsx (29 líneas)
│   │   │   ├── Header.tsx (183 líneas)
│   │   │   ├── Hero.tsx (251 líneas)
│   │   │   ├── PainPoints.tsx (80 líneas)
│   │   │   ├── Process.tsx (87 líneas)
│   │   │   ├── Qualification.tsx (76 líneas)
│   │   │   ├── SalesChatWidget.tsx (226 líneas)
│   │   │   ├── Services.tsx (165 líneas)
│   │   │   ├── StructuredData.tsx (32 líneas)
│   │   │   └── WhatsAppButton.tsx (39 líneas)
│   │   ├── hooks/
│   │   │   ├── useLeadsTable.ts (112 líneas)
│   │   │   └── useRumTracker.ts (28 líneas)
│   │   ├── i18n/
│   │   │   ├── request.ts (27 líneas)
│   │   │   └── routing.ts (15 líneas)
│   │   ├── lib/
│   │   │   ├── __tests__/
│   │   │   │   ├── authz.test.ts (109 líneas)
│   │   │   │   ├── lead-conversion.test.ts (103 líneas)
│   │   │   │   └── lead-multitenancy.test.ts (117 líneas)
│   │   │   ├── agent-service/
│   │   │   │   └── client.ts (82 líneas)
│   │   │   ├── ai/
│   │   │   │   ├── providers/
│   │   │   │   │   └── openai-generic.ts (52 líneas)
│   │   │   │   ├── engine.ts (90 líneas)
│   │   │   │   ├── knowledge.ts (34 líneas)
│   │   │   │   └── types.ts (15 líneas)
│   │   │   ├── appointments/
│   │   │   │   └── appointments.service.ts (202 líneas)
│   │   │   ├── auth/
│   │   │   │   ├── __tests__/
│   │   │   │   │   ├── password.test.ts (27 líneas)
│   │   │   │   │   └── session.test.ts (100 líneas)
│   │   │   │   ├── actions.ts (7 líneas)
│   │   │   │   ├── admin-session.ts (71 líneas)
│   │   │   │   ├── hash.ts (13 líneas)
│   │   │   │   ├── password-recovery.ts (96 líneas)
│   │   │   │   ├── password.ts (23 líneas)
│   │   │   │   ├── request-auth.ts (43 líneas)
│   │   │   │   ├── server.ts (26 líneas)
│   │   │   │   └── session.ts (93 líneas)
│   │   │   ├── billing/
│   │   │   │   ├── alerts.ts (46 líneas)
│   │   │   │   └── plan-limits.ts (50 líneas)
│   │   │   ├── bot/
│   │   │   │   ├── ai-manager.ts (108 líneas)
│   │   │   │   ├── lead-manager.ts (106 líneas)
│   │   │   │   ├── notification-manager.ts (42 líneas)
│   │   │   │   └── redis-context.ts (89 líneas)
│   │   │   ├── config/
│   │   │   │   └── api.ts (4 líneas)
│   │   │   ├── economics/
│   │   │   │   ├── tracker.test.ts (107 líneas)
│   │   │   │   └── tracker.ts (85 líneas)
│   │   │   ├── iam/
│   │   │   │   ├── iam.service.ts (110 líneas)
│   │   │   │   └── rbac.ts (59 líneas)
│   │   │   ├── leads/
│   │   │   │   ├── brief/
│   │   │   │   │   ├── brief.prompts.ts (41 líneas)
│   │   │   │   │   └── brief.service.ts (301 líneas)
│   │   │   │   ├── pipeline/
│   │   │   │   │   └── pipeline.service.ts (189 líneas)
│   │   │   │   ├── scoring/
│   │   │   │   │   ├── scoring.prompts.ts (24 líneas)
│   │   │   │   │   └── scoring.service.ts (236 líneas)
│   │   │   │   ├── classifier.ts (85 líneas)
│   │   │   │   ├── conversion-service.ts (69 líneas)
│   │   │   │   ├── ingest.service.ts (147 líneas)
│   │   │   │   ├── intelligence-service.ts (121 líneas)
│   │   │   │   ├── lead-automation-service.ts (74 líneas)
│   │   │   │   ├── normalizer.ts (84 líneas)
│   │   │   │   └── scoring.ts (59 líneas)
│   │   │   ├── meta/
│   │   │   │   ├── signature-validator.ts (35 líneas)
│   │   │   │   └── whatsapp-client.ts (179 líneas)
│   │   │   ├── observability/
│   │   │   │   ├── analytics/
│   │   │   │   │   └── PerformanceAnalytics.ts (90 líneas)
│   │   │   │   ├── finops/
│   │   │   │   │   └── FinOpsIntelligence.ts (90 líneas)
│   │   │   │   ├── rum/
│   │   │   │   │   ├── rum-sdk.ts (94 líneas)
│   │   │   │   │   └── vitals-handler.ts (22 líneas)
│   │   │   │   ├── logger.ts (53 líneas)
│   │   │   │   ├── metrics.ts (45 líneas)
│   │   │   │   ├── openai-client.ts (66 líneas)
│   │   │   │   ├── otel.ts (70 líneas)
│   │   │   │   ├── places-client.ts (57 líneas)
│   │   │   │   ├── sentry-utils.ts (32 líneas)
│   │   │   │   ├── tracing.ts (42 líneas)
│   │   │   │   └── types.ts (25 líneas)
│   │   │   ├── outreach/
│   │   │   │   └── outreach-service.ts (156 líneas)
│   │   │   ├── payments/
│   │   │   │   ├── mercadopago.ts (209 líneas)
│   │   │   │   ├── subscription-service.ts (244 líneas)
│   │   │   │   ├── types.ts (88 líneas)
│   │   │   │   └── webhook-handlers.ts (184 líneas)
│   │   │   ├── proposals/
│   │   │   │   ├── proposal.pdf.tsx (141 líneas)
│   │   │   │   ├── proposal.prompts.ts (67 líneas)
│   │   │   │   └── proposal.service.ts (469 líneas)
│   │   │   ├── scrapers/
│   │   │   │   └── google-places.ts (64 líneas)
│   │   │   ├── security/
│   │   │   │   ├── audit.ts (20 líneas)
│   │   │   │   ├── cookies.ts (25 líneas)
│   │   │   │   └── rate-limit.ts (53 líneas)
│   │   │   ├── sre/
│   │   │   │   └── metrics.ts (77 líneas)
│   │   │   ├── analytics.ts (120 líneas)
│   │   │   ├── api-auth.ts (58 líneas)
│   │   │   ├── auth.ts (25 líneas)
│   │   │   ├── authz.ts (125 líneas)
│   │   │   ├── bridge-client.ts (27 líneas)
│   │   │   ├── design-tokens.ts (31 líneas)
│   │   │   ├── lead-repository.ts (57 líneas)
│   │   │   ├── logger.ts (35 líneas)
│   │   │   ├── mail.ts (142 líneas)
│   │   │   ├── plan-guard.ts (60 líneas)
│   │   │   ├── prisma.ts (227 líneas)
│   │   │   ├── ratelimit.ts (29 líneas)
│   │   │   ├── scoped-prisma.ts (29 líneas)
│   │   │   ├── tenant-context.ts (33 líneas)
│   │   │   └── whatsapp.ts (74 líneas)
│   │   ├── types/
│   │   │   ├── leads.ts (57 líneas)
│   │   │   └── next-auth.d.ts (24 líneas)
│   │   ├── auth.config.ts (153 líneas)
│   │   ├── instrumentation.ts (13 líneas)
│   │   └── proxy.ts (109 líneas)
│   ├── tests/
│   │   └── auth-bridge.spec.ts (76 líneas)
│   ├── Dockerfile (48 líneas)
│   ├── eslint.config.mjs (35 líneas)
│   ├── next-env.d.ts (6 líneas)
│   ├── next.config.ts (59 líneas)
│   ├── package-lock.json (20978 líneas)
│   ├── package.json (92 líneas)
│   ├── playwright.config.ts (42 líneas)
│   ├── postcss.config.mjs (7 líneas)
│   ├── prisma.config.ts (16 líneas)
│   ├── tsconfig.json (52 líneas)
│   ├── vitest.config.ts (41 líneas)
│   └── vitest.setup.ts (61 líneas)
├── intelligence_engine/
│   ├── intelligence_engine/
│   │   ├── 12 (0 líneas)
│   │   ├── agencia-web-b2b@0.1.0 (0 líneas)
│   │   └── next (0 líneas)
│   ├── src/
│   │   ├── database/
│   │   │   └── classified_repo.py (205 líneas)
│   │   ├── presence/
│   │   │   └── detector.py (239 líneas)
│   │   └── main.py (122 líneas)
│   └── README.md (26 líneas)
├── lead-system/
│   ├── docker-compose.twenty.yml (13 líneas)
│   ├── enricher.py (104 líneas)
│   ├── outreach.py (209 líneas)
│   ├── requirements.txt (6 líneas)
│   ├── scraper_maps.py (116 líneas)
│   └── status.py (56 líneas)
├── RAG/
│   ├── ingest_rag.py (173 líneas)
│   ├── onboarding.json (278 líneas)
│   ├── rag_system.py (0 líneas)
│   ├── sistema_diagnostico.xlsx (56 líneas)
│   └── test_rag.py (195 líneas)
├── scripts/
│   ├── backfill-leads-tenant.mjs (35 líneas)
│   ├── backfill-leads-v2.mjs (33 líneas)
│   ├── backup.sh (20 líneas)
│   ├── check-leads.js (20 líneas)
│   ├── check-users.mjs (17 líneas)
│   ├── create-admin.mjs (60 líneas)
│   ├── db-auth-audit.sql (164 líneas)
│   ├── db-normalize-emails.sql (20 líneas)
│   ├── debug-prisma.mjs (29 líneas)
│   ├── export-apify-to-csv.ts (128 líneas)
│   ├── fix-pr-setup.sh (32 líneas)
│   ├── import-leads.ts (156 líneas)
│   ├── inject-test-lead.ts (34 líneas)
│   ├── logrotate.conf (12 líneas)
│   ├── pre-deploy-auth-validate.sh (217 líneas)
│   ├── qa_auth_flow.sh (110 líneas)
│   ├── qa_simple_flow.js (138 líneas)
│   ├── remote-test.ts (41 líneas)
│   ├── reset-admin.mjs (78 líneas)
│   ├── reset-password.mjs (39 líneas)
│   ├── seed-verification-data.js (113 líneas)
│   ├── seed-webshooks.mjs (131 líneas)
│   ├── test-db.ts (33 líneas)
│   ├── test-init.ts (34 líneas)
│   ├── test-login.mjs (38 líneas)
│   ├── test-prisma.mjs (23 líneas)
│   ├── test-webhook.ts (70 líneas)
│   ├── verify-bridge.js (43 líneas)
│   ├── verify-env.mjs (73 líneas)
│   └── verify-stats.js (27 líneas)
├── tests/
│   ├── auth/
│   │   └── oauth-linking.test.ts (12 líneas)
│   ├── e2e/
│   │   ├── auth-flows.spec.ts (42 líneas)
│   │   ├── contact-form.spec.ts (52 líneas)
│   │   ├── discovery.spec.ts (71 líneas)
│   │   ├── hub.spec.ts (69 líneas)
│   │   ├── navigation.spec.ts (48 líneas)
│   │   └── system-verification.spec.ts (42 líneas)
│   ├── integration/
│   │   └── auth.test.ts (111 líneas)
│   ├── security/
│   │   ├── auth-integrity.test.ts (139 líneas)
│   │   ├── email-normalization.test.ts (16 líneas)
│   │   ├── hardcoded-secrets.test.ts (158 líneas)
│   │   └── secrets-docs.test.ts (46 líneas)
│   ├── unit/
│   │   ├── appointments.service.test.ts (134 líneas)
│   │   ├── brief.service.test.ts (210 líneas)
│   │   ├── pipeline.service.test.ts (101 líneas)
│   │   ├── proposal.pdf.test.ts (49 líneas)
│   │   ├── proposal.service.test.ts (166 líneas)
│   │   ├── scoped-prisma.test.ts (43 líneas)
│   │   └── scoring.service.test.ts (165 líneas)
│   └── results.txt (1859 líneas)
├── benchmark_ollama.py (240 líneas)
├── bridge-server.js (100 líneas)
├── docker-compose.local.yml (31 líneas)
├── docker-compose.prod.yml (97 líneas)
├── docker-compose.yml (32 líneas)
├── ecosystem.config.js (31 líneas)
├── generate_structure.py (273 líneas)
├── ollama_router_memoria.py (408 líneas)
├── README.md (243 líneas)
├── run_daily.py (81 líneas)
├── Skiils-README.md (58 líneas)
├── STRUCTURED.md (1777 líneas)
└── tsconfig.tsbuildinfo (1 líneas)
```

## 📊 Reporte de Líneas de Código

### Por Extensión

| Extensión | Archivos | Líneas |
|-----------|----------|--------|
| .0 | 1 | 0 |
| .conf | 2 | 42 |
| .css | 9 | 2028 |
| .db | 1 | 52 |
| .docx | 1 | 276 |
| .ico | 3 | 231 |
| .js | 26 | 1118 |
| .json | 8 | 21964 |
| .md | 19 | 5446 |
| .mjs | 16 | 886 |
| .png | 5 | 3977 |
| .prisma | 1 | 1094 |
| .ps1 | 1 | 20 |
| .py | 118 | 12619 |
| .rels | 1 | 2 |
| .resolved | 5 | 191 |
| .sh | 5 | 407 |
| .sql | 17 | 2797 |
| .svg | 5 | 5 |
| .toml | 2 | 4 |
| .ts | 521 | 39899 |
| .tsbuildinfo | 1 | 1 |
| .tsx | 285 | 42035 |
| .txt | 7 | 2094 |
| .xlsx | 1 | 56 |
| .xml | 14 | 28 |
| .yml | 7 | 209 |
| .zip | 1 | 276 |
| sin extensión | 5 | 61 |

**Total:** 1088 archivos, 137818 líneas

### Top 10 Archivos Más Grandes

| Archivo | Líneas |
|---------|--------|
| frontend\package-lock.json | 20978 |
| frontend\prisma\migrations\0_init\migration.sql | 2003 |
| tests\results.txt | 1859 |
| STRUCTURED.md | 1777 |
| docs\planes\plan pipeline.md | 1493 |
| _migration_backup_20260323_150733\src_backup\app\icon.png | 1134 |
| _migration_backup_20260323_151358\src_backup\app\icon.png | 1134 |
| frontend\src\app\icon.png | 1134 |
| frontend\prisma\schema.prisma | 1094 |
| _migration_backup_20260323_150733\src_backup\components\admin\LeadsDataTable.tsx | 691 |


## 🔗 Análisis de Dependencias

### Módulos Más Importados

| Módulo | Importado por |
|--------|---------------|
| typing | 48 archivos |
| os | 32 archivos |
| json | 21 archivos |
| fastapi | 21 archivos |
| logging | 20 archivos |
| app | 20 archivos |
| asyncio | 19 archivos |
| httpx | 19 archivos |
| core | 18 archivos |
| psycopg2 | 18 archivos |
| time | 16 archivos |
| datetime | 14 archivos |
| pydantic | 13 archivos |
| pytest | 12 archivos |
| re | 10 archivos |

### Archivos con Más Dependencias

| Archivo | Dependencias |
|---------|--------------|
| backend-saas\app\onboarding_service.py | 13 |
| backend-saas\app\main.py | 11 |
| backend-saas\app\onboarding_router.py | 11 |
| agent-service\services\intelligence_service.py | 9 |
| backend-saas\tests\test_tenant_isolation_qdrant.py | 9 |
| lead-system\scraper_maps.py | 9 |
| ollama_router_memoria.py | 8 |
| agent-service\core\metrics_collector.py | 8 |
| agent-service\core\scheduler.py | 8 |
| agent-service\routers\intelligence.py | 8 |
