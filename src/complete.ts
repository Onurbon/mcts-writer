import { CompletedTagline } from "./types";
import { gpt } from "./gpt";

const optimisers = [
  "clarity",
  "memorability",
  "emotion",
  "brevity",
  "uniqueness",
  "relevance",
  "consistency",
  "action",
  "timelessness",
  "seo",
  "creativity",
  "appeal",
  "versatility",
  "sensitivity",
  "differentiation",
  "curiosity",
  "positivity",
  "credibility",
  "catchiness",
  "humor",
  "impact",
  "simplicity",
  "engagement",
  "recognition",
  "authenticity",
  "innovation",
  "inspiration",
  "trust",
  "originality",
  "connection",
];

export const completePartialTaglinePrompt = (
  companyDescription: string,
  partialTagline: string
) => {
  // Randomly shuffle and pick 4 unique optimisers
  const shuffled = [...optimisers].sort(() => Math.random() - 0.5);
  const [focusOn1, focusOn2, ignore1, ignore2] = shuffled.slice(0, 4);

  return `
Given this company description:
---
${companyDescription}
---
And this partial tagline:
"${partialTagline}"

Complete the tagline in a compelling way.
If not sure what to optimise for, try to focus on ${focusOn1} or ${focusOn2} 
without worrying too much about ${ignore1} and ${ignore2}.

Return a JSON object of the form:
{
  "completedTagline": string,
  "explanation": string // keep it concise!
}

Remember that the completed tagline must start with "${partialTagline}"
`;
};

export const completePartialTagline = async (
  companyDescription: string,
  partialTagline: string
): Promise<CompletedTagline> => {
  return await gpt<CompletedTagline>(
    completePartialTaglinePrompt(companyDescription, partialTagline)
  );
};
