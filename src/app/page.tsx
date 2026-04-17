import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "GrowthOS — India ka Sabse Smart Seller Toolkit",
  description:
    "AI-powered tools for Meesho, Flipkart & Amazon India sellers. Photo Studio, WhatsApp Bot, Title Optimizer & more. Start free.",
  keywords:
    "meesho seller tools, flipkart seller app, amazon india seller, product photo editor india, whatsapp bot seller",
  openGraph: {
    title: "GrowthOS — India ka Sabse Smart Seller Toolkit",
    description: "Save 10+ hours daily. AI tools for Indian marketplace sellers.",
    url: "https://growthos.in",
    siteName: "GrowthOS",
    locale: "en_IN",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
