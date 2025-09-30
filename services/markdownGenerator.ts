import { Participant, Event } from '../types';

const generateInterfaceMarkdown = (name: string, definition: string): string => {
    return `### \`${name}\`\n\n\`\`\`typescript\n${definition.trim()}\n\`\`\`\n\n`;
};

const typeDefinitions = {
    EventType: `
export enum EventType {
  EZF = 'EZF', // Einzelzeitfahren
  MZF = 'MZF', // Mannschaftszeitfahren
  BZF = 'BZF', // Bergzeitfahren
  Handicap = 'Handicap',
}`,
    PerfClass: `
export enum PerfClass {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}`,
    Gender: `
export enum Gender {
  Male = 'm',
  Female = 'w',
}`,
    Participant: `
export interface Participant {
  id: string;
  firstName: string;
  lastName:string;
  email: string;
  phone: string;
  birthYear: number;
  perfClass: PerfClass;
  gender: Gender;
  isRsvMember: boolean;
  club?: string;
  startNumber?: string;
  nationality?: string;
  raceId?: string;
}`,
    Event: `
export interface Event {
  id: string;
  name: string;
  date: string; // ISO 8601 format: YYYY-MM-DD
  location: string;
  eventType: EventType;
  notes: string;
  finished: boolean;
  season: number; // e.g., 2025
}`,
    Result: `
export interface Result {
  id: string;
  eventId: string;
  participantId: string;
  rankOverall?: number; // EZF/BZF
  timeSeconds?: number; // EZF/BZF/MZF individual time
  winnerRank?: 1 | 2 | 3; // Manually assigned rank for winner points
  finisherGroup?: number; // Handicap
  dnf: boolean;
  points: number;
  hasAeroBars?: boolean; // TT-Lenkeraufsatz
  hasTTEquipment?: boolean; // Weiteres Zeitfahrmaterial
}`,
    Team: `
export interface Team {
    id: string;
    eventId: string;
    name: string;
}`,
    TeamMember: `
export interface TeamMember {
    id: string;
    teamId: string;
    participantId: string;
    penaltyMinus2: boolean;
}`,
    Settings: `
export interface Settings {
  timeTrialBonuses: {
      aeroBars: { enabled: boolean; seconds: number; };
      ttEquipment: { enabled: boolean; seconds: number; };
  };
  winnerPoints: number[]; // e.g., [3, 2, 1] for top 3
  handicapBasePoints: Record<PerfClass, number>; // Points for class A-D
  dropScores: number; // N Streichergebnisse
  defaultGroupMapping: {
    hobby: PerfClass,
    ambitious: PerfClass
  },
  handicapSettings: {
    gender: {
        female: { enabled: boolean; seconds: number; };
    };
    ageBrackets: { 
        enabled: boolean; 
        seconds: number;
        minAge: number;
        maxAge: number;
    }[];
    perfClass: {
        hobby: { enabled: boolean; seconds: number; };
    };
  };
}`
};

export const generateProjectMarkdown = (
    participants: Participant[],
    events: Event[],
    season: number | null
): string => {
    let md = `# Skinfit Cup Projekt Dokumentation & Bericht\n\n`;
    md += `**Saison:** ${season || 'Keine ausgewählt'}\n`;
    md += `**Datum des Exports:** ${new Date().toLocaleDateString('de-DE')}\n\n`;
    md += `## 1. Projektübersicht\n\n`;
    md += `Eine Administrations-App zur Verwaltung und Auswertung von Vereinsmeisterschaften im Radsport, inklusive Teilnehmer-, Event- und Ergebnismanagement sowie automatischer Punkteberechnung und Gesamtwertung.\n\n`;
    
    md += `## 2. Datenstrukturen (types.ts)\n\n`;
    md += `Die Anwendung verwendet ein stark typisiertes Datenmodell, um die Konsistenz und Wartbarkeit zu gewährleisten. Nachfolgend sind die wichtigsten Enums und Interfaces aufgeführt.\n\n`;
    md += generateInterfaceMarkdown('EventType', typeDefinitions.EventType);
    md += generateInterfaceMarkdown('PerfClass', typeDefinitions.PerfClass);
    md += generateInterfaceMarkdown('Gender', typeDefinitions.Gender);
    md += generateInterfaceMarkdown('Participant', typeDefinitions.Participant);
    md += generateInterfaceMarkdown('Event', typeDefinitions.Event);
    md += generateInterfaceMarkdown('Result', typeDefinitions.Result);
    md += generateInterfaceMarkdown('Team', typeDefinitions.Team);
    md += generateInterfaceMarkdown('TeamMember', typeDefinitions.TeamMember);
    md += generateInterfaceMarkdown('Settings', typeDefinitions.Settings);

    md += `## 3. Anwendungslogik (scoringService.ts)\n\n`;
    md += `Der \`scoringService.ts\` enthält die Kernlogik für die Punkteberechnung. Er ist vollständig von der UI-Schicht getrennt und operiert nur auf den definierten Datenstrukturen. Die Hauptfunktionen sind:\n\n`;
    md += `- **\`calculatePointsForEvent\`:** Eine Dispatcher-Funktion, die basierend auf dem Event-Typ die korrekte Berechnungslogik aufruft.\n`;
    md += `- **\`calculateTimeTrialPoints\`:** Berechnet Punkte für Einzel- und Bergzeitfahren. Berücksichtigt Material- und Alters-Handicaps, um eine angepasste Zeit zu ermitteln, nach der die Platzierung erfolgt.\n`;
    md += `- **\`calculateHandicapPoints\`:** Berechnet Punkte für Handicap-Rennen. Hier werden Basispunkte je nach Leistungsklasse und Zielgruppe vergeben.\n`;
    md += `- **\`calculateTeamTimeTrialPoints\`:** Berechnet Punkte für Mannschaftszeitfahren. Die Teamzeit wird nach der (n-1)-Regel bestimmt (Zeit des vorletzten Fahrers im Ziel). Ein Team-Handicap, das sich aus den Einzel-Handicaps aller Mitglieder zusammensetzt, wird auf diese Zeit angewendet.\n`;
    md += `- **\`calculateOverallStandings\`:** Erstellt die Gesamtwertung für die drei Gruppen (Hobby, Ambitioniert, Frauen). Berücksichtigt konfigurierbare Streichergebnisse und löst Punktgleichheit (Tie-Breaker) durch Vergleich der besten Einzelergebnisse auf.\n\n`;

    md += `## 4. Daten der Saison ${season}\n\n`;
    
    md += `### 4.1 Events\n\n`;
    if (events.length > 0) {
        md += `| Name | Datum | Ort | Typ | Status |\n`;
        md += `|---|---|---|---|---|\n`;
        [...events].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(e => {
            md += `| ${e.name} | ${new Date(e.date).toLocaleDateString('de-DE')} | ${e.location} | ${e.eventType} | ${e.finished ? 'Abgeschlossen' : 'Anstehend'} |\n`;
        });
    } else {
        md += `_Keine Events für diese Saison angelegt._\n`;
    }
    md += `\n`;
    
    md += `### 4.2 Teilnehmer\n\n`;
    if (participants.length > 0) {
        md += `| Nachname | Vorname | Jahrgang | Klasse | Geschlecht | Verein | RSV Mitglied |\n`;
        md += `|---|---|---|---|---|---|---|\n`;
        [...participants].sort((a,b) => a.lastName.localeCompare(b.lastName)).forEach(p => {
            md += `| ${p.lastName} | ${p.firstName} | ${p.birthYear} | ${p.perfClass} | ${p.gender === 'm' ? 'M' : 'W'} | ${p.club || '-'} | ${p.isRsvMember ? 'Ja' : 'Nein'} |\n`;
        });
    } else {
        md += `_Keine Teilnehmer vorhanden._\n`;
    }
    md += `\n`;
    
    return md;
}