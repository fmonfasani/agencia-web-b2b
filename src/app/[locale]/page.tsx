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

import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description')
  };
}

import { setRequestLocale } from "next-intl/server";

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

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
