export type TaglineEvaluation = {
  score: number;
  reasoning: string;
};

export type TaglineResponse = {
  tagline: string;
  reasoning: string;
};

export type CompletedTagline = {
  completedTagline: string;
  explanation: string;
};

export type NextWordOption = {
  word: string;
  explanation: string;
};

export type NextWordOptions = {
  options: NextWordOption[];
};

export type ComponentScore = {
  score: number;
  explanation: string;
};

export type TaglineScore = {
  combined: number;
  clarity: ComponentScore;
  simplicity: ComponentScore;
  creativity: ComponentScore;
  strength: ComponentScore;
};

export type TreeNode = {
  state: string;
  total_value: number;
  option?: NextWordOption;
  visits: number;
  children: TreeNode[];
  evaluations: {
    state: string;
    score: TaglineScore;
    iteration: number;
  }[];
  parent: TreeNode | null;
  isRoot?: boolean;
  createdAtIteration: number;
  history: {
    iteration: number;
    total_value: number;
    visits: number;
  }[];
};
