import React from 'react';
import { Participant, Event, GroupLabel, Gender } from '../types';
import { Standing } from '../services/scoringService';

interface PrintableReportProps {
    participants: Participant[];
    standings: Record<GroupLabel, Standing[]>;
    finishedEvents: Event[];
    season: number | null;
}

const StandingsTablePrint: React.FC<{ title: string; standings: Standing[]; }> = ({ title, standings }) => (
    <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', borderBottom: '2px solid black', paddingBottom: '0.5rem', marginBottom: '1rem' }}>{title}</h3>
        {standings.length > 0 ? (
            <table>
                <thead>
                    <tr>
                        <th>Rang</th>
                        <th>Name</th>
                        <th>Klasse</th>
                        <th>Gesamtpunkte</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, index) => (
                        <tr key={s.participantId}>
                            <td>{index + 1}.</td>
                            <td>{s.participantName}</td>
                            <td>{s.participantClass}</td>
                            <td><strong>{s.finalPoints}</strong></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : <p>Keine Teilnehmer in dieser Gruppe.</p>}
    </div>
);

const ParticipantsTablePrint: React.FC<{ participants: Participant[] }> = ({ participants }) => {
    const getGenderLabel = (gender: Gender) => (gender === Gender.Male ? 'm' : 'w');
    
    return (
        <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', borderBottom: '2px solid black', paddingBottom: '0.5rem', marginBottom: '1rem', breakBefore: 'page' }}>
                Teilnehmerliste
            </h2>
            <table>
                <thead>
                    <tr>
                        <th>Nachname</th>
                        <th>Vorname</th>
                        <th>Jahrgang</th>
                        <th>Klasse</th>
                        <th>Geschlecht</th>
                        <th>RSV Mitglied</th>
                    </tr>
                </thead>
                <tbody>
                    {[...participants].sort((a,b) => a.lastName.localeCompare(b.lastName)).map(p => (
                        <tr key={p.id}>
                            <td>{p.lastName}</td>
                            <td>{p.firstName}</td>
                            <td>{p.birthYear}</td>
                            <td>{p.perfClass}</td>
                            <td>{getGenderLabel(p.gender)}</td>
                            <td>{p.isRsvMember ? 'Ja' : 'Nein'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export const PrintableReport: React.FC<PrintableReportProps> = ({ participants, standings, finishedEvents, season }) => {
    return (
        <div>
            <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Skinfit Cup {season}</h1>
                <p>Gesamtwertung & Teilnehmerliste (Stand: {new Date().toLocaleDateString('de-DE')})</p>
            </header>
            
            <main>
                <section>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', borderBottom: '2px solid black', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        Gesamtwertung
                    </h2>
                    <StandingsTablePrint title="Männer Ambitioniert (C/D)" standings={standings[GroupLabel.Ambitious]} />
                    <StandingsTablePrint title="Männer Hobby (A/B)" standings={standings[GroupLabel.Hobby]} />
                    <StandingsTablePrint title="Frauen" standings={standings[GroupLabel.Women]} />
                </section>
                
                <ParticipantsTablePrint participants={participants} />
            </main>
        </div>
    );
};
