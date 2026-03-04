/**
 * BUSINESS ROI PROOF - Agencia B2B / Revenue OS
 * Este script simula el modelo matemático del negocio para validar su viabilidad.
 */

async function proveBusinessModel() {
    console.log("====================================================");
    console.log("📊 VALIDACIÓN MATEMÁTICA DEL MODELO DE NEGOCIO (SaaS)");
    console.log("====================================================\n");

    // --- PARÁMETROS DE ENTRADA (TENANT PROMEDIO) ---
    const CONFIG = {
        leadsScraped: 1000,
        costPerScrapedLead: 0.05, // USD

        qualificationRate: 0.10,   // 10% de los leads son calificados por IA
        dealConversionRate: 0.05,  // 5% de los calificados cierran una venta
        avgDealValue: 500,        // USD por contrato cerrado

        aiMessagesPerLead: 10,     // Mensajes promedio para calificar
        costPer1KTokens: 0.01,     // GPT-4o mini cost
        tokensPerMessage: 500,     // Promedio tokens por interacción

        platformBaseFee: 15,       // Costo fijo de hosting/infra por tenant (USD/mes)
    };

    // --- CÁLCULO DE COSTOS OPERATIVOS (OpEx) ---
    const scraperCost = CONFIG.leadsScraped * CONFIG.costPerScrapedLead;
    const totalAIMessages = CONFIG.leadsScraped * CONFIG.aiMessagesPerLead;
    const aiCost = (totalAIMessages * CONFIG.tokensPerMessage / 1000) * CONFIG.costPer1KTokens;

    const totalOpEx = scraperCost + aiCost + CONFIG.platformBaseFee;

    // --- CÁLCULO DE INGRESOS (Revenue) ---
    const qualifiedLeads = CONFIG.leadsScraped * CONFIG.qualificationRate;
    const closedDeals = qualifiedLeads * CONFIG.dealConversionRate;
    const totalRevenue = closedDeals * CONFIG.avgDealValue;

    // --- MÉTRICAS DE EFICIENCIA ---
    const cac = totalOpEx / closedDeals; // Cost of Acquisition per Customer
    const ltv = CONFIG.avgDealValue;      // Simplificado (Lifetime Value inicial)
    const netProfit = totalRevenue - totalOpEx;
    const roi = (totalRevenue - totalOpEx) / totalOpEx;
    const efficiencyScore = totalRevenue / totalOpEx;

    // --- SALIDA DE RESULTADOS ---
    console.log(">>> ESFUERZO OPERATIVO:");
    console.log(`- Leads Inyectados: ${CONFIG.leadsScraped}`);
    console.log(`- Interacciones IA: ${totalAIMessages.toLocaleString()}`);
    console.log(`- Deals Cerrados:   ${closedDeals.toFixed(1)}\n`);

    console.log(">>> ESTRUCTURA DE COSTOS (OpEx):");
    console.log(`- Costo Scraper:     $${scraperCost.toFixed(2)}`);
    console.log(`- Costo OpenAI (IA): $${aiCost.toFixed(2)}`);
    console.log(`- Otros (Hosting):   $${CONFIG.platformBaseFee.toFixed(2)}`);
    console.log(`💸 TOTAL OPEX PARA EL TENANT: $${totalOpEx.toFixed(2)}\n`);

    console.log(">>> PERFORMANCE FINANCIERA:");
    console.log(`💰 REVENUE TOTAL:      $${totalRevenue.toFixed(2)}`);
    console.log(`✅ UTILIDAD NETA:       $${netProfit.toFixed(2)}`);
    console.log(`🚀 ROI UNITARIO:        ${(roi * 100).toFixed(0)}%`);
    console.log(`📈 EFFICIENCY SCORE:  ${efficiencyScore.toFixed(1)}x (Revenue / Costo)\n`);

    console.log(">>> MÉTRICAS SRE / UNIT ECONOMICS:");
    console.log(`🎯 CAC (Costo Adquisición): $${cac.toFixed(2)} por cliente`);
    console.log(`💎 LTV (Valor Cliente):     $${ltv.toFixed(2)}`);
    console.log(`⚖️  Ratio LTV/CAC:           ${(ltv / cac).toFixed(1)}x (Saludable > 3x)\n`);

    if (roi > 2 && efficiencyScore > 5) {
        console.log("VERDICT: 🟢 MODELO ALTAMENTE ESCALABLE Y RENTABLE.");
    } else if (roi > 0) {
        console.log("VERDICT: 🟡 MODELO VIABLE, REQUIERE OPTIMIZACIÓN DE CONVERSIÓN.");
    } else {
        console.log("VERDICT: 🔴 MODELO INSOPORTABLE FINANCIERAMENTE.");
    }

    console.log("\n====================================================");
}

proveBusinessModel().catch(console.error);
