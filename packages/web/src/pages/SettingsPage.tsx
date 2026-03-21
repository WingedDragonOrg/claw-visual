import { useState, useEffect } from 'react';
import { useTeam } from '../components/TeamContext';
import type { Team } from '../types';

type Theme = 'dark' | 'light';

interface WebhookConfig {
  url: string;
  offlineAlert: boolean;
  recoveryNotify: boolean;
}

interface ThresholdConfig {
  offlineThreshold: number;
}

function getTheme(): Theme {
  return (localStorage.getItem('claw-theme') as Theme) || 'dark';
}

function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('claw-theme', theme);
}

function getWebhookConfig(): WebhookConfig {
  try {
    const raw = localStorage.getItem('claw-webhook');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { url: '', offlineAlert: false, recoveryNotify: false };
}

function getThresholdConfig(): ThresholdConfig {
  try {
    const raw = localStorage.getItem('claw-threshold');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { offlineThreshold: 3 };
}

export function SettingsPage() {
  const [theme, setTheme] = useState<Theme>(getTheme);
  const [webhook, setWebhook] = useState<WebhookConfig>(getWebhookConfig);
  const [threshold, setThreshold] = useState<ThresholdConfig>(getThresholdConfig);
  const [saved, setSaved] = useState(false);

  const { teams, addTeam, updateTeam, removeTeam } = useTeam();
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamUrl, setNewTeamUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleSave = () => {
    localStorage.setItem('claw-webhook', JSON.stringify(webhook));
    localStorage.setItem('claw-threshold', JSON.stringify(threshold));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-page">
      <h1 className="settings-title">Settings</h1>

      {/* Teams */}
      <section className="settings-section">
        <h2 className="settings-section-title">Teams</h2>
        {teams.length > 0 && (
          <div className="team-list">
            {teams.map(t => (
              <div key={t.id} className="team-item">
                {editingId === t.id ? (
                  <div className="team-edit-form">
                    <input
                      className="settings-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Team name"
                    />
                    <input
                      className="settings-input"
                      value={editUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      placeholder="Gateway URL"
                    />
                    <div className="team-edit-actions">
                      <button
                        className="team-btn team-btn-save"
                        onClick={() => {
                          if (editName.trim() && editUrl.trim()) {
                            updateTeam({ id: t.id, name: editName.trim(), gatewayUrl: editUrl.trim() });
                            setEditingId(null);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button className="team-btn team-btn-cancel" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="team-item-display">
                    <div className="team-item-info">
                      <span className="team-item-name">{t.name}</span>
                      <span className="team-item-url">{t.gatewayUrl}</span>
                    </div>
                    <div className="team-item-actions">
                      <button
                        className="team-btn team-btn-edit"
                        onClick={() => { setEditingId(t.id); setEditName(t.name); setEditUrl(t.gatewayUrl); }}
                      >
                        Edit
                      </button>
                      <button
                        className="team-btn team-btn-delete"
                        onClick={() => removeTeam(t.id)}
                        disabled={teams.length <= 1}
                        title={teams.length <= 1 ? 'At least one team required' : 'Delete team'}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="team-add-form">
          <input
            className="settings-input"
            placeholder="Team name"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
          />
          <input
            className="settings-input"
            placeholder="Gateway URL (e.g. http://192.168.1.100:18789)"
            value={newTeamUrl}
            onChange={e => setNewTeamUrl(e.target.value)}
          />
          <button
            className="team-btn team-btn-add"
            disabled={!newTeamName.trim() || !newTeamUrl.trim()}
            onClick={() => {
              const team: Team = {
                id: crypto.randomUUID(),
                name: newTeamName.trim(),
                gatewayUrl: newTeamUrl.trim(),
              };
              addTeam(team);
              setNewTeamName('');
              setNewTeamUrl('');
            }}
          >
            Add Team
          </button>
        </div>
      </section>

      {/* Theme */}
      <section className="settings-section">
        <h2 className="settings-section-title">Theme</h2>
        <div className="theme-toggle-group">
          <button
            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <span className="theme-btn-icon">&#9790;</span>
            Dark
          </button>
          <button
            className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <span className="theme-btn-icon">&#9788;</span>
            Light
          </button>
        </div>
      </section>

      {/* Webhook */}
      <section className="settings-section">
        <h2 className="settings-section-title">Webhook</h2>
        <div className="settings-field">
          <label className="settings-label">Webhook URL</label>
          <input
            type="url"
            className="settings-input"
            placeholder="https://example.com/webhook"
            value={webhook.url}
            onChange={(e) => setWebhook({ ...webhook, url: e.target.value })}
          />
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Offline Alert</span>
          <button
            className={`toggle-switch ${webhook.offlineAlert ? 'on' : ''}`}
            onClick={() => setWebhook({ ...webhook, offlineAlert: !webhook.offlineAlert })}
            role="switch"
            aria-checked={webhook.offlineAlert}
          >
            <span className="toggle-knob" />
          </button>
        </div>
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">Recovery Notification</span>
          <button
            className={`toggle-switch ${webhook.recoveryNotify ? 'on' : ''}`}
            onClick={() => setWebhook({ ...webhook, recoveryNotify: !webhook.recoveryNotify })}
            role="switch"
            aria-checked={webhook.recoveryNotify}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </section>

      {/* Threshold */}
      <section className="settings-section">
        <h2 className="settings-section-title">Threshold</h2>
        <div className="settings-field">
          <label className="settings-label">Offline threshold (heartbeat failures)</label>
          <input
            type="number"
            className="settings-input settings-input-sm"
            min={1}
            max={99}
            value={threshold.offlineThreshold}
            onChange={(e) => setThreshold({ ...threshold, offlineThreshold: Math.max(1, parseInt(e.target.value) || 1) })}
          />
        </div>
      </section>

      {/* Save */}
      <div className="settings-actions">
        <button className="settings-save-btn" onClick={handleSave}>
          Save Configuration
        </button>
        {saved && <span className="settings-saved-msg">Saved!</span>}
      </div>
    </div>
  );
}
