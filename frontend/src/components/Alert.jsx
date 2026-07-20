export default function Alert({ type = 'error', message }) {
  if (!message) return null;
  const styles = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`border rounded-lg px-4 py-3 text-sm mb-4 ${styles[type]}`}>
      {message}
    </div>
  );
}
