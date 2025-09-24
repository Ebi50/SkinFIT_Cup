
import { Participant, Event, Result, Team, TeamMember, Settings, EventType, PerfClass, Gender } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const getMockParticipants = (): Participant[] => [
  { id: 'p1', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', phone: '12345', birthYear: 1985, perfClass: PerfClass.C, gender: Gender.Male },
  { id: 'p2', firstName: 'Erika', lastName: 'Musterfrau', email: 'erika@example.com', phone: '67890', birthYear: 1990, perfClass: PerfClass.B, gender: Gender.Female },
  { id: 'p3', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '54321', birthYear: 1992, perfClass: PerfClass.A, gender: Gender.Male },
  { id: 'p4', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '09876', birthYear: 1988, perfClass: PerfClass.D, gender: Gender.Male },
  { id: 'p5', firstName: 'Peter', lastName: 'Jones', email: 'peter@example.com', phone: '11223', birthYear: 1995, perfClass: PerfClass.B, gender: Gender.Male },
  { id: 'p6', firstName: 'Maria', lastName: 'Garcia', email: 'maria@example.com', phone: '44556', birthYear: 1993, perfClass: PerfClass.C, gender: Gender.Female },
];

export const getMockEvents = (): Event[] => [
  { id: 'e1', name: 'Saison-Auftakt EZF', date: '2025-04-15', location: 'Teststrecke Nord', eventType: EventType.EZF, notes: 'Erstes Rennen der Saison', finished: true, season: 2025 },
  { id: 'e2', name: 'Bergkaiser BZF', date: '2025-05-20', location: 'Alpenpass', eventType: EventType.BZF, notes: 'Anspruchsvoller Anstieg', finished: true, season: 2025 },
  { id: 'e3', name: 'Team-Challenge MZF', date: '2025-06-10', location: 'Rundkurs Süd', eventType: EventType.MZF, notes: '4er-Teams', finished: false, season: 2025 },
  { id: 'e4', name: 'Sommer-Handicap', date: '2025-07-22', location: 'Flachland-Kurs', eventType: EventType.Handicap, notes: '', finished: false, season: 2025 },
];

export const getMockResults = (): Result[] => [
    // Event 1: EZF
    { id: generateId(), eventId: 'e1', participantId: 'p1', timeSeconds: 1820, dnf: false, points: 0 }, // C
    { id: generateId(), eventId: 'e1', participantId: 'p2', timeSeconds: 1950, dnf: false, points: 0 }, // B, w
    { id: generateId(), eventId: 'e1', participantId: 'p3', timeSeconds: 1900, dnf: false, points: 0 }, // A
    { id: generateId(), eventId: 'e1', participantId: 'p4', timeSeconds: 1810, dnf: false, points: 0 }, // D
    { id: generateId(), eventId: 'e1', participantId: 'p5', timeSeconds: 1910, dnf: false, points: 0 }, // B
    { id: generateId(), eventId: 'e1', participantId: 'p6', timeSeconds: 2000, dnf: false, points: 0 }, // C, w
    // Event 2: BZF
    { id: generateId(), eventId: 'e2', participantId: 'p1', timeSeconds: 2500, dnf: false, points: 0 },
    { id: generateId(), eventId: 'e2', participantId: 'p2', timeSeconds: 2800, dnf: false, points: 0 },
    { id: generateId(), eventId: 'e2', participantId: 'p4', timeSeconds: 2450, dnf: false, points: 0 },
    { id: generateId(), eventId: 'e2', participantId: 'p5', timeSeconds: 2750, dnf: false, points: 0 },
];

export const getMockTeams = (): Team[] => [];
export const getMockTeamMembers = (): TeamMember[] => [];

export const getInitialSettings = (): Settings => ({
  timeTrialBonuses: {
    aeroBars: { enabled: true, seconds: 30 },
    ttEquipment: { enabled: true, seconds: 30 },
  },
  winnerPoints: [3, 2, 1],
  handicapBasePoints: {
    [PerfClass.A]: 10,
    [PerfClass.B]: 8,
    [PerfClass.C]: 6,
    [PerfClass.D]: 4,
  },
  dropScores: 1,
  defaultGroupMapping: {
    hobby: PerfClass.B,
    ambitious: PerfClass.C,
  },
});