

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Participant, Event, Result, Team, TeamMember, Settings, View, EventType } from './types';
import { getMockParticipants, getMockEvents, getMockResults, getMockTeams, getMockTeamMembers, getInitialSettings } from './services/mockDataService';
import { calculateEventPoints } from './services/scoringService';
import { Standings } from './components/Standings';
import { ParticipantsList } from './components/ParticipantsList';
import { ParticipantImportModal } from './components/ParticipantImportModal';
import { EventsList } from './components/EventsList';
import { EventFormModal } from './components/EventFormModal';
import { NewSeasonModal } from './components/NewSeasonModal';
import { DashboardIcon, UsersIcon, CalendarIcon, ChartBarIcon, CogIcon } from './components/icons';

const Sidebar: React.FC<{ activeView: View; setView: (view: View) => void }> = ({ activeView, setView }) => {
  const navItems = [
    { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { view: 'participants', label: 'Teilnehmer', icon: <UsersIcon /> },
    { view: 'events', label: 'Events', icon: <CalendarIcon /> },
    { view: 'standings', label: 'Gesamtwertung', icon: <ChartBarIcon /> },
    { view: 'settings', label: 'Einstellungen', icon: <CogIcon /> },
  ] as const;

  return (
    <div className="w-64 bg-secondary text-white p-5 flex flex-col h-screen fixed">
      <h1 className="text-2xl font-bold text-white mb-10">
        Skinfit<span className="text-primary">Cup</span>
      </h1>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.view} className="mb-2">
              <button
                onClick={() => setView(item.view)}
                className={`w-full text-left flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 ${
                  activeView === item.view
                    ? 'bg-primary text-white font-semibold'
                    : 'hover:bg-gray-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};


const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<Settings>(getInitialSettings());
  
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [isNewSeasonModalOpen, setNewSeasonModalOpen] = useState(false);
  
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);

  const recalculateAllPoints = useCallback(() => {
    let allResultsUpdated = [...results];
    const finishedTimeTrialEvents = events.filter(e => e.finished && (e.eventType === EventType.EZF || e.eventType === EventType.BZF));
    
    for (const event of finishedTimeTrialEvents) {
      const eventResults = allResultsUpdated.filter(r => r.eventId === event.id);
      const updatedEventResults = calculateEventPoints(eventResults, participants, settings);
      
      allResultsUpdated = allResultsUpdated.map(r => {
        const updated = updatedEventResults.find(ur => ur.id === r.id);
        return updated || r;
      });
    }
    setResults(allResultsUpdated);
  }, [events, participants, results, settings]);


  useEffect(() => {
    const initialParticipants = getMockParticipants();
    const initialEvents = getMockEvents();
    const seasons = [...new Set(initialEvents.map(e => e.season))].sort((a, b) => b - a);

    setParticipants(initialParticipants);
    setEvents(initialEvents);
    setResults(getMockResults());
    setTeams(getMockTeams());
    setTeamMembers(getMockTeamMembers());
    setSettings(getInitialSettings());
    setAvailableSeasons(seasons);
    setSelectedSeason(seasons[0] || new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (participants.length > 0 && events.length > 0 && results.length > 0) {
      recalculateAllPoints();
    }
  }, [participants, events, settings, recalculateAllPoints]);
  
  const eventsForSeason = useMemo(() => {
    if (!selectedSeason) return [];
    return events.filter(e => e.season === selectedSeason);
  }, [events, selectedSeason]);

  const eventIdsForSeason = useMemo(() => new Set(eventsForSeason.map(e => e.id)), [eventsForSeason]);

  const resultsForSeason = useMemo(() => {
    return results.filter(r => eventIdsForSeason.has(r.eventId));
  }, [results, eventIdsForSeason]);
  
  const teamsForSeason = useMemo(() => {
    return teams.filter(t => eventIdsForSeason.has(t.eventId));
  }, [teams, eventIdsForSeason]);
  
  const teamIdsForSeason = useMemo(() => new Set(teamsForSeason.map(t => t.id)), [teamsForSeason]);

  const teamMembersForSeason = useMemo(() => {
    return teamMembers.filter(tm => teamIdsForSeason.has(tm.teamId));
  }, [teamMembers, teamIdsForSeason]);

  const handleImportParticipants = (importedParticipants: Omit<Participant, 'id'>[]) => {
    const existingEmails = new Map(participants.map(p => [p.email.toLowerCase(), p]));
    const newParticipants: Participant[] = [];
    const updatedParticipants = [...participants];

    importedParticipants.forEach(importedP => {
        const existingParticipant = existingEmails.get(importedP.email.toLowerCase());
        if (existingParticipant) {
            // Update existing participant
            const index = updatedParticipants.findIndex(p => p.id === existingParticipant.id);
            if(index !== -1) {
                updatedParticipants[index] = { ...existingParticipant, ...importedP };
            }
        } else {
            // Add new participant
            const newId = `p${Date.now()}${Math.random().toString(16).slice(2)}`;
            newParticipants.push({ ...importedP, id: newId });
        }
    });
    
    setParticipants([...updatedParticipants, ...newParticipants]);
    setImportModalOpen(false);
  };

  const handleOpenEventModal = (event?: Event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  const handleCloseEventModal = () => {
    setEditingEvent(undefined);
    setEventModalOpen(false);
  };

  const handleSaveEvent = (
      eventData: Omit<Event, 'id' | 'season'> & { id?: string },
      eventResults: Result[],
      eventTeams: Team[],
      eventTeamMembers: TeamMember[]
  ) => {
      const isEditing = !!eventData.id;
      const eventId = eventData.id || `e${Date.now()}`;

      const originalEvent = isEditing ? events.find(e => e.id === eventData.id) : null;
      const season = originalEvent ? originalEvent.season : selectedSeason!;
      
      // Construct the final event object with all required properties.
      const updatedEvent: Event = { ...eventData, id: eventId, season };

      if (isEditing) {
          setEvents(events.map(e => e.id === eventId ? updatedEvent : e));
      } else {
          setEvents([...events, updatedEvent]);
      }

      const finalEventResults = eventResults.map(r => ({ ...r, eventId }));
      const finalEventTeams = eventTeams.map(t => ({ ...t, eventId }));

      const otherResults = results.filter(r => r.eventId !== eventId);
      const otherTeams = teams.filter(t => t.eventId !== eventId);
      
      const oldTeamIdsForEvent = teams.filter(t => t.eventId === eventId).map(t => t.id);
      const otherTeamMembers = teamMembers.filter(tm => !oldTeamIdsForEvent.includes(tm.teamId));
      
      setResults([...otherResults, ...finalEventResults]);
      setTeams([...otherTeams, ...finalEventTeams]);
      setTeamMembers([...otherTeamMembers, ...eventTeamMembers]);
      
      handleCloseEventModal();
  };
  
  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm("Möchten Sie dieses Event und alle zugehörigen Ergebnisse wirklich löschen?")) {
        setEvents(events.filter(e => e.id !== eventId));
        setResults(results.filter(r => r.eventId !== eventId));
        const eventTeamIds = teams.filter(t => t.eventId === eventId).map(t => t.id);
        setTeams(teams.filter(t => t.eventId !== eventId));
        setTeamMembers(teamMembers.filter(tm => !eventTeamIds.includes(tm.teamId)));
    }
  };

  const handleCreateSeason = (year: number) => {
    if (!availableSeasons.includes(year)) {
        const updatedSeasons = [...availableSeasons, year].sort((a,b) => b-a);
        setAvailableSeasons(updatedSeasons);
        setSelectedSeason(year);
    }
    setNewSeasonModalOpen(false);
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <div className="text-gray-700">Willkommen beim Skinfit Cup! <br/>Verwaltungs- & Wertungsapp für die Saison <strong>{selectedSeason}</strong>. Wählen Sie einen Menüpunkt, um zu starten.</div>;
      case 'participants':
        return <ParticipantsList participants={participants} onOpenImportModal={() => setImportModalOpen(true)} />;
      case 'events':
        return <EventsList events={eventsForSeason} onNewEvent={() => handleOpenEventModal()} onEditEvent={handleOpenEventModal} onDeleteEvent={handleDeleteEvent} />;
      case 'standings':
        return <Standings participants={participants} events={eventsForSeason} results={resultsForSeason} settings={settings} />;
      case 'settings':
        return <div className="text-gray-700">Einstellungen (noch nicht implementiert).</div>;
      default:
        return <div>Wählen Sie eine Ansicht</div>;
    }
  };

  return (
    <div className="flex bg-light min-h-screen font-sans">
      <Sidebar activeView={view} setView={setView} />
      <main className="flex-1 ml-64 p-8">
         <div className="flex justify-between items-center mb-4">
            <div></div>
            <div className="flex items-center space-x-4">
                <label htmlFor="season-select" className="font-bold text-gray-700">Saison:</label>
                <select 
                    id="season-select"
                    value={selectedSeason || ''} 
                    onChange={e => setSelectedSeason(Number(e.target.value))}
                    className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Saison auswählen"
                >
                    {availableSeasons.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button 
                    onClick={() => setNewSeasonModalOpen(true)}
                    className="bg-secondary hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-transform transform hover:scale-105"
                >
                    <span>Neue Saison</span>
                </button>
            </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8 min-h-full">
            {renderView()}
        </div>
      </main>
      {isImportModalOpen && (
        <ParticipantImportModal
          onClose={() => setImportModalOpen(false)}
          onImport={handleImportParticipants}
          existingParticipants={participants}
          settings={settings}
        />
      )}
      {isEventModalOpen && (
        <EventFormModal
            onClose={handleCloseEventModal}
            onSave={handleSaveEvent}
            event={editingEvent}
            allParticipants={participants}
            eventResults={results.filter(r => r.eventId === editingEvent?.id)}
            eventTeams={teams.filter(t => t.eventId === editingEvent?.id)}
            eventTeamMembers={teamMembers.filter(tm => teams.some(t => t.id === tm.teamId && t.eventId === editingEvent?.id))}
        />
      )}
      {isNewSeasonModalOpen && (
        <NewSeasonModal
            onClose={() => setNewSeasonModalOpen(false)}
            onSave={handleCreateSeason}
            existingSeasons={availableSeasons}
        />
      )}
    </div>
  );
};

export default App;