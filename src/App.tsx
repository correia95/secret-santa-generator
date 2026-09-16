import { useMemo, useState } from 'react';
import { Exclusion, State, generateAssignment, encodeState, decodeState } from './santa';

function defaultState(): State {
  return {
    names: ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'],
    exclusions: [],
    seed: Math.floor(Math.random() * 1_000_000_000),
  };
}

function readInitialState(): State {
  const params = new URLSearchParams(window.location.search);
  if ([...params.keys()].length === 0) return defaultState();
  return decodeState(params, defaultState());
}

export default function App() {
  const [state, setState] = useState<State>(readInitialState);
  const [namesText, setNamesText] = useState(() => readInitialState().names.join('\n'));
  const [exclA, setExclA] = useState('');
  const [exclB, setExclB] = useState('');
  const [selectedGiver, setSelectedGiver] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const assignment = useMemo(
    () => generateAssignment(state.names, state.exclusions, state.seed),
    [state.names, state.exclusions, state.seed],
  );

  function applyNames() {
    const names = namesText.split('\n').map((n) => n.trim()).filter(Boolean);
    setState((s) => ({
      ...s,
      names,
      exclusions: s.exclusions.filter(([a, b]) => names.includes(a) && names.includes(b)),
    }));
    setSelectedGiver('');
    setRevealed(false);
  }

  function regenerate() {
    setState((s) => ({ ...s, seed: Math.floor(Math.random() * 1_000_000_000) }));
    setSelectedGiver('');
    setRevealed(false);
  }

  function addExclusion() {
    if (!exclA || !exclB || exclA === exclB) return;
    const exists = state.exclusions.some(
      ([a, b]) => (a === exclA && b === exclB) || (a === exclB && b === exclA),
    );
    if (exists) return;
    setState((s) => ({ ...s, exclusions: [...s.exclusions, [exclA, exclB] as Exclusion] }));
    setExclA('');
    setExclB('');
  }

  function removeExclusion(i: number) {
    setState((s) => ({ ...s, exclusions: s.exclusions.filter((_, idx) => idx !== i) }));
  }

  async function shareLink() {
    const params = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', `?${params.toString()}`);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="page">
      <h1>Secret Santa Generator</h1>
      <p className="lede">
        Generate Secret Santa pairings from a list of names, with optional exclusion pairs for
        people who shouldn't draw each other (like couples), revealed one person at a time.
      </p>

      <section className="panel">
        <h2>Participants (one per line)</h2>
        <textarea
          className="names-input"
          rows={6}
          value={namesText}
          onChange={(e) => setNamesText(e.target.value)}
        />
        <div className="button-row">
          <button className="primary-btn" onClick={applyNames}>Update list</button>
          <button className="secondary-btn" onClick={regenerate}>🎲 New draw</button>
        </div>
      </section>

      <section className="panel">
        <h2>Exclusions (people who shouldn't draw each other)</h2>
        <div className="exclusion-list">
          {state.exclusions.map(([a, b], i) => (
            <span className="chip" key={i}>
              {a} ↔ {b}
              <button onClick={() => removeExclusion(i)} title="Remove">&times;</button>
            </span>
          ))}
        </div>
        <div className="exclusion-add-row">
          <select value={exclA} onChange={(e) => setExclA(e.target.value)}>
            <option value="">Person A</option>
            {state.names.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={exclB} onChange={(e) => setExclB(e.target.value)}>
            <option value="">Person B</option>
            {state.names.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="secondary-btn" onClick={addExclusion}>Add</button>
        </div>
      </section>

      {assignment === null ? (
        <section className="result warning">
          <p className="verdict">
            {state.names.length < 2
              ? 'Add at least 2 participants to generate a draw.'
              : "Couldn't find a valid draw with these exclusions — try removing one, or add more participants."}
          </p>
        </section>
      ) : (
        <section className="result positive">
          <h2>Reveal (one person at a time)</h2>
          <p className="privacy-note">
            Pick your own name, reveal your match privately, then hand the device to the next
            person — don't scroll up or share this list with the group.
          </p>
          <div className="reveal-row">
            <select
              value={selectedGiver}
              onChange={(e) => { setSelectedGiver(e.target.value); setRevealed(false); }}
            >
              <option value="">Who are you?</option>
              {state.names.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {!revealed ? (
              <button className="primary-btn" onClick={() => setRevealed(true)} disabled={!selectedGiver}>
                Reveal my match
              </button>
            ) : (
              <button className="secondary-btn" onClick={() => { setRevealed(false); setSelectedGiver(''); }}>
                Hide / done
              </button>
            )}
          </div>
          {revealed && selectedGiver && (
            <p className="reveal-text">
              🎁 <strong>{selectedGiver}</strong>, you're the Secret Santa for <strong>{assignment[selectedGiver]}</strong>!
            </p>
          )}
        </section>
      )}

      <div className="actions">
        <button className="share-btn" onClick={shareLink}>{copied ? 'Copied!' : 'Copy organizer link'}</button>
      </div>
      <p className="organizer-warning">
        ⚠️ This link encodes everyone's pairing — it's for your own reference to reload this exact
        draw later. Don't share it with participants, or you'll spoil the surprise for everyone.
      </p>

      <section className="explainer">
        <h2>How this works</h2>
        <p>
          Names are shuffled into a "derangement" — a random assignment where nobody draws
          themselves — and re-shuffled automatically if any exclusion pair ends up matched, until a
          valid draw is found. The draw is deterministic for a given seed, which is what makes the
          organizer link able to reload the exact same pairings later.
        </p>
        <h2>Frequently asked questions</h2>
        <h3>Does this send anything to participants automatically?</h3>
        <p>No — nothing is emailed or messaged. You reveal each person's match on this page and tell them yourself, however you'd like.</p>
        <h3>What if my exclusions make a draw impossible?</h3>
        <p>With too many exclusions relative to the group size, no valid arrangement may exist — you'll see a message asking you to remove one or add more participants.</p>
        <h3>Is my list stored anywhere?</h3>
        <p>Only in this browser and, if you copy it, the organizer link's URL. Nothing is uploaded to a server.</p>
      </section>
    </main>
  );
}
