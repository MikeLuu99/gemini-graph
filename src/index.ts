/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { StructuredTool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Target } from "puppeteer";
import { z } from "zod";

// Define your tool

const edgeSchema = z.object({
    source: z.string().describe(""),
    target: z.string().describe(""),
    label: z.string().describe("")
})
class FakeBrowserTool extends StructuredTool {
    schema = z.array()
  
    name = "create_graph";
  
    description =
      "useful for creating graph from context";
  
    async _call(_: z.infer<this["schema"]>): Promise<string> {
      return "create_graph";
    }
  }

export default {
    async fetch(request, env, ctx) {
        const model = new ChatGoogleGenerativeAI({
            apiKey: "",
            model: "gemini-pro",
          });
        

        
        const tool = new FakeBrowserTool();

    // Bind your tools to the model
        const modelWithTools = model.withStructuredOutput(tool.schema, {
            name: tool.name, // this is optional    
        });
// Optionally, you can pass just a Zod schema, or JSONified Zod schema
// const modelWithTools = model.withStructuredOutput(
//   zodSchema,
// );

        const res = await modelWithTools.invoke([
        [
            "human",
            "Search the web and tell me what the weather will be like tonight in new york. use a popular weather website",
        ],
        ]);

    
        /*
        {
          url: 'https://www.accuweather.com/en/us/new-york-ny/10007/night-weather-forecast/349014',
          query: 'weather tonight'
        }
        */
        return new Response(res.query); 
    },
};