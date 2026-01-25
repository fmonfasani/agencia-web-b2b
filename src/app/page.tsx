import React from "react";
import { Metadata } from "next";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PainPoints from "@/components/PainPoints";
import Services from "@/components/Services";
import Process from "@/components/Process";
import Qualification from "@/components/Qualification";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  title: "Agencia Web | Performance B2B",
  description:
    "Especialistas en desarrollo web para empresas de servicios B2B. Sitios de alto rendimiento que convierten visitantes en leads calificados.",
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <PainPoints />
      <Services />
      <Process />
      <Qualification />
      <Footer />

      <WhatsAppButton />
    </main>
  );
}
