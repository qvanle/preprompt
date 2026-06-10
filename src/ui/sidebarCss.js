export const SIDEBAR_CSS = `
:host {
  all: initial;
  color-scheme: light;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.dashboard {
  width: 390px;
  max-width: calc(100vw - 24px);
  min-height: auto;
  max-height: calc(100vh - 24px);
  overflow: auto;
  padding: 16px;
  border: 1px solid rgba(23, 33, 43, 0.12);
  border-radius: 10px;
  background: #f8faf9;
  color: #17212b;
  box-shadow: 0 24px 80px rgba(23, 33, 43, 0.18);
}

.dashboard__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.dashboard__title,
.dashboard__headerActions,
.card__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dashboard__title {
  min-width: 0;
}

.dashboard__headerActions {
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.dashboard__header h1 {
  margin: 8px 0 4px;
  color: #13202a;
  font-size: 22px;
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1.05;
}

.dashboard__header p {
  display: none;
}

.app-mark {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid rgba(16, 124, 116, 0.22);
  border-radius: 8px;
  background: #e8f4f2;
  color: #0f766e;
  font-size: 13px;
  font-weight: 800;
}

.dashboard__grid,
.dashboard__grid--wide {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 12px;
}

.card {
  min-width: 0;
  padding: 14px;
  border: 1px solid #dfe6e5;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14px 36px rgba(23, 33, 43, 0.07);
}

.card__header {
  justify-content: space-between;
  margin-bottom: 12px;
}

.card__header h2 {
  margin: 0 0 4px;
  color: #17212b;
  font-size: 15px;
  font-weight: 760;
  line-height: 1.2;
}

.card__header p {
  margin: 0;
  color: #62707c;
  font-size: 12px;
  line-height: 1.45;
}

.card__actions {
  flex: 0 0 auto;
}

.stack {
  display: grid;
  gap: 10px;
}

.section-label,
.field > span {
  display: block;
  margin-bottom: 7px;
  color: #52606b;
  font-size: 11px;
  font-weight: 720;
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
}

.toggle {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 10px;
  border: 1px solid #e5ecea;
  border-radius: 8px;
  background: #fbfcfc;
}

.toggle strong {
  display: block;
  color: #1d2933;
  font-size: 13px;
  font-weight: 720;
  line-height: 1.25;
}

.toggle small {
  display: block;
  margin-top: 3px;
  color: #6b7884;
  font-size: 11px;
  line-height: 1.35;
}

.toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch {
  position: relative;
  width: 40px;
  height: 24px;
  border-radius: 999px;
  background: #d8e1df;
  transition:
    background 160ms ease,
    box-shadow 160ms ease;
}

.switch::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(23, 33, 43, 0.18);
  content: "";
  transition: transform 160ms ease;
}

.toggle input:checked + .switch {
  background: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}

.toggle input:checked + .switch::after {
  transform: translateX(16px);
}

.toggle:focus-within,
.chip:focus-visible,
.button:focus-visible,
.field input:focus {
  outline: 2px solid rgba(15, 118, 110, 0.28);
  outline-offset: 2px;
}

.platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #d9e2e0;
  border-radius: 8px;
  background: #ffffff;
  color: #44515d;
  font-size: 12px;
  font-weight: 680;
}

.chip__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #b7c3c0;
}

.chip--active {
  border-color: rgba(15, 118, 110, 0.28);
  background: #e8f4f2;
  color: #0f5f59;
}

.chip--active .chip__dot {
  background: #0f766e;
}

.connection {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 7px;
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid #d9e2e0;
  border-radius: 999px;
  background: #ffffff;
  color: #60707b;
  font-size: 11px;
  font-weight: 720;
  white-space: nowrap;
}

.connection__pulse {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #c4cfcc;
}

.connection--active {
  border-color: rgba(15, 118, 110, 0.24);
  color: #0f5f59;
}

.connection--active .connection__pulse {
  background: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
}

.connection--warning {
  border-color: rgba(202, 138, 4, 0.3);
  color: #8a5a00;
}

.connection--warning .connection__pulse {
  background: #ca8a04;
  box-shadow: 0 0 0 3px rgba(202, 138, 4, 0.14);
}

.button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 760;
  line-height: 1;
}

.button--ghost {
  border-color: #d9e2e0;
  background: #ffffff;
  color: #40505b;
}

.field input {
  width: 100%;
  min-height: 38px;
  padding: 0 11px;
  border: 1px solid #d9e2e0;
  border-radius: 8px;
  background: #ffffff;
  color: #17212b;
  font-size: 13px;
}

.field input::placeholder {
  color: #99a5ad;
}

.analytics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stat {
  min-height: 78px;
  padding: 11px;
  border: 1px solid #e3e9e8;
  border-radius: 8px;
  background: #fbfcfc;
}

.stat--primary {
  background: #e8f4f2;
  border-color: rgba(15, 118, 110, 0.18);
}

.stat span {
  display: block;
  color: #5f6f7b;
  font-size: 11px;
  font-weight: 680;
  line-height: 1.2;
}

.stat strong {
  display: block;
  margin-top: 12px;
  color: #17212b;
  font-size: 26px;
  font-weight: 780;
  line-height: 1;
}

.history {
  display: grid;
  gap: 10px;
}

.history__item {
  padding: 11px;
  border: 1px solid #e3e9e8;
  border-radius: 8px;
  background: #fbfcfc;
}

.history__item header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
  color: #667783;
  font-size: 11px;
}

.history__item header strong {
  color: #0f5f59;
}

.history__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.history__grid label {
  display: block;
  margin-bottom: 4px;
  color: #6a7883;
  font-size: 10px;
  font-weight: 760;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.history__grid p,
.empty-state p {
  margin: 0;
  color: #32424d;
  font-size: 12px;
  line-height: 1.45;
}

.empty-state {
  padding: 18px;
  border: 1px dashed #cad5d3;
  border-radius: 8px;
  background: #fbfcfc;
  text-align: center;
}

.empty-state strong {
  display: block;
  margin-bottom: 4px;
  color: #24323d;
  font-size: 13px;
}
`;

export default SIDEBAR_CSS;
