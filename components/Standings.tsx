import React, { useMemo, useState } from 'react';
import { Participant, Event, Result, Settings, GroupLabel, EventType } from '../types';
import { calculateOverallStandings, Standing } from '../services/scoringService';
import { ChartBarIcon, DownloadIcon } from './icons';
import { PrintableReport } from './PrintableReport';

interface StandingsProps {
  participants: Participant[];
  events: Event[];
  results: Result[];
  settings: Settings;
}

interface StandingsTableProps {
  title: string;
  standings: Standing[];
  finishedEvents: Event[];
}

const getEventHeaderLabel = (event: Event): string => {
  const date = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(event.date));

  let typeCode = '';
  switch (event.eventType) {
    case EventType.EZF:
      typeCode = 'EZF';
      break;
    case EventType.BZF:
      typeCode = 'BZF';
      break;
    case EventType.MZF:
      typeCode = 'MZF';
      break;
    case EventType.Handicap:
      typeCode = 'HC';
      break;
    default:
      typeCode = event.eventType;
  }
  return `${date} ${typeCode}`;
};


const StandingsTable: React.FC<StandingsTableProps> = ({ title, standings, finishedEvents }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'finalPoints', direction: 'desc' });
  
  const sortedStandings = useMemo(() => {
    const sortableItems = [...standings];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'participantName' || sortConfig.key === 'finalPoints') {
          aValue = a[sortConfig.key as keyof Standing];
          bValue = b[sortConfig.key as keyof Standing];
        } else { // Sort by event points
          aValue = a.results.find(r => r.eventId === sortConfig.key)?.points ?? -1;
          bValue = b.results.find(r => r.eventId === sortConfig.key)?.points ?? -1;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [standings, sortConfig]);
  
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortArrow = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'desc' ? ' ▼' : ' ▲';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h3 className="text-2xl font-bold text-secondary mb-4 border-b-2 border-primary pb-2">{title}</h3>
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Rang</th>
              <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider min-w-[200px]">
                <button onClick={() => requestSort('participantName')} className="w-full text-left font-semibold">
                  Name{getSortArrow('participantName')}
                </button>
              </th>
              {finishedEvents.map((event) => (
                <th key={event.id} className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-center min-w-[120px]" title={event.name}>
                  <button onClick={() => requestSort(event.id)} className="w-full text-center font-semibold">
                    {getEventHeaderLabel(event)}{getSortArrow(event.id)}
                  </button>
                </th>
              ))}
              <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-right">
                <button onClick={() => requestSort('finalPoints')} className="w-full text-right font-semibold">
                  Gesamt{getSortArrow('finalPoints')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedStandings.map((standing, index) => (
              <tr key={standing.participantId} className="hover:bg-primary/10">
                <td className="p-3 font-bold text-gray-800">{index + 1}.</td>
                <td className="p-3 text-gray-700">
                  <div>{standing.participantName}</div>
                  <div className="text-xs text-gray-500">Klasse: {standing.participantClass}</div>
                </td>
                {finishedEvents.map(event => {
                  const result = standing.results.find(r => r.eventId === event.id);
                  const points = result ? result.points : '-';
                  const isDropped = result?.isDropped;
                  
                  return (
                    <td key={event.id} className={`p-3 font-mono text-center ${isDropped ? 'text-gray-400' : 'text-gray-700'}`}>
                      {isDropped ? <s title="Streichergebnis">{points}</s> : points}
                    </td>
                  );
                })}
                <td className="p-3 font-mono text-right text-primary-dark font-bold">{standing.finalPoints}</td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={3 + finishedEvents.length} className="p-4 text-center text-gray-500">
                  Keine Daten für diese Gruppe verfügbar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const Standings: React.FC<StandingsProps> = ({ participants, events, results, settings }) => {
  const groupedStandings = useMemo(
    () => calculateOverallStandings(results, participants, events, settings),
    [results, participants, events, settings]
  );

  const finishedEvents = useMemo(() => events.filter(e => e.finished).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [events]);
  const currentSeason = useMemo(() => events.length > 0 ? events[0].season : new Date().getFullYear(), [events]);


  return (
    <div>
      <div className="no-print">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
                <ChartBarIcon />
                <h1 className="text-3xl font-bold text-secondary">Gesamtwertung</h1>
            </div>
             <button
                onClick={() => window.print()}
                className="bg-secondary hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-transform transform hover:scale-105"
            >
                <DownloadIcon className="w-5 h-5" />
                <span>PDF Export / Drucken</span>
            </button>
        </div>
        <p className="mb-8 text-gray-600">
          Die Gesamtwertung wird automatisch basierend auf den Ergebnissen der abgeschlossenen Rennen berechnet. 
          Streichergebnisse ({settings.dropScores}) werden berücksichtigt und sind durchgestrichen markiert. Klicken Sie auf eine Spaltenüberschrift, um die Tabelle zu sortieren.
        </p>

        <div className="grid grid-cols-1 gap-8">
          <StandingsTable title="Männer Ambitioniert (C/D)" standings={groupedStandings[GroupLabel.Ambitious]} finishedEvents={finishedEvents} />
          <StandingsTable title="Männer Hobby (A/B)" standings={groupedStandings[GroupLabel.Hobby]} finishedEvents={finishedEvents} />
          <StandingsTable title="Frauen" standings={groupedStandings[GroupLabel.Women]} finishedEvents={finishedEvents} />
        </div>
      </div>

      <div className="print-only">
        <PrintableReport 
            participants={participants}
            standings={groupedStandings}
            finishedEvents={finishedEvents}
            season={currentSeason}
        />
      </div>
    </div>
  );
};