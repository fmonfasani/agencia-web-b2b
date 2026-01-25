import React from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PainPoints from "@/components/PainPoints";
import Services from "@/components/Services";
import Process from "@/components/Process";
import Qualification from "@/components/Qualification";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

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
