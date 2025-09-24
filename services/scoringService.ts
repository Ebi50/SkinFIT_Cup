import { Participant, Event, Result, Settings, Gender, PerfClass, GroupLabel } from '../types';

// Helper to determine a participant's group
export const getParticipantGroup = (participant: Participant): GroupLabel => {
  if (participant.gender === Gender.Female) {
    return GroupLabel.Women;
  }
  if ([PerfClass.A, PerfClass.B].includes(participant.perfClass)) {
    return GroupLabel.Hobby;
  }
  return GroupLabel.Ambitious;
};

// Main scoring logic for an event
export const calculateEventPoints = (
  eventResults: Result[],
  participants: Participant[],
  settings: Settings
): Result[] => {
  const participantMap = new Map(participants.map(p => [p.id, p]));

  // Create a structure with full participant data for sorting
  const enrichedResults = eventResults
    .filter(r => !r.dnf && r.timeSeconds != null)
    .map(r => ({
      ...r,
      participant: participantMap.get(r.participantId),
    }))
    .filter(r => r.participant != null);

  // Sort by time (ascending)
  enrichedResults.sort((a, b) => (a.timeSeconds ?? Infinity) - (b.timeSeconds ?? Infinity));
  
  const updatedResults = new Map<string, Result>();
  eventResults.forEach(r => updatedResults.set(r.id, {...r, points: r.dnf ? 0 : r.points}));

  const getPlacementPoints = (rank: number) => {
      if (rank <= 10) return 8;
      if (rank <= 20) return 7;
      if (rank <= 30) return 6;
      return 5;
  };

  enrichedResults.forEach((result, index) => {
      const rankOverall = index + 1;
      
      // Start with placement points based on overall rank
      let points = getPlacementPoints(rankOverall);
      
      // Add winner bonus points if manually assigned
      if (result.winnerRank && result.winnerRank <= settings.winnerPoints.length) {
          points += settings.winnerPoints[result.winnerRank - 1];
      }
      
      const originalResult = updatedResults.get(result.id);
      if(originalResult) {
          updatedResults.set(result.id, { ...originalResult, points, rankOverall });
      }
  });

  return Array.from(updatedResults.values());
};

// --- Overall Standings Calculation ---
export interface Standing {
    participantId: string;
    participantName: string;
    participantClass: PerfClass;
    totalPoints: number;
    results: { eventId: string; points: number; isDropped?: boolean }[];
    finalPoints: number;
    tieBreakerScores: number[];
}

export const calculateOverallStandings = (
    results: Result[],
    participants: Participant[],
    events: Event[],
    settings: Settings
): Record<GroupLabel, Standing[]> => {
    const participantMap = new Map(participants.map(p => [p.id, p]));
    const standingsByParticipant: Record<string, Standing> = {};

    for (const p of participants) {
        standingsByParticipant[p.id] = {
            participantId: p.id,
            participantName: `${p.lastName}, ${p.firstName}`,
            participantClass: p.perfClass,
            totalPoints: 0,
            results: [],
            finalPoints: 0,
            tieBreakerScores: [],
        };
    }

    const finishedEvents = events.filter(e => e.finished);

    for (const event of finishedEvents) {
        const eventResults = results.filter(r => r.eventId === event.id);
        for (const result of eventResults) {
            if (standingsByParticipant[result.participantId]) {
                standingsByParticipant[result.participantId].results.push({
                    eventId: event.id,
                    points: result.points,
                    isDropped: false,
                });
            }
        }
    }

    Object.values(standingsByParticipant).forEach(standing => {
        // Mark dropped scores
        if (settings.dropScores > 0 && standing.results.length > settings.dropScores) {
            const sortedResultsForDropping = [...standing.results].sort((a, b) => a.points - b.points);
            const resultsToDrop = sortedResultsForDropping.slice(0, settings.dropScores);
            
            const droppedPointsCount = new Map<number, number>();
            resultsToDrop.forEach(r => {
                droppedPointsCount.set(r.points, (droppedPointsCount.get(r.points) || 0) + 1);
            });

            standing.results.forEach(r => {
                if (droppedPointsCount.has(r.points) && droppedPointsCount.get(r.points)! > 0) {
                    r.isDropped = true;
                    droppedPointsCount.set(r.points, droppedPointsCount.get(r.points)! - 1);
                } else {
                    r.isDropped = false;
                }
            });
        }

        standing.totalPoints = standing.results.reduce((sum, p) => sum + p.points, 0);
        
        const pointsToDrop = standing.results
            .filter(r => r.isDropped)
            .reduce((sum, r) => sum + r.points, 0);
        
        standing.finalPoints = standing.totalPoints - pointsToDrop;
        standing.tieBreakerScores = standing.results.map(r => r.points).sort((a, b) => b - a);
    });

    const finalStandings = Object.values(standingsByParticipant);

    // Tie-breaking logic
    finalStandings.sort((a, b) => {
        if (b.finalPoints !== a.finalPoints) {
            return b.finalPoints - a.finalPoints;
        }
        // Tie-breaker: compare best scores
        for (let i = 0; i < Math.max(a.tieBreakerScores.length, b.tieBreakerScores.length); i++) {
            const scoreA = a.tieBreakerScores[i] || 0;
            const scoreB = b.tieBreakerScores[i] || 0;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
        }
        // Alphabetical tie-breaker
        return a.participantName.localeCompare(b.participantName);
    });

    // Group the standings
    const groupedStandings: Record<GroupLabel, Standing[]> = {
        [GroupLabel.Hobby]: [],
        [GroupLabel.Ambitious]: [],
        [GroupLabel.Women]: [],
    };

    finalStandings.forEach(standing => {
        const participant = participantMap.get(standing.participantId);
        if (participant) {
            const group = getParticipantGroup(participant);
            groupedStandings[group].push(standing);
        }
    });

    return groupedStandings;
};