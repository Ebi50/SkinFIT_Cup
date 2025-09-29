import { Participant, Event, Result, Settings, Gender, PerfClass, GroupLabel, Team, TeamMember, EventType } from '../types';

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

// --- Specific Calculators ---

const getPlacementPoints = (rank: number): number => {
    if (rank <= 3) return 8;
    if (rank <= 6) return 7;
    if (rank <= 10) return 6;
    return 5;
};

export const calculateHandicap = (participant: Participant, result: Result, event: Event, settings: Settings): number => {
    let adjustment = 0;
    const eventYear = event.season;
    const age = eventYear - participant.birthYear;
    const { handicapSettings, timeTrialBonuses } = settings;

    // Gender (Bonus is a negative adjustment)
    if (handicapSettings.gender.female.enabled && participant.gender === Gender.Female) {
        adjustment += handicapSettings.gender.female.seconds;
    }

    // Age (Bonus is a negative adjustment)
    for (const bracket of handicapSettings.ageBrackets) {
        if (bracket.enabled && age >= bracket.minAge && age <= bracket.maxAge) {
            adjustment += bracket.seconds;
            break; // Apply only the first matching age bracket
        }
    }

    // Performance Class (Bonus is a negative adjustment)
    if (handicapSettings.perfClass.hobby.enabled && [PerfClass.A, PerfClass.B].includes(participant.perfClass)) {
        adjustment += handicapSettings.perfClass.hobby.seconds;
    }

    // Material (Penalty is a positive adjustment)
    if (timeTrialBonuses.aeroBars.enabled && result.hasAeroBars) {
      adjustment += timeTrialBonuses.aeroBars.seconds;
    }
    if (timeTrialBonuses.ttEquipment.enabled && result.hasTTEquipment) {
      adjustment += timeTrialBonuses.ttEquipment.seconds;
    }

    return adjustment;
};


const calculateTimeTrialPoints = (
  event: Event,
  eventResults: Result[],
  participants: Participant[],
  settings: Settings
): Result[] => {
  const participantMap = new Map(participants.map(p => [p.id, p]));

  // Step 1: Create a mutable map of all results. This ensures we return a result for every participant,
  // including DNFs. DNFs get 0 points, finishers get a baseline of 1 point.
  const finalResults = new Map<string, Result>();
  eventResults.forEach(r => {
    finalResults.set(r.id, { ...r, points: r.dnf ? 0 : 1, rankOverall: undefined });
  });

  // Step 2: Identify valid finishers, calculate their handicap-adjusted time, and sort them.
  const rankedFinishers = eventResults
    .filter(r => !r.dnf && r.timeSeconds != null && r.timeSeconds > 0)
    .map(r => {
      const participant = participantMap.get(r.participantId);
      if (!participant) return null; // Exclude results for unknown participants from ranking

      const handicap = calculateHandicap(participant, r, event, settings);
      const adjustedTimeSeconds = (r.timeSeconds || 0) + handicap;
      return { ...r, adjustedTimeSeconds };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.adjustedTimeSeconds - b.adjustedTimeSeconds);

  // Step 3: Iterate through the sorted finishers to assign placement points and rank.
  rankedFinishers.forEach((rankedResult, index) => {
    const rankOverall = index + 1;
    let points = getPlacementPoints(rankOverall);

    // Add winner points bonus for top 3 finishers
    if (rankOverall <= settings.winnerPoints.length) {
      points += settings.winnerPoints[rankOverall - 1];
    }

    // Update the result in our map with the calculated points and rank.
    // We destructure to remove the temporary 'adjustedTimeSeconds' property.
    const { adjustedTimeSeconds, ...resultToUpdate } = rankedResult;
    finalResults.set(resultToUpdate.id, { ...resultToUpdate, points, rankOverall });
  });

  // Step 4: Convert the map back to an array for the final output.
  return Array.from(finalResults.values());
};

const calculateHandicapPoints = (
    eventResults: Result[],
    participants: Participant[],
    settings: Settings
): Result[] => {
    const participantMap = new Map(participants.map(p => [p.id, p]));
    const updatedResults: Result[] = [];

    for (const result of eventResults) {
        if (result.dnf) {
            updatedResults.push({ ...result, points: 0 });
            continue;
        }

        const participant = participantMap.get(result.participantId);
        if (!participant) {
            updatedResults.push({ ...result, points: 0 });
            continue;
        }

        const basePoints = settings.handicapBasePoints[participant.perfClass] || 0;
        let points;

        if (result.finisherGroup === 2) {
            // Finisher in group 2 gets base points minus one, with a minimum of 1.
            points = Math.max(1, basePoints - 1);
        } else {
            // Finisher in group 1 or with no group assigned gets full base points.
            // If base points are 0 for their class, they still get a finisher point.
            points = Math.max(1, basePoints);
        }

        // Add winner points bonus
        if (result.winnerRank && result.winnerRank <= settings.winnerPoints.length) {
            points += settings.winnerPoints[result.winnerRank - 1];
        }

        updatedResults.push({ ...result, points });
    }
    return updatedResults;
};

const calculateTeamTimeTrialPoints = (
    event: Event,
    eventResults: Result[],
    teams: Team[],
    teamMembers: TeamMember[],
    participants: Participant[],
    settings: Settings
): Result[] => {
    const participantMap = new Map(participants.map(p => [p.id, p]));
    const resultMap = new Map(eventResults.map(r => [r.participantId, r]));

    const rankedTeams = teams.map(team => {
        const members = teamMembers.filter(tm => tm.teamId === team.id);
        const memberResults = members
            .map(member => resultMap.get(member.participantId))
            .filter((r): r is Result => r !== undefined && !r.dnf && r.timeSeconds != null && r.timeSeconds > 0);

        if (memberResults.length < 2) { // Need at least 2 finishers for n-1 rule
             return { ...team, adjustedTime: Infinity, memberIds: members.map(m => m.participantId) };
        }

        // Calculate total team handicap by summing up individual handicaps
        const totalTeamHandicap = members.reduce((sum, member) => {
            const participant = participantMap.get(member.participantId);
            const result = resultMap.get(member.participantId);
            if (participant && result) {
                return sum + calculateHandicap(participant, result, event, settings);
            }
            return sum;
        }, 0);

        // Find the n-1th rider's time (base time)
        const sortedTimes = memberResults.map(r => r.timeSeconds!).sort((a, b) => a - b);
        const relevantRiderIndex = Math.max(0, sortedTimes.length - 2); // n-1th rider for a team of size n is at index n-2
        const baseTime = sortedTimes[relevantRiderIndex];

        const adjustedTime = baseTime + totalTeamHandicap;
        
        return { ...team, adjustedTime, memberIds: members.map(m => m.participantId) };
    }).sort((a, b) => a.adjustedTime - b.adjustedTime);

    const teamPoints = new Map<string, number>();
    rankedTeams.forEach((team, index) => {
        if (team.adjustedTime === Infinity) return;
        const rank = index + 1;
        let points = getPlacementPoints(rank);

        // Add winner points bonus for top 3 teams
        if (rank <= settings.winnerPoints.length) {
            points += settings.winnerPoints[rank - 1];
        }
        
        teamPoints.set(team.id, points);
    });

    const resultsByParticipant = new Map<string, Result>();
    eventResults.forEach(r => resultsByParticipant.set(r.participantId, {...r, points: 0}));

    for (const member of teamMembers) {
        const teamId = member.teamId;
        const participantId = member.participantId;
        const result = resultsByParticipant.get(participantId);

        if (result && !result.dnf) {
            let points = teamPoints.get(teamId) || 1; // 1 finisher point if team didn't rank
            if (member.penaltyMinus2) {
                points = Math.max(0, points - 2);
            }
            resultsByParticipant.set(participantId, { ...result, points });
        } else if (result && result.dnf) {
            resultsByParticipant.set(participantId, { ...result, points: 0 });
        }
    }
    return Array.from(resultsByParticipant.values());
};

// --- Main Dispatcher Function ---

export const calculatePointsForEvent = (
    event: Event,
    eventResults: Result[],
    participants: Participant[],
    teams: Team[],
    teamMembers: TeamMember[],
    settings: Settings
): Result[] => {
    if (!event.finished) {
        return eventResults.map(r => ({ ...r, points: 0, rankOverall: undefined }));
    }

    switch (event.eventType) {
        case EventType.EZF:
        case EventType.BZF:
            return calculateTimeTrialPoints(event, eventResults, participants, settings);
        case EventType.Handicap:
            return calculateHandicapPoints(eventResults, participants, settings);
        case EventType.MZF:
            return calculateTeamTimeTrialPoints(event, eventResults, teams, teamMembers, participants, settings);
        default:
            return eventResults;
    }
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
    const finishedEventIds = new Set(events.filter(e => e.finished).map(e => e.id));

    // Only create standings for participants who have results in finished events.
    for (const result of results) {
        if (!finishedEventIds.has(result.eventId)) {
            continue;
        }

        const participantId = result.participantId;
        const participant = participantMap.get(participantId);

        // Skip results from deleted/unknown participants
        if (!participant) {
            continue;
        }

        // If we haven't seen this participant before, create their standing entry.
        if (!standingsByParticipant[participantId]) {
            standingsByParticipant[participantId] = {
                participantId: participant.id,
                participantName: `${participant.lastName}, ${participant.firstName}`,
                participantClass: participant.perfClass,
                totalPoints: 0,
                results: [],
                finalPoints: 0,
                tieBreakerScores: [],
            };
        }

        // Add the result to the participant's standing.
        standingsByParticipant[participantId].results.push({
            eventId: result.eventId,
            points: result.points,
            isDropped: false,
        });
    }

    Object.values(standingsByParticipant).forEach(standing => {
        // Drop Score Logic:
        // A missed event automatically counts as a drop score.
        // Therefore, we only drop the worst scores from the *attended* events if the
        // participant has missed fewer events than the allowed number of drop scores.
        standing.results.forEach(r => r.isDropped = false);

        const finishedEventCount = finishedEventIds.size;
        const attendedEventCount = standing.results.length;
        const missedEventCount = finishedEventCount - attendedEventCount;

        const scoresToDropFromAttended = Math.max(0, settings.dropScores - missedEventCount);

        if (scoresToDropFromAttended > 0) {
            // Ensure we don't try to drop more scores than are available
            const scoresToDropCount = Math.min(scoresToDropFromAttended, attendedEventCount);

            if (scoresToDropCount > 0) {
                const sortedResultsForDropping = [...standing.results].sort((a, b) => a.points - b.points);
                const resultsToDrop = sortedResultsForDropping.slice(0, scoresToDropCount);
                
                // This logic handles ties correctly by creating a frequency map of points to drop.
                const droppedPointsCount = new Map<number, number>();
                resultsToDrop.forEach(r => {
                    droppedPointsCount.set(r.points, (droppedPointsCount.get(r.points) || 0) + 1);
                });

                standing.results.forEach(r => {
                    if (droppedPointsCount.has(r.points) && droppedPointsCount.get(r.points)! > 0) {
                        r.isDropped = true;
                        droppedPointsCount.set(r.points, droppedPointsCount.get(r.points)! - 1);
                    }
                });
            }
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
