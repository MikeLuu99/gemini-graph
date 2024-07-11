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
import { TokenTextSplitter } from "langchain/text_splitter";
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


const cardMetaDataSchema = z.object({
    title: z.string().describe(""),
    startChunkId: z.string().describe(""),
    endChunkId: z.string().describe("")
})



class FakeBrowserTool extends StructuredTool {
    schema = z.object({
        cardMetaData: z.array(cardMetaDataSchema).describe("")
    })

    name = "create_new_cards";

    description =
        "useful for creating new detailed cards from context";

    async _call(_: z.infer<this["schema"]>): Promise<string> {
        return "create_new_cards";
    }
}

const textContext = JSON.stringify(convertMarkdownToString("./src/notes"), null, 2)

const splitter = new TokenTextSplitter({
    encodingName: "gpt2",
    chunkSize: 200,
    chunkOverlap: 0,
});

function convertDocumentsToJson(docs: any[]): string {
    const formattedDocuments = docs.map((doc, index) => ({
      index,
      content: doc.pageContent
    }));
  
    return JSON.stringify(formattedDocuments, null, 2);
  }

const context_ = splitter.createDocuments([textContext]).then(res => {


    const jsonString = convertDocumentsToJson(res);

    const numberOfChunks = res.length


    const prompt = `
    You are an AI assistant tasked with analyzing chunks of content from multiple notes and creating meaningful cards that represent the information in these chunks. Your goal is to generate a list of card metadata objects that cover all the provided chunks.
    
    Given the following chunks of text from various notes:
    
    ${jsonString}
    
    Please create a list of card metadata objects. Each card metadata object should have the following structure:
    {
      title: "A clear and descriptive title for the card",
      startChunkId: "The ID of the first chunk this card covers",
      endChunkId: "The ID of the last chunk this card covers"
    }
    
    Guidelines:
    1. Create cards that logically group related information from each indexes of the chunks.
    2. For each indexes of the chunk, there should be at least one card metadata. There should be ${numberOfChunks} new cards generated
    3. The title should be clear and descriptive, reflecting the main topic or concept covered by the chunks.
    4. The startChunkId should be the ID (index) of the first chunk that the card's content starts with.
    5. The endChunkId should be the ID (index) of the last chunk that the card's content ends with.
    6. A card can span multiple chunks if they are closely related.
    7. Ensure that all chunks are covered by at least one card.
    8. Create as many cards as necessary to represent all the information in the chunks effectively.
    
    Please provide your response as a JSON array of card metadata objects.
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

    modelWithTools.invoke([
        [
            "human",
            prompt,
        ],
    ]).then(res => {
        console.log(res)
    })
})
