import { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const login = async () => {
    try {
      const res = await api.post('/users/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/events');
    } catch {
      alert('Invalid credentials');
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
          <input className="border p-2 w-full mb-4" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="border p-2 w-full mb-4" placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />
          <button className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700" onClick={login}>Login</button>
        </div>
      </div>
    </>
  );
}