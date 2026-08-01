export default function Loader({ message = 'Loading...' }) {
  return (
    <div className="loader" style={{ flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" />
      <p className="text-muted text-sm">{message}</p>
    </div>
  );
}
