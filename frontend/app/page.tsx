import Nav from "@/components/Nav";
import HeroSection from "@/components/HeroSection";
import RankMarquee from "@/components/RankMarquee";
import StatsRow from "@/components/StatsRow";
import FeaturesGrid from "@/components/FeaturesGrid";
import RanksSection from "@/components/RanksSection";
import CompliancePreview from "@/components/CompliancePreview";
import DriftWatch from "@/components/DriftWatch";
import AIAdvisor from "@/components/AIAdvisor";
import WaitlistCTA from "@/components/WaitlistCTA";
import Footer from "@/components/Footer";

function Divider() {
  return (
    <div
      className="h-px max-w-300 mx-auto"
      style={{ background: "var(--border)" }}
    />
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <RankMarquee />
        <StatsRow />
        <Divider />
        <FeaturesGrid />
        <Divider />
        <RanksSection />
        <Divider />
        <CompliancePreview />
        <Divider />
        <DriftWatch />
        <Divider />
        <AIAdvisor />
        <Divider />
        <WaitlistCTA />
      </main>
      <Footer />
    </>
  );
}
