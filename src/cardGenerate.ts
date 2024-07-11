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


const cardSchema = z.object({
    title: z.string(),
    content: z.string(),
    parentId: z.string()
})

const edgeSchema = z.object({
    source: z.string().describe(""),
    target: z.string().describe(""),
    label: z.string().describe("")
})
class FakeBrowserTool extends StructuredTool {
    schema = z.object({
        // edges: z.array(edgeSchema).describe(""),
        cards: z.array(cardSchema)
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
You are an AI assistant tasked with analyzing the content of multiple notes and generating comprehensive, detailed cards that capture all the information from these notes. Your goal is to create a set of cards that, together, represent all the content from the original notes in a more structured and potentially expanded format.

Given the following notes:

${JSON.stringify(context, null, 2)}

Please create a list of new cards based on the content of the existing notes. Each card should have the following structure:
{
  title: "A clear and descriptive title for the card",
  content: "Detailed content of the card, capturing information from the notes",
  parentId: "The filename of the note that this card is primarily based on"
}

Guidelines for new cards:
1. Ensure that all information from the original notes is captured in the new cards. No content should be lost in the conversion process.
2. Create multiple cards for each note if necessary to properly organize and represent all the information.
3. The title should be clear, descriptive, and reflect the main topic or concept of the card.
4. The content should be detailed and comprehensive. Don't summarize excessively - include all relevant information from the original notes.
5. Feel free to expand on the original content if it helps to clarify or provide context, but clearly distinguish any added information.
6. The parentId should be the filename of the note that the card's content primarily comes from. If a card combines information from multiple notes, choose the most relevant one.
7. Organize the information logically. You may create hierarchies or sequences of cards if it helps to structure the information more clearly.
8. If there are any unclear or ambiguous points in the original notes, create separate cards to highlight these areas and suggest possible clarifications.
9. For any technical or specialized content, maintain the original level of detail and terminology.

Please provide your response as a JSON object with the property 'cards' (an array of card objects). Ensure that when all cards are read together, they provide a complete and possibly enhanced representation of all the information from the original notes.
`;

// ... rest of the code remains the same


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

const contextCharacters = context.length

// const sumContext = 

console.log("Number of character in context", contextCharacters)

modelWithTools.invoke([
    [
        "human",
        prompt,
    ],
]).then(res => {
    console.log("===========================================================")

    const contents = res.cards?.map(card => card.content?.length ?? 0) ?? [];
    const sumContents = contents.reduce((a, b) => a + b, 0);
    // const contents = res['cards'].map(card=>{
    //     return card.content.length
    // })
    // const sumContents = contents.reduce((a,b) =>{
    //     return a+b
    // })
    console.log("Sum of characters", sumContents)


    console.log("Number of new cards", res['cards'].length)
    console.log("===========================================================")
    console.log(res)
})

/*
{
  url: 'https://www.accuweather.com/en/us/new-york-ny/10007/night-weather-forecast/349014',
  query: 'weather tonight'
}
*/
//         return new Response(JSON.stringify(res.edges)); 
//     },
// };