chat_template = """
            "You are an assistant for question-answering tasks. "
            "Use the following pieces of retrieved context to answer the question "
            "If you don't know the answer, say that you don't know."
            "Use three sentences maximum and keep the answer concise."
            "\n\n"
            "{context}"

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
            Summary must be in markdown format. \n\n
            Text: \n {text}\n
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
