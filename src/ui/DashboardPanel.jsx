import {
    Analytics,
    Card,
    ConnectionPill,
    HistoryList,
    PlatformPicker,
    TextField,
    Toggle
} from './components.jsx';
import { useExtensionState } from './hooks.js';

export function DashboardPanel({ compact = false, onClose }) {
    const { settings, history, connection, updateSettings, clearHistory } = useExtensionState();
    const activePlatformCount = settings.activePlatformIds.length;
    const apiConfigured = Boolean(settings.api.endpoint || settings.api.apiKey);

    return (
        <main className={`dashboard dashboard--single ${compact ? 'dashboard--compact' : ''}`}>
            <header className="dashboard__header">
                <div className="dashboard__title">
                    <span className="app-mark" aria-hidden="true">
                        R
                    </span>
                    <div>
                        <h1>Dashboard</h1>
                        <p>Manage prompt enhancement, API usage, and history.</p>
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

            <div className="dashboard__stack">
                <Card
                    title="Analytics"
                    subtitle="API usage, estimated cost, and refinement activity."
                    actions={
                        <button className="button button--ghost" type="button" onClick={clearHistory}>
                            Clear history
                        </button>
                    }
                >
                    <Analytics history={history} />
                </Card>

                <Card title="History" subtitle="Compare original prompts, enhanced prompts, usage, and cost.">
                    <HistoryList history={history} />
                </Card>

                <Card title="Core settings" subtitle="Compact controls for enhancement behavior and API access.">
                    <div className="settings-console">
                        <section className="settings-row">
                            <div className="settings-row__summary">
                                <span className="section-label">Status & Mode</span>
                                <h3>{settings.enabled ? 'Running on selected platforms' : 'Paused across all platforms'}</h3>
                                <p>
                                    {settings.autoChooseEnhanced
                                        ? 'Enhanced prompts are selected automatically.'
                                        : 'Review dialog appears before sending enhanced prompts.'}
                                </p>
                            </div>
                            <div className="settings-row__controls settings-row__controls--toggles">
                                <Toggle
                                    label="Enabled"
                                    hint="Activate Reprompt."
                                    checked={settings.enabled}
                                    onChange={(enabled) => updateSettings({ enabled })}
                                />
                                <Toggle
                                    label="Auto-refine"
                                    hint="Rewrite before submit."
                                    checked={settings.autoRefine}
                                    onChange={(autoRefine) => updateSettings({ autoRefine })}
                                />
                                <Toggle
                                    label="Auto-choose enhanced"
                                    hint="Skip review dialog."
                                    checked={settings.autoChooseEnhanced}
                                    onChange={(autoChooseEnhanced) => updateSettings({ autoChooseEnhanced })}
                                />
                            </div>
                        </section>

                        <section className="settings-row">
                            <div className="settings-row__summary">
                                <span className="section-label">Platform Coverage</span>
                                <h3>{activePlatformCount} platforms selected</h3>
                                <p>Reprompt intercepts submit actions only on selected chat surfaces.</p>
                            </div>
                            <div className="settings-row__controls">
                                <PlatformPicker
                                    value={settings.activePlatformIds}
                                    onChange={(activePlatformIds) => updateSettings({ activePlatformIds })}
                                />
                            </div>
                        </section>

                        <section className="settings-row">
                            <div className="settings-row__summary">
                                <span className="section-label">API Connection</span>
                                <h3>{apiConfigured ? 'Remote refinement configured' : 'Local refinement active'}</h3>
                                <p>
                                    {apiConfigured
                                        ? `Using ${settings.api.model || 'the configured model'} when the endpoint is available.`
                                        : 'Local rewrite rules run without an external API key.'}
                                </p>
                            </div>
                            <div className="settings-row__controls">
                                <details className="settings-disclosure">
                                    <summary>
                                        <span>Edit API settings</span>
                                        <span>{apiConfigured ? settings.api.model || 'Configured' : 'Local'}</span>
                                    </summary>
                                    <div className="settings-fields">
                                        <TextField
                                            label="API endpoint"
                                            value={settings.api.endpoint}
                                            placeholder="https://api.openai.com/v1/chat/completions"
                                            onChange={(endpoint) => updateSettings({ api: { ...settings.api, endpoint } })}
                                        />
                                        <TextField
                                            label="API key"
                                            type="password"
                                            value={settings.api.apiKey}
                                            placeholder="sk-..."
                                            onChange={(apiKey) => updateSettings({ api: { ...settings.api, apiKey } })}
                                        />
                                        <TextField
                                            label="Model"
                                            value={settings.api.model}
                                            placeholder="gpt-4o-mini"
                                            onChange={(model) => updateSettings({ api: { ...settings.api, model } })}
                                        />
                                    </div>
                                </details>
                            </div>
                        </section>
                    </div>
                </Card>
            </div>
        </main>
    );
}

export default DashboardPanel;
