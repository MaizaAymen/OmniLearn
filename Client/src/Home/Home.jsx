import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ContributionSection from "./components/ContributionSection";
import StatsCards from "./components/StatsCards";
import Footer from "./components/Footer";
import "./home.css";

export default function Home() {
  return (
    <div className="omni-home">
      <Navbar />
      <main className="omni-main">
        <Hero />
        <ContributionSection />
        <StatsCards />
      </main>
      <Footer />
    </div>
  );
}
