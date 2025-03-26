import { useEffect, useState } from 'react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function Events() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get('/events').then(res => setEvents(res.data.data));
  }, []);

  return (
    <>
      <Navbar />
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Available Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(ev => (
            <div key={ev._id} className="bg-white rounded shadow-md p-4">
              <h4 className="font-semibold text-lg mb-2">{ev.name}</h4>
              <p>{ev.description}</p>
              <p className="text-sm text-gray-600">Date: {ev.date}</p>
              <p className="text-sm text-gray-600">Venue: {ev.venue}</p>
              <p className="text-sm">Price: {ev.price} {ev.currency}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}