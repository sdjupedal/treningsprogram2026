import { useRef } from "react";
import { useSettings, useSessions } from "./hooks/useStore";
import { ProgramSection } from "./components/ProgramSection";
import { CalendarSection } from "./components/CalendarSection";
import { DiarySection } from "./components/DiarySection";
import { StatsSection } from "./components/StatsSection";
import { LogTodaySection } from "./components/LogTodaySection";
import { SettingsSection } from "./components/SettingsSection";
import { toISODate } from "./lib/format";

const NAV = [
  { id: "program", label: "Program" },
  { id: "logg", label: "Logg i dag" },
  { id: "kalender", label: "Kalender" },
  { id: "dagbok", label: "Dagbok" },
  { id: "statistikk", label: "Statistikk" },
  { id: "innstillingar", label: "Innstillingar" },
];

export default function App() {
  const [settings, saveSettings] = useSettings();
  const sessions = useSessions();
  const today = toISODate(new Date());
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  function scrollTo(id: string) {
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">
          HYBRID <span className="mark">7r</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => scrollTo(n.id)}>{n.label}</button>
          ))}
        </nav>
      </header>

      <div ref={(el) => { refs.current["program"] = el; }}>
        <ProgramSection sessions={sessions} today={today} />
      </div>
      <div ref={(el) => { refs.current["logg"] = el; }}>
        <LogTodaySection sessions={sessions} today={today} />
      </div>
      <div ref={(el) => { refs.current["kalender"] = el; }}>
        <CalendarSection sessions={sessions} today={today} />
      </div>
      <div ref={(el) => { refs.current["dagbok"] = el; }}>
        <DiarySection sessions={sessions} />
      </div>
      <div ref={(el) => { refs.current["statistikk"] = el; }}>
        <StatsSection sessions={sessions} settings={settings} today={today} />
      </div>
      <div ref={(el) => { refs.current["innstillingar"] = el; }}>
        <SettingsSection settings={settings} saveSettings={saveSettings} sessions={sessions} today={today} />
      </div>

      <footer className="faint" style={{ fontSize: 12, textAlign: "center", padding: "10px 0" }}>
        HYBRID 7r · lokal lagring i nettlesaren · ingen backend
      </footer>
    </div>
  );
}
