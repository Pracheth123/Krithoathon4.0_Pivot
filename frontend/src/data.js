export const dummyCandidates = [
  {
    id: "C-101",
    name: "Alex Mercer",
    score: 94,
    skills: [
      { name: "React", match: "Mapped from candidate text: 'Built multiple single-page applications using React'" },
      { name: "Node.js", match: "Mapped from candidate text: 'Developed RESTful backends with Node & Express'" },
      { name: "AWS", match: "Mapped from candidate text: 'Deployed serverless architectures on AWS Lambda'" }
    ],
    github_url: "https://github.com/alexcoder",
    tcfe_metrics: { continuity_score: 0.85, burst_score: 0.1, burst_detected: false },
    sanitized_text: "Built multiple single-page applications using React... Deployed serverless architectures on AWS Lambda",
    xaiExplanation: "Strong match due to direct alignment with core JD requirements. Alex brings heavy experience in building React SPAs and Node.js backends. The candidate specifically demonstrated scaling services similar to our current architecture."
  },
  {
    id: "C-102",
    name: "Sarah Jenkins",
    score: 89,
    skills: [
      { name: "Python", match: "Mapped from candidate text: 'Architected data pipelines in Python'" },
      { name: "Scrum", match: "Mapped from candidate text: 'Led coordinated delivery of cross-functional teams'" },
      { name: "Docker", match: "Mapped from candidate text: 'Containerized all microservices using Docker'" }
    ],
    github_url: "https://github.com/sarahj",
    tcfe_metrics: { continuity_score: 0.92, burst_score: 0.05, burst_detected: false },
    sanitized_text: "Architected data pipelines in Python... Containerized all microservices using Docker",
    xaiExplanation: "Solid alignment on backend scripting and project management. The system mapped 'coordinated delivery' directly to 'Scrum'. Sarah covers the containerization requirements perfectly."
  },
  {
    id: "C-103",
    name: "Prachethm Iriyala",
    score: 82,
    skills: [
      { name: "AI/ML", match: "Mapped from candidate text: 'Aspiring AI/ML Engineer'" },
      { name: "Backend", match: "Mapped from candidate text: 'Professional Summary included backend references'" }
    ],
    github_url: "https://github.com/Pracheth123",
    tcfe_metrics: {
      continuity_score: 0.3333,
      burst_score: 1,
      burst_detected: true
    },
    sanitized_text: "[PERSON]prachethm iriyala @gmail.com    |   +91 9182603243  \nGitHub: https://github.com/Pracheth123   |   LinkedIn: https://www.linkedin.com/in/pracheth -m-730043322/  \nHyderabad, [GPE]  \nProfessional Summary  \nAspiring AI/ML Engineer...",
    xaiExplanation: "High technical competency but noticeably flagged by True Candidate Fairness Engine (TCFE) for burst-committing prior to application. High burst_score (1.0) and low continuity_score (0.33) triggers the required amber warning."
  },
  {
    id: "C-104",
    name: "Elena Rodriguez",
    score: 75,
    skills: [
      { name: "Data Science", match: "Mapped from candidate text: 'Applied machine learning models'" },
      { name: "SQL", match: "Mapped from candidate text: 'Extracted datasets using complex SQL aggregations'" }
    ],
    github_url: "https://github.com/elenadata",
    tcfe_metrics: { continuity_score: 0.65, burst_score: 0.2, burst_detected: false },
    sanitized_text: "Applied machine learning models... Extracted datasets using complex SQL aggregations",
    xaiExplanation: "Good fundamentals but skillset is skewed toward Data Science rather than Full-Stack Web Development as outlined in the JD. Match penalty applied for lacking frontend framework exposure."
  }
];

export const dummyGraphData = {
  nodes: [
    { id: "Software Engineering", group: 1, core: true },
    { id: "Backend",              group: 1, core: true },
    { id: "Frontend",             group: 1, core: true },
    { id: "Project Management",   group: 1, core: true },
    { id: "React",      group: 2 },
    { id: "Node.js",    group: 2 },
    { id: "AWS",        group: 2 },
    { id: "Python",     group: 2 },
    { id: "Docker",     group: 2 },
    { id: "Agile",      group: 3 },
    { id: "Scrum",      group: 3 },
    { id: "Java",       group: 4 },
    { id: "Spring Boot",group: 4 }
  ],
  links: [
    { source: "Software Engineering", target: "Backend", value: 1 },
    { source: "Software Engineering", target: "Frontend", value: 1 },
    { source: "Frontend", target: "React", value: 1 },
    { source: "Backend", target: "Node.js", value: 1 },
    { source: "Backend", target: "AWS", value: 1 },
    { source: "Backend", target: "Python", value: 1 },
    { source: "Backend", target: "Docker", value: 1 },
    { source: "Backend", target: "Java", value: 1 },
    { source: "Java", target: "Spring Boot", value: 1 },
    { source: "Project Management", target: "Agile", value: 1 },
    { source: "Agile", target: "Scrum", value: 1 }
  ],
  covered_skills: ["React", "Node.js", "Python", "Scrum", "Docker", "AWS"],
  gap_skills: ["Java", "Spring Boot"]
};
