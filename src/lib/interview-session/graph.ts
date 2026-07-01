import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { ConversationTurn, EvaluationResult, InterviewContext, SessionState } from "./types";
import {
  evaluateAnswerNode,
  finishInterviewNode,
  followUpDecisionNode,
  generateNextQuestionNode,
  startInterviewNode,
} from "./nodes";

type GraphState = {
  ctx: InterviewContext;
  session: SessionState;
  history: ConversationTurn[];
  candidateAnswer: string;
  evaluation: EvaluationResult | null;
  interviewerMessage: string | null;
  done: boolean;
};

const GraphAnnotation = Annotation.Root({
  ctx: Annotation<InterviewContext>,
  session: Annotation<SessionState>,
  history: Annotation<ConversationTurn[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  candidateAnswer: Annotation<string>({ reducer: (_, next) => next, default: () => "" }),
  evaluation: Annotation<EvaluationResult | null>({ reducer: (_, next) => next, default: () => null }),
  interviewerMessage: Annotation<string | null>({ reducer: (_, next) => next, default: () => null }),
  done: Annotation<boolean>({ reducer: (_, next) => next, default: () => false }),
});

async function evaluateNode(state: GraphState): Promise<Partial<GraphState>> {
  const { evaluation, state: newSession } = await evaluateAnswerNode(
    state.ctx,
    state.session,
    state.candidateAnswer,
    state.history,
  );
  return { evaluation, session: newSession };
}

async function followUpNode(state: GraphState): Promise<Partial<GraphState>> {
  if (!state.evaluation) return {};
  const { isFollowUp, message, state: newSession } = await followUpDecisionNode(
    state.ctx,
    state.session,
    state.evaluation,
  );
  if (isFollowUp && message) {
    const turn: ConversationTurn = {
      role: "interviewer",
      content: message,
      timestamp: new Date().toISOString(),
      topic: state.evaluation.topicLabel,
    };
    return {
      session: newSession,
      history: [...state.history, turn],
      interviewerMessage: message,
      done: false,
    };
  }
  return { session: newSession };
}

async function nextQuestionNode(state: GraphState): Promise<Partial<GraphState>> {
  const { state: newSession, message } = await generateNextQuestionNode(state.ctx, state.session, state.history);
  if (newSession.phase === "closing") {
    const turn: ConversationTurn = {
      role: "interviewer",
      content: message,
      timestamp: new Date().toISOString(),
    };
    return {
      session: newSession,
      history: [...state.history, turn],
      interviewerMessage: message,
      done: true,
    };
  }
  const turn: ConversationTurn = {
    role: "interviewer",
    content: message,
    timestamp: new Date().toISOString(),
    topic: newSession.topicsCovered.at(-1),
  };
  return {
    session: newSession,
    history: [...state.history, turn],
    interviewerMessage: message,
    done: false,
  };
}

function routeAfterFollowUp(state: GraphState): "nextQuestion" | typeof END {
  if (state.interviewerMessage) return END;
  return "nextQuestion";
}

export function buildTurnGraph() {
  return new StateGraph(GraphAnnotation)
    .addNode("evaluate", evaluateNode)
    .addNode("followUp", followUpNode)
    .addNode("nextQuestion", nextQuestionNode)
    .addEdge(START, "evaluate")
    .addEdge("evaluate", "followUp")
    .addConditionalEdges("followUp", routeAfterFollowUp, { nextQuestion: "nextQuestion", [END]: END })
    .addEdge("nextQuestion", END)
    .compile();
}

export async function runStartInterview(ctx: InterviewContext, session: SessionState) {
  return startInterviewNode(ctx, session);
}

export async function runTurnGraph(
  ctx: InterviewContext,
  session: SessionState,
  history: ConversationTurn[],
  candidateAnswer: string,
) {
  const graph = buildTurnGraph();
  const candidateTurn: ConversationTurn = {
    role: "candidate",
    content: candidateAnswer,
    timestamp: new Date().toISOString(),
    topic: session.topicsCovered.at(-1),
  };
  const historyWithAnswer = [...history, candidateTurn];

  const result = await graph.invoke({
    ctx,
    session,
    history: historyWithAnswer,
    candidateAnswer,
    evaluation: null,
    interviewerMessage: null,
    done: false,
  });

  return {
    session: result.session as SessionState,
    history: result.history as ConversationTurn[],
    interviewerMessage: result.interviewerMessage as string | null,
    evaluation: result.evaluation as EvaluationResult | null,
    done: result.done as boolean,
  };
}

export async function runFinishOnly(ctx: InterviewContext, session: SessionState, history: ConversationTurn[]) {
  return finishInterviewNode(ctx, session, history);
}
