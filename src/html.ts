import { writeFileSync, readFileSync } from "fs";
import { TreeNode } from "./types";

function generateNodeHtml(node: TreeNode, maxIteration: number): string {
  // Skip nodes with no evaluations, or nodes created after maxIteration
  if (node.createdAtIteration > maxIteration) {
    return "";
  }

  // Filter evaluations up to maxIteration
  const filteredEvaluations = node.evaluations.filter(
    (e) => e.iteration <= maxIteration
  );

  // If no evaluations and no children with evaluations, skip this node
  const childrenHtml = node.children
    .map((child) => generateNodeHtml(child, maxIteration))
    .join("");

  if (filteredEvaluations.length === 0 && !childrenHtml) {
    return "";
  }

  // Find the latest history entry up to maxIteration
  const latestHistory = [...node.history]
    .filter((h) => h.iteration <= maxIteration)
    .sort((a, b) => b.iteration - a.iteration)[0];

  // Calculate score based on history
  const visits = latestHistory?.visits || 0;
  const totalValue = latestHistory?.total_value || 0;
  const avgValue = visits > 0 ? (totalValue / visits) * 10 : 0;
  const score = avgValue.toFixed(2);

  const evaluationsHtml = filteredEvaluations
    .map(
      (e) => `
    <div class="evaluation" title="" data-tooltip="Clarity: ${
      e.score.clarity.score
    } - ${e.score.clarity.explanation}
Simplicity: ${e.score.simplicity.score} - ${e.score.simplicity.explanation}
Creativity: ${e.score.creativity.score} - ${e.score.creativity.explanation}
Strength: ${e.score.strength.score} - ${e.score.strength.explanation}">
      <div class="score-dot" style="background-color: ${getScoreColor(
        e.score.combined
      )}">${e.score.combined.toFixed(1)}</div>
      <div class="completion">${e.state}</div>
    </div>
  `
    )
    .join("");

  return `
    <div class="node">
      <div class="node-header" role="button" tabindex="0">
          <div class="nameandscore">  
          <span class="expand-icon">▼</span>
          <span class="state">${node.option?.word || "(root)"}</span>
          <span class="stats">n=${visits},s=${score}</span>
          </div>
          ${
            evaluationsHtml
              ? `<div class="evaluations-container">${evaluationsHtml}</div>`
              : ""
          }
      </div>
      <div class="node-content">
        ${childrenHtml ? `<div class="children">${childrenHtml}</div>` : ""}
      </div>
    </div>
  `;
}

function getScoreColor(score: number): string {
  if (score < 1 || score > 5) throw new Error("Value must be between 1 and 5");

  const colors = [
    { r: 255, g: 0, b: 0 }, // Red
    { r: 255, g: 165, b: 0 }, // Amber
    { r: 0, g: 255, b: 0 }, // Green
  ];

  const t = (score - 1) / 4; // Normalize to [0, 1]
  const mid = 0.5; // Midpoint

  const start = t <= mid ? colors[0] : colors[1];
  const end = t <= mid ? colors[1] : colors[2];
  const scale = t <= mid ? t * 2 : (t - mid) * 2;

  const r = Math.round(start.r + scale * (end.r - start.r));
  const g = Math.round(start.g + scale * (end.g - start.g));
  const b = Math.round(start.b + scale * (end.b - start.b));

  return `rgb(${r}, ${g}, ${b})`;
}

export function toHTML(tree: TreeNode, outputPath: string): void {
  // Find max iteration in the tree
  function findMaxIteration(node: TreeNode): number {
    let max = node.evaluations.reduce(
      (max, e) => Math.max(max, e.iteration),
      0
    );
    for (const child of node.children) {
      max = Math.max(max, findMaxIteration(child));
    }
    return max;
  }

  const maxIteration = findMaxIteration(tree);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>MCTS Tree Visualization</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 20px;
          background: #f5f5f5;
        }
        .node {
          margin-bottom: 2px;
        }
        .node-header {
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 0.9em;
          gap: 8px;
          display: flex;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        .nameandscore{
          display: inline-block;
          width: 190px;
          opacity: 50%;
         }
        .state {
          font-weight: bold;
        }
        .stats {
          font-size: 0.6em;
          padding-left: 2px;
        }
        .evaluations-container {
          display: flex;
          gap: 8px;
        }
        .evaluation {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }
        .evaluation:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          top: 100%;
          left: 200px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px;
          border-radius: 4px;
          font-size: 1em;
          white-space: pre-line;
          z-index: 100;
          width: max-content;
          max-width: 700px;
        }
        .score-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.7em;
          font-weight: bold;
          flex-shrink: 0;
        }
        .completion {
          font-size: 0.9em;
        }
        .explanation {
          font-size: 0.9em;
          color: #666;
        }
        .children {
          margin-left: 20px;
          margin-top: 1px;
        }
        .controls {
          padding: 4px 8px;
          gap: 6px;
          display: flex;
          align-items: center;
          margin-bottom: 6px;
          background: #fff;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 0.85em;
        }
        
        .slider {
          flex-grow: 1;
          height: 4px;
        }
        
        .play-button {
          padding: 4px 8px;
          border-radius: 3px;
          border: none;
          background: #007bff;
          color: white;
          cursor: pointer;
          font-size: 0.85em;
        }
        
        .play-button:hover {
          background: #0056b3;
        }
        
        .node-header:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        
        .expand-icon {
          display: inline-block;
          width: 16px;
          transition: transform 0.2s;
        }
        
        .node.collapsed .expand-icon {
          transform: rotate(-90deg);
        }
        
        .node.collapsed .node-content {
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="controls">
        <button id="playButton" class="play-button">▶ Play</button>
        <input type="range" id="iterationSlider" class="slider" min="1" max="${maxIteration}" value="${maxIteration}">
        <span id="iterationDisplay">${maxIteration}/${maxIteration}</span>
      </div>
      <div id="treeContainer">
        ${generateNodeHtml(tree, maxIteration)}
      </div>
      
      <script>
        const tree = ${JSON.stringify(tree)};
        const maxIteration = ${maxIteration};
        let isPlaying = false;
        let playInterval;
        
        // Add getScoreColor function for client-side use
        function getScoreColor(score) {
          if (score < 1 || score > 5) throw new Error("Value must be between 1 and 5");

          const colors = [
            { r: 255, g: 0, b: 0 }, // Red
            { r: 255, g: 165, b: 0 }, // Amber
            { r: 0, g: 255, b: 0 }, // Green
          ];

          const t = (score - 1) / 4; // Normalize to [0, 1]
          const mid = 0.5; // Midpoint

          const start = t <= mid ? colors[0] : colors[1];
          const end = t <= mid ? colors[1] : colors[2];
          const scale = t <= mid ? t * 2 : (t - mid) * 2;

          const r = Math.round(start.r + scale * (end.r - start.r));
          const g = Math.round(start.g + scale * (end.g - start.g));
          const b = Math.round(start.b + scale * (end.b - start.b));

          return "rgb(" + r + "," + g + "," + b + ")";
        }
        
        function initializeFoldingBehavior() {
          document.querySelectorAll('.node-header').forEach(header => {
            header.addEventListener('click', (e) => {
              const node = header.closest('.node');
              node.classList.toggle('collapsed');
            });
            
            // Add keyboard support
            header.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
              }
            });
          });
        }
        
        function updateTree(iteration) {
          document.getElementById('iterationDisplay').textContent = iteration + '/' + maxIteration;
          document.getElementById('treeContainer').innerHTML = ${generateNodeHtml.toString()}(tree, iteration);
          initializeFoldingBehavior(); // Re-initialize folding behavior after tree update
        }
        
        document.getElementById('iterationSlider').addEventListener('input', (e) => {
          const iteration = parseInt(e.target.value);
          updateTree(iteration);
        });
        
        document.getElementById('playButton').addEventListener('click', () => {
          const button = document.getElementById('playButton');
          const slider = document.getElementById('iterationSlider');
          
          if (isPlaying) {
            clearInterval(playInterval);
            button.textContent = '▶ Play';
            isPlaying = false;
          } else {
            button.textContent = '⏸ Pause';
            isPlaying = true;
            slider.value = 1;
            updateTree(1);
            
            playInterval = setInterval(() => {
              const currentValue = parseInt(slider.value);
              if (currentValue >= maxIteration) {
                clearInterval(playInterval);
                button.textContent = '▶ Play';
                isPlaying = false;
                return;
              }
              slider.value = currentValue + 1;
              updateTree(currentValue + 1);
            }, 500); // Update every 500ms
          }
        });
        
        // Initialize folding behavior on page load
        initializeFoldingBehavior();
      </script>
    </body>
    </html>
  `;

  writeFileSync(outputPath, html);
}

// Add main execution code
if (require.main === module) {
  const prefix = process.argv[2];
  if (!prefix) {
    console.error("Please provide a filename prefix as argument");
    process.exit(1);
  }

  const inputPath = `outputs/${prefix}.json`;
  const outputPath = `outputs/${prefix}.html`;

  try {
    const jsonData = readFileSync(inputPath, "utf8");
    const tree = JSON.parse(jsonData) as TreeNode;
    toHTML(tree, outputPath);
    console.log(`Generated ${outputPath}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
