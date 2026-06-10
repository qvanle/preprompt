import { platformName, PLATFORMS } from '../shared/platforms.js';

export function Card({ title, subtitle, children, actions, className = '' }) {
  return (
    <section className={`card ${className}`.trim()}>
      <div className="card__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="card__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function PlatformPicker({ value, onChange }) {
  return (
    <div className="platforms" role="group" aria-label="Platforms">
      {PLATFORMS.map((platform) => {
        const active = value.includes(platform.id);
        return (
          <button
            key={platform.id}
            className={`chip ${active ? 'chip--active' : ''}`}
            type="button"
            aria-pressed={active}
            onClick={() => {
              const next = active
                ? value.filter((id) => id !== platform.id)
                : [...value, platform.id];
              onChange(next);
            }}
          >
            <span className="chip__dot" aria-hidden="true" />
            {platform.name}
          </button>
        );
      })}
    </div>
  );
}

export function ConnectionPill({ connection }) {
  const isConnected = Boolean(connection?.connected);
  const tone = connection?.tone ?? 'local';
  const label = connection?.label ?? 'Local refinement';

  return (
    <span className={`connection connection--${tone} ${isConnected ? 'connection--active' : ''}`}>
      <span className="connection__pulse" aria-hidden="true" />
      {label}
    </span>
  );
}

export function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="toggle">
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function TextField({ label, value, placeholder, type = 'text', onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value ?? 0));
}

export function formatCost(value) {
  return typeof value === 'number' ? `$${value.toFixed(6)}` : 'Unknown';
}

function getUsageTotals(history) {
  return history.reduce(
    (totals, entry) => {
      const usage = entry.usage ?? {};
      return {
        calls: totals.calls + (entry.source === 'remote' ? 1 : 0),
        inputTokens: totals.inputTokens + Number(usage.inputTokens ?? 0),
        outputTokens: totals.outputTokens + Number(usage.outputTokens ?? 0),
        totalTokens: totals.totalTokens + Number(usage.totalTokens ?? 0),
        costUsd: totals.costUsd + Number(entry.costUsd ?? 0)
      };
    },
    { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0 }
  );
}

export function Analytics({ history }) {
  const remoteCount = history.filter((entry) => entry.source === 'remote').length;
  const localCount = history.length - remoteCount;
  const totals = getUsageTotals(history);

  return (
    <div className="analytics">
      <div className="stat stat--primary">
        <span>Total refinements</span>
        <strong>{formatNumber(history.length)}</strong>
      </div>
      <div className="stat">
        <span>API calls</span>
        <strong>{formatNumber(totals.calls)}</strong>
      </div>
      <div className="stat">
        <span>Total tokens</span>
        <strong>{formatNumber(totals.totalTokens)}</strong>
      </div>
      <div className="stat">
        <span>Estimated cost</span>
        <strong>{formatCost(totals.costUsd)}</strong>
      </div>
      <div className="stat">
        <span>Input / output</span>
        <strong>
          {formatNumber(totals.inputTokens)} / {formatNumber(totals.outputTokens)}
        </strong>
      </div>
      <div className="stat">
        <span>Local fallback</span>
        <strong>{formatNumber(localCount)}</strong>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatUsage(usage) {
  if (!usage) {
    return 'Usage unknown';
  }

  return `${formatNumber(usage.inputTokens)} in / ${formatNumber(usage.outputTokens)} out`;
}

export function HistoryList({ history }) {
  if (!history.length) {
    return <p className="empty">No prompt history yet.</p>;
  }

  return (
    <div className="history">
      {history.map((entry) => (
        <article className="history__item" key={entry.id}>
          <div className="history__meta">
            <strong>{platformName(entry.platformId)}</strong>
            <span>{formatDate(entry.createdAt)}</span>
          </div>
          <div className="history__usage">
            <span>{entry.source ?? 'local'}</span>
            <span>{entry.model ?? 'Local model'}</span>
            <span>{formatUsage(entry.usage)}</span>
            <span>{formatCost(entry.costUsd)}</span>
          </div>
          <div className="history__grid">
            <div>
              <span className="section-label">Original</span>
              <p>{entry.original}</p>
            </div>
            <div>
              <span className="section-label">Enhanced</span>
              <p>{entry.refined}</p>
            </div>
          </div>
          {entry.warning ? <p className="history__warning">{entry.warning}</p> : null}
        </article>
      ))}
    </div>
  );
}
