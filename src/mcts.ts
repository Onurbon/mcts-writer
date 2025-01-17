import * as fs from "fs";
import * as path from "path";
import { completePartialTagline } from "./complete";
import { generateNextWordOptions } from "./nextword";
import { evaluateTagline } from "./eval";
import { TreeNode } from "./types";

const MAX_DEPTH = 10; // Maximum number of words in tagline

function UCB1(node: TreeNode, parentVisits: number): number {
  const n = node.visits;
  const N = parentVisits;
  const C = 0.1;
  const sqrtlogNn = Math.sqrt(Math.log(parentVisits) / node.visits);
  const V = node.total_value / n;
  if (n === 0) return Infinity;
  return V + C * sqrtlogNn;
}

async function select(node: TreeNode): Promise<TreeNode> {
  console.log(`\nSELECT: Current node state: "${node.state}"`);
  if (node.children.length === 0) {
    console.log("→ No children, selecting this node for expansion");
    return node;
  }

  let bestChild = node.children[0];
  let bestScore = UCB1(bestChild, node.visits);

  for (const child of node.children) {
    const score = UCB1(child, node.visits);
    if (score > bestScore) {
      bestScore = score;
      bestChild = child;
    }
  }

  console.log(
    `→ Selected child with state: "${
      bestChild.state
    }" (UCB1 score: ${bestScore.toFixed(3)})`
  );
  return await select(bestChild);
}

async function expand(
  node: TreeNode,
  companyDescription: string,
  currentIteration: number
): Promise<void> {
  console.log(`\nEXPAND: Expanding node with state: "${node.state}"`);

  // Count words in current state
  const wordCount = node.state.trim().split(/\s+/).length;

  // Don't expand if we've reached max depth or already have children
  if (wordCount >= MAX_DEPTH || node.children.length > 0) {
    console.log("→ Skipping expansion (max depth reached or has children)");
    return;
  }

  const options = await generateNextWordOptions(companyDescription, node.state);
  console.log(`→ Generated ${options.options.length} possible next words`);

  node.children = options.options.map((option) => ({
    state: (
      node.state +
      (/^[.,!?]/.test(option.word.trim()) ? "" : " ") +
      option.word
    ).trim(),
    option,
    total_value: 0,
    visits: 0,
    children: [],
    evaluations: [],
    parent: node,
    createdAtIteration: currentIteration,
    history: [],
  }));

  console.log(
    "→ New child states:",
    node.children.map((child) => `"${child.state}"`).join(", ")
  );
}

async function simulate(
  node: TreeNode,
  companyDescription: string,
  currentIteration: number
): Promise<number> {
  console.log(`\nSIMULATE: Running simulation for state: "${node.state}"`);

  const completed = await completePartialTagline(
    companyDescription,
    node.state
  );
  console.log(`→ Completed tagline: "${completed.completedTagline}"`);

  const evaluation = await evaluateTagline(
    companyDescription,
    completed.completedTagline
  );

  console.log(`→ Score: ${evaluation.combined}/10`);

  node.evaluations.push({
    state: completed.completedTagline,
    score: evaluation,
    iteration: currentIteration,
  });

  return evaluation.combined / 10; // Normalize score to 0-1 range for MCTS
}

async function backpropagate(
  node: TreeNode,
  value: number,
  currentIteration: number
): Promise<void> {
  console.log(`\nBACKPROPAGATE: Updating stats along path to root`);

  let current: TreeNode | null = node;
  while (current !== null) {
    current.visits++;
    current.total_value += value;
    current.history.push({
      iteration: currentIteration,
      total_value: current.total_value,
      visits: current.visits,
    });
    console.log(
      `→ Updated node "${current.state}": visits=${current.visits}, total_value=${current.total_value}`
    );
    current = current.parent;
  }
}

async function monteCarloTreeSearch(
  description: string,
  iterations: number
): Promise<TreeNode> {
  console.log("\n=== Starting Monte Carlo Tree Search ===");

  const root: TreeNode = {
    state: "",
    total_value: 0,
    visits: 0,
    children: [],
    evaluations: [],
    parent: null,
    isRoot: true,
    createdAtIteration: 0,
    history: [],
  };

  for (let i = 0; i < iterations; i++) {
    console.log(`\n📍 ITERATION ${i + 1}/${iterations} ${"-".repeat(40)}`);

    const selected = await select(root);
    await expand(selected, description, i);
    const value = await simulate(selected, description, i);
    await backpropagate(selected, value, i);

    console.log(`\nIteration ${i + 1} complete. Current root stats:`);
    console.log(`→ Visits: ${root.visits}`);
    console.log(`→ Total value: ${root.total_value}`);
    console.log(
      `→ Success rate: ${((root.total_value / root.visits) * 100).toFixed(1)}%`
    );
  }

  // Remove circular references before returning
  const prepareForSerialization = (node: TreeNode): any => {
    const { parent, isRoot, ...serializableNode } = node;
    return {
      ...serializableNode,
      children: node.children.map(prepareForSerialization),
    };
  };

  return prepareForSerialization(root);
}

async function main() {
  const companyName = process.argv[2];
  const iterations = parseInt(process.argv[3] || "10");

  if (!companyName) {
    console.error("Please provide a company name");
    process.exit(1);
  }

  // Read company description
  const inputPath = path.join(__dirname, "inputs", `${companyName}.txt`);
  if (!fs.existsSync(inputPath)) {
    console.error(`No description found for ${companyName}`);
    process.exit(1);
  }

  const description = fs.readFileSync(inputPath, "utf-8");
  console.log(`Running MCTS for ${companyName} with ${iterations} iterations`);

  const result = await monteCarloTreeSearch(description, iterations);

  // Save results
  const outputPath = path.join(__dirname, "outputs", `${companyName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Results saved to ${outputPath}`);
}

main().catch(console.error);
