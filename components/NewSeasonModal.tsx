
import React, { useState } from 'react';
import { CloseIcon } from './icons';

interface NewSeasonModalProps {
    onClose: () => void;
    onSave: (year: number) => void;
    existingSeasons: number[];
}

export const NewSeasonModal: React.FC<NewSeasonModalProps> = ({ onClose, onSave, existingSeasons }) => {
    const latestSeason = Math.max(...existingSeasons, new Date().getFullYear() - 1);
    const [year, setYear] = useState<string>((latestSeason + 1).toString());
    const [error, setError] = useState('');

    const handleSave = () => {
        const yearNum = parseInt(year, 10);
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            setError('Bitte geben Sie ein gültiges Jahr ein.');
            return;
        }
        if (existingSeasons.includes(yearNum)) {
            setError('Diese Saison existiert bereits.');
            return;
        }
        onSave(yearNum);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-secondary">Neue Saison erstellen</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><CloseIcon /></button>
                </div>
                
                <div className="space-y-4">
                    <label htmlFor="season-year" className="block text-sm font-medium text-gray-700">
                        Jahr der Saison
                    </label>
                    <input
                        type="number"
                        id="season-year"
                        value={year}
                        onChange={(e) => {
                            setYear(e.target.value);
                            setError('');
                        }}
                        className="p-2 border border-gray-300 rounded-md w-full"
                        placeholder="z.B. 2026"
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        Abbrechen
                    </button>
                    <button onClick={handleSave} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">
                        Erstellen
                    </button>
                </div>
            </div>
        </div>
    );
};
