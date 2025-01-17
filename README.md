# Making LLMs better at creative writing using Monte Carlo Tree Search

## Motivation

LLMs like gpt4 are pretty good at writing code, but reasoning models like `o1` are even better. While OpenAI has not revealed the details of how they trained `o1`, experts have speculated that they used a classic ML technique called Monte Carlo Tree Search (MCTS) under the hood. 

MCTS is generally understood to perform well in the context of problems where:
* you need to make decisions under uncertainty 
* the search space is large and complex 
* decisions are made sequentially over multiple stages. 

Examples of problems where MCTS is considered effective include playing strategic games like Go and Chess, planning in robotics, optimizing resource allocation, and solving complex scheduling tasks. And now the modern reasoning models like `o1`, which made use of MCTS under the hood (among other techniques), are known to perform well for all sorts of mathematical problems and other formal problems, like solving programming challenges. 

The question I wanted to explore with this experiment is the following: can MCTS also help LLMs become better at more informal problems like creative writing tasks? 

## Original Intuition

Most people would argue that creative writing is very different from mathematical puzzles, but I believe they actually underestimate the similarities between the two. Both can be very complex, and both can be broken down into a sequence of small decisions (e.g. choosing what word to write). The key difference IMO is really where the uncertainty comes from. When solving a game like a maze, the uncertainty comes from the fact that the player doesn't know where all the walls are. In the case of a creative writing task, uncertainty comes from the fact that we don't know who the jury will be or what their taste will be like. 

The way MCTS addresses the uncertainty problem is to try a bunch of paths at random to get an idea of how good a partial solution is. For instance, in the case of a maze, to see if a specific position in the maze is on the right path, we would try and get the player to walk in random directions until they get stuck or find the exit, and by repeating this many times, we can get a good approximation of how close the player is from the exit. Similarly, when trying to solve a creative writing task, MCTS can look at a partial solution (say, an incomplete sentence) and it can try to explore randomly different ways to complete it (using LLMs), and then it might try to guess what score would a jury give to the completed sentence (again using LLMs). 

My initial hope was the LLMs would do a decent jobs at generating good candidates and evaluating candidates, as long as the prompts gave them enough context on what would be considered a good output. (Spoiler alert: these two tasks actually took more work than I hoped!) 

## The Experiment: Generating Startup Taglines

I decided to pick a creative writing task that I'm fairly familiar with and which is widely recognized to be hard, both for humans or LLMs. So I picked the following: 

- Input: a description of a startup, consisting of two long paragraphs describing the problem they're working on, and the solution they're building
- Output: generate a good tagline for this startup, where "good" means striking a balance between clarity, simplicity, creativity, and boldness. 

I decided to only include one example of input and output data in this repo (the description of my own startup [toughtly](https://trythoughtly.com/)), but you could easily find more inputs by looking at portfolio websites, for instance [EF](https://www.joinef.com/companies) or [YC](https://www.ycombinator.com/companies). 

What I find interesting about company taglines is that they tend to be a matter of taste and some people tend to have very strong positive or negative reaction when they see a tagline they like or dislike. It was also a convenient choice for this experiment because taglines are usually very short, so we don't need to do MCTS with a very deep state tree. 

##  The interesting technical bits 

The code in this repo is a prototype that I put together using TypeScript and OpenAI's gpt-4o-mini. I also used the AI-augmented code editor Cursor which helped me iterate really fast, but it took quite a few iterations to get this working as I wanted. So here is a summary of the challenges I encountered along the way.  

### Evaluating taglines 

My first implementation of the LLM evaluator was always returning an average score, and there were several core issues to address. First, I had to address the calibration problem and give concrete examples of good and bad taglines for the LLMs to have a clear idea of what's a 2/5 mean and what a 4/5 mean. But for the evaluation to work (and for those examples to help), I had to also break down the scoring into 4 different prompts, each corresponding to a different quality dimensions. But then I discovered that combining these scores already required some care. Taking a simple average didn't yield good results because it was encouraging the generation of boring taglines, with nothing exceptional about them. So I ended up using a weighted average which gave extra weight to low ratings and high ratings compared to medium ratings. After all these tweaks, I ended up with the code in `./src/eval.ts` which did a decent job at evaluating taglines, at least based on my manual self-assessment.  

### Generating creative taglines 

My first implementation of the LLM tagline completion job was problematic because it was only generating very bland and unremarkable options which were neither very strong nor very weak on any quality dimensions. This was a problem for two reasons: this failed to ever produce any really good candidate, but it also made it difficult for the MCTS algorithm to optimize anything, because there was very little variance (and very little signal) in the different branches of the state tree. The solution I came up with was to manually introduce more randomness. I generated a long list of relevant adjectives and then for every run I picked 4  of them at random and just adding the following line the prompt: "focus on {A} or {B} without worrying about {C} and {D}". For instance, one run may try and produce a tagline which is "short" and "bold" without worrying about "tone" or "clarity". See final result in `./src/complete.ts`. 

### Generating next word

A surprisingly hard task was to decide exactly what list of next words to consider when trying to expand an incomplete tagline. Considering too many words would make the search much longer (and more expensive in AI credits) but keeping it too short also didn't work really well, because the search was missing out on great options. My first implementation was using a single prompt and was just hardcoding a number of words (always 3), but this was rarely the right number. I eventually found a better solution: asking the model to generate a relatively large number of completed taglines, sort them from best to worse (as per the LLM's self evaluation) and look at which words these completed taglines are using as their next word. Sometimes many of these taglines uses the same next word, and we end up with a small number of children in the search tree. Some other times we have a longer set of options, and we have more children. See final implementation in `./src/nextword.ts`.

### Implementing MCTS

The Monte Carlo Tree Search algorithm is well documented online, but one slightly tricky part was to set the constant that dictates how often the algorithm will decide to explore new branches and how often it will exploit the branches that are already known to be good. After some trial-and-error, I realized that I had to use a relatively low value for the parameter `C` to encourage the model to do more exploitation as this was leading empirically to better results. See `./src/mcts.ts` for more implementation details. 

## Output and visualisation  

This repo include an example of output which was generated by using the following scripts: 

```
# generate the MCTS tree with 100 runs using inputs/thoughtly.txt 
npx ts-node ./src/mcts.ts thoughtly 100
# use the above results to generate outputs/thoughtly.html 
npx ts-node ./src/html.ts thoughtly  
```

You can open the resulting html page at the following address: 

// todo : add url and screen shot 

In this page you will see:
- An interactive visualization of the MCTS search tree where each node represents a partial tagline
- A control panel at the top with:
  - A play button (▶) that lets you watch the MCTS algorithm unfold step by step
  - A slider to manually navigate through different iterations of the algorithm
- For each node in the tree:
  - The word being added at that step (or "(root)" for the starting node)
  - Statistics showing `n=` (number of visits to this node) and `s=` (average score from 1-5)
  - Colored dots representing different complete taglines that were evaluated through this node, where:
    - Red indicates low scores (around 1-2)
    - Amber indicates medium scores (around 3)
    - Green indicates high scores (around 4-5)
  - Hovering over these dots reveals detailed scoring breakdowns for clarity, simplicity, creativity, and strength

You can click on any node to collapse/expand its children, making it easier to focus on specific branches of the search tree. The visualization helps understand how MCTS explores different possibilities and gradually focuses on more promising paths as the algorithm progresses.

## Findings and conclusion 

While I did not have time to conduct any formal and scientific evaluation of the results, my subjective opinion is that the generated taglines (those obtaining the highest scores after the search) which were MUCH better than what I expected. They were not only better than what I had previously got using simple prompts to Claude or ChatGPT prompts, but I also found them better than what I got using more sophisticated prompts (chain of thought) or using more sophisticated models like `o1` (which only seems to perform well for maths and coding problems). In fact, many of the generated prompts were better than most than the options that my co-founder and I had produced when brainstorming possible taglines in real life. 

But it would be difficult for a reader to judge this without trying it themselves, because one needs to be familiar with the input data (the company description) to appreciate how good a proposed tagline is. This is one of the main reasons why I wanted to open-source this.  

