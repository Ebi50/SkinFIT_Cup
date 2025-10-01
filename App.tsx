import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Participant, Event, Result, Team, TeamMember, Settings, View, EventType, PerfClass, Gender } from './types';
import { getMockParticipants, getMockEvents, getMockResults, getMockTeams, getMockTeamMembers, getInitialSettings } from './services/mockDataService';
import { calculatePointsForEvent } from './services/scoringService';
import { Standings } from './components/Standings';
import { ParticipantsList } from './components/ParticipantsList';
import { ParticipantImportModal } from './components/ParticipantImportModal';
import { ParticipantFormModal } from './components/ParticipantFormModal';
import { EventsList } from './components/EventsList';
import { EventFormModal, TeamEditModal } from './components/EventFormModal';
import { NewSeasonModal } from './components/NewSeasonModal';
import { DashboardIcon, UsersIcon, CalendarIcon, ChartBarIcon, CogIcon } from './components/icons';
import { SettingsView } from './components/SettingsView';
import { Dashboard } from './components/Dashboard';
import { EventDetailView } from './components/EventDetailView';

const Sidebar: React.FC<{ activeView: View; setView: (view: View) => void }> = ({ activeView, setView }) => {
  const navItems = [
    { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { view: 'participants', label: 'Teilnehmer', icon: <UsersIcon /> },
    { view: 'events', label: 'Events', icon: <CalendarIcon /> },
    { view: 'standings', label: 'Gesamtwertung', icon: <ChartBarIcon /> },
    { view: 'settings', label: 'Einstellungen', icon: <CogIcon /> },
  ] as const;

  const isDetailView = activeView === 'eventDetail';

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
                  activeView === item.view || (isDetailView && item.view === 'events')
                    ? 'bg-primary text-white font-semibold'
                    // Updated the hover color for better contrast and consistency.
                    : 'hover:bg-primary/20'
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

  const [isParticipantModalOpen, setParticipantModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | undefined>(undefined);
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // State for the new Team Edit Modal
  const [isTeamEditModalOpen, setTeamEditModalOpen] = useState(false);
  const [editingEventForTeams, setEditingEventForTeams] = useState<Event | null>(null);


  const recalculateAllPoints = useCallback(() => {
    setResults(currentResults => {
        const finishedEvents = events.filter(e => e.finished);
        if (finishedEvents.length === 0) return currentResults;

        const unfinishedEventIds = new Set(events.filter(e => !e.finished).map(e => e.id));
        let newResults = currentResults.filter(r => unfinishedEventIds.has(r.eventId));

        for (const event of finishedEvents) {
            const eventResults = currentResults.filter(r => r.eventId === event.id);
            
            const eventTeams = event.eventType === EventType.MZF ? teams.filter(t => t.eventId === event.id) : [];
            const eventTeamIds = new Set(eventTeams.map(t => t.id));
            const eventTeamMembers = event.eventType === EventType.MZF ? teamMembers.filter(tm => eventTeamIds.has(tm.teamId)) : [];

            const updatedEventResults = calculatePointsForEvent(
                event,
                eventResults,
                participants,
                eventTeams,
                eventTeamMembers,
                settings
            );
            newResults = [...newResults, ...updatedEventResults];
        }
        
        return newResults;
    });
  }, [events, participants, teams, teamMembers, settings]);


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

  // BUG FIX: Added `teams` and `teamMembers` to the dependency array.
  // This ensures that points are recalculated whenever team compositions change,
  // for example, after a participant is deleted.
  useEffect(() => {
    if (participants.length > 0 && events.length > 0) {
      recalculateAllPoints();
    }
  }, [participants, events, settings, teams, teamMembers, recalculateAllPoints]);
  
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

  const handleImportParticipants = useCallback((importedParticipants: Omit<Participant, 'id'>[]) => {
    const importedByEmail = new Map(
      importedParticipants.map(p => [p.email.toLowerCase(), p])
    );
  
    setParticipants(currentParticipants => {
        const existingEmails = new Set(currentParticipants.map(p => p.email.toLowerCase()));

        const updatedParticipants = currentParticipants.map(p => {
          const importedData = importedByEmail.get(p.email.toLowerCase());
          return importedData ? { ...p, ...importedData } : p;
        });
    
        const newParticipants: Participant[] = importedParticipants
          .filter(p => !existingEmails.has(p.email.toLowerCase()))
          .map(p => ({
            ...p,
            id: `p${Date.now()}${Math.random().toString(16).slice(2)}`,
          }));
        
        return [...updatedParticipants, ...newParticipants];
    });

    setImportModalOpen(false);
  }, []);

  const handleOpenEventModal = useCallback((event?: Event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  }, []);

  const handleCloseEventModal = useCallback(() => {
    setEditingEvent(undefined);
    setEventModalOpen(false);
  }, []);

  const handleSaveEvent = useCallback((
      eventData: Omit<Event, 'id' | 'season'> & { id?: string },
      eventResultsFromModal: Result[],
      eventTeamsFromModal: Team[],
      eventTeamMembersFromModal: TeamMember[]
  ) => {
      const isEditing = !!eventData.id;
      const eventId = eventData.id || `e${Date.now()}`;
  
      // Find the original season to preserve it
      const originalEvent = isEditing ? events.find(e => e.id === eventId) : null;
      const season = originalEvent ? originalEvent.season : selectedSeason!;
      
      // Construct the final event object that will be saved
      const finalEvent: Event = { 
          name: eventData.name,
          date: eventData.date,
          location: eventData.location,
          eventType: eventData.eventType,
          notes: eventData.notes,
          finished: eventData.finished,
          id: eventId, 
          season 
      };
  
      // CRITICAL FIX: Calculate points for the saved event immediately using the final event data.
      // This ensures that changes like setting 'finished' or updating a 'winnerRank' are
      // instantly reflected in the points before the state is updated.
      const calculatedResults = calculatePointsForEvent(
          finalEvent,
          eventResultsFromModal,
          participants,
          eventTeamsFromModal,
          eventTeamMembersFromModal,
          settings
      );
  
      // Now update all states with the final, calculated data
      setEvents(prevEvents => {
        return isEditing ? prevEvents.map(e => e.id === eventId ? finalEvent : e) : [...prevEvents, finalEvent];
      });
      
      const finalEventResults = calculatedResults.map(r => ({ ...r, eventId }));
      setResults(prevResults => [...prevResults.filter(r => r.eventId !== eventId), ...finalEventResults]);
      
      const oldTeamIdsForEvent = new Set(teams.filter(t => t.eventId === eventId).map(t => t.id));
  
      setTeams(prevTeams => {
          const teamsToKeep = prevTeams.filter(t => t.eventId !== eventId);
          const finalEventTeams = eventTeamsFromModal.map(t => ({ ...t, eventId }));
          return [...teamsToKeep, ...finalEventTeams];
      });
  
      setTeamMembers(prevMembers => {
        const membersToKeep = prevMembers.filter(tm => !oldTeamIdsForEvent.has(tm.teamId));
        return [...membersToKeep, ...eventTeamMembersFromModal];
      });
      
      handleCloseEventModal();
  }, [events, selectedSeason, participants, settings, teams, handleCloseEventModal]);
  
  const handleDeleteEvent = (eventId: string) => {
    if (!window.confirm("Möchten Sie dieses Event und alle zugehörigen Ergebnisse wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) {
      return;
    }

    setEvents(currentEvents => currentEvents.filter(e => e.id !== eventId));
    setResults(currentResults => currentResults.filter(r => r.eventId !== eventId));
    
    setTeams(currentTeams => {
        const teamIdsToDelete = new Set(
            currentTeams.filter(t => t.eventId === eventId).map(t => t.id)
        );

        if (teamIdsToDelete.size > 0) {
            setTeamMembers(currentTeamMembers =>
                currentTeamMembers.filter(tm => !teamIdsToDelete.has(tm.teamId))
            );
        }
        
        return currentTeams.filter(t => t.eventId !== eventId);
    });
  };

  const handleCreateSeason = useCallback((year: number) => {
    if (!availableSeasons.includes(year)) {
        const updatedSeasons = [...availableSeasons, year].sort((a,b) => b-a);
        setAvailableSeasons(updatedSeasons);
        setSelectedSeason(year);
    }
    setNewSeasonModalOpen(false);
  }, [availableSeasons]);

  const handleSettingsChange = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
  }, []);

  const handleOpenParticipantModal = useCallback((participant: Participant) => {
      setEditingParticipant(participant);
      setParticipantModalOpen(true);
  }, []);

  const handleOpenNewParticipantModal = useCallback(() => {
    const newParticipant: Participant = {
        id: `p${Date.now()}${Math.random().toString(16).slice(2)}`,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        birthYear: new Date().getFullYear() - 30,
        perfClass: PerfClass.B,
        gender: Gender.Male,
        isRsvMember: false,
    };
    setEditingParticipant(newParticipant);
    setParticipantModalOpen(true);
  }, []);


  const handleCloseParticipantModal = useCallback(() => {
      setEditingParticipant(undefined);
      setParticipantModalOpen(false);
  }, []);

  const handleSaveParticipant = useCallback((participantData: Participant) => {
      setParticipants(prevParticipants => {
          const exists = prevParticipants.some(p => p.id === participantData.id);
          if (exists) {
              return prevParticipants.map(p =>
                  p.id === participantData.id ? participantData : p
              );
          } else {
              return [...prevParticipants, participantData];
          }
      });
      handleCloseParticipantModal();
  }, [handleCloseParticipantModal]);

  const handleDeleteParticipant = (participantId: string) => {
      if (!window.confirm("Möchten Sie diesen Teilnehmer und alle zugehörigen Ergebnisse wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) {
          return;
      }
      setParticipants(currentParticipants =>
          currentParticipants.filter(p => p.id !== participantId)
      );
      setResults(currentResults =>
          currentResults.filter(r => r.participantId !== participantId)
      );
      setTeamMembers(currentTeamMembers =>
          currentTeamMembers.filter(tm => tm.participantId !== participantId)
      );
  };

  const handleViewEvent = useCallback((eventId: string) => {
      setSelectedEventId(eventId);
      setView('eventDetail');
  }, []);

  const handleBackToEventsList = useCallback(() => {
      setSelectedEventId(null);
      setView('events');
  }, []);
  
  const isNewParticipant = useMemo(() => {
      if (!editingParticipant) return false;
      return !participants.some(p => p.id === editingParticipant.id);
  }, [editingParticipant, participants]);

  // Handlers for the Team Edit Modal
  const handleOpenTeamEditModal = useCallback((eventId: string) => {
      const eventToEdit = events.find(e => e.id === eventId);
      if (eventToEdit) {
          setEditingEventForTeams(eventToEdit);
          setTeamEditModalOpen(true);
      }
  }, [events]);

  const handleCloseTeamEditModal = useCallback(() => {
      setEditingEventForTeams(null);
      setTeamEditModalOpen(false);
  }, []);

  const handleSaveTeamsAndMembers = useCallback((
      updatedTeamsForEvent: Team[],
      updatedTeamMembersForEvent: TeamMember[]
  ) => {
      if (!editingEventForTeams) return;
      const eventId = editingEventForTeams.id;
  
      const oldTeamIdsForEvent = new Set(teams.filter(t => t.eventId === eventId).map(t => t.id));
  
      setTeams(prev => [
          ...prev.filter(t => t.eventId !== eventId),
          ...updatedTeamsForEvent
      ]);
  
      setTeamMembers(prev => [
          ...prev.filter(tm => !oldTeamIdsForEvent.has(tm.teamId)),
          ...updatedTeamMembersForEvent
      ]);
  
      handleCloseTeamEditModal();
  }, [editingEventForTeams, teams, handleCloseTeamEditModal]);


  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard 
                  selectedSeason={selectedSeason} 
                  participants={participants}
                  events={eventsForSeason}
                />;
      case 'participants':
        return <ParticipantsList participants={participants} onOpenImportModal={() => setImportModalOpen(true)} onEditParticipant={handleOpenParticipantModal} onDeleteParticipant={handleDeleteParticipant} onNewParticipant={handleOpenNewParticipantModal} />;
      case 'events':
        return <EventsList events={eventsForSeason} onNewEvent={() => handleOpenEventModal()} onEditEvent={handleOpenEventModal} onDeleteEvent={handleDeleteEvent} onViewDetails={handleViewEvent} />;
      case 'standings':
        return <Standings participants={participants} events={eventsForSeason} results={resultsForSeason} settings={settings} />;
      case 'settings':
        return <SettingsView settings={settings} onSettingsChange={handleSettingsChange} />;
       case 'eventDetail': {
            const selectedEvent = events.find(e => e.id === selectedEventId);
            if (!selectedEvent) return <div>Event nicht gefunden. <button onClick={handleBackToEventsList} className="text-primary underline">Zurück zur Übersicht</button></div>;
            
            const eventResults = results.filter(r => r.eventId === selectedEventId);
            const eventTeams = teams.filter(t => t.eventId === selectedEventId);
            const eventTeamIds = new Set(eventTeams.map(t => t.id));
            const eventTeamMembers = teamMembers.filter(tm => eventTeamIds.has(tm.teamId));

            return <EventDetailView 
                        event={selectedEvent}
                        participants={participants}
                        results={eventResults}
                        teams={eventTeams}
                        teamMembers={eventTeamMembers}
                        settings={settings}
                        onBack={handleBackToEventsList}
                        onEditTeams={handleOpenTeamEditModal}
                    />;
        }
      default:
        return <div>Wählen Sie eine Ansicht</div>;
    }
  };

  return (
    <div className="flex bg-light min-h-screen font-sans">
      <div className="no-print">
        <Sidebar activeView={view} setView={setView} />
      </div>
      <main className="flex-1 ml-64 p-8">
         <div className="flex justify-between items-center mb-4 no-print">
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
      {isEventModalOpen && selectedSeason && (
        <EventFormModal
            onClose={handleCloseEventModal}
            onSave={handleSaveEvent}
            event={editingEvent}
            allParticipants={participants}
            eventResults={results.filter(r => r.eventId === editingEvent?.id)}
            eventTeams={teams.filter(t => t.eventId === editingEvent?.id)}
            eventTeamMembers={teamMembers.filter(tm => teams.some(t => t.id === tm.teamId && t.eventId === editingEvent?.id))}
            settings={settings}
            selectedSeason={selectedSeason}
        />
      )}
      {isNewSeasonModalOpen && (
        <NewSeasonModal
            onClose={() => setNewSeasonModalOpen(false)}
            onSave={handleCreateSeason}
            existingSeasons={availableSeasons}
        />
      )}
       {isParticipantModalOpen && editingParticipant && (
        <ParticipantFormModal
            onClose={handleCloseParticipantModal}
            onSave={handleSaveParticipant}
            participant={editingParticipant}
            isNew={isNewParticipant}
        />
      )}
      {isTeamEditModalOpen && editingEventForTeams && (
          <TeamEditModal
              event={editingEventForTeams}
              initialTeams={teams.filter(t => t.eventId === editingEventForTeams.id)}
              initialTeamMembers={teamMembers.filter(tm => teams.some(t => t.id === tm.teamId && t.eventId === editingEventForTeams.id))}
              allParticipants={participants}
              onClose={handleCloseTeamEditModal}
              onSave={handleSaveTeamsAndMembers}
          />
      )}
    </div>
  );
};

export default App;