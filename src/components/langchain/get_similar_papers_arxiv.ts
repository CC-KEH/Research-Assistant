import { ArxivRetriever } from "@langchain/community/retrievers/arxiv";

export async function findSimilarArxivPapers(
  title: string,
  maxResults = 5,
  fullDocuments = false
) {
  const retriever = new ArxivRetriever({
    getFullDocuments: fullDocuments,
    maxSearchResults: maxResults,
  });

  const documents = await retriever.invoke(title);

  documents.forEach((doc) => {
    console.log("arXiv ID:", doc.metadata.arxivId);
    console.log("Authors:", doc.metadata.authors.join(", "));
    console.log("Published:", doc.metadata.published);
    console.log("Updated:", doc.metadata.updated);
    console.log("Link:", doc.metadata.link);
    console.log("PDF:", doc.metadata.pdfUrl);
  });
}
