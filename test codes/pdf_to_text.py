import openai
import os
from dotenv import load_dotenv
import PyPDF2

# Load environment variables from .env file (API key)
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# File path of the PDF
file_path = "C:\\Users\\frank\\Desktop\\catching_hidden_claues\\app\\db\\split_pdf_here\\page_1.pdf"

# Extract text from PDF
with open(file_path, "rb") as file:
    reader = PyPDF2.PdfReader(file)
    text = ""
    for page_num in range(len(reader.pages)):
        page = reader.pages[page_num]
        text += page.extract_text()

# Save extracted text to output file
with open("output.txt", "w", encoding="utf-8") as file:
    file.write(text)

# Function to send prompt to GPT and get a response
def get_gpt_response(prompt_text):
    try:
        # Sending prompt to GPT-3 and returning the response
        response = openai.Completion.create(
            engine="text-davinci-003",  # or use "gpt-4" if available
            prompt=prompt_text,
            max_tokens=500,  # Maximum length of response
            n=1,  # Number of responses to generate
            stop=None,  # Optionally define stop sequences
            temperature=0.7  # Adjusts randomness of the response
        )
        return response.choices[0].text.strip()
    except Exception as e:
        return f"Error occurred: {str(e)}"
    

# =============================================================
# Command or prompt to send to GPT (you can modify this)
user_command = "The document I’m sending now is a legally binding contract. Please categorize each clause under one of the following categories: Low cost, High protection // High cost, High protection // Low cost, Low protection // High cost, Low protection, and display the results.

"
# =============================================================

# Combine the user's command with the extracted PDF text
prompt_text = f"{user_command}\n\n{text}"

# Get the GPT response
gpt_response = get_gpt_response(prompt_text)

# Print the GPT's response
print("GPT's Response:")
print(gpt_response)

# Save the GPT response to a file
with open("gpt_output.txt", "w", encoding="utf-8") as file:
    file.write(gpt_response)
