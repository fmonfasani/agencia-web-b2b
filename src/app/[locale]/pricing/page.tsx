import React from "react";
import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingHero from "@/components/pricing/PricingHero";
import PricingTable from "@/components/pricing/PricingTable";
import PricingMaintenance from "@/components/pricing/PricingMaintenance";
import PricingCTA from "@/components/pricing/PricingCTA";
import WhatsAppButton from "@/components/WhatsAppButton";

import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Pricing.Metadata' });

  return {
    title: t('title'),
    description: t('description')
  };
}

import { setRequestLocale } from "next-intl/server";

export default async function PricingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen">
      <Header />
      <PricingHero />
      <PricingTable />
      <PricingMaintenance />
      <PricingCTA />
      <Footer />

      <WhatsAppButton />
    </main>
  );
}
