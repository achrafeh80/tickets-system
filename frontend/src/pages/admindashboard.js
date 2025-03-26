import { useEffect, useState } from 'react';
import api from '../api';

export default function AdminDashboard() {
  const [logs, setLogs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('logs');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/users/logs'); // tu vas créer ce endpoint côté backend
        setLogs(res.data.logs || []);
        setErrors(res.data.errors || []);
      } catch (err) {
        console.error('Error fetching logs', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) return <p>Loading admin data...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Dashboard</h2>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setTab('logs')}>View Logs</button>
        <button onClick={() => setTab('errors')}>View Errors</button>
      </div>

      {tab === 'logs' && (
        <div>
          <h3>Logs</h3>
          <ul>
            {logs.map((line) => (
              <li key={line.id || line} style={{ fontFamily: 'monospace' }}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'errors' && (
        <div>
          <h3>Errors</h3>
          <ul>
            {errors.map((line) => (
              <li key={line.id || line} style={{ color: 'red', fontFamily: 'monospace' }}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
