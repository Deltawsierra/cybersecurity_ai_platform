import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://127.0.0.1:8000/admin-dashboard/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Access denied or failed to fetch');
        return res.text();
      })
      .then((html) => setHtmlContent(html))
      .catch((err) => {
        console.error(err);
        setHtmlContent('<h2 class="text-red-600">You are not authorized to view this page.</h2>');
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6">Admin Page</h1>
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
};

export default AdminPage;
