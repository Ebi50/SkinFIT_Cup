import React, { useState, useEffect, useMemo } from 'react';
import { Event, Participant, Result, Team, TeamMember, EventType, Settings, GroupLabel } from '../types';
import { CloseIcon, PlusIcon, TrashIcon, UsersIcon } from './icons';
import { ParticipantSelectionModal } from './ParticipantSelectionModal';
import { calculateHandicap, getParticipantGroup } from '../services/scoringService';

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

const formatSecondsToMMSS = (totalSeconds?: number): string => {
    // Formats a total number of seconds into a "mm:ss" string.
    if (totalSeconds === null || totalSeconds === undefined || !isFinite(totalSeconds) || totalSeconds < 0) {
        return '';
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const parseInputToSeconds = (value: string): number | undefined => {
    // Parses a user-entered string (e.g., "22:33" or "2233") into a total number of seconds.
    const trimmedValue = value.trim();
    if (trimmedValue === '') return undefined;

    // Handle "mm:ss" format
    if (trimmedValue.includes(':')) {
        const parts = trimmedValue.split(':');
        const minutes = parseInt(parts[0] || '0', 10);
        const seconds = parseInt(parts[1] || '0', 10);

        if (isNaN(minutes) || isNaN(seconds) || seconds < 0 || seconds >= 60 || minutes < 0) {
            return undefined; // Invalid format
        }
        return minutes * 60 + seconds;
    }

    // Handle plain numbers, e.g., "2233" -> 22m 33s
    const justNumbers = trimmedValue.replace(/[^0-9]/g, '');
    if (justNumbers.length === 0 || justNumbers.length > 6) return undefined;

    if (justNumbers.length <= 2) {
        // e.g., "59" -> 59 seconds
        const seconds = parseInt(justNumbers, 10);
        return seconds < 60 ? seconds : undefined;
    }
    
    // e.g., "123" -> 1m 23s, "2233" -> 22m 33s
    const secondsPart = parseInt(justNumbers.slice(-2), 10);
    const minutesPart = parseInt(justNumbers.slice(0, -2), 10);
    
    if (isNaN(minutesPart) || isNaN(secondsPart) || secondsPart >= 60 || minutesPart < 0) {
        return undefined;
    }
    
    return minutesPart * 60 + secondsPart;
};


// Internal component for displaying a single team member row in the MZF editor
const TeamMemberRow: React.FC<{
    member: TeamMember;
    memberResult: Result;
    onResultChange: <K extends keyof Result>(resultId: string, field: K, value: Result[K]) => void;
    onMemberChange: <K extends keyof TeamMember>(memberId: string, field: K, value: TeamMember[K]) => void;
    onRemoveMember: (memberId: string) => void;
    getParticipantName: (id: string) => string;
    handicap?: number;
    timeInputValue: string;
    onTimeInputChange: (resultId: string, value: string) => void;
    onTimeInputBlur: (resultId: string, value: string) => void;
}> = ({ member, memberResult, onResultChange, onMemberChange, onRemoveMember, getParticipantName, handicap, timeInputValue, onTimeInputChange, onTimeInputBlur }) => {
    return (
        <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-center p-2 rounded bg-white border">
            <div className="col-span-12 md:col-span-3 font-medium text-gray-800">
                {getParticipantName(member.participantId)}
            </div>
            <div className="col-span-6 md:col-span-2">
                <input
                    type="text"
                    placeholder="mm:ss"
                    value={timeInputValue}
                    onChange={e => onTimeInputChange(memberResult.id, e.target.value)}
                    onBlur={e => onTimeInputBlur(memberResult.id, e.target.value)}
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
    const [formData, setFormData] = useState<Omit<Event, 'id' | 'season'>>({
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

    // State to manage the string value of time inputs for a better UX
    const [timeInputs, setTimeInputs] = useState<Record<string, string>>({});

    const participantMap = useMemo(() => new Map(allParticipants.map(p => [p.id, p])), [allParticipants]);
    
    useEffect(() => {
        if (formData.eventType === EventType.MZF) {
            const teamMemberParticipantIds = new Set(teamMembers.map(tm => tm.participantId));
            const resultsParticipantIds = new Set(results.map(r => r.participantId));
            const missingResults: Result[] = [];
            
            teamMemberParticipantIds.forEach((participantId: string) => {
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
    
    useEffect(() => {
        // This effect synchronizes the local time input string state (`timeInputs`)
        // with the main `results` state. It ensures that when participants are
        // added or removed, the UI updates correctly, but it avoids overwriting
        // what the user is currently typing into an input field.
        setTimeInputs(currentInputs => {
            const newInputs = { ...currentInputs };
            const resultIdsInState = new Set(results.map(r => r.id));

            // Add entries for any new results that aren't in our input state yet.
            for (const result of results) {
                if (!currentInputs.hasOwnProperty(result.id)) {
                    newInputs[result.id] = formatSecondsToMMSS(result.timeSeconds);
                }
            }

            // Remove entries from our input state if the corresponding result was deleted.
            for (const inputId in currentInputs) {
                if (!resultIdsInState.has(inputId)) {
                    delete newInputs[inputId];
                }
            }
            return newInputs;
        });
    }, [results]);


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
    
    const handleResultChange = <K extends keyof Result>(resultId: string, field: K, value: Result[K]) => {
        setResults(prev => prev.map(r => r.id === resultId ? { ...r, [field]: value } : r));
    };
    
    const handleTimeInputChange = (resultId: string, value: string) => {
        // This handler only updates the local string state, allowing free user input.
        // It does not reformat the value, which prevents the cursor from jumping.
        // Basic sanitization prevents obviously invalid formats.
        const sanitizedValue = value.replace(/[^0-9:]/g, '');
        if ((sanitizedValue.match(/:/g) || []).length > 1 || sanitizedValue.length > 7) {
            return;
        }
        setTimeInputs(prev => ({ ...prev, [resultId]: sanitizedValue }));
    };

    const handleTimeInputBlur = (resultId: string, value: string) => {
        // On blur, parse the user's raw string input into seconds.
        const totalSeconds = parseInputToSeconds(value);
        
        // Update the main 'results' state with the canonical numeric value.
        handleResultChange(resultId, 'timeSeconds', totalSeconds);
        
        // Update the local input state with a clean, formatted 'mm:ss' string.
        setTimeInputs(prev => ({ ...prev, [resultId]: formatSecondsToMMSS(totalSeconds) }));
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

    const handleTeamChange = <K extends keyof Team>(teamId: string, field: K, value: Team[K]) => {
        // FIX: Replaced incorrect variable `r` with `t`.
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, [field]: value } : t));
    };
    
    const handleTeamMemberChange = <K extends keyof TeamMember>(memberId: string, field: K, value: TeamMember[K]) => {
        // FIX: Replaced incorrect variable `r` with `tm`.
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
    
        // Special, grouped rendering for Handicap events
        if (eventType === EventType.Handicap) {
            const groupedResults = results.reduce<Record<GroupLabel, Result[]>>((acc, result) => {
                const participant = participantMap.get(result.participantId);
                if (participant) {
                    const group = getParticipantGroup(participant);
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(result);
                }
                return acc;
            }, {} as Record<GroupLabel, Result[]>);

            const resultGroups = [
                { title: "Männer Ambitioniert (C/D)", group: GroupLabel.Ambitious, resultsForGroup: groupedResults[GroupLabel.Ambitious] || [] },
                { title: "Männer Hobby (A/B)", group: GroupLabel.Hobby, resultsForGroup: groupedResults[GroupLabel.Hobby] || [] },
                { title: "Frauen", group: GroupLabel.Women, resultsForGroup: groupedResults[GroupLabel.Women] || [] }
            ];
            const winnerRanks: (1 | 2 | 3)[] = [1, 2, 3];

            return (
                 <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Ergebnisse nach Wertungsgruppe</h3>
                    <p className="text-sm text-gray-600 mb-4">Teilnehmer werden automatisch ihrer Gruppe zugewiesen. Siegerpunkte können pro Gruppe vergeben werden.</p>
                     <div className="space-y-6 mt-4">
                         {resultGroups.map(({ title, resultsForGroup }) => {
                            if (resultsForGroup.length === 0) return null;

                            const usedRanksInGroup = new Set(resultsForGroup.map(r => r.winnerRank).filter(Boolean));

                            return (
                                <div key={title} className="p-4 border rounded-lg bg-gray-50/50">
                                    <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">{title}</h4>
                                    <div className="space-y-2">
                                        {resultsForGroup.map(result => (
                                            <div key={result.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-white rounded shadow-sm">
                                                <div className="col-span-12 md:col-span-4 font-medium">{getParticipantName(result.participantId)}</div>
                                                <div className="col-span-6 md:col-span-3">
                                                    <select value={result.finisherGroup || 1} onChange={(e) => handleResultChange(result.id, 'finisherGroup', parseInt(e.target.value, 10) || undefined)} className="w-full p-2 border border-gray-300 rounded-md text-sm" aria-label="Zielgruppe auswählen">
                                                        <option value={1}>Zielgruppe 1</option>
                                                        <option value={2}>Zielgruppe 2</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-6 md:col-span-3">
                                                    <select value={result.winnerRank || 0} onChange={(e) => handleResultChange(result.id, 'winnerRank', parseInt(e.target.value) === 0 ? undefined : parseInt(e.target.value) as (1|2|3))} className="w-full p-2 border border-gray-300 rounded-md text-sm">
                                                        <option value={0}>Kein Bonus</option>
                                                        {winnerRanks.map(rank => (
                                                            <option key={rank} value={rank} disabled={usedRanksInGroup.has(rank) && result.winnerRank !== rank}>
                                                                {rank}. Platz (+{settings.winnerPoints[rank - 1] || 0} Pkt)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                 <div className="col-span-12 md:col-span-2 flex items-center justify-end space-x-4">
                                                    <div className="flex items-center">
                                                        <input title="Did Not Finish" type="checkbox" id={`dnf-${result.id}`} checked={!!result.dnf} onChange={(e) => handleResultChange(result.id, 'dnf', e.target.checked)} className="h-5 w-5 text-primary focus:ring-primary-dark border-gray-300 rounded" />
                                                        <label htmlFor={`dnf-${result.id}`} className="ml-2 text-xs text-gray-500">DNF</label>
                                                    </div>
                                                    <button onClick={() => handleRemoveResult(result.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                         })}
                     </div>
                     <button onClick={() => setParticipantSelectionOpen(true)} className="text-primary hover:text-primary-dark font-semibold py-2 px-4 rounded-lg border border-primary flex items-center space-x-2 mt-4">
                        <PlusIcon className="w-5 h-5" /> <span>Teilnehmer hinzufügen</span>
                    </button>
                 </div>
            );
        }

        // Default rendering for other event types (EZF, BZF)
        const usedWinnerRanks = new Set(results.map(r => r.winnerRank).filter(Boolean));
        const winnerRanks: (1 | 2 | 3)[] = [1, 2, 3];
    
        return (
            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Ergebnisse</h3>
    
                <div className="grid grid-cols-12 gap-2 items-center mb-2 px-2 text-sm font-semibold text-gray-600">
                    <div className="col-span-3">Teilnehmer</div>
                    <div className="col-span-2">Zeit (mm:ss)</div>
                    <div className="col-span-2">Angep. Zeit</div>
                    <div className="col-span-2">Material</div>
                    <div className="col-span-2">Bonus-Rang</div>
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
        
                            <div className="col-span-2">
                                <input
                                    type="text"
                                    placeholder="mm:ss"
                                    value={timeInputs[result.id] ?? ''}
                                    onChange={e => handleTimeInputChange(result.id, e.target.value)}
                                    onBlur={e => handleTimeInputBlur(result.id, e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div className="col-span-2">
                                <input type="text" value={adjustedTime !== null ? `${formatSecondsToMMSS(adjustedTime)}` : '-'} readOnly className="w-full p-2 bg-gray-100 border-gray-200 rounded-md text-center font-semibold text-gray-700"/>
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
                                        <div className="text-xl font-bold text-primary-dark">{isFinite(calculatedTime) ? `${formatSecondsToMMSS(calculatedTime)}` : 'N/A'}</div>
                                    </div>
                                    <button onClick={() => handleRemoveTeam(team.id)} className="ml-4 text-red-500 hover:text-red-700 p-1" aria-label={`Team ${team.name} löschen`}>
                                        <TrashIcon />
                                    </button>
                                </div>
                                
                                <div className="hidden md:grid grid-cols-12 gap-x-3 items-center px-2 pb-2 text-xs font-semibold text-gray-500 border-b mb-2">
                                    <div className="col-span-3">Mitglied</div>
                                    <div className="col-span-2">Zeit (mm:ss)</div>
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
                                                timeInputValue={timeInputs[memberResult.id] ?? ''}
                                                onTimeInputChange={handleTimeInputChange}
                                                onTimeInputBlur={handleTimeInputBlur}
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

// --- Team Edit Modal ---

interface TeamEditModalProps {
    event: Event;
    initialTeams: Team[];
    initialTeamMembers: TeamMember[];
    allParticipants: Participant[];
    onClose: () => void;
    onSave: (updatedTeams: Team[], updatedTeamMembers: TeamMember[]) => void;
}

export const TeamEditModal: React.FC<TeamEditModalProps> = ({
    event,
    initialTeams,
    initialTeamMembers,
    allParticipants,
    onClose,
    onSave,
}) => {
    const [teams, setTeams] = useState<Team[]>(() => JSON.parse(JSON.stringify(initialTeams)));
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => JSON.parse(JSON.stringify(initialTeamMembers)));
    
    const [isParticipantSelectionOpen, setParticipantSelectionOpen] = useState(false);
    const [targetTeamId, setTargetTeamId] = useState<string | null>(null);

    const participantMap = useMemo(() => new Map(allParticipants.map(p => [p.id, p])), [allParticipants]);
    const getParticipantName = (id: string) => {
        const p = participantMap.get(id);
        return p ? `${p.lastName}, ${p.firstName}` : 'Unbekannt';
    };

    const handleTeamNameChange = (teamId: string, newName: string) => {
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name: newName } : t));
    };

    const handlePenaltyChange = (memberId: string, penalty: boolean) => {
        setTeamMembers(prev => prev.map(tm => tm.id === memberId ? { ...tm, penaltyMinus2: penalty } : tm));
    };

    const handleRemoveMember = (memberId: string) => {
        setTeamMembers(prev => prev.filter(tm => tm.id !== memberId));
    };

    const handleOpenParticipantSelection = (teamId: string) => {
        setTargetTeamId(teamId);
        setParticipantSelectionOpen(true);
    };

    const handleAddMembers = (participantIds: string[]) => {
        if (!targetTeamId) return;
        const newMembers: TeamMember[] = participantIds.map(pid => ({
            id: generateId(),
            teamId: targetTeamId,
            participantId: pid,
            penaltyMinus2: false,
        }));
        setTeamMembers(prev => [...prev, ...newMembers]);
        setParticipantSelectionOpen(false);
        setTargetTeamId(null);
    };

    const handleAddNewTeam = () => {
        const newTeam: Team = {
            id: generateId(),
            eventId: event.id,
            name: `Neues Team ${teams.length + 1}`,
        };
        setTeams(prev => [...prev, newTeam]);
    };

    const handleDeleteTeam = (teamId: string) => {
        if (window.confirm("Möchten Sie dieses Team und alle Mitglieder daraus wirklich entfernen?")) {
            setTeams(prev => prev.filter(t => t.id !== teamId));
            setTeamMembers(prev => prev.filter(tm => tm.teamId !== teamId));
        }
    };

    const handleSaveClick = () => {
        onSave(teams, teamMembers);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70]">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-secondary">Teams bearbeiten</h2>
                        <p className="text-gray-500">{event.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><CloseIcon /></button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-4 -mx-4 px-4">
                    {teams.map(team => (
                        <div key={team.id} className="p-4 border rounded-lg bg-gray-50/50">
                            <div className="flex justify-between items-center gap-4 mb-3 border-b pb-2">
                                <input
                                    type="text"
                                    value={team.name}
                                    onChange={e => handleTeamNameChange(team.id, e.target.value)}
                                    className="p-2 border border-gray-300 rounded-md font-semibold text-lg flex-grow"
                                    aria-label="Teamname"
                                />
                                <button onClick={() => handleDeleteTeam(team.id)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0" aria-label={`Team ${team.name} löschen`}>
                                    <TrashIcon />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {teamMembers.filter(tm => tm.teamId === team.id).map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded shadow-sm">
                                        <span className="font-medium">{getParticipantName(member.participantId)}</span>
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`penalty-${member.id}`}
                                                    checked={member.penaltyMinus2}
                                                    onChange={e => handlePenaltyChange(member.id, e.target.checked)}
                                                    className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"
                                                />
                                                <label htmlFor={`penalty-${member.id}`} className="ml-2 text-sm text-gray-600">Penalty (-2 Pkt.)</label>
                                            </div>
                                            <button onClick={() => handleRemoveMember(member.id)} className="text-red-500 hover:text-red-700 p-1" aria-label="Mitglied entfernen">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => handleOpenParticipantSelection(team.id)} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-semibold py-1 px-2 rounded-lg border border-blue-600 flex items-center space-x-1 hover:bg-blue-50">
                                <UsersIcon className="w-4 h-4" /> <span>Mitglieder hinzufügen</span>
                            </button>
                        </div>
                    ))}
                </div>
                
                <div className="mt-4 flex-shrink-0">
                     <button onClick={handleAddNewTeam} className="text-primary hover:text-primary-dark font-semibold py-2 px-4 rounded-lg border border-primary flex items-center space-x-2 hover:bg-primary/10">
                        <PlusIcon className="w-5 h-5" /> <span>Neues Team hinzufügen</span>
                    </button>
                </div>

                <div className="flex justify-end space-x-4 mt-6 pt-4 border-t flex-shrink-0">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Abbrechen</button>
                    <button onClick={handleSaveClick} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Änderungen speichern</button>
                </div>
            </div>
            {isParticipantSelectionOpen && (
                 <ParticipantSelectionModal
                    onClose={() => setParticipantSelectionOpen(false)}
                    onAddParticipants={handleAddMembers}
                    allParticipants={allParticipants}
                    alreadySelectedIds={teamMembers.map(tm => tm.participantId)}
                />
            )}
        </div>
    );
};
