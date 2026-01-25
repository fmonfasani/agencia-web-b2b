import React from "react";

export default function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Agencia Web",
    image: "https://agenciaweb.com/og-image.jpg",
    description:
      "Desarrollo web B2B de alto rendimiento. Especialistas en sitios rápidos y que convierten para empresas de servicios.",
    url: "https://agenciaweb.com",
    telephone: "+541112345678",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Buenos Aires",
      addressCountry: "AR",
    },
    priceRange: "$$$", // Indicador de mercado B2B Premium
    openingHours: "Mo-Fr 09:00-18:00",
    sameAs: [
      "https://www.linkedin.com/company/agencia-web",
      "https://twitter.com/agenciaweb",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
