import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onGoTo: (tab: "setup" | "plan") => void;
}

export default function HelpGuide({ open, onClose, onGoTo }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="guide-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <button className="guide-close" onClick={onClose} aria-label="Close guide">×</button>
        <span className="eyebrow">A small field guide</span>
        <h2 id="guide-title">What is The Weeksmith?</h2>
        <p className="guide-lead">It takes all the class groups you <em>could</em> attend and finds complete weekly timetables without collisions. Nothing is uploaded; your data lives in this browser.</p>
        <div className="guide-steps">
          <article><span>1</span><div><h3>Gather your courses</h3><p>Import a semester plan from USOS, or add courses by hand. For each lecture, exercise, or lab, add every group you are willing to attend.</p></div></article>
          <article><span>2</span><div><h3>Describe each group</h3><p>Add its day and time. A group may have several meetings. Mark a component “optional” only if a valid plan may leave it out.</p></div></article>
          <article><span>3</span><div><h3>Choose the fairest week</h3><p>Set your priorities, then browse the ranked results. The first result is the closest match; choose any card to see its calendar.</p></div></article>
        </div>
        <div className="usos-walkthrough">
          <div className="walkthrough-heading">
            <span className="eyebrow">Importing from USOS</span>
            <h3>Bring your timetable into USOSdestroyer</h3>
            <p>Before importing, you must create a plan in USOS and add <strong>all courses and class groups that you attend or could attend</strong>. USOSdestroyer can only find combinations from the choices present on that plan.</p>
          </div>

          <article className="visual-step">
            <div className="mock-browser" aria-label="Illustration of creating a plan in USOS">
              <div className="mock-browser-bar"><i/><i/><i/><span>USOSweb · Student section</span></div>
              <div className="mock-screen">
                <div className="mock-nav">MY USOSWEB</div>
                <div className="mock-title">Plans</div>
                <div className="mock-row active">＋ Create a new plan</div>
                <div className="mock-row">My semester plan</div>
              </div>
            </div>
            <div><b>1. Create a USOS plan</b><p>In USOSweb, open the plan or timetable section and create a new personal plan for the correct semester.</p></div>
          </article>

          <article className="visual-step reverse">
            <div className="mock-browser" aria-label="Illustration of adding every course to a USOS plan">
              <div className="mock-browser-bar"><i/><i/><i/><span>USOSweb · Edit plan</span></div>
              <div className="mock-screen">
                <div className="mock-title">My semester plan</div>
                <div className="mock-course"><em>✓</em> Algorithms <small>lecture · groups 1, 2</small></div>
                <div className="mock-course"><em>✓</em> Databases <small>lab · groups 3, 5</small></div>
                <div className="mock-add">＋ Add course</div>
              </div>
            </div>
            <div><b>2. Add every possible course group</b><p>Add all courses you attend, including every lecture, exercise, and lab group you would accept. A missing group cannot appear in generated results.</p></div>
          </article>

          <article className="visual-step">
            <div className="mock-browser" aria-label="Illustration of opening page source and copying HTML">
              <div className="mock-browser-bar"><i/><i/><i/><span>view-source: usos…</span></div>
              <div className="mock-code"><span>&lt;usos-timetable&gt;</span><br/> &nbsp;&lt;div class="course"&gt;…<br/> &nbsp;&lt;/div&gt;<br/><span>&lt;/usos-timetable&gt;</span><div className="key-hint">Ctrl+A&nbsp;&nbsp; Ctrl+C</div></div>
            </div>
            <div><b>3. Copy the page HTML</b><p>Open the finished plan in <strong>semester view</strong>. Right-click an empty part of the page and choose <strong>View page source</strong> (or press <kbd>Ctrl+U</kbd>). In the new source tab press <kbd>Ctrl+A</kbd>, then <kbd>Ctrl+C</kbd>. On macOS use <kbd>⌘A</kbd> and <kbd>⌘C</kbd>.</p></div>
          </article>

          <article className="visual-step reverse">
            <div className="mock-browser paste-shot" aria-label="Illustration of pasting HTML into USOSdestroyer">
              <div className="mock-browser-bar"><i/><i/><i/><span>USOSdestroyer</span></div>
              <div className="mock-screen"><div className="mock-title">Import from USOS</div><div className="mock-textarea">Paste the copied page HTML here…</div><div className="mock-button">Read plan</div></div>
            </div>
            <div><b>4. Paste it into USOSdestroyer</b><p>Return here, open <strong>Import from USOS</strong>, paste the copied HTML into the box, choose <strong>Read plan</strong>, review what was found, and finally choose <strong>Add to my courses</strong>.</p></div>
          </article>
        </div>
        <div className="plan-walkthrough">
          <div className="walkthrough-heading">
            <span className="eyebrow">Choosing the best plan</span>
            <h3>“Best” means best for you</h3>
            <p>USOSdestroyer first rejects schedules with collisions, then ranks every valid timetable using the preferences you enable. The preference at the top has the strongest influence; each preference below it has less.</p>
          </div>

          <div className="ranking-shot" aria-label="Illustration of arranging timetable ranking priorities">
            <div className="shot-priorities">
              <strong>What makes a good week?</strong>
              <div><i>1</i><span>✓ Minimize gaps <small>Less waiting between classes</small></span><b>↑ ↓</b></div>
              <div><i>2</i><span>✓ Maximize free days <small>More days with no classes</small></span><b>↑ ↓</b></div>
              <div><i>3</i><span>✓ Late starts / early finishes <small>Shorter, friendlier class days</small></span><b>↑ ↓</b></div>
              <div className="muted"><i>4</i><span>□ Minimize class days <small>Unticked criteria are ignored</small></span><b>↑ ↓</b></div>
            </div>
            <div className="shot-note"><span>☝</span><div><b>Tick, untick, and reorder</b><p>Use the arrows to put your most important preference first. Untick anything that should not affect the ranking.</p></div></div>
          </div>

          <div className="choice-grid">
            <article><span>☕</span><h4>Minimize gaps</h4><p>Prefers less idle time between the first and last class of each day.</p></article>
            <article><span>🌿</span><h4>Maximize free days</h4><p>Prefers more entirely class-free weekdays. Weekends count if a result uses them.</p></article>
            <article><span>🌤️</span><h4>Late starts / early finishes</h4><p>Balances starting later with finishing earlier across all class days.</p></article>
            <article><span>🗺️</span><h4>Minimize class days</h4><p>Clusters classes onto fewer days, even if the selected days are busier.</p></article>
          </div>

          <div className="results-shot" aria-label="Illustration of browsing and viewing ranked plans">
            <div className="shot-results">
              <strong>Possible paths <small>18 plans</small></strong>
              <div className="result-card chosen"><b>#1</b><small>gaps: 30m · free days: 2 · days used: 3</small></div>
              <div className="result-card"><b>#2</b><small>gaps: 1h · free days: 3 · days used: 2</small></div>
              <div className="result-card"><b>#3</b><small>gaps: 1h 30m · free days: 2 · days used: 3</small></div>
            </div>
            <div className="shot-calendar">
              <strong>Your week · option #1</strong>
              <div className="mini-days"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div>
              <div className="mini-week"><i className="class-a">Algorithms<br/><small>10:00–11:30</small></i><i className="class-b">Databases<br/><small>12:00–13:30</small></i><i className="class-c">Lab<br/><small>09:00–10:30</small></i></div>
            </div>
          </div>
          <p className="screenshot-caption"><strong>How to compare:</strong> select any numbered result on the left to display its full weekly calendar. Compare its gap time, number of free days, and days used—not only its score.</p>

          <div className="possibilities-list">
            <h4>What else the planner understands</h4>
            <ul>
              <li><strong>Odd and even weeks:</strong> classes at the same time do not clash when one occurs only on odd weeks and the other only on even weeks.</li>
              <li><strong>Several meetings per group:</strong> one group can meet multiple times during the week.</li>
              <li><strong>Equivalent groups:</strong> groups with identical times are shown together instead of creating duplicate-looking plans.</li>
              <li><strong>Optional components:</strong> if no complete plan works, the planner can omit the smallest possible set of components you marked optional.</li>
              <li><strong>Temporary exclusion:</strong> turn off “Include” to generate plans without an entire course, without deleting it.</li>
              <li><strong>Rooms and weekends:</strong> locations appear on the calendar, and Saturday/Sunday are displayed whenever needed.</li>
            </ul>
          </div>
        </div>
        <aside className="guide-tip"><strong>A useful distinction:</strong> “Include” controls whether an entire course enters the search. “Optional” allows only that one component to be skipped if no complete timetable exists.</aside>
        <div className="guide-actions">
          <button className="secondary-cta" onClick={() => onGoTo("setup")}>Go to courses</button>
          <button className="primary-cta" onClick={() => onGoTo("plan")}>See plans <span>→</span></button>
        </div>
      </section>
    </div>
  );
}
