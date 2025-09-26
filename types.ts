export enum EventType {
  EZF = 'EZF', // Einzelzeitfahren
  MZF = 'MZF', // Mannschaftszeitfahren
  BZF = 'BZF', // Bergzeitfahren
  Handicap = 'Handicap',
}

export enum PerfClass {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum Gender {
  Male = 'm',
  Female = 'w',
}

export enum GroupLabel {
  Hobby = 'Hobby',
  Ambitious = 'Ambitioniert',
  Women = 'Frauen',
}

export interface Participant {
  id: string;
  firstName: string;
  lastName:string;
  email: string;
  phone: string;
  birthYear: number;
  perfClass: PerfClass;
  gender: Gender;
  isRsvMember: boolean;
  club?: string;
  startNumber?: string;
  nationality?: string;
}

export interface Event {
  id: string;
  name: string;
  date: string; // ISO 8601 format: YYYY-MM-DD
  location: string;
  eventType: EventType;
  notes: string;
  finished: boolean;
  season: number; // e.g., 2025
}

export interface Result {
  id: string;
  eventId: string;
  participantId: string;
  rankOverall?: number; // EZF/BZF
  timeSeconds?: number; // EZF/BZF/MZF individual time
  winnerRank?: 1 | 2 | 3; // Manually assigned rank for winner points
  finisherGroup?: number; // Handicap
  dnf: boolean;
  points: number;
  hasAeroBars?: boolean; // TT-Lenkeraufsatz
  hasTTEquipment?: boolean; // Weiteres Zeitfahrmaterial
}

export interface Team {
    id: string;
    eventId: string;
    name: string;
}

export interface TeamMember {
    id: string;
    teamId: string;
    participantId: string;
    penaltyMinus2: boolean;
    // MZF individual results are now part of the main Result type
    // timeSeconds?: number;
    // dnf?: boolean;
    // hasAeroBars?: boolean;
    // hasTTEquipment?: boolean;
}

export interface MaterialHandicapSetting {
    enabled: boolean;
    seconds: number;
}

export interface HandicapRule {
    enabled: boolean;
    seconds: number; // Can be negative for a bonus or positive for a penalty
}

export interface AgeHandicapRule extends HandicapRule {
    minAge: number;
    maxAge: number;
}


export interface Settings {
  timeTrialBonuses: {
      aeroBars: MaterialHandicapSetting;
      ttEquipment: MaterialHandicapSetting;
  };
  winnerPoints: number[]; // e.g., [3, 2, 1] for top 3
  handicapBasePoints: Record<PerfClass, number>; // Points for class A-D
  dropScores: number; // N Streichergebnisse
  defaultGroupMapping: {
    hobby: PerfClass,
    ambitious: PerfClass
  },
  handicapSettings: {
    gender: {
        female: HandicapRule;
    };
    ageBrackets: AgeHandicapRule[];
    perfClass: {
        hobby: HandicapRule;
    };
  };
}

export type View = 'dashboard' | 'participants' | 'events' | 'standings' | 'settings' | 'eventDetail';