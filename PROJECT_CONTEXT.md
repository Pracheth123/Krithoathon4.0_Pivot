# Project Context: TalentGraph AI

## 1. Problem Statement
**Domain:** EdTech / HR Technology - ATS vs Qualified Candidates
**Scenario:** Modern Applicant Tracking Systems (ATS) often filter out genuinely qualified candidates because unstructured formatting causes parsers to miss relevant keywords. This creates a massive gap between talent availability and talent discovery.
**Goal:** Build a fair, semantic solution that addresses this measurable gap. The solution needs to go beyond keyword matching to translate corporate jargon into a standardized skill taxonomy, provide explainable match logic, and utilize a True Candidate Fairness Engine (TCFE) to flag metrics inflation.

## 2. Tech Stack & Architecture
We have created a Vite + React application locally to serve as the project frontend. It uses a premium dark-mode, glassmorphism aesthetic built from scratch.
- **Frontend Framework:** React + Vite
- **Data Visualization:** D3.js (Force-directed network graphs for mapping skill datasets)
- **Icons:** `lucide-react`
- **Styling:** Custom CSS (`index.css`) defining variables, flex/grid layouts, scrollbars, and tooltips.

## 3. UI Dashboard Blueprint (Fully Built)
The dashboard is structured as a Single-Page App with a persistent global Sidebar and four main content panels:

* **Panel 1: The Ingestion Console (Data Upload)**
  * A drag-and-drop file upload zone for recruiters to process resumes.
  * A live terminal feed that simulates the ingestion process (stripping PII, embedding data, connecting to Vector DB).

* **Panel 2: The Query Terminal (Search Input)**
  * An interface to paste the full Job Description (JD).
  * Includes a Slider for "Number of Candidates" and a Toggle for "TCFE Strict Mode".
  * **Taxonomy Expansion Log:** A terminal feed displaying `[SYSTEM] Normalizing Job Requirements...` to show users that the system translates complex phrasing into standardized taxonomy clusters before querying.

* **Panel 3: Candidate Ranker (Results & XAI)**
  * Renders a ranked list of candidate profiles.
  * Expanding a candidate row reveals the **XAI (Explainable AI) Report** and GitHub activity metrics.
  * Contains hover tooltips directly on skill badges confirming Traceability (e.g. *"Mapped from candidate text..."*).
  * Implements the **TCFE flag UI**: Displays an amber `<AlertTriangle />` when a candidate is flagged for metric manipulation (like GitHub burst commits).

* **Panel 4: Competitive Skill Gap Topology (CSGT)**
  * An interactive force-directed network graph natively implemented using D3.js.
  * Nodes represent standardized skills. The "Show Gap Topology" button selectively colors `gap_skills` in red across the entire talent pool vs the JD.

## 4. Current Iteration & Backend Integration
The UI components are entirely mapped to the API schema and populated via a centralized `data.js` object. We just modified the React logic to successfully accept and render the live backend JSON Contract for the data ingestion endpoint.

**The Current Data Contract Processed by the UI:**
```json
{
  "github_url": "https://github.com/Pracheth123",
  "tcfe_metrics": {
    "continuity_score": 0.3333,
    "burst_score": 1,
    "burst_detected": true
  },
  "sanitized_text": "[PERSON]prachethm iriyala @gmail.com..."
}
```

**How the Frontend Handles this Payload:**
1. Dynamically toggles an amber UI badge if `tcfe_metrics.burst_detected` is `true`.
2. Prints the real `continuity_score` and `burst_score` explicitly in the GitHub Tracker drawer for transparency.
3. Automatically triggers the Ingestion terminal logging of any generated URLs.

## 5. The Immediate Next Steps
The frontend mock is functionally complete and ready to swap hardcoded JSON state for native `fetch()` calls.
The immediate next step is writing out the backend python API endpoints (specifically the `main.py` ingestion pipeline) to process actual uploaded PDFs and serve the resulting JSON to the React modules.
