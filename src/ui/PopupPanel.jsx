import { ConnectionPill, PlatformPicker, Toggle } from './components.jsx';
import { useExtensionState } from './hooks.js';

export function PopupPanel() {
  const { settings, connection, updateSettings } = useExtensionState();

  const openSidebar = () => chrome.runtime.sendMessage({ type: 'SHOW_SIDEBAR' });
  const openOptions = () => chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });

  return (
    <main className="popup">
      <header className="popup__header">
        <div>
          <span className="app-mark" aria-hidden="true">R</span>
          <h1>Reprompt</h1>
          <p>Formal prompt refinement for AI chat platforms.</p>
        </div>
        <ConnectionPill connection={connection} />
      </header>

      <section className="popup__section">
        <Toggle
          label="Enabled"
          hint="Activate refinement on supported platforms."
          checked={settings.enabled}
          onChange={(enabled) => updateSettings({ enabled })}
        />
        <Toggle
          label="Auto-refine on submit"
          hint="Rewrite prompts before they leave the compose box."
          checked={settings.autoRefine}
          onChange={(autoRefine) => updateSettings({ autoRefine })}
        />
      </section>

      <section className="popup__section">
        <span className="section-label">Platforms</span>
        <PlatformPicker
          value={settings.activePlatformIds}
          onChange={(activePlatformIds) => updateSettings({ activePlatformIds })}
        />
      </section>

      <footer className="popup__actions">
        <button className="button button--primary" type="button" onClick={openSidebar}>
          Open sidebar
        </button>
        <button className="button button--ghost" type="button" onClick={openOptions}>
          Options
        </button>
      </footer>
    </main>
  );
}
