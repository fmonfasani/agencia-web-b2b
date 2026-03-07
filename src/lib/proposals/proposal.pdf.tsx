import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface ProposalPdfData {
  title: string;
  problem: string;
  solution: string;
  deliverables: string[];
  timeline: string;
  investment: string;
  roi?: string | null;
  companyName: string;
  tenantName: string;
  tenantLogoUrl?: string | null;
  contactEmail?: string | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontSize: 11,
    color: "#111827",
    lineHeight: 1.5,
  },
  cover: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  logo: {
    width: 110,
    height: 44,
    objectFit: "contain",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#4b5563",
  },
  sectionTitle: {
    fontSize: 15,
    marginTop: 18,
    marginBottom: 8,
    fontWeight: 700,
  },
  paragraph: {
    marginBottom: 8,
  },
  bulletRow: {
    display: "flex",
    flexDirection: "row",
    marginBottom: 5,
  },
  bullet: {
    width: 12,
    fontWeight: 700,
  },
  bulletText: {
    flex: 1,
  },
  card: {
    marginTop: 8,
    padding: 10,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  footer: {
    marginTop: 26,
    paddingTop: 10,
    borderTop: "1 solid #d1d5db",
    color: "#6b7280",
    fontSize: 10,
  },
});

export function ProposalPdfDocument(data: ProposalPdfData) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, styles.cover]}>
        <View>
          {data.tenantLogoUrl ? <Image src={data.tenantLogoUrl} style={styles.logo} /> : null}
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>{data.companyName}</Text>
          <Text style={styles.subtitle}>Preparado por {data.tenantName}</Text>
        </View>

        <View style={styles.footer}>
          <Text>{data.contactEmail ?? "contacto@agencia.com"}</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Problema detectado</Text>
        <Text style={styles.paragraph}>{data.problem}</Text>

        <Text style={styles.sectionTitle}>Solucion propuesta</Text>
        <Text style={styles.paragraph}>{data.solution}</Text>

        <Text style={styles.sectionTitle}>Entregables</Text>
        {data.deliverables.map((item, index) => (
          <View key={`deliverable-${index}`} style={styles.bulletRow}>
            <Text style={styles.bullet}>-</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.paragraph}>Timeline: {data.timeline}</Text>
          <Text style={styles.paragraph}>Inversion: {data.investment}</Text>
          {data.roi ? <Text>ROI estimado: {data.roi}</Text> : null}
        </View>

        <View style={styles.footer}>
          <Text>{data.tenantName}</Text>
          <Text>{data.contactEmail ?? "contacto@agencia.com"}</Text>
        </View>
      </Page>
    </Document>
  );
}
