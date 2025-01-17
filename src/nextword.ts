import { NextWordOptions, NextWordOption } from "./types";
import { gpt } from "./gpt";

interface CompletionsResponse {
  completions: Array<{ tagline: string; explanation: string }>;
}

const MAX_GENERATED_COMPLETIONS = 10;
const MAX_WORDS_SELECTED = 5;

const generateCompletionsPrompt = (
  companyDescription: string,
  partialTagline: string
) => `
You are an expert at creating compelling startup taglines.
Given this company description:
---
${companyDescription}
---
And this partial tagline:
"${partialTagline}"

Generate ${MAX_GENERATED_COMPLETIONS} different ways to complete this tagline, ordered from best to worst. 
Make them diverse in approach but all high quality.

Each completion must start with "${partialTagline}".

Return a JSON object of the form:
{
  "completions": [
    {
      "tagline": string,
      "explanation": string // Brief explanation of why this completion works well
    }
  ]
}
`;

async function generateCompletions(
  companyDescription: string,
  partialTagline: string
) {
  const { completions } = await gpt<CompletionsResponse>(
    generateCompletionsPrompt(companyDescription, partialTagline)
  );
  return completions;
}

function extractNextWords(
  partialTagline: string,
  completions: Array<{ tagline: string; explanation: string }>
): NextWordOption[] {
  const nextWords = new Map<string, { word: string; explanation: string }>();

  for (const completion of completions) {
    const remainingText = completion.tagline
      .slice(partialTagline.length)
      .trim();
    const firstWord = remainingText.split(/\s+/)[0];

    if (
      firstWord &&
      !nextWords.has(firstWord) &&
      nextWords.size < MAX_WORDS_SELECTED
    ) {
      nextWords.set(firstWord, {
        word: firstWord,
        explanation: `Example: "${completion.tagline}"`,
      });
    }
  }

  return Array.from(nextWords.values());
}

export async function generateNextWordOptions(
  companyDescription: string,
  partialTagline: string
): Promise<NextWordOptions> {
  const completions = await generateCompletions(
    companyDescription,
    partialTagline
  );
  const options = extractNextWords(partialTagline, completions);
  return { options };
}
