import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/admin/finops/route';
import { prisma } from '@/lib/prisma';

// Mock Next/Server
vi.mock('next/server', () => ({
    NextResponse: {
        json: (body: any, init?: any) => {
            return {
                json: async () => body,
                status: init?.status || 200,
            };
        },
    },
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        apiCostEvent: {
            findMany: vi.fn(),
        },
    },
}));

describe('FinOps API Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe calcular el costo total correctamente', async () => {
        const mockEvents = [
            { costUsd: 0.1, api: 'openai', tenantId: 't1', timestamp: new Date() },
            { costUsd: 0.2, api: 'google_places', tenantId: 't1', timestamp: new Date() },
        ];

        (prisma.apiCostEvent.findMany as any).mockResolvedValue(mockEvents);

        const response = await GET();
        const data = await response.json();

        expect(data.total_month_cost).toBeCloseTo(0.3);
        expect(data.by_api.openai).toBeCloseTo(0.1);
        expect(data.by_api.google_places).toBeCloseTo(0.2);
    });

    it('debe generar alertas si la proyección supera el presupuesto', async () => {
        // Simulamos un gasto de $4 en el primer día del mes -> Proyección > $4.90
        const mockEvents = [
            { costUsd: 4.0, api: 'openai', tenantId: 't1', timestamp: new Date() },
        ];

        (prisma.apiCostEvent.findMany as any).mockResolvedValue(mockEvents);

        const response = await GET();
        const data = await response.json();

        expect(data.projection_end_month).toBeGreaterThan(4.90);
        expect(data.alerts.length).toBeGreaterThan(0);
        expect(data.alerts[0]).toContain('exceeds 80%');
    });

    it('debe manejar un mes sin consumos correctamente (cero)', async () => {
        (prisma.apiCostEvent.findMany as any).mockResolvedValue([]);

        const response = await GET();
        const data = await response.json();

        expect(data.total_month_cost).toBe(0);
        expect(data.projection_end_month).toBe(0);
        expect(data.alerts.length).toBe(0);
        expect(Object.keys(data.by_tenant).length).toBe(0);
    });

    it('debe agrupar el costo por múltiples tenants correctamente', async () => {
        const mockEvents = [
            { costUsd: 0.1, api: 'openai', tenantId: 'tenant-a', timestamp: new Date() },
            { costUsd: 0.2, api: 'openai', tenantId: 'tenant-a', timestamp: new Date() },
            { costUsd: 0.15, api: 'google_places', tenantId: 'tenant-b', timestamp: new Date() },
        ];

        (prisma.apiCostEvent.findMany as any).mockResolvedValue(mockEvents);

        const response = await GET();
        const data = await response.json();

        expect(data.by_tenant['tenant-a']).toBeCloseTo(0.3);
        expect(data.by_tenant['tenant-b']).toBe(0.15);
        expect(data.total_month_cost).toBeCloseTo(0.45);
    });
});
