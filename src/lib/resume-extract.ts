import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isDocx(file: File) {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

export async function extractResumeText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isPdf(file)) {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const normalized = (typeof text === "string" ? text : "").trim();
    if (!normalized) {
      throw new Error("Could not extract text from PDF. Try a text-based PDF or upload DOCX.");
    }
    return normalized;
  }

  if (isDocx(file)) {
    const result = await mammoth.extractRawText({ buffer });
    const normalized = result.value?.trim() ?? "";
    if (!normalized) {
      throw new Error("Could not extract text from DOCX.");
    }
    return normalized;
  }

  throw new Error("Unsupported file type. Upload PDF or DOCX only.");
}

export function parseAiResumeJson(raw: string): Record<string, unknown> {
  const fallback: Record<string, unknown> = {
    skills: [],
    suggestions: ["Add measurable impact metrics to project bullets."],
    atsScore: 72,
  };

  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "react", "node", "nodejs", "sql", "mongodb",
  "postgresql", "aws", "docker", "kubernetes", "html", "css", "tailwind", "nextjs", "express",
  "git", "rest", "api", "graphql", "redis", "spring", "angular", "vue", "c++", "c#", ".net",
];

export function parseResumeLocally(text: string): Record<string, unknown> {
  const lower = text.toLowerCase();
  const skills = SKILL_KEYWORDS.filter((skill) => lower.includes(skill));
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasEmail = /\S+@\S+\.\S+/.test(text);
  const hasPhone = /(\+?\d[\d\s\-().]{7,}\d)/.test(text);
  const bulletCount = (text.match(/[•\-*]\s/g) ?? []).length;

  let atsScore = 55;
  if (wordCount > 200) atsScore += 10;
  if (wordCount > 400) atsScore += 5;
  if (skills.length >= 5) atsScore += 10;
  if (hasEmail) atsScore += 5;
  if (hasPhone) atsScore += 5;
  if (bulletCount >= 5) atsScore += 10;

  const suggestions = [
    bulletCount < 5 ? "Add more bullet points with measurable achievements." : "Good use of bullet structure.",
    skills.length < 4 ? "Include a dedicated skills section with technologies from the job description." : "Skills section looks reasonable.",
    "Tailor project descriptions to match target role keywords.",
  ];

  return {
    skills: [...new Set(skills)],
    experience: text.slice(0, 500),
    atsScore: Math.min(92, atsScore),
    suggestions,
  };
}
