import { platformName, PLATFORMS } from '../shared/platforms.js';

export function Card({ title, subtitle, children, actions }) {
  return (
    <section className="card">
      <header className="card__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="card__actions">{actions}</div> : null}
      </header>
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
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

export function TextField({ label, value, placeholder, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function HistoryList({ history }) {
  if (!history.length) {
    return (
      <div className="empty-state">
        <strong>No prompt history yet</strong>
        <p>Refined prompts will appear here after Reprompt processes a message.</p>
      </div>
    );
  }

  return (
    <div className="history">
      {history.map((item) => (
        <article className="history__item" key={item.id}>
          <header>
            <strong>{platformName(item.platformId)}</strong>
            <span>{new Date(item.createdAt).toLocaleString()}</span>
          </header>
          <div className="history__grid">
            <div>
              <label>Original</label>
              <p>{item.original}</p>
            </div>
            <div>
              <label>Refined</label>
              <p>{item.refined}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Analytics({ history }) {
  const total = history.length;
  const byPlatform = history.reduce((acc, item) => {
    acc[item.platformId] = (acc[item.platformId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="analytics">
      <div className="stat stat--primary">
        <span>Total refined</span>
        <strong>{total}</strong>
      </div>
      {PLATFORMS.map((platform) => (
        <div className="stat" key={platform.id}>
          <span>{platform.name}</span>
          <strong>{byPlatform[platform.id] ?? 0}</strong>
        </div>
      ))}
    </div>
  );
}
