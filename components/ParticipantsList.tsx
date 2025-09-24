
import React from 'react';
import { Participant, Gender, PerfClass } from '../types';
import { UploadIcon, UsersIcon, PencilIcon, TrashIcon, CheckIcon } from './icons';

interface ParticipantsListProps {
  participants: Participant[];
  onOpenImportModal: () => void;
  onEditParticipant: (participant: Participant) => void;
  onDeleteParticipant: (participantId: string) => void;
}

const getGenderLabel = (gender: Gender) => (gender === Gender.Male ? 'Männlich' : 'Weiblich');
const getPerfClassLabel = (perfClass: PerfClass) => `Klasse ${perfClass}`;

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants, onOpenImportModal, onEditParticipant, onDeleteParticipant }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <UsersIcon />
          <h1 className="text-3xl font-bold text-secondary">Teilnehmer</h1>
        </div>
        <button
          onClick={onOpenImportModal}
          className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-transform transform hover:scale-105"
        >
          <UploadIcon className="w-5 h-5" />
          <span>Importieren</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Name</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Verein</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Startnr.</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Nation</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Jahrgang</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Klasse</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Geschlecht</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider text-center">RSV Mitglied</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Telefon</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">E-Mail</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-primary/10">
                  <td className="p-4 text-gray-800 font-medium">{p.lastName}, {p.firstName}</td>
                  <td className="p-4 text-gray-700">{p.club || '-'}</td>
                  <td className="p-4 text-gray-700">{p.startNumber || '-'}</td>
                  <td className="p-4 text-gray-700">{p.nationality || '-'}</td>
                  <td className="p-4 text-gray-700">{p.birthYear}</td>
                  <td className="p-4 text-gray-700">{getPerfClassLabel(p.perfClass)}</td>
                  <td className="p-4 text-gray-700">{getGenderLabel(p.gender)}</td>
                  <td className="p-4 text-center">
                    {p.isRsvMember ? <CheckIcon className="w-6 h-6 text-primary mx-auto" /> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-4 text-gray-500">{p.phone}</td>
                  <td className="p-4 text-gray-500">{p.email}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => onEditParticipant(p)} className="text-blue-600 hover:text-blue-800 p-2" aria-label={`Teilnehmer ${p.firstName} ${p.lastName} bearbeiten`}>
                        <PencilIcon />
                    </button>
                    <button onClick={() => onDeleteParticipant(p.id)} className="text-red-600 hover:text-red-800 p-2 ml-2" aria-label={`Teilnehmer ${p.firstName} ${p.lastName} löschen`}>
                        <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-4 text-center text-gray-500">
                    Keine Teilnehmer vorhanden. Starten Sie mit dem Import.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};