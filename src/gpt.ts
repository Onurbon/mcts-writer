import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_API_KEY,
  endpoint: process.env.AZURE_ENDPOINT,
  apiVersion: process.env.AZURE_API_VERSION,
  deployment: process.env.AZURE_DEPLOYMENT,
});

const MAX_RETRIES = 3;
const MODEL = "gpt-4o-mini";

export const gpt = async <T>(prompt: string, temperature = 0.3): Promise<T> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature,
        response_format: { type: "json_object" },
      });
      return JSON.parse(res.choices[0].message.content!) as T;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.log(
          "++++ PROMPT ++++++++++++++++++++++++++++++++++++++++++++++"
        );
        console.log(prompt);
        console.log(
          "++++ ERROR ++++++++++++++++++++++++++++++++++++++++++++++"
        );
        console.log(JSON.stringify(error, null, 2));
        throw new Error(`Failed after ${MAX_RETRIES} attempts: ${error}`);
      }
      console.warn(
        `GPT API call failed, attempt ${attempt}/${MAX_RETRIES}. Retrying in ${attempt} seconds...`,
        JSON.stringify(error, null, 2)
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error("Unexpected error");
};
