import React, { useMemo } from 'react';
import { Participant, Event, Result, Settings, GroupLabel, EventType } from '../types';
import { calculateOverallStandings, Standing } from '../services/scoringService';
import { ChartBarIcon } from './icons';

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


const StandingsTable: React.FC<StandingsTableProps> = ({ title, standings, finishedEvents }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
    <h3 className="text-2xl font-bold text-secondary mb-4 border-b-2 border-primary pb-2">{title}</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Rang</th>
            <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider min-w-[200px]">Name</th>
            {finishedEvents.map((event) => (
              <th key={event.id} className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-center" title={event.name}>
                {getEventHeaderLabel(event)}
              </th>
            ))}
            <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-right">Gesamt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {standings.map((standing, index) => (
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

export const Standings: React.FC<StandingsProps> = ({ participants, events, results, settings }) => {
  const groupedStandings = useMemo(
    () => calculateOverallStandings(results, participants, events, settings),
    [results, participants, events, settings]
  );

  const finishedEvents = useMemo(() => events.filter(e => e.finished).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [events]);

  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <ChartBarIcon />
        <h1 className="text-3xl font-bold text-secondary">Gesamtwertung</h1>
      </div>
      <p className="mb-8 text-gray-600">
        Die Gesamtwertung wird automatisch basierend auf den Ergebnissen der abgeschlossenen Rennen berechnet. 
        Streichergebnisse ({settings.dropScores}) werden berücksichtigt und sind durchgestrichen markiert.
      </p>

      <div className="grid grid-cols-1 gap-8">
        <StandingsTable title="Männer Ambitioniert (C/D)" standings={groupedStandings[GroupLabel.Ambitious]} finishedEvents={finishedEvents} />
        <StandingsTable title="Männer Hobby (A/B)" standings={groupedStandings[GroupLabel.Hobby]} finishedEvents={finishedEvents} />
        <StandingsTable title="Frauen" standings={groupedStandings[GroupLabel.Women]} finishedEvents={finishedEvents} />
      </div>
    </div>
  );
};