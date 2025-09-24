import React from 'react';
import { Settings } from '../types';
import { CogIcon } from './icons';

interface SettingsViewProps {
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsChange }) => {
  const handleWinnerPointsChange = (index: number, value: string) => {
    // If the input is empty, treat it as 0.
    if (value === '') {
      const newWinnerPoints = [...settings.winnerPoints];
      newWinnerPoints[index] = 0;
      onSettingsChange({ ...settings, winnerPoints: newWinnerPoints });
      return;
    }
    
    const points = parseInt(value, 10);
    // Validate that the input is a non-negative integer.
    // This prevents saving negative numbers or non-numeric input.
    if (!isNaN(points) && points >= 0) {
      const newWinnerPoints = [...settings.winnerPoints];
      newWinnerPoints[index] = points;
      onSettingsChange({ ...settings, winnerPoints: newWinnerPoints });
    }
  };

  const handleTTBonusChange = (
    key: 'aeroBars' | 'ttEquipment',
    field: 'enabled' | 'seconds',
    value: boolean | number
  ) => {
    const newBonuses = {
      ...settings.timeTrialBonuses,
      [key]: {
        ...settings.timeTrialBonuses[key],
        [field]: value,
      },
    };
    onSettingsChange({ ...settings, timeTrialBonuses: newBonuses });
  };

  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <CogIcon />
        <h1 className="text-3xl font-bold text-secondary">Einstellungen</h1>
      </div>
      <div className="space-y-8">
        {/* Time Trial Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-secondary mb-4 border-b pb-2">Zeitfahr-Wertung</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-md font-medium text-gray-700">Bonus-Punkte für Top-Platzierungen</label>
              <p className="text-sm text-gray-500 mb-2">Punkte, die zusätzlich zu den Platzierungspunkten vergeben werden (manuelle Zuweisung im Event).</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {settings.winnerPoints.map((points, index) => (
                  <div key={index}>
                    <label htmlFor={`winner-points-${index}`} className="block text-sm font-medium text-gray-600">{index + 1}. Platz</label>
                    <input
                      type="number"
                      id={`winner-points-${index}`}
                      value={points}
                      min="0" // Prevents using arrows to go below zero and shows browser validation
                      onChange={(e) => handleWinnerPointsChange(index, e.target.value)}
                      className="mt-1 p-2 w-full border border-gray-300 rounded-md"
                    />
                  </div>
                ))}
              </div>
            </div>
            <hr />
            <div>
              <label className="block text-md font-medium text-gray-700">Material-Handicap</label>
              <p className="text-sm text-gray-500 mb-2">Zeitstrafen für spezielle Ausrüstung bei Zeitfahren.</p>
              <div className="space-y-3">
                {/* Aero Bars */}
                <div className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="aero-bars-enabled"
                      checked={settings.timeTrialBonuses.aeroBars.enabled}
                      onChange={(e) => handleTTBonusChange('aeroBars', 'enabled', e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"
                    />
                    <label htmlFor="aero-bars-enabled" className="ml-3 block text-sm font-medium text-gray-800">Lenkeraufsatz</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={settings.timeTrialBonuses.aeroBars.seconds}
                      onChange={(e) => handleTTBonusChange('aeroBars', 'seconds', parseInt(e.target.value, 10) || 0)}
                      className="w-20 p-1 border border-gray-300 rounded-md text-sm"
                      disabled={!settings.timeTrialBonuses.aeroBars.enabled}
                    />
                    <span className="text-sm text-gray-600">Sekunden</span>
                  </div>
                </div>
                {/* TT Equipment */}
                <div className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                   <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="tt-equipment-enabled"
                      checked={settings.timeTrialBonuses.ttEquipment.enabled}
                      onChange={(e) => handleTTBonusChange('ttEquipment', 'enabled', e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary-dark border-gray-300 rounded"
                    />
                    <label htmlFor="tt-equipment-enabled" className="ml-3 block text-sm font-medium text-gray-800">Weiteres Zeitfahrmaterial</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={settings.timeTrialBonuses.ttEquipment.seconds}
                      onChange={(e) => handleTTBonusChange('ttEquipment', 'seconds', parseInt(e.target.value, 10) || 0)}
                      className="w-20 p-1 border border-gray-300 rounded-md text-sm"
                      disabled={!settings.timeTrialBonuses.ttEquipment.enabled}
                    />
                    <span className="text-sm text-gray-600">Sekunden</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Other Settings Sections can be added here */}
      </div>
    </div>
  );
};