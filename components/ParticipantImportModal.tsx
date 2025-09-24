
import React, { useState, useCallback, useMemo } from 'react';
import { Participant, Settings, PerfClass, Gender, GroupLabel } from '../types';
import { CloseIcon, UploadIcon } from './icons';

// Make PapaParse and XLSX available from the global scope
declare const Papa: any;
declare const XLSX: any;

interface ParticipantImportModalProps {
  onClose: () => void;
  onImport: (participants: Omit<Participant, 'id'>[]) => void;
  existingParticipants: Participant[];
  settings: Settings;
}

type ParticipantKey = keyof Omit<Participant, 'id'>;

const PARTICIPANT_FIELDS: { key: ParticipantKey; label: string }[] = [
  { key: 'firstName', label: 'Vorname' },
  { key: 'lastName', label: 'Nachname' },
  { key: 'email', label: 'E-Mail' },
  { key: 'phone', label: 'Telefon' },
  { key: 'birthYear', label: 'Geburtsjahr' },
  { key: 'perfClass', label: 'Klasse (A/B/C/D)' },
  { key: 'gender', label: 'Geschlecht (m/w)' },
  { key: 'isRsvMember', label: 'RSV Mitglied (ja/nein)' },
  { key: 'club', label: 'Verein' },
  { key: 'startNumber', label: 'Startnummer' },
  { key: 'nationality', label: 'Nationalität' },
];

// Additional fields that can come from the CSV
const EXTRA_CSV_FIELDS = [{ key: 'group', label: 'Gruppe (Hobby/Ambitioniert/Frauen)' }];

const ALL_MAPPABLE_FIELDS = [...PARTICIPANT_FIELDS, ...EXTRA_CSV_FIELDS];

export const ParticipantImportModal: React.FC<ParticipantImportModalProps> = ({ onClose, onImport, existingParticipants, settings }) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');

  const existingEmails = useMemo(() => new Set(existingParticipants.map(p => p.email.toLowerCase())), [existingParticipants]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      
      const processData = (parsedData: Record<string, any>[], fields: string[]) => {
         // Convert all values to strings to match PapaParse behavior
         const stringData = parsedData.map(row => 
            Object.entries(row).reduce((acc, [key, value]) => {
                acc[key] = String(value ?? '');
                return acc;
            }, {} as Record<string, string>)
        );
        
        setHeaders(fields);
        setData(stringData);

        // Auto-mapping
        const newMapping: Record<string, string> = {};
        fields.forEach((header: string) => {
          const lowerHeader = header.toLowerCase();
          const foundField = ALL_MAPPABLE_FIELDS.find(f => lowerHeader.includes(f.label.toLowerCase().split(' ')[0]));
          if (foundField) {
            newMapping[header] = foundField.key;
          }
        });
        setMapping(newMapping);
      };

      if (selectedFile.name.endsWith('.csv')) {
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
              if (results.errors.length) {
                setError('Fehler beim Parsen der CSV-Datei.');
                return;
              }
              processData(results.data, results.meta.fields);
            },
          });
      } else if (selectedFile.name.endsWith('.xlsx')) {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const fileData = e.target?.result;
                  const workbook = XLSX.read(fileData, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[sheetName];
                  const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                  if (jsonData.length === 0) {
                      setError('Die Excel-Datei ist leer oder hat keine Kopfzeile.');
                      return;
                  }
                  
                  const fields = Object.keys(jsonData[0]);
                  processData(jsonData, fields);

              } catch (err) {
                  console.error(err);
                  setError('Fehler beim Parsen der Excel-Datei.');
              }
          };
          reader.onerror = () => setError('Fehler beim Lesen der Datei.');
          reader.readAsArrayBuffer(selectedFile);
      } else {
          setError('Bitte eine .csv oder .xlsx Datei auswählen.');
      }
    }
  };

  const handleMappingChange = (header: string, fieldKey: string) => {
    setMapping(prev => ({ ...prev, [header]: fieldKey }));
  };

  const processAndImport = useCallback(() => {
    const emailField = Object.keys(mapping).find(h => mapping[h] === 'email');
    if (!emailField) {
      setError('E-Mail-Spalte muss zugewiesen werden.');
      return;
    }

    const importedParticipants = data.map(row => {
        let perfClass = row[Object.keys(mapping).find(h => mapping[h] === 'perfClass') || '']?.toUpperCase();
        let gender = row[Object.keys(mapping).find(h => mapping[h] === 'gender') || '']?.toLowerCase();
        const group = row[Object.keys(mapping).find(h => mapping[h] === 'group') || ''];
        
        const isRsvMemberRaw = row[Object.keys(mapping).find(h => mapping[h] === 'isRsvMember') || '']?.toLowerCase() || '';
        const isRsvMember = ['ja', 'yes', 'true', '1'].includes(isRsvMemberRaw);

        // Group mapping logic from spec
        if (group?.toLowerCase().includes('frau')) {
            gender = Gender.Female;
        } else if (group?.toLowerCase().includes('hobby')) {
            perfClass = settings.defaultGroupMapping.hobby;
        } else if (group?.toLowerCase().includes('ambitioniert')) {
            perfClass = settings.defaultGroupMapping.ambitious;
        }

        return {
            firstName: row[Object.keys(mapping).find(h => mapping[h] === 'firstName') || ''] || '',
            lastName: row[Object.keys(mapping).find(h => mapping[h] === 'lastName') || ''] || '',
            email: row[emailField] || '',
            phone: row[Object.keys(mapping).find(h => mapping[h] === 'phone') || ''] || '',
            birthYear: parseInt(row[Object.keys(mapping).find(h => mapping[h] === 'birthYear') || ''], 10) || 0,
            perfClass: (Object.values(PerfClass).includes(perfClass as PerfClass) ? perfClass : PerfClass.B) as PerfClass,
            gender: (gender === 'm' || gender === 'w' ? gender : Gender.Male) as Gender,
            isRsvMember: isRsvMember,
            club: row[Object.keys(mapping).find(h => mapping[h] === 'club') || ''] || undefined,
            startNumber: row[Object.keys(mapping).find(h => mapping[h] === 'startNumber') || ''] || undefined,
            nationality: row[Object.keys(mapping).find(h => mapping[h] === 'nationality') || ''] || undefined,
        };
    }).filter(p => p.email); // Must have an email

    onImport(importedParticipants);
  }, [data, mapping, onImport, settings]);

  const previewData = useMemo(() => {
    return data.slice(0, 5).map(row => {
        const emailField = Object.keys(mapping).find(h => mapping[h] === 'email');
        const email = emailField ? row[emailField]?.toLowerCase() : '';
        const isUpdate = email ? existingEmails.has(email) : false;
        return { row, isUpdate };
    });
  }, [data, mapping, existingEmails]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-secondary">Teilnehmer importieren</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <CloseIcon />
          </button>
        </div>

        {/* Step 1: File Upload */}
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">1. CSV- oder Excel-Datei auswählen</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                            <span>Datei hochladen</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv,.xlsx" />
                        </label>
                        <p className="pl-1">oder per Drag & Drop</p>
                    </div>
                    <p className="text-xs text-gray-500">{file ? file.name : 'CSV oder XLSX bis 10MB'}</p>
                </div>
            </div>
        </div>
        
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {data.length > 0 && (
          <>
            {/* Step 2: Mapping */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">2. Spalten zuordnen</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {headers.map(header => (
                  <div key={header}>
                    <label className="block text-sm font-bold text-gray-600 truncate" title={header}>{header}</label>
                    <select
                      value={mapping[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                    >
                      <option value="">-- Nicht importieren --</option>
                      {ALL_MAPPABLE_FIELDS.map(field => (
                        <option key={field.key} value={field.key}>{field.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Preview */}
            <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-2">3. Vorschau</h3>
                <p className="text-sm text-gray-600 mb-2">Es werden {data.length} Zeilen importiert. <span className="text-yellow-600 font-semibold">Gelb markierte</span> Zeilen aktualisieren bestehende Teilnehmer (basierend auf E-Mail).</p>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>{headers.map(h => <th key={h} className="p-2 text-left font-medium text-gray-500 truncate">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {previewData.map(({row, isUpdate}, index) => (
                                <tr key={index} className={isUpdate ? 'bg-yellow-100' : ''}>
                                    {headers.map(h => <td key={h} className="p-2 text-gray-700 truncate">{row[h]}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">
                Abbrechen
              </button>
              <button onClick={processAndImport} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">
                {data.length} Teilnehmer importieren
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};