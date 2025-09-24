import React, { useState } from 'react';
import { Participant, PerfClass, Gender } from '../types';
import { CloseIcon } from './icons';

interface ParticipantFormModalProps {
    onClose: () => void;
    onSave: (participant: Participant) => void;
    participant: Participant;
}

export const ParticipantFormModal: React.FC<ParticipantFormModalProps> = ({ onClose, onSave, participant }) => {
    const [formData, setFormData] = useState<Participant>(participant);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveClick = () => {
        // Simple conversion for birthYear, ensuring it's a number
        const dataToSave = {
            ...formData,
            birthYear: Number(formData.birthYear)
        };
        onSave(dataToSave);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-secondary">Teilnehmer bearbeiten</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><CloseIcon /></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Vorname</label>
                            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Nachname</label>
                            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-Mail</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefon</label>
                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                             <label htmlFor="birthYear" className="block text-sm font-medium text-gray-700">Jahrgang</label>
                            <input type="number" id="birthYear" name="birthYear" value={formData.birthYear} onChange={handleChange} className="mt-1 p-2 border border-gray-300 rounded-md w-full" />
                        </div>
                        <div>
                            <label htmlFor="perfClass" className="block text-sm font-medium text-gray-700">Klasse</label>
                            <select id="perfClass" name="perfClass" value={formData.perfClass} onChange={handleChange} className="mt-1 p-2 border border-gray-300 rounded-md w-full">
                                {Object.values(PerfClass).map(pc => <option key={pc} value={pc}>Klasse {pc}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Geschlecht</label>
                            <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className="mt-1 p-2 border border-gray-300 rounded-md w-full">
                                <option value={Gender.Male}>Männlich</option>
                                <option value={Gender.Female}>Weiblich</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Abbrechen</button>
                    <button onClick={handleSaveClick} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Speichern</button>
                </div>
            </div>
        </div>
    );
};
