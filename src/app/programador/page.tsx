import type { Metadata } from "next";
import { Programador } from "@/components/Programador";
import { sampleAthlete, sampleWeek } from "@/lib/sample";
import { todayIn } from "@/lib/today";

export const metadata: Metadata = { title: "Programador" };
export const dynamic = "force-dynamic";

export default function ProgramadorPage() {
  const today = todayIn();
  return (
    <main className="page">
      <header className="page-head">
        <div className="stack">
          <h1>Programador</h1>
          <p className="sub">Crea la sesión y envíala al reloj COROS a través del calendario de intervals.icu.</p>
        </div>
      </header>
      <Programador today={today} week={sampleWeek(today)} zones={sampleAthlete.zones} weightKg={sampleAthlete.weightKg} />
    </main>
  );
}
