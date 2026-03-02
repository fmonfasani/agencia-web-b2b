# Skill: Lead Management & Pipeline Acceleration

This skill enables AI agents to manage the sales pipeline, detect stalled leads, and convert prospects into high-value deals.

## Core Capabilities

1.  **Lead Status Lifecycle**: Manage transitions from `NEW` to `QUALIFIED`, `CONVERTED`, or `LOST`.
2.  **Multitenant Isolation**: Automatic execution within tenant scopes using `getTenantPrisma`.
3.  **Revenue Conversion**: Automates the transfer of intelligence (Digital Score) into Deal value ($).
4.  **Stagnation Detection**: Identifies accounts with 0 activity in 7 days.

## Implementation Guide

- **Lead to Deal conversion**:
  - `LeadConversionService.convertToDeal(tenantId, leadId, userId)`:
    - This creates a `PROSPECTING` stage deal in the specified tenant's pipeline.
    - Estimates value based on the lead's `potentialScore` (Score \* 10).
    - Status will be updated to `CONVERTED` and a `LEAD_CONVERTED_TO_DEAL` event is emitted.

- **Stalled Lead Analysis**:
  - `LeadAutomationService.analyzeStalledLeads(tenantId)`:
    - Fetches the top 10 leads with no updates since 7 days ago.
    - Returns a JSON report with AI-driven suggestions for reactivation.

## Agent Guidelines

> [!TIP]
> Always verify the lead exists and is assigned to the current tenant before proposing a conversion.
> For leads with a `potentialScore` > 80, prioritize immediate conversion or high-touch follow-up.

---

### Command Integration

- Mark lead as qualified: `PATCH /api/leads/[id]/status { status: "QUALIFIED" }`
- Run health check: (To reach LeadAutomationService logic via agent-triggered scripts/api - _to be expanded in Phase 5_)
