import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingHero from "@/components/pricing/PricingHero";
import PricingTable from "@/components/pricing/PricingTable";
import PricingMaintenance from "@/components/pricing/PricingMaintenance";
import PricingCTA from "@/components/pricing/PricingCTA";
import { MessageCircle } from "lucide-react";

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <PricingHero />
      <PricingTable />
      <PricingMaintenance />
      <PricingCTA />
      <Footer />

      {/* WhatsApp Floating Button */}
      <a
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-2xl transition-all hover:-translate-y-1 flex items-center justify-center group"
        href="#"
      >
        <MessageCircle size={28} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 font-bold whitespace-nowrap">
          Contactanos
        </span>
      </a>
    </main>
  );
}
