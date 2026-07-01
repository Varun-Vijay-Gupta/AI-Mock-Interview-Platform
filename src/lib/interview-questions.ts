export type InterviewQuestion = {
  question: string;
  category: string;
  mode: "TECHNICAL" | "HR" | "BEHAVIORAL" | "CODING" | string;
};

export type InterviewMode = "TECHNICAL" | "HR" | "MIXED";

function normalizeMode(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "_");
}

function isHrQuestion(q: InterviewQuestion) {
  const mode = normalizeMode(q.mode ?? "");
  const category = (q.category ?? "").toLowerCase();
  return mode === "HR" || mode === "BEHAVIORAL" || category.includes("hr") || category.includes("behavior");
}

function isTechnicalQuestion(q: InterviewQuestion) {
  const mode = normalizeMode(q.mode ?? "");
  const category = (q.category ?? "").toLowerCase();
  if (isHrQuestion(q)) return false;
  return (
    mode === "TECHNICAL" ||
    mode === "CODING" ||
    category.includes("technical") ||
    category.includes("coding") ||
    category.includes("system") ||
    category.includes("react") ||
    category.includes("node") ||
    category.includes("database") ||
    category.includes("dsa")
  );
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dedupeQuestions(items: InterviewQuestion[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.question.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function selectLiveQuestions(
  pool: InterviewQuestion[],
  mode: InterviewMode,
  options?: { companyName?: string; roleName?: string; techRequirements?: string },
): InterviewQuestion[] {
  const targetCount = 8;
  const technicalPool = dedupeQuestions(pool.filter(isTechnicalQuestion));
  const hrPool = dedupeQuestions(pool.filter(isHrQuestion));

  const contextualTechnical = buildContextualTechnicalQuestions(options);
  const contextualHr = buildContextualHrQuestions(options);

  let selected: InterviewQuestion[] = [];

  if (mode === "TECHNICAL") {
    selected = [...shuffle([...contextualTechnical, ...technicalPool])];
  } else if (mode === "HR") {
    selected = [
      { question: "Tell me about yourself.", category: "Introduction", mode: "HR" },
      ...shuffle([...contextualHr, ...hrPool]),
    ];
  } else {
    const techCount = 6;
    const hrCount = 2;
    selected = [
      { question: "Tell me about yourself.", category: "Introduction", mode: "HR" },
      ...shuffle([...contextualTechnical, ...technicalPool]).slice(0, techCount),
      ...shuffle([...contextualHr, ...hrPool]).slice(0, hrCount),
    ];
  }

  return dedupeQuestions(selected).slice(0, targetCount);
}

function buildContextualTechnicalQuestions(options?: {
  companyName?: string;
  roleName?: string;
  techRequirements?: string;
}): InterviewQuestion[] {
  const company = options?.companyName ?? "the company";
  const role = options?.roleName ?? "this role";
  const stack = options?.techRequirements ?? "the required tech stack";

  return [
    {
      question: `For the ${role} role at ${company}, how would you architect a feature using ${stack}?`,
      category: "Architecture",
      mode: "TECHNICAL",
    },
    {
      question: `Explain how you would debug a production issue in a ${stack} application.`,
      category: "Debugging",
      mode: "TECHNICAL",
    },
    {
      question: `What trade-offs would you consider when scaling a backend built with ${stack}?`,
      category: "System Design",
      mode: "TECHNICAL",
    },
    {
      question: `Walk through how you would design authentication and authorization for a ${role} project.`,
      category: "Security",
      mode: "TECHNICAL",
    },
    {
      question: `Describe a performance optimization you implemented using ${stack}.`,
      category: "Performance",
      mode: "TECHNICAL",
    },
    {
      question: `How do you ensure code quality and testing in projects involving ${stack}?`,
      category: "Best Practices",
      mode: "TECHNICAL",
    },
  ];
}

function buildContextualHrQuestions(options?: { companyName?: string; roleName?: string }): InterviewQuestion[] {
  const company = options?.companyName ?? "our company";
  const role = options?.roleName ?? "this position";

  return [
    { question: `Why do you want to join ${company} as a ${role}?`, category: "Motivation", mode: "HR" },
    { question: "Describe a conflict in your team and how you resolved it.", category: "Behavioral", mode: "HR" },
    { question: "What are your strengths and weaknesses for this role?", category: "Self Assessment", mode: "HR" },
    { question: "Tell me about a failure and what you learned from it.", category: "Behavioral", mode: "HR" },
  ];
}

export function parseQuestionPool(raw: unknown): InterviewQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return { question: item, category: "General", mode: "TECHNICAL" };
      if (item && typeof item === "object" && "question" in item) {
        const q = item as Record<string, unknown>;
        return {
          question: String(q.question ?? ""),
          category: String(q.category ?? "General"),
          mode: String(q.mode ?? "TECHNICAL"),
        };
      }
      return null;
    })
    .filter((q): q is InterviewQuestion => Boolean(q?.question?.trim()));
}
