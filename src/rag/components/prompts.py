chat_template = """
            Answer the question as detailed as possible from the provided context, make sure to provide all the details, if the answer is not if __name__ == "__main__":
            provided context just say, "answer is not available in the context", don't provide the wrong answer \n\n 
            Context: \n {context}?\n 
            Question: \n {question}\n
            
            Answer: 

            """

chunks_template = """
            You are an expert assistant with expertise in summarizing research papers,
            Summarize the following text as detailed as possible \n\n
            Text: \n {text}\n
            Summary: 

            """
            
final_combine_template = """
            You are an expert assistant with expertise in summarizing research papers,
            Provide a complete summary of the entire Research Paper without missing any topic, in a simple language,
            Each topic after their explanation must have a simple example to explain further. \n\n
            Text: \n {text}\n
            Summary: 

            """
summary_template ="""
    # Topic
    {topic}
    
    # Prerequisites
    {prerequisites}
    
    # Introduction
    {introduction}
    
    # Summary
    {summary}
    
    # Conclusion
    {conclusion}
"""