import { ConnectionPill, Toggle } from './components.jsx';
import { useExtensionState } from './hooks.js';

export function PopupPanel() {
  const { settings, connection, updateSettings } = useExtensionState();

  const openDashboard = () => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });

  return (
    <main className="popup">
      <header className="popup__header">
        <div className="dashboard__title">
          <span className="app-mark" aria-hidden="true">
            R
          </span>
          <div>
            <h1>Reprompt</h1>
            <p>Prompt enhancement for AI chat platforms.</p>
          </div>
        </div>
        <ConnectionPill connection={connection} />
      </header>

      <div className="stack">
        <Toggle
          label="Enabled"
          hint="Activate Reprompt on supported platforms."
          checked={settings.enabled}
          onChange={(enabled) => updateSettings({ enabled })}
        />
        <Toggle
          label="Automatically choose enhanced version"
          hint="Skip the review dialog when submitting."
          checked={settings.autoChooseEnhanced}
          onChange={(autoChooseEnhanced) => updateSettings({ autoChooseEnhanced })}
        />
      </div>

      <footer className="popup__actions">
        <button className="button button--primary" type="button" onClick={openDashboard}>
          Open dashboard
        </button>
      </footer>
    </main>
  );
}
