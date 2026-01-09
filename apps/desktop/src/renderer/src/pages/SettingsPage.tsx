import { useState, useEffect, useCallback } from 'react';
import { getMe, type User } from '@microflash/api-client';

export function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMe();
      setUser(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="btn btn-text" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="settings-section">
        <h3 className="settings-section-title">Account</h3>
        {user ? (
          <div className="settings-info">
            <p>
              <strong>User ID:</strong> {user.id}
            </p>
            <p>
              <strong>Clerk ID:</strong> {user.clerkId}
            </p>
            <p>
              <strong>Created:</strong>{' '}
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <p>Not signed in</p>
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">About</h3>
        <div className="settings-info">
          <p>
            <strong>MicroFlash Desktop</strong>
          </p>
          <p>Version 0.1.0</p>
          <p>
            A microlearning-first flashcard app for deck and card management.
          </p>
        </div>
      </div>
    </div>
  );
}
