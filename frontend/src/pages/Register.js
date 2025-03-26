
import { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Register() {
  const [form, setForm] = useState({ 
    email: '', 
    password: '', 
    firstName: '', 
    lastName: '', 
    language: 'en' 
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const register = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError(null);
    setIsSubmitting(true);

    const { email, password, firstName, lastName } = form;
    if (!email || !password || !firstName || !lastName) {
      setError('Tous les champs sont obligatoires');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log("Sending form:", form);
      const res = await api.post('/users/register', form, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      localStorage.setItem('token', res.data.token);
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto mt-8 p-6 border rounded shadow">
        <h2 className="text-xl font-bold mb-4">Créer un compte</h2>
        <form onSubmit={register}>
          <input
            className="border p-2 w-full mb-4"
            placeholder="Prénom"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
          <input
            className="border p-2 w-full mb-4"
            placeholder="Nom"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
          <input
            className="border p-2 w-full mb-4"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="border p-2 w-full mb-4"
            placeholder="Mot de passe"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Création en cours...' : 'Créer un compte'}
          </button>
        </form>
      </div>
    </>
  );
}
