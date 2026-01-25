/**
 * Google Analytics 4 Helper Functions
 *
 * Usage:
 * - trackEvent('button_click', { button_name: 'cta' })
 * - trackPageView('/pricing')
 * - trackFormSubmit('contact_form')
 * - trackCTAClick('header')
 */

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>,
    ) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Track custom event in Google Analytics
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, unknown>,
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventParams);
  } else {
    console.warn("[Analytics] gtag not loaded yet");
  }
};

/**
 * Track page view
 */
export const trackPageView = (url: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "", {
      page_path: url,
    });
  }
};

/**
 * Track form submission with form name
 */
export const trackFormSubmit = (
  formName: string,
  additionalData?: Record<string, unknown>,
) => {
  trackEvent("form_submit", {
    form_name: formName,
    ...additionalData,
  });
};

/**
 * Track CTA click with location context
 */
export const trackCTAClick = (ctaLocation: string, ctaText?: string) => {
  trackEvent("cta_click", {
    location: ctaLocation,
    text: ctaText,
  });
};

/**
 * Track navigation click
 */
export const trackNavigation = (destination: string, source: string) => {
  trackEvent("navigation", {
    destination,
    source,
  });
};

/**
 * Track scroll depth (25%, 50%, 75%, 100%)
 */
export const trackScrollDepth = (depth: number) => {
  trackEvent("scroll_depth", {
    depth_percentage: depth,
  });
};

/**
 * Track WhatsApp button click
 */
export const trackWhatsAppClick = () => {
  trackEvent("whatsapp_click", {
    source: "floating_button",
  });
};

/**
 * Track pricing plan selection
 */
export const trackPricingPlanClick = (planName: string, planPrice: string) => {
  trackEvent("pricing_plan_click", {
    plan_name: planName,
    plan_price: planPrice,
  });
};

export default {
  trackEvent,
  trackPageView,
  trackFormSubmit,
  trackCTAClick,
  trackNavigation,
  trackScrollDepth,
  trackWhatsAppClick,
  trackPricingPlanClick,
};
