import { useState } from 'react';
import { resolveAnomaly } from '../api';

export default function ResolveModal({ order, onClose, onResolved }) {
  const [form, setForm] = useState({
    new_latitude: order.latitude ?? '',
    new_longitude: order.longitude ?? '',
    resolved_by: '',
    support_note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await resolveAnomaly(order.id, {
        new_latitude: parseFloat(form.new_latitude),
        new_longitude: parseFloat(form.new_longitude),
        resolved_by: form.resolved_by,
        support_note: form.support_note || null,
      });
      onResolved();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resolve order.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <h3 className="text-lg font-bold text-gray-800 mb-1">Resolve Anomaly</h3>
        <p className="text-sm text-gray-500 mb-4">
          Order #{order.id} — {order.customer_name}
        </p>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Latitude</span>
            <input
              type="number" step="any" required
              value={form.new_latitude} onChange={set('new_latitude')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Longitude</span>
            <input
              type="number" step="any" required
              value={form.new_longitude} onChange={set('new_longitude')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        </div>

        <label className="block mb-3">
          <span className="text-xs font-medium text-gray-600">Agent Name</span>
          <input
            type="text" required
            value={form.resolved_by} onChange={set('resolved_by')}
            placeholder="e.g. support.agent.42"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs font-medium text-gray-600">Note (optional)</span>
          <textarea
            rows={2}
            value={form.support_note} onChange={set('support_note')}
            placeholder="What was corrected?"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button" onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit" disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Resolve'}
          </button>
        </div>
      </form>
    </div>
  );
}
