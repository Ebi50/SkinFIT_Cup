import React, { useState, useMemo } from 'react';
import { Participant } from '../types';
import { CloseIcon, UsersIcon } from './icons';

interface ParticipantSelectionModalProps {
    onClose: () => void;
    onAddParticipants: (participantIds: string[]) => void;
    allParticipants: Participant[];
    alreadySelectedIds: string[];
}

export const ParticipantSelectionModal: React.FC<ParticipantSelectionModalProps> = ({
    onClose,
    onAddParticipants,
    allParticipants,
    alreadySelectedIds
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const availableParticipants = useMemo(() => {
        const alreadySelected = new Set(alreadySelectedIds);
        const searchTermLower = searchTerm.toLowerCase();

        return allParticipants
            .filter(p => !alreadySelected.has(p.id))
            .filter(p => {
                if (!searchTermLower) return true; // Show all if search is empty
                const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                const reversedFullName = `${p.lastName} ${p.firstName}`.toLowerCase();
                return fullName.includes(searchTermLower) || reversedFullName.includes(searchTermLower);
            })
            .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }, [allParticipants, alreadySelectedIds, searchTerm]);

    const handleToggle = (participantId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(participantId)) {
                newSet.delete(participantId);
            } else {
                newSet.add(participantId);
            }
            return newSet;
        });
    };
    
    const handleToggleAll = () => {
        if (selectedIds.size === availableParticipants.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(availableParticipants.map(p => p.id)));
        }
    }

    const handleAdd = () => {
        onAddParticipants(Array.from(selectedIds));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60]">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-secondary flex items-center space-x-2">
                        <UsersIcon />
                        <span>Teilnehmer auswählen</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <CloseIcon />
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Suchen nach Vor- oder Nachname..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                
                <div className="flex-grow overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-3">
                                    <input 
                                        type="checkbox"
                                        checked={availableParticipants.length > 0 && selectedIds.size === availableParticipants.length}
                                        onChange={handleToggleAll}
                                        className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"
                                    />
                                </th>
                                <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Name</th>
                                <th className="p-3 font-semibold text-sm text-gray-600 tracking-wider">Klasse</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                           {availableParticipants.map(p => (
                               <tr key={p.id} className="hover:bg-primary/10 cursor-pointer" onClick={() => handleToggle(p.id)}>
                                   <td className="p-3">
                                       <input
                                           type="checkbox"
                                           checked={selectedIds.has(p.id)}
                                           onChange={e => e.stopPropagation()} // Prevent row click from toggling twice
                                           className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"
                                       />
                                   </td>
                                   <td className="p-3 text-gray-800 font-medium">{p.lastName}, {p.firstName}</td>
                                   <td className="p-3 text-gray-700">{p.perfClass}</td>
                               </tr>
                           ))}
                            {availableParticipants.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-500">
                                        Keine weiteren Teilnehmer verfügbar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        Abbrechen
                    </button>
                    <button 
                        onClick={handleAdd} 
                        disabled={selectedIds.size === 0}
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {selectedIds.size} Teilnehmer hinzufügen
                    </button>
                </div>
            </div>
        </div>
    );
};