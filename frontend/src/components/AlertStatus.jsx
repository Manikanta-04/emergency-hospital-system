export default function AlertStatus({ status, onRetry }) {
  if (!status) return null;

  if (status.loading) {
    return (
      <div className="alert-status loading">
        <span className="spinner" />
        <span>Dispatching alert to hospital...</span>
      </div>
    );
  }

  if (status.sent) {
    return (
      <div className="alert-status success">
        <div className="status-icon">✅</div>
        <div>
          <strong>Alert Successfully Sent!</strong>
          <p>{status.message}</p>
          <small>Alert ID: {status.alertLogId}</small>
        </div>
      </div>
    );
  }

  if (status.failed) {
    return (
      <div className="alert-status failed">
        <div className="status-icon">❌</div>
        <div>
          <strong>Alert Failed</strong>
          <p>{status.error}</p>
          {status.canRetry && (
            <button className="retry-btn" onClick={onRetry}>🔄 Retry</button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
