import React, { useState, useEffect, useMemo } from 'react';
import { Event, Participant, Result, Team, TeamMember, EventType, Settings } from '../types';
import { CloseIcon, PlusIcon, TrashIcon, UsersIcon } from './icons';
import { ParticipantSelectionModal } from './ParticipantSelectionModal';
import { calculateHandicap } from '../services/scoringService';

interface EventFormModalProps {
    onClose: () => void;
    onSave: (event: Omit<Event, 'id' | 'season'> & { id?: string }, results: Result[], teams: Team[], teamMembers: TeamMember[]) => void;
    event?: Event;
    allParticipants: Participant[];
    eventResults: Result[];
    eventTeams: Team[];
    eventTeamMembers: TeamMember[];
    settings: Settings;
    selectedSeason: number;
}

const generateId = () => `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;


// Internal component for displaying a single team member row in the MZF editor
const TeamMemberRow: React.FC<{
    member: TeamMember;
    memberResult: Result;
    onResultChange: <K extends keyof Result>(resultId: string, field: K, value: Result[K]) => void;
    onMemberChange: <K extends keyof TeamMember>(memberId: string, field: K, value: TeamMember[K]) => void;
    onRemoveMember: (memberId: string) => void;
    getParticipantName: (id: string) => string;
    handicap?: number;
}> = ({ member, memberResult, onResultChange, onMemberChange, onRemoveMember, getParticipantName, handicap }) => {
    return (
        <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-center p-2 rounded bg-white border">
            <div className="col-span-12 md:col-span-3 font-medium text-gray-800">
                {getParticipantName(member.participantId)}
            </div>
            <div className="col-span-6 md:col-span-2">
                <input
                    type="number"
                    placeholder="Zeit"
                    // The nullish coalescing operator (??) is used to handle `timeSeconds` being 0.
                    // Using `|| ''` would incorrectly display an empty string for a time of 0 seconds.
                    value={memberResult.timeSeconds ?? ''}
                    // `parseInt` is called with a radix of 10 for correctness. The result is checked
                    // for NaN to correctly handle empty input, and 0 is preserved as a valid value.
                    onChange={e => { const num = parseInt(e.target.value, 10); onResultChange(memberResult.id, 'timeSeconds', isNaN(num) ? undefined : num); }}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md"
                />
            </div>
            <div className="col-span-6 md:col-span-3 space-y-1">
                <div className="flex items-center text-xs">
                    <input type="checkbox" id={`aero-${memberResult.id}`} checked={!!memberResult.hasAeroBars} onChange={(e) => onResultChange(memberResult.id, 'hasAeroBars', e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"/>
                    <label htmlFor={`aero-${memberResult.id}`} className="ml-2">Aufsatz</label>
                </div>
                <div className="flex items-center text-xs">
                    <input type="checkbox" id={`tt-${memberResult.id}`} checked={!!memberResult.hasTTEquipment} onChange={(e) => onResultChange(memberResult.id, 'hasTTEquipment', e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"/>
                    <label htmlFor={`tt-${memberResult.id}`} className="ml-2">Material</label>
                </div>
                 {handicap !== undefined && (
                    <div className="text-xs text-gray-500 mt-1 pt-1 border-t">
                        Handicap: <strong className={handicap > 0 ? 'text-red-600' : 'text-green-600'}>{handicap > 0 ? '+' : ''}{handicap.toFixed(0)}s</strong>
                    </div>
                )}
            </div>
            <div className="col-span-4 md:col-span-1 flex items-center">
                <input
                    type="checkbox"
                    id={`penalty-${member.id}`}
                    checked={member.penaltyMinus2}
                    onChange={(e) => onMemberChange(member.id, 'penaltyMinus2', e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"/>
                <label htmlFor={`penalty-${member.id}`} className="ml-2 text-xs">Penalty</label>
            </div>
             <div className="col-span-4 md:col-span-1 flex items-center justify-center">
                <input type="checkbox" id={`dnf-${memberResult.id}`} checked={!!memberResult.dnf} onChange={(e) => onResultChange(memberResult.id, 'dnf', e.target.checked)} className="h-5 w-5 text-primary focus:ring-primary-dark border-gray-300 rounded" />
            </div>
            <div className="col-span-4 md:col-span-2 text-right">
                <button onClick={() => onRemoveMember(member.id)} className="text-red-500 hover:text-red-700 p-1" aria-label="Teammitglied entfernen"><TrashIcon className="w-4 h-4" /></button>
            </div>
        </div>
    );
};

export const EventFormModal: React.FC<EventFormModalProps> = ({
    onClose, onSave, event, allParticipants, eventResults, eventTeams, eventTeamMembers, settings, selectedSeason
}) => {
    // FIX: Removed explicit Omit type to let TypeScript infer a simpler structural type, 
    // avoiding downstream type inference issues that were causing 'unknown' types.
    const [formData, setFormData] = useState({
        name: event?.name || '',
        date: event?.date || new Date().toISOString().split('T')[0],
        location: event?.location || '',
        eventType: event?.eventType || EventType.EZF,
        notes: event?.notes || '',
        finished: event?.finished || false,
    });
    
    const [results, setResults] = useState<Result[]>(eventResults);
    const [teams, setTeams] = useState<Team[]>(eventTeams);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(eventTeamMembers);
    
    const [isParticipantSelectionOpen, setParticipantSelectionOpen] = useState(false);
    const [targetTeamId, setTargetTeamId] = useState<string | null>(null);

    const participantMap = useMemo(() => new Map(allParticipants.map(p => [p.id, p])), [allParticipants]);
    
    useEffect(() => {
        if (formData.eventType === EventType.MZF) {
            const teamMemberParticipantIds = new Set(teamMembers.map(tm => tm.participantId));
            const resultsParticipantIds = new Set(results.map(r => r.participantId));
            const missingResults: Result[] = [];
            
            teamMemberParticipantIds.forEach(participantId => {
                if (!resultsParticipantIds.has(participantId)) {
                    missingResults.push({
                        id: generateId(),
                        eventId: event?.id || '',
                        participantId: participantId,
                        dnf: false,
                        points: 0,
                    });
                }
            });

            if (missingResults.length > 0) {
                setResults(prev => [...prev, ...missingResults]);
            }
        }
    }, [formData.eventType, teamMembers, results, event?.id]);


    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddParticipants = (participantIds: string[]) => {
        const newResults: Result[] = participantIds.map(pid => ({
            id: generateId(),
            eventId: event?.id || '',
            participantId: pid,
            dnf: false,
            points: 0,
            finisherGroup: formData.eventType === EventType.Handicap ? 1 : undefined,
        }));
        setResults(prev => [...prev, ...newResults]);
    };
    
    // Using a generic type `<K extends keyof Result>` makes this handler
    // fully type-safe, preventing incorrect field names or value types from being passed.
    const handleResultChange = <K extends keyof Result>(resultId: string, field: K, value: Result[K]) => {
        setResults(prev => prev.map(r => r.id === resultId ? { ...r, [field]: value } : r));
    };

    const handleRemoveResult = (resultId: string) => {
        setResults(prev => prev.filter(r => r.id !== resultId));
    };

    const handleAddTeam = () => {
        const newTeam: Team = {
            id: generateId(),
            eventId: event?.id || '',
            name: `Team ${teams.length + 1}`,
        };
        setTeams(prev => [...prev, newTeam]);
    };

    // Using a generic type `<K extends keyof Team>` makes this handler
    // fully type-safe, preventing incorrect field names or value types from being passed.
    const handleTeamChange = <K extends keyof Team>(teamId: string, field: K, value: Team[K]) => {
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, [field]: value } : t));
    };
    
    // Using a generic type `<K extends keyof TeamMember>` makes this handler
    // fully type-safe, preventing incorrect field names or value types from being passed.
    const handleTeamMemberChange = <K extends keyof TeamMember>(memberId: string, field: K, value: TeamMember[K]) => {
        setTeamMembers(prev => prev.map(tm => tm.id === memberId ? { ...tm, [field]: value } : tm));
    };

    const handleRemoveTeam = (teamId: string) => {
        setTeams(prev => prev.filter(t => t.id !== teamId));
        setTeamMembers(prev => prev.filter(tm => tm.teamId !== teamId));
    };

    const handleOpenTeamMemberSelection = (teamId: string) => {
        setTargetTeamId(teamId);
        setParticipantSelectionOpen(true);
    };

    const handleAddMembersToTeam = (participantIds: string[]) => {
        if (!targetTeamId) return;

        const newMembers: TeamMember[] = participantIds.map(pid => ({
            id: generateId(),
            teamId: targetTeamId,
            participantId: pid,
            penaltyMinus2: false,
        }));

        const currentResultPids = new Set(results.map(r => r.participantId));
        const newResults: Result[] = participantIds
            .filter(pid => !currentResultPids.has(pid))
            .map(pid => ({
                id: generateId(),
                eventId: event?.id || '',
                participantId: pid,
                dnf: false,
                points: 0,
            }));
        
        setTeamMembers(prev => [...prev, ...newMembers]);
        if (newResults.length > 0) {
            setResults(prev => [...prev, ...newResults]);
        }
    };
    
    const handleRemoveTeamMember = (memberId: string) => {
        setTeamMembers(prev => prev.filter(tm => tm.id !== memberId));
    };

    const handleModalClose = () => {
        setParticipantSelectionOpen(false);
        setTargetTeamId(null);
    };

    const handleSaveClick = () => {
        const eventId = event?.id;
        const finalResults = results.map(r => ({...r, eventId: eventId || ''}));
        const finalTeams = teams.map(t => ({...t, eventId: eventId || ''}));

        onSave({ ...formData, id: eventId }, finalResults, finalTeams, teamMembers);
    };
    
    const getParticipantName = (id: string) => {
        const p = participantMap.get(id);
        return p ? `${p.lastName}, ${p.firstName}` : 'Unbekannt';
    }

    const calculateMZFAnalytics = (
        currentTeamMembers: TeamMember[],
        allResults: Result[],
        participants: Map<string, Participant>,
        currentEvent: Omit<Event, 'id' | 'season'> & { id?: string, season: number },
        currentSettings: Settings
    ) => {
        const fakeEventForCalc: Event = { ...currentEvent, id: currentEvent.id || generateId() };
        const individualHandicaps = new Map<string, number>();

        const memberResults = currentTeamMembers
            .map(member => {
                const result = allResults.find(r => r.participantId === member.participantId);
                const participant = participants.get(member.participantId);
                if (result && participant) {
                    const handicap = calculateHandicap(participant, result, fakeEventForCalc, currentSettings);
                    individualHandicaps.set(member.participantId, handicap);
                }
                return result;
            })
            .filter((r): r is Result => r !== undefined && !r.dnf && r.timeSeconds != null && r.timeSeconds > 0);

        if (memberResults.length < 2) {
            return { calculatedTime: Infinity, individualHandicaps };
        }

        const totalTeamHandicap = Array.from(individualHandicaps.values()).reduce((sum, val) => sum + val, 0);

        const sortedTimes = memberResults.map(r => r.timeSeconds!).sort((a, b) => a - b);
        const relevantRiderIndex = Math.max(0, sortedTimes.length - 2);
        const baseTime = sortedTimes[relevantRiderIndex];
        const calculatedTime = baseTime + totalTeamHandicap;

        return { calculatedTime, individualHandicaps };
    };

    const renderResultsEditor = () => {
        const eventType = formData.eventType;
        const usedWinnerRanks = new Set(results.map(r => r.winnerRank).filter(Boolean));
        const winnerRanks: (1 | 2 | 3)[] = [1, 2, 3];
    
        return (
            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Ergebnisse</h3>
    
                <div className="grid grid-cols-12 gap-2 items-center mb-2 px-2 text-sm font-semibold text-gray-600">
                    <div className="col-span-3">Teilnehmer</div>
                    {(eventType === EventType.EZF || eventType === EventType.BZF) && (
                        <>
                            <div className="col-span-2">Zeit (sek)</div>
                            <div className="col-span-2">Angep. Zeit</div>
                            <div className="col-span-2">Material</div>
                            <div className="col-span-2">Bonus-Rang</div>
                        </>
                    )}
                    {eventType === EventType.Handicap && <div className="col-span-6 md:col-span-5">Zielgruppe</div>}
                    <div className="col-span-1 text-center">Aktion</div>
                </div>
    
                {results.map(result => {
                    const participant = participantMap.get(result.participantId);
                    let adjustedTime: number | null = null;
                    if (participant && result.timeSeconds) {
                        const fakeEventForCalc: Event = { ...formData, id: event?.id || '', season: event?.season || selectedSeason };
                        const handicap = calculateHandicap(participant, result, fakeEventForCalc, settings);
                        adjustedTime = result.timeSeconds + handicap;
                    }

                    return (
                        <div key={result.id} className="grid grid-cols-12 gap-2 items-center mb-2 p-2 bg-gray-50 rounded">
                            <div className="col-span-3 font-medium">{getParticipantName(result.participantId)}</div>
        
                            {(eventType === EventType.EZF || eventType === EventType.BZF) && (
                                <>
                                    <div className="col-span-2">
                                        <input type="number" placeholder="Zeit" value={result.timeSeconds ?? ''} onChange={(e) => { const num = parseInt(e.target.value, 10); handleResultChange(result.id, 'timeSeconds', isNaN(num) ? undefined : num); }} className="w-full p-2 border border-gray-300 rounded-md"/>
                                    </div>
                                    <div className="col-span-2">
                                        <input type="text" value={adjustedTime !== null ? `${adjustedTime.toFixed(0)}s` : '-'} readOnly className="w-full p-2 bg-gray-100 border-gray-200 rounded-md text-center font-semibold text-gray-700"/>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <div className="flex items-center text-xs">
                                            <input type="checkbox" id={`aero-${result.id}`} checked={!!result.hasAeroBars} onChange={(e) => handleResultChange(result.id, 'hasAeroBars', e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"/>
                                            <label htmlFor={`aero-${result.id}`} className="ml-2">Aufsatz</label>
                                        </div>
                                        <div className="flex items-center text-xs">
                                            <input type="checkbox" id={`tt-${result.id}`} checked={!!result.hasTTEquipment} onChange={(e) => handleResultChange(result.id, 'hasTTEquipment', e.target.checked)} className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"/>
                                            <label htmlFor={`tt-${result.id}`} className="ml-2">Material</label>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <select value={result.winnerRank || 0} onChange={(e) => handleResultChange(result.id, 'winnerRank', parseInt(e.target.value) === 0 ? undefined : parseInt(e.target.value) as (1|2|3))} className="w-full p-2 border border-gray-300 rounded-md">
                                            <option value={0}>Kein Bonus</option>
                                            {winnerRanks.map(rank => (
                                                <option key={rank} value={rank} disabled={usedWinnerRanks.has(rank) && result.winnerRank !== rank}>
                                                    {rank}. Platz (+{settings.winnerPoints[rank - 1] || 0} Pkt)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            {eventType === EventType.Handicap && (
                                <div className="col-span-6 md:col-span-5">
                                    <select value={result.finisherGroup || 1} onChange={(e) => handleResultChange(result.id, 'finisherGroup', parseInt(e.target.value, 10) || undefined)} className="w-full p-2 border border-gray-300 rounded-md" aria-label="Zielgruppe auswählen">
                                        <option value={1}>Zielgruppe 1 (kein Abzug)</option>
                                        <option value={2}>Zielgruppe 2 (Punktabzug)</option>
                                    </select>
                                </div>
                            )}
        
                            <div className="col-span-1 flex items-center justify-around">
                                <label htmlFor={`dnf-${result.id}`} className="text-xs text-gray-500 sr-only">DNF</label>
                                <input title="Did Not Finish" type="checkbox" id={`dnf-${result.id}`} checked={!!result.dnf} onChange={(e) => handleResultChange(result.id, 'dnf', e.target.checked)} className="h-5 w-5 text-primary focus:ring-primary-dark border-gray-300 rounded" />
                                <button onClick={() => handleRemoveResult(result.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    );
                })}
                <button onClick={() => setParticipantSelectionOpen(true)} className="text-primary hover:text-primary-dark font-semibold py-2 px-4 rounded-lg border border-primary flex items-center space-x-2 mt-2">
                    <PlusIcon className="w-5 h-5" /> <span>Teilnehmer hinzufügen</span>
                </button>
            </div>
        );
    };

    const renderTeamEditor = () => {
        return (
            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Teams & Ergebnisse</h3>
                <div className="space-y-4">
                    {teams.map(team => {
                        const currentTeamMembers = teamMembers.filter(tm => tm.teamId === team.id);
                        const { calculatedTime, individualHandicaps } = calculateMZFAnalytics(
                            currentTeamMembers,
                            results,
                            participantMap,
                            { ...formData, id: event?.id || '', season: event?.season || selectedSeason },
                            settings
                        );
                        
                        return (
                            <div key={team.id} className="relative p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                                    <input type="text" value={team.name} onChange={e => handleTeamChange(team.id, 'name', e.target.value)} className="p-2 border border-gray-300 rounded-md font-semibold text-lg flex-grow" aria-label="Teamname"/>
                                    <div className="text-right ml-4">
                                        <div className="text-sm text-gray-500">Berechnete Zeit</div>
                                        <div className="text-xl font-bold text-primary-dark">{isFinite(calculatedTime) ? `${calculatedTime.toFixed(0)}s` : 'N/A'}</div>
                                    </div>
                                    <button onClick={() => handleRemoveTeam(team.id)} className="ml-4 text-red-500 hover:text-red-700 p-1" aria-label={`Team ${team.name} löschen`}>
                                        <TrashIcon />
                                    </button>
                                </div>
                                
                                <div className="hidden md:grid grid-cols-12 gap-x-3 items-center px-2 pb-2 text-xs font-semibold text-gray-500 border-b mb-2">
                                    <div className="col-span-3">Mitglied</div>
                                    <div className="col-span-2">Zeit (s)</div>
                                    <div className="col-span-3">Material-Handicap</div>
                                    <div className="col-span-1">Penalty</div>
                                    <div className="col-span-1 text-center">DNF</div>
                                    <div className="col-span-2 text-right">Aktion</div>
                                </div>

                                <div className="space-y-3 mb-3">
                                    {currentTeamMembers.map(member => {
                                        const memberResult = results.find(r => r.participantId === member.participantId);
                                        if (!memberResult) return null;

                                        return (
                                            <TeamMemberRow
                                                key={member.id}
                                                member={member}
                                                memberResult={memberResult}
                                                onResultChange={handleResultChange}
                                                onMemberChange={handleTeamMemberChange}
                                                onRemoveMember={handleRemoveTeamMember}
                                                getParticipantName={getParticipantName}
                                                handicap={individualHandicaps.get(member.participantId)}
                                            />
                                        );
                                    })}
                                </div>
                                <button onClick={() => handleOpenTeamMemberSelection(team.id)} className="text-sm text-blue-600 hover:text-blue-800 font-semibold py-1 px-2 rounded-lg border border-blue-600 flex items-center space-x-1 hover:bg-blue-50">
                                    <UsersIcon className="w-4 h-4" /> <span>Mitglieder hinzufügen</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
                <button onClick={handleAddTeam} className="mt-4 text-primary hover:text-primary-dark font-semibold py-2 px-4 rounded-lg border border-primary flex items-center space-x-2 hover:bg-primary/10">
                    <PlusIcon className="w-5 h-5" /> <span>Team hinzufügen</span>
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-secondary">{event ? 'Event bearbeiten' : 'Neues Event erstellen'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><CloseIcon /></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" name="name" value={formData.name} onChange={handleFormChange} placeholder="Event Name" className="p-2 border border-gray-300 rounded-md w-full" />
                        <input type="date" name="date" value={formData.date} onChange={handleFormChange} className="p-2 border border-gray-300 rounded-md w-full" />
                        <input type="text" name="location" value={formData.location} onChange={handleFormChange} placeholder="Ort" className="p-2 border border-gray-300 rounded-md w-full" />
                        <select name="eventType" value={formData.eventType} onChange={handleFormChange} className="p-2 border border-gray-300 rounded-md w-full">
                            <option value={EventType.EZF}>Einzelzeitfahren</option>
                            <option value={EventType.BZF}>Bergzeitfahren</option>
                            <option value={EventType.MZF}>Mannschaftszeitfahren</option>
                            <option value={EventType.Handicap}>Handicap</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="event-notes" className="block text-sm font-medium text-gray-700">Notizen</label>
                        <textarea id="event-notes" name="notes" value={formData.notes} onChange={handleFormChange} placeholder="Zusätzliche Informationen zum Event..." className="mt-1 p-2 border border-gray-300 rounded-md w-full h-24" />
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" id="finished" name="finished" checked={formData.finished} onChange={handleFormChange} className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded" />
                        <label htmlFor="finished" className="ml-2 block text-sm text-gray-900">Event ist abgeschlossen (berechnet Punkte)</label>
                    </div>
                </div>
                
                <hr className="my-6" />

                {formData.eventType === EventType.MZF ? renderTeamEditor() : renderResultsEditor()}

                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Abbrechen</button>
                    <button onClick={handleSaveClick} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Speichern</button>
                </div>
            </div>
            {isParticipantSelectionOpen && (
                <ParticipantSelectionModal
                    onClose={handleModalClose}
                    onAddParticipants={targetTeamId ? handleAddMembersToTeam : handleAddParticipants}
                    allParticipants={allParticipants}
                    alreadySelectedIds={
                        formData.eventType === EventType.MZF
                            ? teamMembers.map(tm => tm.participantId)
                            : results.map(r => r.participantId)
                    }
                />
            )}
        </div>
    );
};
