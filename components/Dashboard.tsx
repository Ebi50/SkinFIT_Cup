import React from 'react';
import { DownloadIcon } from './icons';

interface DashboardProps {
  selectedSeason: number | null;
}

const generateSpecDocument = () => {
  const content = `
Projektspezifikation & Systemarchitektur
=======================================

Projekt: Skinfit Cup Verwaltungs- & Wertungsapp
Version: Aktueller Stand
Datum: ${new Date().toLocaleDateString('de-DE')}

---

1. Systemarchitektur
--------------------
Die Anwendung ist als moderne Single-Page-Application (SPA) konzipiert und nutzt eine klare, komponentenbasierte Architektur, die auf bewährten Frontend-Prinzipien aufbaut. Die Architektur lässt sich in vier Hauptschichten unterteilen, die eine hohe Wartbarkeit, Testbarkeit und Skalierbarkeit gewährleisten.

1.1 Beschreibung der Schichten
*   Präsentationsschicht (UI-Komponenten): Verantwortlich für die Darstellung der UI und Entgegennahme von Benutzerinteraktionen. Befindet sich im Verzeichnis \`components/\`.
*   State-Management-Schicht (App.tsx): Fungiert als zentrale Container-Komponente und ist die alleinige Quelle der Wahrheit ('Single Source of Truth') für den gesamten Anwendungszustand.
*   Geschäftslogik-Schicht (Services): Komplett von React entkoppelte TypeScript-Module, die die Kernlogik der Anwendung (z.B. Wertungsberechnung) enthalten.
*   Datenschicht (types.ts): Definiert alle zentralen Datenstrukturen und Typen für Typsicherheit und eine saubere Codebasis.

2. Funktionsübersicht (Spezifikation)
-------------------------------------

2.1 Teilnehmerverwaltung
*   Listenansicht, Bearbeiten, Löschen und Import von Teilnehmern via CSV und Excel.

2.2 Event- & Ergebnisverwaltung
*   Anlegen, Bearbeiten und Löschen von Events.
*   Kontextsensitive Ergebniseingabe für EZF, BZF, MZF und Handicap-Rennen.
*   Live-Berechnung von angepassten Zeiten und Handicaps direkt im Formular.

2.3 Wertungs- & Berechnungslogik
*   Automatische Neuberechnung der Punkte bei Datenänderungen.
*   Komplexes, konfigurierbares Handicap-System basierend auf Alter, Geschlecht, Leistungsklasse und Material.
*   Korrekte MZF-Teamzeit-Berechnung nach der (n-1)-Regel.

2.4 Gesamtwertung
*   Gruppierte Ansichten für Ambitionierte, Hobby-Fahrer und Frauen.
*   Dynamische Spaltenüberschriften für Rennen.
*   Automatische Berücksichtigung von Streichergebnissen.

2.5 Einstellungen
*   Konfiguration von Bonus-Punkten, Material-Handicaps und Streichergebnissen.
`.trim();

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Skinfit_Cup_App_Spezifikation.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};


export const Dashboard: React.FC<DashboardProps> = ({ selectedSeason }) => {
  const handleDownloadSpecification = () => {
    generateSpecDocument();
  };

  return (
    <div>
        <div className="text-gray-700 mb-8">
            Willkommen beim Skinfit Cup! <br/>Verwaltungs- & Wertungsapp für die Saison <strong>{selectedSeason}</strong>. Wählen Sie einen Menüpunkt, um zu starten.
        </div>
        <button
            onClick={handleDownloadSpecification}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-transform transform hover:scale-105"
        >
            <DownloadIcon className="w-5 h-5" />
            <span>Spezifikation herunterladen (.txt)</span>
        </button>
    </div>
  );
};