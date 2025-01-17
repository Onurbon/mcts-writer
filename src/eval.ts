import { TaglineScore, ComponentScore } from "./types";
import { gpt } from "./gpt";

const clearPrompt = (description: string, tagline: string) => `
You are an expert at analyzing how well taglines communicate a company's value proposition. Be brutally honest and don't sugar-coat your assessment. Your role is to provide objective analysis without concern for feelings or relationships.

Rate this tagline on clarity (1-5):
1 = Completely unclear what the company does
2 = Vague or misleading about company purpose
3 = Basic understanding possible but lacks precision
4 = Clear value proposition with minor ambiguity
5 = Perfect clarity of purpose and value

Examples and their ratings:
"Just Do It" - 2: Famous but unclear about shoes/sports
"Your Pizza in 30 Minutes or Free" - 5: Crystal clear promise
"Think Different" - 1: Says nothing about computers/tech
"The Ultimate Driving Machine" - 4: Clear premium cars focus
"Coffee All Day Long" - 3: Suggests food/drinks but imprecise

More examples in the domain of AI startups:
"AI for Everyone" - 1: Says nothing about specific value/purpose
"Train ML Models 10x Faster" - 5: Crystal clear proposition
"Empowering the Future" - 2: Vague tech platitude
"Your AI Writing Assistant" - 4: Clear purpose with slight ambiguity
"Intelligence Amplified" - 2: Unclear what product/service offers

Company Description:
${description}

Tagline to evaluate:
"${tagline}"

Return a JSON object with:
{
  "score": number,
  "explanation": string (max 10 words, be direct and candid)
}
`;

const simplePrompt = (description: string, tagline: string) => `
You are an expert linguist specializing in rhythm, melody and grammar. Give your  professional opinion. Focus purely on linguistic merit.

Rate this tagline on simplicity (1-5):
1 = Awkward/incorrect grammar or hard to pronounce
2 = Clunky rhythm or confusing structure
3 = Functional but unremarkable flow
4 = Smooth and pleasant to say
5 = Perfect rhythm and memorable sound pattern

Examples and their ratings:
"Melts in Your Mouth, Not in Your Hands" - 5: Perfect rhythm
"Like a Good Neighbor There When You Need" - 4: Natural flow
"The Quicker Picker Upper" - 3: Okay but slightly forced
"We Try Harder Because We're Number Two" - 2: Awkward
"Solutions for a smart-planet" - 1: Hyphen makes it jarring

More examples in the domain of AI startups:
"Write Better, Write Faster" - 5: Perfect rhythm and alliteration
"Enterprise AI Infrastructure Solutions" - 1: Clunky corporate speak
"AI That Works For You" - 4: Natural, conversational flow
"Democratizing Artificial Intelligence Today" - 2: Too many syllables
"Smart Answers, Instant Results" - 5: Balanced, memorable pattern

Tagline to evaluate:
"${tagline}"

Return a JSON object with:
{
  "score": number,
  "explanation": string (max 10 words, be direct and candid)
}
`;

const creativityPrompt = (description: string, tagline: string) => `
You are an expert creative director who has evaluated thousands of taglines. Be completely honest without concern for feelings. Your job is to judge creativity objectively, not to make friends.

Rate this tagline on creativity (1-5):
1 = Generic/forgettable corporate speak
2 = Common phrases with little originality
3 = Somewhat interesting but not remarkable
4 = Creative and memorable approach
5 = Brilliantly unique and unforgettable

Examples and their ratings:
"Think Different" - 5: Brilliantly challenges convention
"The Happiest Place on Earth" - 4: Emotionally evocative
"Save Money. Live Better." - 3: Clear but unremarkable
"Leading Innovation" - 2: Generic tech company phrase
"Business Solutions Provider" - 1: Completely forgettable

More examples in the domain of AI startups:
"Your Second Brain, Your First Choice" - 5: Clever wordplay
"AI-Powered Productivity" - 1: Generic tech description
"Turn Data Into Dreams" - 4: Evocative transformation metaphor
"Making AI Simple" - 2: Common basic phrase
"Where Algorithms Meet Imagination" - 5: Unique and memorable

Company Description:
${description}

Tagline to evaluate:
"${tagline}"

Return a JSON object with:
{
  "score": number,
  "explanation": string (max 10 words, be direct and candid)
}
`;

const strengthPrompt = (description: string, tagline: string) => `
You are an expert at analyzing the impact and boldness of marketing messages. Give your harshest, most honest critique. Don't hold back - we need objective truth, not politeness.

Rate this tagline on strength (1-5):
1 = Weak, timid, or apologetic tone
2 = Passive or lacking conviction
3 = Moderate assertiveness
4 = Strong and confident
5 = Extremely bold and powerful

Examples and their ratings:
"The King of Beers" - 5: Ultimate authority claim
"Challenge Everything" - 4: Bold call to action
"Life's Good" - 3: Positive but not particularly bold
"We Try Harder" - 2: Admits second place
"Banking Made Nice" - 1: Apologetic, weak positioning

More examples in the domain of AI startups:
"Revolutionizing AI Development" - 3: Standard tech claim
"The Future of Work is Here" - 4: Bold, definitive statement
"We Make AI Better" - 2: Lacks specificity and power
"Master Any Skill Instantly" - 5: Extremely bold promise
"Helping Teams Use AI" - 1: Passive, understated positioning

Company Description:
${description}

Tagline to evaluate:
"${tagline}"

Return a JSON object with:
{
  "score": number,
  "explanation": string (max 10 words, be direct and candid)
}
`;

const getWeight = (score: number): number => {
  if (score === 1 || score === 5) return 5; // Highest weight for extreme scores
  if (score === 2 || score === 4) return 2; // Medium weight for moderate scores
  return 1; // Base weight for middle score
};

const computeCombinedScore = (scores: {
  clarity: number;
  simplicity: number;
  creativity: number;
  strength: number;
}): number => {
  const scoreEntries = Object.values(scores);
  const weightedSum = scoreEntries.reduce(
    (sum, score) => sum + score * getWeight(score),
    0
  );
  const totalWeight = scoreEntries.reduce(
    (sum, score) => sum + getWeight(score),
    0
  );
  const combined = weightedSum / totalWeight;
  return combined;
};

export const evaluateTagline = async (
  description: string,
  tagline: string
): Promise<TaglineScore> => {
  // Run all evaluations in parallel
  const [clarity, simplicity, creativity, strength] = await Promise.all([
    gpt<ComponentScore>(clearPrompt(description, tagline)),
    gpt<ComponentScore>(simplePrompt(description, tagline)),
    gpt<ComponentScore>(creativityPrompt(description, tagline)),
    gpt<ComponentScore>(strengthPrompt(description, tagline)),
  ]);

  const combined = computeCombinedScore({
    clarity: clarity.score,
    simplicity: simplicity.score,
    creativity: creativity.score,
    strength: strength.score,
  });

  return {
    combined,
    clarity,
    simplicity,
    creativity,
    strength,
  };
};
