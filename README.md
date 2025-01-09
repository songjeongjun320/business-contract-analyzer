# Business Contract Analyzer

Welcome to the official repository of **Business Contract Analyzer**:  
🚀 [Visit the Site](https://business-contract-analyzer.vercel.app/)  
🚀 [GitHub Repository](https://github.com/songjeongjun320/business-contract-analyzer)  
🚀 [LinkedIn Post](https://www.linkedin.com/feed/update/urn:li:activity:7261619797505761280/)

---

## Project Overview

💡 **Business Contract Analyzer** is a powerful tool designed to analyze business contracts for individuals and companies alike. Through this platform, users can identify vulnerabilities in their contracts, discover potential toxic clauses, and understand how these clauses might lead to financial losses. Our research-driven model provides insights in an easily digestible format, empowering users to make informed decisions. The goal of our platform is to analyze contract weaknesses more efficiently and quickly, offering alternatives without incurring costly lawyer fees, whether for personal or business use. 🌱 **Transform your contract analysis experience!**

This project was developed in collaboration with **Professor Hitendra Chaturvedi from ASU**. Leveraging **Large Language Models (LLMs)**, it pinpoints risky clauses in business contracts, providing users with crucial insights. The development journey was filled with challenges, each bringing unique learning experiences and solutions.

---

## Features ✨

- **Page Splitting**: Users can upload a PDF file and automatically split it into separate pages for easier processing.
- **Text Extraction**: The tool extracts text from each PDF page, saving it as clean text files for analysis.
- **Risk Analysis**: Analyzes the extracted text using LLMs to identify potentially risky clauses in contracts.
- **Organized Output**: Splitted PDFs and extracted text files are saved in clearly defined directories for easy access through the model.

## Tech Stack 🛠️

- **Frontend**: Next.js, TypeScript, JavaScript, HTML
- **Backend**: Node.js, Flask, Python, REST API, Groq API (LLAMA)
- **Database**: Supabase
- **Deployment**: Vercel (Client), AWS EC2 with Route 53 and Load Balancer (Server)
- **Version Control**: Git & GitHub

---

## Challenges & Solutions 🚧

### 🚧 Challenge #1: Managing Frontend and Backend in One Project

Initially, we attempted to deploy both the frontend (client) and backend (LLM API and PDF processing) within a single Vercel project. However, **Vercel’s virtual CPU allocation** for backend tasks proved insufficient for the demands of our LLM and PDF processing tasks. Additionally, our backend PDF processing code was in **Python**, which Vercel does not directly support. We decided to **split the frontend and backend**, moving the backend to Flask for more efficient processing.

### 🚧 Challenge #2: Choosing the Right Deployment Environment for the Backend

After separating the backend, we explored deployment options like **Heroku, Vercel, and AWS**. Heroku’s API response time was slow, often triggering errors due to Vercel’s 30-second timeout for backend responses. AWS emerged as the best option for its flexibility and scalability, especially for handling asynchronous, heavy-duty tasks.

### 🚧 Challenge #3: Setting Up AWS Infrastructure and Cloud Fundamentals

Deploying on AWS brought complexities such as setting up an **EC2 instance** to host our Flask server. From managing security groups to optimizing server performance, configuring AWS deepened my understanding of **cloud infrastructure**.

### 🚧 Challenge #4: HTTPS Configuration and Domain Setup

Running the application locally posed no issues, but accessing the AWS-hosted backend introduced the need for HTTPS. I:

- Purchased a domain through **Route 53**
- Configured HTTP to HTTPS redirection
- Set up **SSL/TLS certificates** for secure communication

This was a key learning experience in web security and SSL management.

### 🚧 Challenge #5: Optimizing Response Times for Large PDF Files

A 15-page PDF took around 5 minutes to process, with each page’s LLM analysis taking about 20-30 seconds. Reducing this response time became essential to improve usability.

### 🚧 Challenge #6: Trying Polling to Handle Long Response Times

To handle long response times, we initially implemented **polling**, where the client periodically checked the backend for updates. However, the 30-second Vercel timeout persisted, as delayed responses from the first API request still caused issues.

### 🚧 Challenge #7: Sequential API Requests for Each Page

To address this, I split the PDF into individual pages and sent them to the backend **sequentially**. Sending requests in **parallel** triggered a "Too much API request" error, but **sequential requests** worked effectively, allowing each page to be processed and responded to one-by-one.

### 🚧 Challenge #8: Storing JSON Results on a Persistent Database

Initially, we tried storing analysis results on **Vercel’s temporary storage** (`/tmp`), but data persistence was an issue. We transitioned to **Supabase**, allowing us to securely save and retrieve processed JSON results.

---

## AWS EC2 and HTTPS Setup 🔒

To ensure secure communication and high availability for our backend server, we deployed our Flask application on an **AWS EC2** instance and configured **HTTPS with a load balancer**. This setup involved several steps:

1. **EC2 Instance Deployment**: Hosting the Flask server on an AWS EC2 instance to manage contract analysis requests.
2. **Domain and SSL Certificate**: Registering a domain in **Route 53** and obtaining an SSL certificate from AWS ACM.
3. **HTTPS Load Balancer**: Configuring an AWS Application Load Balancer to handle HTTPS requests and redirect all HTTP requests to HTTPS.
4. **Security Groups and Port Management**: Allowing only necessary ports (443 for HTTPS, 80 for HTTP, and 5000 for internal communication).

Through this setup, **Business Contract Analyzer** provides a secure and scalable infrastructure, protecting sensitive data and offering a smooth experience on the platform.

---

## Final Prototype Links 🚀

- 🌐 [**Visit the Prototype**](https://business-contract-analyzer.vercel.app/)
- 📂 [**GitHub Repository**](https://github.com/songjeongjun320/business-contract-analyzer)

---

## Demo Videos

[Demo video: 60 seconds](https://www.youtube.com/watch?v=Gq83-TCbGyw&t=1s)

<iframe width="770" height="432" src="https://www.youtube.com/watch?v=Gq83-TCbGyw&t=1s" frameborder="0" allowfullscreen></iframe>

---

### 🌟 Final Remarks 🌟

Reflecting on this journey, I realized that **coding and developing a product are distinct skills**. This project required understanding cloud infrastructure, secure communication, and deployment strategies beyond just programming. Every challenge taught me something invaluable and strengthened my appreciation for **full-stack development**.

## 💡 **If you have any ideas or suggestions, feel free to reach out at [songjeongjun320@gmail.com](mailto:songjeongjun320@gmail.com)!**

### Tags

#BusinessContractAnalyzer #AI #LLM #AWS #Vercel #Supabase #FullStackDevelopment #CloudComputing #ProfessionalJourney
