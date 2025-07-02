import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { vectorStore } from "./connections";
import { Document } from "@langchain/core/documents";
import path from "path";

async function load_documents() {
  const exampleDataPath = "files/";

  const directoryLoader = new DirectoryLoader(exampleDataPath, {
    ".pdf": (filePath: string) => new PDFLoader(filePath),
  });

  const rawDocs = await directoryLoader.load();

  // 🌟 Assign paperId to each doc using file name
  const enrichedDocs = rawDocs.map((doc) => {
    const sourcePath = doc.metadata.source as string;
    const fileName = path.basename(sourcePath, ".pdf"); // e.g., "bert-paper"
    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        paperId: fileName,
        title: fileName.replace(/-/g, " "), // Optional title beautifier
      },
    });
  });

  return enrichedDocs;
}

async function split_documents(docs: Document[]) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const splits = await splitter.splitDocuments(docs);
  console.log(`✅ Split ${docs.length} PDF(s) into ${splits.length} chunks.`);
  return splits;
}

async function store_documents(splits: Document[]) {
  await vectorStore.addDocuments(splits);
  console.log(`✅ Stored ${splits.length} chunks in vector store.`);
}

// 🔁 Full run
export async function indexPapers() {
  const docs = await load_documents();
  const splits = await split_documents(docs);
  await store_documents(splits);
  return { docs, splits };
}

// import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// import { vectorStore, llm } from "./connections";

// async function load_documents() {
//   const exampleDataPath = "files/";

//   const directoryLoader = new DirectoryLoader(exampleDataPath, {
//     ".pdf": (path: string) => new PDFLoader(path),
//   });

//   const directoryDocs = await directoryLoader.load();

//   console.log(directoryDocs[0]);

//   const textSplitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 1000,
//     chunkOverlap: 200,
//   });

//   const splitDocs = await textSplitter.splitDocuments(directoryDocs);
//   console.log(splitDocs[0]);
//   return splitDocs;
// }

// async function split_documents(docs) {
//   const splitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 1000,
//     chunkOverlap: 200,
//   });
//   const allSplits = await splitter.splitDocuments(docs);
//   console.log(`Split PDF doc into ${allSplits.length} sub-documents.`);
// }

// async function store_documents(splits) {
//   await vectorStore.addDocuments(splits);
// }
