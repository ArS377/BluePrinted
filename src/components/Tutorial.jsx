import { CloseIcon } from "../icons.jsx";
import { Dialog } from "./Dialog.jsx";

const steps = [
  { label: "Try a save", title: "Save a finding in the sample.",
    body: "Edit the note and choose Save finding. The server stores it for this session. Select a recorded event to highlight its boundary in the map.",
    output: "Next, check Reject the next save and save again. Your draft stays in the form. Explain trace points to the failed write.",
    path: ["Edit a note", "Save finding", "Select an event"] },
  { label: "Create an app", title: "Describe what you want Replit to build.",
    body: "Choose Create your own app, write a prompt, and connect Replit. BluePrinted sends the request and keeps the returned editor link. Replit may ask for input or credits before continuing.",
    output: "A project link confirms that Replit accepted the request. It does not mean the app is finished.",
    path: ["Write a prompt", "Connect Replit", "Open the editor"] },
  { label: "Inspect the code", title: "Check the app in Replit, then inspect it.",
    body: "When the app runs in Replit, return here and choose Inspect build. Replit reports components, routes, and storage. BluePrinted validates and saves that architecture snapshot.",
    output: "Declared boundaries have not been observed running. A runtime event is needed to mark a boundary as observed.",
    path: ["App runs", "Inspect build", "Architecture map"] },
  { label: "Observe & update", title: "Pair the published app to record its actions.",
    body: "Publish the app, open App runtime, and pair its URL. Use the instrumented app to collect events. Send an update when you want a change, then inspect again to compare versions.",
    output: "Pairing requires the BluePrinted bridge in the generated app. Server-only actions need their own instrumentation; pairing alone does not expose them.",
    path: ["Publish & pair", "Use the app", "Compare updates"] }
];

export function Tutorial({ open, step, onStep, onClose, onTry }) {
  const current = steps[step];
  return <Dialog open={open} onClose={onClose} labelledBy="tutorial-title" className="tutorial-sheet">
    <header className="tutorial-head"><strong>BluePrinted guide</strong><button className="icon-button" type="button" onClick={onClose} aria-label="Close guide" autoFocus><CloseIcon /></button></header>
    <div className="tutorial-body">
      <nav className="tutorial-index" aria-label="Guide steps">{steps.map((item, index) => <button className={index === step ? "is-current" : ""} aria-current={index === step ? "step" : undefined}
        type="button" onClick={() => onStep(index)} key={item.label}><span>{index + 1}</span>{item.label}</button>)}</nav>
      <section className="tutorial-plate">
        <p className="context-label">Step {step + 1} of {steps.length}</p>
        <h2 id="tutorial-title">{current.title}</h2>
        <p>{current.body}</p>
        <ol className="tutorial-diagram">{current.path.map((label) => <li key={label}>{label}</li>)}</ol>
        <p className="tutorial-output">{current.output}</p>
      </section>
    </div>
    <footer className="tutorial-foot">
      <button className="button button-paper" type="button" onClick={() => onStep(step - 1)} disabled={step === 0}>Back</button>
      {step < steps.length - 1 ? <button className="button button-ink" type="button" onClick={() => onStep(step + 1)}>Next →</button> : <button className="button button-primary" type="button" onClick={onTry}>Open the sample →</button>}
    </footer>
  </Dialog>;
}
