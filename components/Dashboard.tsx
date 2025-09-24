import React from 'react';
import { DownloadIcon } from './icons';

interface DashboardProps {
  selectedSeason: number | null;
}

const generateSpecDocument = () => {
  const docxLibrary = (window as any).docx;

  if (!docxLibrary) {
    alert("Fehler: Die Dokumenten-Bibliothek (docx) konnte nicht geladen werden.");
    console.error("docx library not found on window object");
    return;
  }
  
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } = docxLibrary;

  const doc = new Document({
    sections: [{
      properties: {
        page: {
            margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
            },
        },
      },
      children: [
        new Paragraph({
          text: "Projektspezifikation & Systemarchitektur",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Projekt: ", bold: true }),
            new TextRun("Skinfit Cup Verwaltungs- & Wertungsapp"),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Version: ", bold: true }),
            new TextRun("Aktueller Stand"),
          ],
        }),
         new Paragraph({
            spacing: { after: 300 },
            children: [
                new TextRun({ text: "Datum: ", bold: true }),
                new TextRun(new Date().toLocaleDateString('de-DE')),
            ],
        }),

        // 1. Systemarchitektur
        new Paragraph({ text: "1. Systemarchitektur", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        new Paragraph("Die Anwendung ist als moderne Single-Page-Application (SPA) konzipiert und nutzt eine klare, komponentenbasierte Architektur, die auf bewährten Frontend-Prinzipien aufbaut. Die Architektur lässt sich in vier Hauptschichten unterteilen, die eine hohe Wartbarkeit, Testbarkeit und Skalierbarkeit gewährleisten."),
        
        new Paragraph({ text: "1.1 Beschreibung der Schichten", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 200 } }),
        new Paragraph({
            bullet: { level: 0 },
            children: [
                new TextRun({ text: "Präsentationsschicht (UI-Komponenten): ", bold: true }),
                new TextRun("Verantwortlich für die Darstellung der UI und Entgegennahme von Benutzerinteraktionen. Befindet sich im Verzeichnis `components/`.")
            ]
        }),
        new Paragraph({
            bullet: { level: 0 },
            children: [
                new TextRun({ text: "State-Management-Schicht (App.tsx): ", bold: true }),
                new TextRun("Fungiert als zentrale Container-Komponente und ist die alleinige Quelle der Wahrheit ('Single Source of Truth') für den gesamten Anwendungszustand.")
            ]
        }),
        new Paragraph({
            bullet: { level: 0 },
            children: [
                new TextRun({ text: "Geschäftslogik-Schicht (Services): ", bold: true }),
                new TextRun("Komplett von React entkoppelte TypeScript-Module, die die Kernlogik der Anwendung (z.B. Wertungsberechnung) enthalten.")
            ]
        }),
         new Paragraph({
            bullet: { level: 0 },
            children: [
                new TextRun({ text: "Datenschicht (types.ts): ", bold: true }),
                new TextRun("Definiert alle zentralen Datenstrukturen und Typen für Typsicherheit und eine saubere Codebasis.")
            ]
        }),

        // 2. Funktionsübersicht
        new Paragraph({ text: "2. Funktionsübersicht (Spezifikation)", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
        
        // 2.1 Teilnehmerverwaltung
        new Paragraph({ text: "2.1 Teilnehmerverwaltung", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 200 } }),
        new Paragraph({ text: "Listenansicht, Bearbeiten, Löschen und Import von Teilnehmern via CSV und Excel.", bullet: { level: 0 } }),
        
        // 2.2 Event- & Ergebnisverwaltung
        new Paragraph({ text: "2.2 Event- & Ergebnisverwaltung", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 200 } }),
        new Paragraph({ text: "Anlegen, Bearbeiten und Löschen von Events.", bullet: { level: 0 } }),
        new Paragraph({ text: "Kontextsensitive Ergebniseingabe für EZF, BZF, MZF und Handicap-Rennen.", bullet: { level: 0 } }),
        new Paragraph({ text: "Live-Berechnung von angepassten Zeiten und Handicaps direkt im Formular.", bullet: { level: 0 } }),
        
        // 2.3 Wertungs- & Berechnungslogik
        new Paragraph({ text: "2.3 Wertungs- & Berechnungslogik", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 200 } }),
        new Paragraph({ text: "Automatische Neuberechnung der Punkte bei Datenänderungen.", bullet: { level: 0 } }),
        new Paragraph({ text: "Komplexes, konfigurierbares Handicap-System basierend auf Alter, Geschlecht, Leistungsklasse und Material.", bullet: { level: 0 } }),
        new Paragraph({ text: "Korrekte MZF-Teamzeit-Berechnung nach der (n-1)-Regel.", bullet: { level: 0 } }),

        // 2.4 Gesamtwertung
        new Paragraph({ text: "2.4 Gesamtwertung", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 200 } }),
        new Paragraph({ text: "Gruppierte Ansichten für Ambitionierte, Hobby-Fahrer und Frauen.", bullet: { level: 0 } }),
        new Paragraph({ text: "Dynamische Spaltenüberschriften für Rennen.", bullet: { level: 0 } }),
        new Paragraph({ text: "Automatische Berücksichtigung von Streichergebnissen.", bullet: { level: 0 } }),

         // 2.5 Einstellungen
        new Paragraph({ text: "2.5 Einstellungen", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 200 } }),
        new Paragraph({ text: "Konfiguration von Bonus-Punkten, Material-Handicaps und Streichergebnissen.", bullet: { level: 0 } }),
      ],
    }],
  });

  Packer.toBlob(doc).then((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Skinfit_Cup_App_Spezifikation.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
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
            <span>Spezifikation herunterladen (.docx)</span>
        </button>
    </div>
  );
};
