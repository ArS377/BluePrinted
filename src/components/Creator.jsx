import { useEffect, useState } from "react";
import { ArrowIcon } from "../icons.jsx";
import { promptExamples } from "../sample-data.js";
import { draftKey, readDraft, writeDraft } from "../workspace-state.js";

function storage() { try { return window.sessionStorage; } catch { return null; } }

export function Creator({ connected, busy, onCreate, onConnect }) {
  const [draft, setDraft] = useState(() => readDraft(storage()));
  const [saved, setSaved] = useState(true);
  const { name, prompt } = draft;
  const setField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  useEffect(() => { setSaved(writeDraft(storage(), draft)); }, [draft]);

  async function submit(event) {
    event.preventDefault();
    writeDraft(storage(), draft);
    if (!connected) { onConnect(); return; }
    const result = await onCreate({ name, prompt });
    if (result?.project) {
      try { storage()?.removeItem(draftKey); } catch { /* Storage can be unavailable in private browsing. */ }
    }
  }

  return (
    <section className="creator" aria-labelledby="creator-title">
      <header className="creator-intro">
        <span className="context-label">New app</span>
        <h1 id="creator-title">What would you like to build?</h1>
        <p>Replit builds the app from your prompt. BluePrinted maps the code and collects events from the actions you run.</p>
      </header>
      <div className="creator-grid">
        <div>
          <form className="prompt-desk" onSubmit={submit}>
            <div className="prompt-desk-head">
              <label htmlFor="project-name">Project name <span>optional</span></label>
              <input id="project-name" value={name} onChange={(event) => setField("name", event.target.value)} placeholder="Research desk" maxLength={72} disabled={busy} />
            </div>
            <label className="prompt-label" htmlFor="project-prompt">Describe the app</label>
            <textarea id="project-prompt" value={prompt} onChange={(event) => setField("prompt", event.target.value)}
              placeholder="Who uses it? What should they be able to do? Include one action you want to follow through the code."
              minLength={20} maxLength={4000} required disabled={busy} aria-describedby="draft-status" />
            <div className="prompt-desk-foot">
              <span>{prompt.length.toLocaleString()} / 4,000</span>
              <button className="button button-primary" type="submit" disabled={busy || prompt.trim().length < 20}>
                {busy ? "Sending request…" : connected ? "Build on Replit" : "Connect Replit to build"}{!busy && <ArrowIcon />}
              </button>
            </div>
            <p className="draft-status" id="draft-status">{saved ? "Draft saved in this browser tab. Connecting will keep it here." : "This browser cannot save the draft. Copy your prompt before connecting."}</p>
          </form>
          <div className="prompt-examples"><span>Need a starting point?</span><div>
            {promptExamples.map((example) => <button type="button" disabled={busy} onClick={() => setField("prompt", example)} key={example}>{example}</button>)}
          </div></div>
        </div>
        <aside className="creation-steps">
          <h2>After you send the prompt</h2>
          <ol>
            <li><strong>Open the Replit editor</strong><p>Watch the build and answer any setup questions there.</p></li>
            <li><strong>Inspect the finished app</strong><p>Return here to save its architecture map.</p></li>
            <li><strong>Publish and pair</strong><p>Connect the published app, then use it to collect traces.</p></li>
          </ol>
          <p>Replit controls build and publishing limits. BluePrinted cannot bypass credit limits or complete account setup for you.</p>
        </aside>
      </div>
    </section>
  );
}
