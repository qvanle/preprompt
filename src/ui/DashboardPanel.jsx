import {
  Analytics,
  Card,
  ConnectionPill,
  HistoryList,
  PlatformPicker,
  TextField,
  Toggle,
} from './components.jsx';
import { useExtensionState } from './hooks.js';

export function DashboardPanel({ compact = false, onClose }) {
  const { settings, history, connection, updateSettings, clearHistory } = useExtensionState();

  return (
    <main className={`dashboard ${compact ? 'dashboard--compact' : ''}`}>
      <header className="dashboard__header">
        <div className="dashboard__title">
          <span className="app-mark" aria-hidden="true">R</span>
          <div>
            <h1>Dashboard</h1>
            <p>Advanced configuration, analytics, and prompt history.</p>
          </div>
        </div>
        <div className="dashboard__headerActions">
          <ConnectionPill connection={connection} />
          {onClose ? (
            <button className="button button--ghost" type="button" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </header>

      <div className="dashboard__grid">
        <Card title="Core settings" subtitle="Control extension behavior and supported platforms.">
          <div className="stack">
            <Toggle
              label="Enabled"
              checked={settings.enabled}
              onChange={(enabled) => updateSettings({ enabled })}
            />
            <Toggle
              label="Auto-refine on submit"
              checked={settings.autoRefine}
              onChange={(autoRefine) => updateSettings({ autoRefine })}
            />
            <Toggle
              label="Show sidebar by default"
              checked={settings.sidebarVisible}
              onChange={(sidebarVisible) => updateSettings({ sidebarVisible })}
            />
            <div>
              <span className="section-label">Platforms</span>
              <PlatformPicker
                value={settings.activePlatformIds}
                onChange={(activePlatformIds) => updateSettings({ activePlatformIds })}
              />
            </div>
          </div>
        </Card>

        <Card title="API key management" subtitle="Connect an external refinement endpoint if desired.">
          <div className="stack">
            <TextField
              label="API endpoint"
              value={settings.api.endpoint}
              placeholder="https://api.example.com/refine"
              onChange={(endpoint) => updateSettings({ api: { ...settings.api, endpoint } })}
            />
            <TextField
              label="API key"
              value={settings.api.apiKey}
              placeholder="sk-..."
              onChange={(apiKey) => updateSettings({ api: { ...settings.api, apiKey } })}
            />
            <TextField
              label="Model"
              value={settings.api.model}
              placeholder="gpt-4.1-mini"
              onChange={(model) => updateSettings({ api: { ...settings.api, model } })}
            />
          </div>
        </Card>
      </div>

      <div className="dashboard__grid dashboard__grid--wide">
        <Card
          title="Analytics"
          subtitle="A lightweight view of prompt refinement activity."
          actions={
            <button className="button button--ghost" type="button" onClick={clearHistory}>
              Clear history
            </button>
          }
        >
          <Analytics history={history} />
        </Card>

        <Card title="History" subtitle="Compare the original prompt with the refined version.">
          <HistoryList history={history} />
        </Card>
      </div>
    </main>
  );
}

export default DashboardPanel;
