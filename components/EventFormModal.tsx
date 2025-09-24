import React, { useState } from 'react';
import { Event, Participant, Result, Team, TeamMember, EventType } from '../types';
import { CloseIcon, PlusIcon, TrashIcon, UsersIcon } from './icons';
import { ParticipantSelectionModal } from './ParticipantSelectionModal';

interface EventFormModalProps {
    onClose: () => void;
    onSave: (event: Omit<Event, 'id' | 'season'> & { id?: string }, results: Result[], teams: Team[], teamMembers: TeamMember[]) => void;
    event?: Event;
    allParticipants: Participant[];
    eventResults: Result[];
    eventTeams: Team[];
    eventTeamMembers: TeamMember[];
}

const generateId = () => `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const EventFormModal: React.FC<EventFormModalProps> = ({
    onClose, onSave, event, allParticipants, eventResults, eventTeams, eventTeamMembers
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
        }));
        setResults(prev => [...prev, ...newResults]);
    };
    
    const handleResultChange = (resultId: string, field: keyof Result, value: any) => {
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
            timeSeconds: 0,
        };
        setTeams(prev => [...prev, newTeam]);
    };

    const handleTeamChange = (teamId: string, field: keyof Team, value: any) => {
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, [field]: value } : t));
    };

    const handleRemoveTeam = (teamId: string) => {
        setTeams(prev => prev.filter(t => t.id !== teamId));
        setTeamMembers(prev => prev.filter(tm => tm.teamId !== teamId));
    };

    const handleAddTeamMember = (teamId: string) => {
        const teamMemberIds = teamMembers.map(tm => tm.participantId);
        const availableParticipants = allParticipants.filter(p => !teamMemberIds.includes(p.id));
        if (availableParticipants.length > 0) {
            const newMember: TeamMember = {
                id: generateId(),
                teamId,
                participantId: availableParticipants[0].id,
                penaltyMinus2: false,
            };
            setTeamMembers(prev => [...prev, newMember]);
        }
    };
    
    const handleTeamMemberChange = (memberId: string, field: keyof TeamMember, value: any) => {
        setTeamMembers(prev => prev.map(tm => tm.id === memberId ? { ...tm, [field]: value } : tm));
    };

    const handleRemoveTeamMember = (memberId: string) => {
        setTeamMembers(prev => prev.filter(tm => tm.id !== memberId));
    };

    const handleSaveClick = () => {
        const eventId = event?.id;
        // Ensure all entities have the correct eventId
        const finalResults = results.map(r => ({...r, eventId: eventId || ''}));
        const finalTeams = teams.map(t => ({...t, eventId: eventId || ''}));

        onSave({ ...formData, id: eventId }, finalResults, finalTeams, teamMembers);
    };
    
    const getParticipantName = (id: string) => {
        const p = allParticipants.find(p => p.id === id);
        return p ? `${p.lastName}, ${p.firstName}` : 'Unbekannt';
    }

    const renderResultsEditor = () => {
        const isHandicap = formData.eventType === EventType.Handicap;
        const isTimeTrial = formData.eventType === EventType.EZF || formData.eventType === EventType.BZF;
        const currentParticipantIds = new Set(results.map(r => r.participantId));
        const usedWinnerRanks = new Set(results.map(r => r.winnerRank).filter(Boolean));
        const winnerRanks: (1 | 2 | 3)[] = [1, 2, 3];

        return (
            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Ergebnisse</h3>
                {results.map(result => {
                    const participantsForDropdown = allParticipants
                        .filter(p => !currentParticipantIds.has(p.id) || p.id === result.participantId)
                        .sort((a,b) => a.lastName.localeCompare(b.lastName));
                    
                    return (
                        <div key={result.id} className="grid grid-cols-12 gap-2 items-center mb-2 p-2 bg-gray-50 rounded">
                            <div className="col-span-4">
                                <select
                                    value={result.participantId}
                                    onChange={(e) => handleResultChange(result.id, 'participantId', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                >
                                    {participantsForDropdown.map(p => <option key={p.id} value={p.id}>{getParticipantName(p.id)}</option>)}
                                </select>
                            </div>
                            <div className={isTimeTrial ? "col-span-2" : "col-span-5"}>
                                <input
                                    type="number"
                                    placeholder={isHandicap ? "Gruppe" : "Zeit (sek)"}
                                    value={isHandicap ? result.finisherGroup || '' : result.timeSeconds || ''}
                                    onChange={(e) => handleResultChange(result.id, isHandicap ? 'finisherGroup' : 'timeSeconds', parseInt(e.target.value) || undefined)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            {isTimeTrial && (
                                <div className="col-span-3">
                                    <select
                                        value={result.winnerRank || 0}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            handleResultChange(result.id, 'winnerRank', val === 0 ? undefined : val);
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value={0}>Kein Bonus</option>
                                        {winnerRanks.map(rank => (
                                            <option 
                                                key={rank} 
                                                value={rank}
                                                disabled={usedWinnerRanks.has(rank) && result.winnerRank !== rank}
                                            >
                                                {rank}. Platz (+{4-rank} Pkt)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="col-span-2 flex items-center">
                                 <input
                                    type="checkbox"
                                    id={`dnf-${result.id}`}
                                    checked={result.dnf}
                                    onChange={(e) => handleResultChange(result.id, 'dnf', e.target.checked)}
                                    className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"
                                />
                                <label htmlFor={`dnf-${result.id}`} className="ml-2 block text-sm text-gray-900">DNF</label>
                            </div>
                            <div className="col-span-1 text-right">
                               <button onClick={() => handleRemoveResult(result.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon/></button>
                            </div>
                        </div>
                    );
                })}
                <button onClick={() => setParticipantSelectionOpen(true)} className="text-primary hover:text-primary-dark font-semibold py-2 px-4 rounded-lg border border-primary flex items-center space-x-2">
                    <PlusIcon className="w-5 h-5"/> <span>Teilnehmer hinzufügen</span>
                </button>
            </div>
        );
    };

    const renderTeamEditor = () => {
        return (
            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Teams & Ergebnisse</h3>
                {teams.map(team => {
                    const currentTeamMembers = teamMembers.filter(tm => tm.teamId === team.id);
                    const assignedParticipantIds = teamMembers.map(tm => tm.participantId);
                    const availableParticipants = allParticipants.filter(p => !assignedParticipantIds.includes(p.id));

                    return (
                        <div key={team.id} className="mb-4 p-4 border border-gray-200 rounded-lg">
                            <div className="grid grid-cols-3 gap-4 items-center mb-3">
                                <input
                                    type="text"
                                    value={team.name}
                                    onChange={e => handleTeamChange(team.id, 'name', e.target.value)}
                                    className="col-span-1 p-2 border border-gray-300 rounded-md"
                                />
                                <input
                                    type="number"
                                    placeholder="Zeit (sek)"
                                    value={team.timeSeconds || ''}
                                    onChange={e => handleTeamChange(team.id, 'timeSeconds', parseInt(e.target.value) || 0)}
                                    className="col-span-1 p-2 border border-gray-300 rounded-md"
                                />
                                <div className="col-span-1 text-right">
                                    <button onClick={() => handleRemoveTeam(team.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon/></button>
                                </div>
                            </div>
                            
                            <h4 className="text-sm font-semibold text-gray-600 mb-2 ml-1">Teammitglieder</h4>
                            {currentTeamMembers.map(member => (
                                <div key={member.id} className="grid grid-cols-12 gap-2 items-center mb-1">
                                    <div className="col-span-6">
                                        <select
                                            value={member.participantId}
                                            onChange={(e) => handleTeamMemberChange(member.id, 'participantId', e.target.value)}
                                            className="w-full p-2 text-sm border border-gray-300 rounded-md"
                                        >
                                            <option value={member.participantId}>{getParticipantName(member.participantId)}</option>
                                            {availableParticipants.map(p => <option key={p.id} value={p.id}>{getParticipantName(p.id)}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-5 flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`penalty-${member.id}`}
                                            checked={member.penaltyMinus2}
                                            onChange={(e) => handleTeamMemberChange(member.id, 'penaltyMinus2', e.target.checked)}
                                            className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"
                                        />
                                        <label htmlFor={`penalty-${member.id}`} className="ml-2 block text-sm text-gray-900">Penalty (-2)</label>
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <button onClick={() => handleRemoveTeamMember(member.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                             <button onClick={() => handleAddTeamMember(team.id)} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold py-1 px-2 rounded-lg border border-blue-600 flex items-center space-x-1">
                                <UsersIcon className="w-4 h-4"/> <span>Mitglied hinzufügen</span>
                            </button>
                        </div>
                    );
                })}
                <button onClick={handleAddTeam} className="text-primary hover:text-primary-dark font-semibold py-2 px-4 rounded-lg border border-primary flex items-center space-x-2">
                    <PlusIcon className="w-5 h-5"/> <span>Team hinzufügen</span>
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
                     <textarea name="notes" value={formData.notes} onChange={handleFormChange} placeholder="Notizen" className="p-2 border border-gray-300 rounded-md w-full h-24" />
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
                    onClose={() => setParticipantSelectionOpen(false)}
                    onAddParticipants={handleAddParticipants}
                    allParticipants={allParticipants}
                    alreadySelectedIds={results.map(r => r.participantId)}
                />
            )}
        </div>
    );
};