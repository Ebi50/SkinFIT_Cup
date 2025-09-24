
import React, { useMemo } from 'react';
import { Event, Participant, Result, Team, TeamMember, Settings, EventType } from '../types';
import { ArrowLeftIcon, CalendarIcon } from './icons';
import { calculateHandicap } from '../services/scoringService';

interface EventDetailViewProps {
    event: Event;
    participants: Participant[];
    results: Result[];
    teams: Team[];
    teamMembers: TeamMember[];
    settings: Settings;
    onBack: () => void;
}

const eventTypeLabels: Record<EventType, string> = {
    [EventType.EZF]: 'Einzelzeitfahren',
    [EventType.MZF]: 'Mannschaftszeitfahren',
    [EventType.BZF]: 'Bergzeitfahren',
    [EventType.Handicap]: 'Handicap',
};

const formatDate = (dateString: string) => new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' }).format(new Date(dateString));

export const EventDetailView: React.FC<EventDetailViewProps> = ({ event, participants, results, teams, teamMembers, settings, onBack }) => {
    
    const participantMap = useMemo(() => new Map(participants.map(p => [p.id, p])), [participants]);
    
    const getParticipantName = (id: string) => {
        const p = participantMap.get(id);
        return p ? `${p.lastName}, ${p.firstName}` : 'Unbekannt';
    }

    const renderTimeTrialResults = () => {
        const finishers = results
            .filter(r => !r.dnf && participantMap.has(r.participantId))
            .map(r => {
                const participant = participantMap.get(r.participantId)!;
                const handicap = calculateHandicap(participant, r, event, settings);
                const adjustedTime = (r.timeSeconds || 0) + handicap;
                return { ...r, participant, adjustedTime };
            })
            .sort((a, b) => a.adjustedTime - b.adjustedTime);

        const dnfs = results.filter(r => r.dnf);

        return (
             <table className="w-full text-left">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Rang</th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Name</th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-center">Zeit</th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-center">Angep. Zeit</th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-right">Punkte</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {finishers.map((result, index) => (
                        <tr key={result.id} className="hover:bg-primary/10">
                            <td className="p-3 font-bold">{index + 1}.</td>
                            <td className="p-3">{getParticipantName(result.participantId)}</td>
                            <td className="p-3 font-mono text-center">{result.timeSeconds}s</td>
                            <td className="p-3 font-mono text-center font-semibold text-primary-dark">{result.adjustedTime.toFixed(0)}s</td>
                            <td className="p-3 font-mono text-right font-bold">{result.points}</td>
                        </tr>
                    ))}
                    {dnfs.map(result => (
                         <tr key={result.id} className="hover:bg-red-50 opacity-70">
                            <td className="p-3 font-bold text-red-600">DNF</td>
                            <td className="p-3">{getParticipantName(result.participantId)}</td>
                            <td className="p-3 font-mono text-center">-</td>
                            <td className="p-3 font-mono text-center">-</td>
                            <td className="p-3 font-mono text-right font-bold">{result.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const renderMZFResults = () => {
        const resultMap = new Map(results.map(r => [r.participantId, r]));

        const rankedTeams = teams.map(team => {
            const members = teamMembers.filter(tm => tm.teamId === team.id);
            const memberResults = members
                .map(member => resultMap.get(member.participantId))
                .filter((r): r is Result => r !== undefined && !r.dnf && r.timeSeconds != null && r.timeSeconds > 0);

            if (memberResults.length < 2) return { ...team, adjustedTime: Infinity, members };

            const totalTeamHandicap = members.reduce((sum, member) => {
                const participant = participantMap.get(member.participantId);
                const result = resultMap.get(member.participantId);
                if (participant && result) return sum + calculateHandicap(participant, result, event, settings);
                return sum;
            }, 0);

            const sortedTimes = memberResults.map(r => r.timeSeconds!).sort((a, b) => a - b);
            const relevantRiderIndex = Math.max(0, sortedTimes.length - 2);
            const baseTime = sortedTimes[relevantRiderIndex];
            const adjustedTime = baseTime + totalTeamHandicap;
            
            return { ...team, adjustedTime, members };
        }).sort((a, b) => a.adjustedTime - b.adjustedTime);
        
        return (
            <div className="space-y-6">
                {rankedTeams.map((team, index) => (
                    <div key={team.id} className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-3 border-b pb-3">
                            <h4 className="text-xl font-bold text-secondary">{index + 1}. {team.name}</h4>
                            <div className="text-right">
                                <div className="text-sm text-gray-500">Team-Zeit</div>
                                <div className="text-2xl font-bold text-primary-dark">{isFinite(team.adjustedTime) ? `${team.adjustedTime.toFixed(0)}s` : 'N/A'}</div>
                            </div>
                        </div>
                         <table className="w-full text-left text-sm">
                            <thead>
                                <tr>
                                    <th className="p-2 font-semibold text-gray-600">Name</th>
                                    <th className="p-2 font-semibold text-gray-600 text-center">Ind. Zeit</th>
                                    <th className="p-2 font-semibold text-gray-600 text-center">Status</th>
                                    <th className="p-2 font-semibold text-gray-600 text-right">Punkte</th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.members.map(member => {
                                    const result = resultMap.get(member.participantId);
                                    return (
                                        <tr key={member.id}>
                                            <td className="p-2">{getParticipantName(member.participantId)}</td>
                                            <td className="p-2 text-center font-mono">{result?.timeSeconds ? `${result.timeSeconds}s` : '-'}</td>
                                            <td className="p-2 text-center font-semibold">{result?.dnf ? <span className="text-red-600">DNF</span> : 'Finisher'}</td>
                                            <td className="p-2 text-right font-mono font-bold">{result?.points ?? 0}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        );
    }
    
    const renderHandicapResults = () => {
        // Simple rank based on points for handicap events
        const sortedResults = [...results].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
        return (
            <table className="w-full text-left">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Rang</th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Name</th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Zielgruppe</th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-right">Punkte</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {sortedResults.map((result, index) => (
                        <tr key={result.id} className="hover:bg-primary/10">
                            <td className="p-3 font-bold">{index + 1}.</td>
                            <td className="p-3">{getParticipantName(result.participantId)}</td>
                            <td className="p-3">{result.finisherGroup ? `Gruppe ${result.finisherGroup}` : '-'}</td>
                            <td className="p-3 font-mono text-right font-bold">{result.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    const renderResults = () => {
         if (results.length === 0) {
            return <div className="text-center text-gray-500 py-8">Noch keine Ergebnisse für dieses Event vorhanden.</div>;
        }

        switch (event.eventType) {
            case EventType.EZF:
            case EventType.BZF:
                return renderTimeTrialResults();
            case EventType.MZF:
                return renderMZFResults();
            case EventType.Handicap:
                return renderHandicapResults();
            default:
                return <div>Ergebnisanzeige für diesen Event-Typ nicht implementiert.</div>;
        }
    };

    return (
        <div>
            <button onClick={onBack} className="mb-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg flex items-center space-x-2">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Zurück zur Event-Liste</span>
            </button>

            <div className="flex items-center space-x-3 mb-2">
                <CalendarIcon />
                <h1 className="text-3xl font-bold text-secondary">{event.name}</h1>
            </div>
             <div className="flex items-center space-x-6 text-gray-600 mb-6 border-b pb-4">
                <span><strong>Datum:</strong> {formatDate(event.date)}</span>
                <span><strong>Ort:</strong> {event.location}</span>
                <span><strong>Typ:</strong> {eventTypeLabels[event.eventType]}</span>
                <span>
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ event.finished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' }`}>
                      {event.finished ? 'Abgeschlossen' : 'Anstehend'}
                    </span>
                </span>
            </div>
            
             {event.notes && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                    <h4 className="font-bold">Notizen</h4>
                    <p>{event.notes}</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    {renderResults()}
                </div>
            </div>
        </div>
    );
};