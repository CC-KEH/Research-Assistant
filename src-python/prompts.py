from langchain.prompts import ChatPromptTemplate

chat_system_template = """
You are an assistant for question-answering tasks. 
Use the following pieces of retrieved context to answer the question 
If you don't know the answer, say that you don't know.
Use three sentences maximum and keep the answer concise.

{context}
"""

chunks_system_template = """
You are an expert assistant with expertise in summarizing research papers,
Summarize the following text as detailed as possible 

Text: 
{text}

Summary: 
"""

final_system_combine_template = """
You are an expert assistant with expertise in summarizing research papers,
Provide a complete summary of the entire Research Paper without missing any topic, in a simple language,
Each topic after their explanation must have a simple example to explain further. 

Summary must be in markdown format. 

Text: 
{text}

Summary: 
    # Topic 
    topic here

    # Prerequisites
    prerequisites here

    # Introduction
    introduction here

    # Summary
    summary here

    # Conclusion
    conclusion here
"""

# Create chat prompt templates
chat_template = ChatPromptTemplate.from_messages([
    ("system", chat_system_template),
    ("user", "{text}"),
])

chunks_template = ChatPromptTemplate.from_messages([
    ("system", chunks_system_template),
    ("user", "{text}"),
])

final_combine_template = ChatPromptTemplate.from_messages([
    ("system", final_system_combine_template),
    ("user", "{text}"),
])

# Invoke templates
chat_prompt_value = chat_template.invoke({
    "language": "english",
    "text": "",
})

chunks_prompt_value = chunks_template.invoke({
    "language": "english",
    "text": "",
})

final_combine_prompt_value = final_combine_template.invoke({
    "language": "english",
    "text": "",
})