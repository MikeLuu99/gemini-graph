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
import * as fs from 'fs'
import * as path from 'path'

// Define your tool

function convertMarkdownToString(directoryPath: string): { [filename: string]: string } {
    const result: { [filename: string]: string } = {};

    // Read the contents of the directory
    const files = fs.readdirSync(directoryPath);

    // Iterate through each file in the directory
    for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const stats = fs.statSync(filePath);

        // Check if it's a file and has a .md extension
        if (stats.isFile() && path.extname(file).toLowerCase() === '.md') {
            // Read the file contents and store it in the result object
            const content = fs.readFileSync(filePath, 'utf-8');
            result[file] = content;
        }
    }

    return result;
}


const edgeSchema = z.object({
    source: z.string().describe(""),
    target: z.string().describe(""),
    label: z.string().describe("")
})
class FakeBrowserTool extends StructuredTool {
    schema = z.object({
        edges: z.array(edgeSchema).describe("")
    })

    name = "create_graph";

    description =
        "useful for creating graph from context";

    async _call(_: z.infer<this["schema"]>): Promise<string> {
        return "create_graph";
    }
}

// export default {
//     async fetch(request, env, ctx) {
const context = convertMarkdownToString("./src/notes")


const prompt = `
You are an AI assistant tasked with analyzing the content of multiple notes and creating meaningful connections between them. Your goal is to generate a list of edges that represent relationships between different notes.

Given the following notes:

${JSON.stringify(context, null, 2)}

Please create a list of edges that connect these notes. Each edge should have the following structure:
{
  source: "filename of the source note",
  target: "filename of the target note",
  label: "a brief description of the relationship between the notes"
}

Guidelines:
1. The source and target should be filenames from the provided notes. The filename for each note is located immediately after the # symbol at the beginning of each note's content.
2. The label should be a concise description of how the notes are related.
3. Create edges only when there's a meaningful connection between notes.
4. You can create multiple edges for the same pair of notes if there are different types of connections.
5. Aim to create a comprehensive set of edges that captures the main relationships between the notes.
6. Make sure to use the exact filenames as they appear after the # symbol, without adding any file extensions or modifying them.

Please provide your response as a JSON array of edge objects.
`;



const model = new ChatGoogleGenerativeAI({
    // apiKey: process.env.GEMINI_API_KEY,
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
modelWithTools.invoke([
    [
        "human",
        prompt,
    ],
]).then(res=>console.log(res)
)

/*
{
  url: 'https://www.accuweather.com/en/us/new-york-ny/10007/night-weather-forecast/349014',
  query: 'weather tonight'
}
*/
//         return new Response(JSON.stringify(res.edges)); 
//     },
// };