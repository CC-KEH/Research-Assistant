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

final_summary_template = """
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

    # Key Contributions
    contributions here

    # Critical Analysis
    critical analysis here

    # Future Work
    future work here

    # Conclusion
    conclusion here
"""

contributions_template = """
You are an expert assistant specialized in analyzing research papers.
Extract and clearly articulate the key contributions of this research paper.
Focus on novel methods, findings, algorithms, frameworks, or insights introduced.
Present each contribution with a brief explanation and a practical example.

Text:
{text}

Key Contributions (in markdown format):
    ## Key Contributions
    
    ### Contribution 1: [Title]
    - **Description**: [What was contributed]
    - **Example**: [Simple example illustrating this contribution]
    
    ### Contribution 2: [Title]
    - **Description**: [What was contributed]
    - **Example**: [Simple example illustrating this contribution]
"""

critical_analysis_template = """
You are an expert research analyst with deep expertise in evaluating academic papers.
Provide a balanced critical analysis of this research paper covering:
- Strengths and weaknesses of the methodology
- Validity of assumptions and limitations
- Experimental design and result interpretation
- Comparison with existing work
- Potential biases or gaps

Be objective and constructive in your analysis.

Text:
{text}

Critical Analysis (in markdown format):
    ## Critical Analysis
    
    ### Strengths
    - [Strength 1]
    - [Strength 2]
    
    ### Weaknesses
    - [Weakness 1]
    - [Weakness 2]
    
    ### Methodology Assessment
    [Analysis of methods used]
    
    ### Limitations
    [Identified limitations]
    
    ### Overall Assessment
    [Balanced summary of the paper's quality and impact]
"""

future_work_template = """
You are an expert research strategist with expertise in identifying research directions.
Based on the research paper, identify and elaborate on:
- Future research directions suggested by the authors
- Potential extensions of this work
- Unresolved questions or challenges
- New opportunities opened by this research

Provide actionable suggestions with examples where applicable.

Text:
{text}

Future Work (in markdown format):
    ## Future Work and Research Directions
    
    ### Directions Suggested by Authors
    - [Direction 1 with brief explanation]
    - [Direction 2 with brief explanation]
    
    ### Potential Extensions
    - [Extension 1]: [How it could build on this work]
    - [Extension 2]: [How it could build on this work]
    
    ### Open Questions
    - [Question 1]
    - [Question 2]
    
    ### Practical Applications
    [How future work could lead to real-world applications]
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
    ("system", final_summary_template),
    ("user", "{text}"),
])

contributions_prompt_template = ChatPromptTemplate.from_messages([
    ("system", contributions_template),
    ("user", "{text}"),
])

critical_analysis_prompt_template = ChatPromptTemplate.from_messages([
    ("system", critical_analysis_template),
    ("user", "{text}"),
])

future_work_prompt_template = ChatPromptTemplate.from_messages([
    ("system", future_work_template),
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

contributions_prompt_value = contributions_prompt_template.invoke({
    "language": "english",
    "text": "",
})

critical_analysis_prompt_value = critical_analysis_prompt_template.invoke({
    "language": "english",
    "text": "",
})

future_work_prompt_value = future_work_prompt_template.invoke({
    "language": "english",
    "text": "",
})
