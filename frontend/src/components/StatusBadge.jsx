const colorMap = {
  // Customer status
  Lead: 'bg-amber-100 text-amber-700',
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-slate-100 text-slate-600',
  // Challan status
  Draft: 'bg-slate-100 text-slate-600',
  Confirmed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${colorMap[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}
