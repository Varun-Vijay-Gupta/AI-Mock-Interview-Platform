export type InterviewPayload = {
  mode: "TECHNICAL" | "HR" | "MIXED";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  interviewerPersona: string;
  companyName?: string;
  roleName?: string;
};
