import React, { useState } from 'react';
import axios from 'axios';

const CVEClassifierPage: React.FC = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<null | {
    label: string;
    confidence: number;
    keywords: string[];
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        'http://127.0.0.1:8000/api/detection/classify-cve/',
        { text },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setResult(response.data);
    } catch (err: any) {
      setError('Failed to classify CVE. Please check your input or try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-12 p-4 border rounded shadow bg-white">
      <h1 className="text-2xl font-bold mb-4">CVE Classifier</h1>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-semibold">Enter CVE or Vulnerability Description:</label>
        <textarea
          className="w-full p-2 border rounded mb-4"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          disabled={loading}
        >
          {loading ? 'Classifying...' : 'Submit'}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-bold mb-2">Prediction Result</h2>
          <p><strong>Label:</strong> {result.label}</p>
          <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(2)}%</p>
          <p><strong>Top Keywords:</strong> {result.keywords.join(', ')}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 border border-red-400 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default CVEClassifierPage;
