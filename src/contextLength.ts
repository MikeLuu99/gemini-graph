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


const context = JSON.stringify(convertMarkdownToString("./src/notes"), null, 2)

console.log(typeof(context))

console.log("Length", context.length)