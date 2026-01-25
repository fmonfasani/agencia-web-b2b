import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingHero from "@/components/pricing/PricingHero";
import PricingTable from "@/components/pricing/PricingTable";
import PricingMaintenance from "@/components/pricing/PricingMaintenance";
import PricingCTA from "@/components/pricing/PricingCTA";
import WhatsAppButton from "@/components/WhatsAppButton";

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
