import React from "react";
import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingHero from "@/components/pricing/PricingHero";
import PricingTable from "@/components/pricing/PricingTable";
import PricingMaintenance from "@/components/pricing/PricingMaintenance";
import PricingCTA from "@/components/pricing/PricingCTA";
import WhatsAppButton from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  title: "Precios y Planes",
  description:
    "Planes claros y transparentes para escalar tu presencia digital B2B. Entrega rápida, hosting administrado y soporte técnico prioritario.",
};

export default function PricingPage() {
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
