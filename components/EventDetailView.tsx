import React, { useMemo, useState, useEffect } from 'react';
import { Event, Participant, Result, Team, TeamMember, Settings, EventType, GroupLabel } from '../types';
import { ArrowLeftIcon, CalendarIcon } from './icons';
import { calculateHandicap, getParticipantGroup } from '../services/scoringService';

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

// Helper function to determine placement points, mirrored from scoringService
const getPlacementPoints = (rank: number): number => {
    if (rank <= 10) return 8;
    if (rank <= 20) return 7;
    if (rank <= 30) return 6;
    return 5;
};

export const EventDetailView: React.FC<EventDetailViewProps> = ({ event, participants, results, teams, teamMembers, settings, onBack }) => {
    
    const [filterStatus, setFilterStatus] = useState<'all' | 'finished' | 'dnf'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        // Set default sort order based on event type when the component mounts or the event changes.
        if (event.eventType === EventType.EZF || event.eventType === EventType.BZF) {
            // For individual time trials, the default sort is by rank, ascending.
            setSortConfig({ key: 'rank', direction: 'asc' });
        } else if (event.eventType === EventType.Handicap) {
             // For handicap events, the default sort is also by rank, ascending.
            setSortConfig({ key: 'rank', direction: 'asc' });
        } else if (event.eventType === EventType.MZF) {
            // For team time trials, the default sort is by the calculated team time, ascending.
            setSortConfig({ key: 'adjustedTime', direction: 'asc' });
        } else {
            // Clear sort config for any other event type.
            setSortConfig(null);
        }
    }, [event.eventType]);

    const participantMap = useMemo(() => new Map(participants.map(p => [p.id, p])), [participants]);
    
    const getParticipantName = (id: string) => {
        const p = participantMap.get(id);
        return p ? `${p.lastName}, ${p.firstName}` : 'Unbekannt';
    }

    // Unified and robust search function.
    const participantMatchesSearch = (participantId: string, term: string): boolean => {
        const trimmedTerm = term.trim().toLowerCase();
        if (!trimmedTerm) return true; // Always match if search term is empty
        const participant = participantMap.get(participantId);
        if (!participant) return false;
        
        const fullName = `${participant.firstName} ${participant.lastName}`.toLowerCase();
        const reversedFullName = `${participant.lastName}, ${participant.firstName}`.toLowerCase();
        return fullName.includes(trimmedTerm) || reversedFullName.includes(trimmedTerm);
    };
    
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortArrow = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return '';
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    const filteredResults = useMemo(() => {
        return results.filter(result => {
            const nameMatch = participantMatchesSearch(result.participantId, searchTerm);
            const statusMatch = filterStatus === 'all' || (filterStatus === 'finished' && !result.dnf) || (filterStatus === 'dnf' && result.dnf);
            return nameMatch && statusMatch;
        });
    }, [results, searchTerm, filterStatus, participantMap]);


    const renderTimeTrialResults = () => {
        // Step 1: Calculate ranks based on adjusted time. This is the official ranking.
        const rankedFinishers = filteredResults
            .filter(r => !r.dnf && participantMap.has(r.participantId))
            .map(r => {
                const participant = participantMap.get(r.participantId)!;
                const handicap = calculateHandicap(participant, r, event, settings);
                const adjustedTime = (r.timeSeconds || 0) + handicap;
                return { ...r, participant, adjustedTime };
            })
            .sort((a, b) => a.adjustedTime - b.adjustedTime)
            .map((result, index) => ({...result, rank: index + 1}));

        // Step 2: Apply interactive sorting for display purposes. The official rank is preserved.
        let displayData: (typeof rankedFinishers[number] & { participantName?: string })[] = [...rankedFinishers];

        if (sortConfig) {
             displayData.sort((a, b) => {
                let aVal: any;
                let bVal: any;
                if (sortConfig.key === 'name') {
                    aVal = getParticipantName(a.participantId);
                    bVal = getParticipantName(b.participantId);
                } else {
                    aVal = a[sortConfig.key as keyof typeof a] ?? (sortConfig.direction === 'asc' ? Infinity : -Infinity);
                    bVal = b[sortConfig.key as keyof typeof b] ?? (sortConfig.direction === 'asc' ? Infinity : -Infinity);
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                
                // 1st Tie-breaker: If primary sort values are equal, use the official rank.
                const rankDiff = (a.rank ?? Infinity) - (b.rank ?? Infinity);
                if (rankDiff !== 0) return rankDiff;

                // 2nd Tie-breaker: If ranks are also equal, sort by name alphabetically.
                return getParticipantName(a.participantId).localeCompare(getParticipantName(b.participantId));
            });
        }
        
        // Step 3: Handle participants who did not finish (DNF).
        const dnfs = filteredResults.filter(r => r.dnf);

        if (displayData.length === 0 && dnfs.length === 0) {
            return <div className="p-4 text-center text-gray-500">Keine Ergebnisse für die aktuellen Filter gefunden.</div>;
        }

        return (
             <table className="w-full min-w-[700px] text-left">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">
                            <button className="font-semibold" onClick={() => requestSort('rank')}>Rang{getSortArrow('rank')}</button>
                        </th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">
                             <button className="font-semibold" onClick={() => requestSort('name')}>Name{getSortArrow('name')}</button>
                        </th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-center">
                            <button className="font-semibold" onClick={() => requestSort('timeSeconds')}>Zeit{getSortArrow('timeSeconds')}</button>
                        </th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-center">
                            <button className="font-semibold" onClick={() => requestSort('adjustedTime')}>Angep. Zeit{getSortArrow('adjustedTime')}</button>
                        </th>
                        <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-right">
                             <button className="font-semibold" onClick={() => requestSort('points')}>Punkte{getSortArrow('points')}</button>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {displayData.map((result) => (
                        <tr key={result.id} className="hover:bg-primary/10">
                            <td className="p-3 font-bold">{result.rank}.</td>
                            <td className="p-3">
                                <div className="flex items-center">
                                    <span>{getParticipantName(result.participantId)}</span>
                                    {result.winnerRank && result.winnerRank <= settings.winnerPoints.length && (
                                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800" title={`Bonus points for placing ${result.winnerRank}`}>
                                            +{settings.winnerPoints[result.winnerRank - 1]} Bonus Pts
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="p-3 font-mono text-center">{result.timeSeconds}s</td>
                            <td className="p-3 font-mono text-center font-semibold text-primary-dark">{result.adjustedTime.toFixed(0)}s</td>
                            <td className="p-3 font-mono text-right font-bold">{result.points}</td>
                        </tr>
                    ))}
                    {dnfs.map(result => {
                         return (
                             <tr key={result.id} className="hover:bg-red-50 opacity-70">
                                <td className="p-3 font-bold text-red-600">DNF</td>
                                <td className="p-3">
                                    {getParticipantName(result.participantId)}
                                </td>
                                <td className="p-3 font-mono text-center">-</td>
                                <td className="p-3 font-mono text-center">-</td>
                                <td className="p-3 font-mono text-right font-bold">{result.points}</td>
                            </tr>
                         );
                    })}
                </tbody>
            </table>
        );
    };

    const renderMZFResults = () => {
        const allTeamsRanked = useMemo(() => {
            const allTeamsWithData = teams.map(team => {
                // Step 1: Identify all members of the current team.
                const allMembersOfTeam = teamMembers.filter(tm => tm.teamId === team.id);
    
                // Step 2: Determine the team's base time using the (n-1) rule on valid finishers.
                // A valid finisher is not DNF and has a recorded time > 0.
                const validFinisherResults = allMembersOfTeam
                    .map(member => results.find(r => r.participantId === member.participantId))
                    .filter((r): r is Result => r !== undefined && !r.dnf && r.timeSeconds != null && r.timeSeconds > 0);
                
                // Edge Case: Teams with fewer than two valid finishers cannot have a valid time.
                // Their time is set to Infinity to rank them last.
                if (validFinisherResults.length < 2) {
                    return { ...team, adjustedTime: Infinity, totalTeamHandicap: 0, rank: Infinity };
                }
                
                // The base time is the time of the second-to-last finisher (n-1 rule).
                const sortedFinisherTimes = validFinisherResults.map(r => r.timeSeconds!).sort((a, b) => a - b);
                const baseTime = sortedFinisherTimes[Math.max(0, validFinisherResults.length - 2)];
    
                // Step 3: Calculate the total team handicap.
                // This sum includes the handicaps of ALL team members, including those who are DNF.
                const totalTeamHandicap = allMembersOfTeam.reduce((sum, member) => {
                    const participant = participantMap.get(member.participantId);
                    // This will find the result for DNF riders too.
                    const result = results.find(r => r.participantId === member.participantId); 
                    if (participant && result) {
                        // calculateHandicap returns positive values for penalties and negative for bonuses.
                        return sum + calculateHandicap(participant, result, event, settings);
                    }
                    return sum;
                }, 0);
    
                // Step 4: Calculate the final adjusted time.
                // A bonus (negative handicap) reduces the time, a penalty (positive) increases it.
                const adjustedTime = baseTime + totalTeamHandicap;
                
                return { ...team, adjustedTime, totalTeamHandicap, rank: 0 };
            });

            // Sort teams first by adjusted time, then by name for a stable order.
            const sortedTeams = [...allTeamsWithData].sort((a, b) => {
                const timeDiff = a.adjustedTime - b.adjustedTime;
                if (timeDiff !== 0) return timeDiff;
                return a.name.localeCompare(b.name); // Stable sort criterion for ties
            });
            
            // Assign ranks using "Standard Competition Ranking" (e.g., 1, 2, 2, 4).
            // Teams with the same time receive the same rank.
            const rankedTeamsWithTies = [];
            let rank = 1;
            for (let i = 0; i < sortedTeams.length; i++) {
                const team = sortedTeams[i];
                
                if (!isFinite(team.adjustedTime)) {
                    rankedTeamsWithTies.push({ ...team, rank: Infinity });
                    continue;
                }
                
                // The rank only increases when the current team's time is greater than the previous team's time.
                // This assigns the same rank to all teams in a tie.
                if (i > 0 && sortedTeams[i].adjustedTime > sortedTeams[i - 1].adjustedTime) {
                    // The new rank is the current position in the sorted list (1-based index).
                    rank = i + 1;
                }
                
                rankedTeamsWithTies.push({ ...team, rank: rank });
            }
            return rankedTeamsWithTies;

        }, [teams, teamMembers, results, participantMap, event, settings]);
    
        const displayedTeams = useMemo(() => {
            const filtered = allTeamsRanked.filter(team => {
                const members = teamMembers.filter(tm => tm.teamId === team.id);
                if (members.length === 0) return false;

                return members.some(member => {
                    const nameMatches = participantMatchesSearch(member.participantId, searchTerm);
                    if (!nameMatches) return false;

                    const result = results.find(r => r.participantId === member.participantId);
                    const statusMatches = filterStatus === 'all' 
                        || (result && ((filterStatus === 'finished' && !result.dnf) || (filterStatus === 'dnf' && result.dnf)));

                    return statusMatches;
                });
            });
    
            if (sortConfig) {
                return [...filtered].sort((a, b) => {
                    const dir = sortConfig.direction === 'asc' ? 1 : -1;
                    let compareVal = 0;
                    if (sortConfig.key === 'adjustedTime') {
                        compareVal = (a.adjustedTime - b.adjustedTime) * dir;
                    } else if (sortConfig.key === 'name') {
                        compareVal = a.name.localeCompare(b.name) * dir;
                    }

                    if (compareVal !== 0) return compareVal;
                    // Secondary sort criterion
                    const rankDiff = (a.rank ?? Infinity) - (b.rank ?? Infinity);
                    if (rankDiff !== 0) return rankDiff;
                    // Tertiary sort criterion
                    return a.name.localeCompare(b.name);
                });
            }
            return filtered;
        }, [allTeamsRanked, teamMembers, results, searchTerm, filterStatus, sortConfig, participantMap]);
    
        if (displayedTeams.length === 0) {
            return <div className="p-4 text-center text-gray-500">Keine Ergebnisse für die aktuellen Filter gefunden.</div>;
        }
    
        return (
            <div className="space-y-6">
                {displayedTeams.map((team) => {
                    const teamPoints = isFinite(team.adjustedTime) ? getPlacementPoints(team.rank) : 0;
                    const displayedMembers = teamMembers
                        .filter(tm => tm.teamId === team.id)
                        .filter(member => {
                            if (filterStatus === 'all') return true;
                            const r = results.find(res => res.participantId === member.participantId);
                            if (!r) return false;
                            return (filterStatus === 'finished' && !r.dnf) || (filterStatus === 'dnf' && r.dnf);
                        });
    
                    return (
                        <div key={team.id} className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 min-w-[650px]">
                            <div className="flex justify-between items-center gap-4 mb-3 border-b pb-3">
                                <h4 className="text-xl font-bold text-secondary truncate whitespace-nowrap" title={team.name}>
                                     <button className="font-bold text-left" onClick={() => requestSort('name')}>{team.rank}. {team.name}{getSortArrow('name')}</button>
                                </h4>
                                <div className="flex items-center space-x-6 flex-shrink-0">
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">
                                            <button className="font-semibold" onClick={() => requestSort('adjustedTime')}>
                                                Team-Zeit{getSortArrow('adjustedTime')}
                                            </button>
                                        </div>
                                        <div className="text-2xl font-bold text-primary-dark">{isFinite(team.adjustedTime) ? `${team.adjustedTime.toFixed(0)}s` : 'N/A'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Ges. Handicap</div>
                                        {isFinite(team.adjustedTime) ? (
                                            <div className={`text-2xl font-bold ${team.totalTeamHandicap > 0 ? 'text-red-600' : team.totalTeamHandicap < 0 ? 'text-green-600' : 'text-gray-800'}`}>
                                                {team.totalTeamHandicap > 0 ? '+' : ''}{team.totalTeamHandicap.toFixed(0)}s
                                            </div>
                                        ) : (
                                            <div className="text-2xl font-bold text-gray-400">N/A</div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Punkte</div>
                                        <div className="text-2xl font-bold text-primary-dark">{teamPoints}</div>
                                    </div>
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
                                    {displayedMembers
                                        .sort((a, b) => getParticipantName(a.participantId).localeCompare(getParticipantName(b.participantId)))
                                        .map(member => {
                                            const result = results.find(r => r.participantId === member.participantId);
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
                    );
                })}
            </div>
        );
    };
    
    const renderHandicapResults = () => {
        if (results.length === 0) {
            return <div className="text-center text-gray-500 py-8">Noch keine Ergebnisse für dieses Event vorhanden.</div>;
        }
        if (filteredResults.length === 0) {
            return <div className="p-4 text-center text-gray-500">Keine Ergebnisse für die aktuellen Filter gefunden.</div>;
        }

        const groupedResults = filteredResults.reduce<Record<GroupLabel, Result[]>>((acc, result) => {
            const participant = participantMap.get(result.participantId);
            if (participant) {
                const group = getParticipantGroup(participant);
                acc[group].push(result);
            }
            return acc;
        }, { [GroupLabel.Ambitious]: [], [GroupLabel.Hobby]: [], [GroupLabel.Women]: [] });

        const resultGroups = [
            { title: "Männer Ambitioniert (C/D)", resultsForGroup: groupedResults[GroupLabel.Ambitious] },
            { title: "Männer Hobby (A/B)", resultsForGroup: groupedResults[GroupLabel.Hobby] },
            { title: "Frauen", resultsForGroup: groupedResults[GroupLabel.Women] }
        ];

        return (
            <div>
                {resultGroups.map(({ title, resultsForGroup }) => {
                    if (resultsForGroup.length === 0) {
                        return null;
                    }

                    const finishers = resultsForGroup.filter(r => !r.dnf);
                    const dnfs = resultsForGroup.filter(r => r.dnf);

                    let rankedResults = [...finishers]
                        .sort((a, b) => {
                            const pointsDiff = (b.points ?? 0) - (a.points ?? 0);
                            if (pointsDiff !== 0) return pointsDiff;
                            return getParticipantName(a.participantId).localeCompare(getParticipantName(b.participantId));
                        })
                        .map((r, index) => ({ ...r, rank: index + 1 }));

                    if (sortConfig) {
                        rankedResults.sort((a, b) => {
                            let aVal, bVal;
                            if (sortConfig.key === 'name') {
                                aVal = getParticipantName(a.participantId);
                                bVal = getParticipantName(b.participantId);
                            } else {
                                aVal = a[sortConfig.key as keyof typeof a] ?? (sortConfig.direction === 'asc' ? Infinity : -Infinity);
                                bVal = b[sortConfig.key as keyof typeof b] ?? (sortConfig.direction === 'asc' ? Infinity : -Infinity);
                            }
                            
                            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                            
                            // 1st Tie-breaker: If primary sort values are equal, use the official rank.
                            const rankDiff = (a.rank ?? Infinity) - (b.rank ?? Infinity);
                            if (rankDiff !== 0) return rankDiff;

                            // 2nd Tie-breaker: If ranks are also equal, sort by name alphabetically.
                            return getParticipantName(a.participantId).localeCompare(getParticipantName(b.participantId));
                        });
                    }

                    return (
                        <div key={title} className="mb-8">
                            <h3 className="text-xl font-bold text-secondary mb-4">{title}</h3>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full min-w-[600px] text-left">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">
                                                <button className="font-semibold" onClick={() => requestSort('rank')}>Rang{getSortArrow('rank')}</button>
                                            </th>
                                            <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">
                                                <button className="font-semibold" onClick={() => requestSort('name')}>Name{getSortArrow('name')}</button>
                                            </th>
                                            <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">
                                                <button className="font-semibold" onClick={() => requestSort('finisherGroup')}>Zielgruppe{getSortArrow('finisherGroup')}</button>
                                            </th>
                                            <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider text-right">
                                                <button className="font-semibold" onClick={() => requestSort('points')}>Punkte{getSortArrow('points')}</button>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {rankedResults.map((result) => (
                                            <tr key={result.id} className="hover:bg-primary/10">
                                                <td className="p-3 font-bold">{result.rank}.</td>
                                                <td className="p-3">
                                                    <div className="flex items-center">
                                                        <span>{getParticipantName(result.participantId)}</span>
                                                        {result.winnerRank && result.winnerRank <= settings.winnerPoints.length && (
                                                            <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800" title={`Bonus points for placing ${result.winnerRank}`}>
                                                                +{settings.winnerPoints[result.winnerRank - 1]} Bonus Pts
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">{result.finisherGroup ? `Gruppe ${result.finisherGroup}` : '-'}</td>
                                                <td className="p-3 font-mono text-right font-bold">{result.points}</td>
                                            </tr>
                                        ))}
                                        {dnfs.map(result => (
                                            <tr key={result.id} className="hover:bg-red-50 opacity-70">
                                                <td className="p-3 font-bold text-red-600">DNF</td>
                                                <td className="p-3">
                                                    {getParticipantName(result.participantId)}
                                                </td>
                                                <td className="p-3">-</td>
                                                <td className="p-3 font-mono text-right font-bold">{result.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const renderResults = () => {
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
    
    const FilterControls = () => (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border flex flex-wrap items-center justify-between gap-4">
            <div className="flex-grow min-w-[250px]">
                <input
                    type="text"
                    placeholder="Teilnehmer suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="flex rounded-md shadow-sm">
                    <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 text-sm font-medium border rounded-l-md ${filterStatus === 'all' ? 'bg-primary text-white border-primary-dark' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>Alle</button>
                    <button onClick={() => setFilterStatus('finished')} className={`px-4 py-2 text-sm font-medium border-t border-b ${filterStatus === 'finished' ? 'bg-primary text-white border-primary-dark' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>Finisher</button>
                    <button onClick={() => setFilterStatus('dnf')} className={`px-4 py-2 text-sm font-medium border rounded-r-md ${filterStatus === 'dnf' ? 'bg-primary text-white border-primary-dark' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>DNF</button>
                </div>
            </div>
        </div>
    );

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
            
            <FilterControls />

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto p-4">
                    {renderResults()}
                </div>
            </div>
        </div>
    );
};
