"use client";
import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { trackPricingPlanClick } from "@/lib/analytics";
import { useTranslations } from "next-intl";

const plansConfig = [
  {
    id: 'landing',
    priceSetup: "299",
    priceMaint: "29.99",
    featureCount: 6,
    highlight: false,
  },
  {
    id: 'professional',
    priceSetup: "1.499",
    priceMaint: "149",
    featureCount: 7,
    highlight: true,
    hasBadge: true,
  },
  {
    id: 'corporate',
    priceSetup: "2.399",
    priceMaint: "239",
    featureCount: 6,
    highlight: false,
  },
];

const PricingTable = () => {
  const t = useTranslations('Pricing.plans');

  return (
    <section className="section-padding bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-12">
          {plansConfig.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`flex flex-col p-8 rounded-3xl border transition-all relative ${plan.highlight
                ? "border-primary/20 bg-primary/2 shadow-premium-hover scale-[1.05] z-10"
                : "border-slate-100 bg-white shadow-premium"
                }`}
            >
              {plan.hasBadge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">
                  {t(`${plan.id}.badge`)}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-text-main mb-2 tracking-tight">
                  {t(`${plan.id}.name`)}
                </h3>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-6">
                  {t(`${plan.id}.ideal`)}
                </p>

                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-text-secondary">
                      USD
                    </span>
                    <span className="text-4xl font-extrabold text-text-main">
                      {plan.priceSetup}
                    </span>
                    <span className="text-sm font-semibold text-text-secondary">
                      {t('labels.setup')}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 text-primary">
                    <span className="text-sm font-bold">+ USD</span>
                    <span className="text-2xl font-extrabold">
                      {plan.priceMaint}
                    </span>
                    <span className="text-sm font-semibold opacity-80">
                      {t('labels.month')}
                    </span>
                  </div>
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-10">
                {Array.from({ length: plan.featureCount }).map((_, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm font-medium text-text-main"
                  >
                    <div className="mt-0.5 size-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check
                        className="text-primary"
                        size={12}
                        strokeWidth={3}
                      />
                    </div>
                    <span>{t(`${plan.id}.features.${i}`)}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#contacto"
                onClick={() => trackPricingPlanClick(plan.id, plan.priceSetup)}
                className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${plan.highlight
                  ? "bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20"
                  : "bg-slate-50 text-text-main hover:bg-slate-100 border border-slate-200"
                  }`}
              >
                {t('labels.cta')}
                <ArrowRight size={16} />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingTable;
