import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Participant, Event, Result, Team, TeamMember, Settings, View, EventType } from './types';
import { getMockParticipants, getMockEvents, getMockResults, getMockTeams, getMockTeamMembers, getInitialSettings } from './services/mockDataService';
import { calculatePointsForEvent } from './services/scoringService';
import { Standings } from './components/Standings';
import { ParticipantsList } from './components/ParticipantsList';
import { ParticipantImportModal } from './components/ParticipantImportModal';
import { ParticipantFormModal } from './components/ParticipantFormModal';
import { EventsList } from './components/EventsList';
import { EventFormModal } from './components/EventFormModal';
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

  useEffect(() => {
    if (participants.length > 0 && events.length > 0) {
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
      // FIX: The intermediate plainEventData object was removed because spreading the complex
      // intersection type of eventData was causing TypeScript to lose type information,
      // resulting in an 'unknown' type. Using eventData directly solves the issue.
      const isEditing = !!eventData.id;
      const eventId = eventData.id || `e${Date.now()}`;

      // 1. Update Events state
      setEvents(prevEvents => {
        const originalEvent = isEditing ? prevEvents.find(e => e.id === eventId) : null;
        const season = originalEvent ? originalEvent.season : selectedSeason!;
        
        const updatedEvent: Event = { 
            name: eventData.name,
            date: eventData.date,
            location: eventData.location,
            eventType: eventData.eventType,
            notes: eventData.notes,
            finished: eventData.finished,
            id: eventId, 
            season 
        };

        if (isEditing) {
            return prevEvents.map(e => e.id === eventId ? updatedEvent : e);
        } else {
            return [...prevEvents, updatedEvent];
        }
      });
      
      // 2. Update Results state
      const finalEventResults = eventResults.map(r => ({ ...r, eventId }));
      setResults(prevResults => [...prevResults.filter(r => r.eventId !== eventId), ...finalEventResults]);
      
      // 3. Update Teams and Team Members state.
      // We must remove all old teams AND their members for this event, then add the new ones.
      const oldTeamIdsForEvent = new Set(teams.filter(t => t.eventId === eventId).map(t => t.id));
      
      setTeamMembers(prevMembers => [
          ...prevMembers.filter(tm => !oldTeamIdsForEvent.has(tm.teamId)),
          ...eventTeamMembers
      ]);

      setTeams(prevTeams => {
          const finalEventTeams = eventTeams.map(t => ({ ...t, eventId }));
          return [...prevTeams.filter(t => t.eventId !== eventId), ...finalEventTeams];
      });
      
      handleCloseEventModal();
  };
  
  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm("Möchten Sie dieses Event und alle zugehörigen Ergebnisse wirklich löschen?")) {
        // To correctly remove all data related to an event, we must update several parts of the state.
        // We use functional updates (`setState(prevState => ...)`) for safety.

        // First, we need to find all teams associated with this event, because we need to
        // delete their members as well. We do this before scheduling the state updates.
        // This is safe because this handler is recreated on every render, capturing the current `teams` state.
        const teamIdsForEventToDelete = new Set(teams.filter(t => t.eventId === eventId).map(t => t.id));

        // 1. Remove the event itself.
        setEvents(currentEvents => 
            currentEvents.filter(e => e.id !== eventId)
        );

        // 2. Remove all results for the event.
        setResults(currentResults => 
            currentResults.filter(r => r.eventId !== eventId)
        );

        // 3. Remove all teams for the event.
        setTeams(currentTeams => 
            currentTeams.filter(t => t.eventId !== eventId)
        );

        // 4. Remove all team members who were in the teams associated with the event.
        setTeamMembers(currentTeamMembers => 
            currentTeamMembers.filter(tm => !teamIdsForEventToDelete.has(tm.teamId))
        );
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

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings);
  };

    const handleOpenParticipantModal = (participant: Participant) => {
        setEditingParticipant(participant);
        setParticipantModalOpen(true);
    };

    const handleCloseParticipantModal = () => {
        setEditingParticipant(undefined);
        setParticipantModalOpen(false);
    };

    const handleSaveParticipant = (participantData: Participant) => {
        setParticipants(prevParticipants => 
            prevParticipants.map(p => 
                p.id === participantData.id ? participantData : p
            )
        );
        handleCloseParticipantModal();
    };

    const handleDeleteParticipant = (participantId: string) => {
        if (window.confirm("Möchten Sie diesen Teilnehmer und alle zugehörigen Ergebnisse wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) {
            // Using functional updates to ensure we're always working with the latest state.
            // This is a robust way to handle state updates in React.

            // 1. Remove the participant from the main list.
            setParticipants(currentParticipants => 
                currentParticipants.filter(p => p.id !== participantId)
            );

            // 2. Remove all results associated with this participant.
            setResults(currentResults => 
                currentResults.filter(r => r.participantId !== participantId)
            );

            // 3. Remove the participant from any teams they were a member of.
            setTeamMembers(currentTeamMembers => 
                currentTeamMembers.filter(tm => tm.participantId !== participantId)
            );
        }
    };

    const handleViewEvent = (eventId: string) => {
        setSelectedEventId(eventId);
        setView('eventDetail');
    };

    const handleBackToEventsList = () => {
        setSelectedEventId(null);
        setView('events');
    };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard selectedSeason={selectedSeason} />;
      case 'participants':
        return <ParticipantsList participants={participants} onOpenImportModal={() => setImportModalOpen(true)} onEditParticipant={handleOpenParticipantModal} onDeleteParticipant={handleDeleteParticipant} />;
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
                    />;
        }
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
        />
      )}
    </div>
  );
};

export default App;
