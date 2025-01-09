# 🚀 **Toxic Clauses Detector in Business Contracts**

A business contract can contain numerous legal clauses, some of which may pose a significant risk to one of the parties involved. The **Toxic Clauses Detector** is an AI-powered tool designed to **analyze business contracts**, identify potentially harmful clauses, and categorize them based on risk. This solution is intended to help users, especially those unfamiliar with legal jargon, gain insights into the potential risks hidden in contract clauses.

## 🔍 **What Problem Does It Solve?**

Business contracts often include complex clauses that might be difficult to interpret for non-experts. Such clauses may result in unfavorable outcomes, including unexpected financial obligations or loss of rights.

The **Toxic Clauses Detector** offers a simple, easy-to-use solution to detect such risky clauses and provides a categorized breakdown based on risk levels. This empowers users to:

- **Understand** the risks hidden in complex legal documents.
- **Make informed decisions** about potential negotiations or changes before signing.
- **Save time and money** by quickly identifying problematic clauses without needing extensive legal expertise.

## 🛠️ **Setup Instructions**

### **1. Access the Application**

🌐 **Visit the live website** to use the Toxic Clauses Detector in Business Contracts:

👉 [Live Website](https://business-contract-analyzer.vercel.app/)

### **2. Features**

🔹 **Upload your business contract** in PDF format.  
🔹 The contract is analyzed for clauses with varying levels of risk.  
🔹 Results are categorized into three risk levels:

- 🚨 **Critical Attention Required**
- ⚠️ **Moderate Attention Advised**
- ✅ **Low Risk, High Protection**

### **3. How It Works**

1. 📄 **Upload your business contract.**
2. 💡 **AI-powered analysis** detects potentially harmful clauses.
3. 📊 **Risk categorization** presents results in a user-friendly interface.

### **4. Download Analysis**

📥 **Download the analysis** as a PDF file for further review.

### **5. Technology Stack**

- **Frontend**: Next.js for building the UI and providing a smooth user experience.
- **Backend**: The application processes text analysis using an API that handles clause extraction and risk categorization.

---

## 📁 **Project Structure**

```bash
.
├── app
│   ├── api
│   │   ├── get-final-result
│   │   │   └── route.ts       # Route to retrieve final analysis results
│   │   └── process-groq
│   │       └── route.ts       # Main processing route for Groq analysis
│   ├── components
│   └── pages
│       ├── analysis
│       │   └── page.tsx       # Analysis result page
│       └── upload
│           └── page.tsx       # File upload page
├── flask_api
│   ├── flask_api.py           # Python API for toxicity processing
│   ├── requirements.txt       # Python dependencies
├── public
├── README.md
```

🌐 Website: [Toxic Clauses Detector](https://toxic-clauses-detector-in-business-contract.vercel.app/)
📂 GitHub Repository: [Repository URL](https://github.com/songjeongjun320/toxic_clauses_detector_in_business_contract)
💼 LinkedIn: [Your LinkedIn Profile](https://www.linkedin.com/feed/?trk=homepage-basic_sign-in-submit)
