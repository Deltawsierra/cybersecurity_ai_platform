import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-xl p-8">
        <h1 className="text-2xl font-bold mb-4">Welcome to the Dashboard</h1>
        {user && (
          <p className="text-gray-700 mb-6">
            Logged in as <span className="font-semibold">{user}</span>
          </p>
        )}
        <p>This is your central hub for viewing threat data, logs, and reports.</p>
      </div>
    </div>
  );
};

export default Dashboard;
