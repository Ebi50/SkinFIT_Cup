import React from 'react';
import { Event, EventType } from '../types';
import { CalendarIcon, PlusIcon, PencilIcon, TrashIcon } from './icons';

interface EventsListProps {
  events: Event[];
  onNewEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (eventId: string) => void;
}

const eventTypeLabels: Record<EventType, string> = {
  [EventType.EZF]: 'Einzelzeitfahren',
  [EventType.MZF]: 'Mannschaftszeitfahren',
  [EventType.BZF]: 'Bergzeitfahren',
  [EventType.Handicap]: 'Handicap',
};

const formatDate = (dateString: string) => {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch (e) {
    return 'Ungültiges Datum';
  }
};

export const EventsList: React.FC<EventsListProps> = ({ events, onNewEvent, onEditEvent, onDeleteEvent }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <CalendarIcon />
          <h1 className="text-3xl font-bold text-secondary">Events</h1>
        </div>
        <button
          onClick={onNewEvent}
          className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-transform transform hover:scale-105"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Neues Event</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Name</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Datum</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Typ</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-600 tracking-wider text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-primary/10">
                  <td className="p-4 text-gray-800 font-medium">{event.name}</td>
                  <td className="p-4 text-gray-700">{formatDate(event.date)}</td>
                  <td className="p-4 text-gray-700">{eventTypeLabels[event.eventType]}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      event.finished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.finished ? 'Abgeschlossen' : 'Anstehend'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => onEditEvent(event)} className="text-blue-600 hover:text-blue-800 p-2">
                        <PencilIcon />
                    </button>
                    <button onClick={() => onDeleteEvent(event.id)} className="text-red-600 hover:text-red-800 p-2 ml-2">
                        <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Keine Events vorhanden. Erstellen Sie ein neues Event.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
