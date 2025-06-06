# 🤖 Tiz AI Lead Scraper

[![Docker Pulls](https://img.shields.io/docker/pulls/tiz20lion/tiz-lead-scraper)](https://hub.docker.com/r/tiz20lion/tiz-lead-scraper)
[![GitHub](https://img.shields.io/github/stars/Tiz20lion/tiz-lead-scraper?style=social)](https://github.com/Tiz20lion/tiz-lead-scraper)

**AI-Powered Lead Generation Agent - Extract high-quality leads with intelligent automation**

## 🚀 AI Features

- 🤖 **AI-Enhanced Prompts** - Smart prompt optimization for better results
- 🔍 **AI Search Queries** - Intelligent query generation and refinement
- ⭐ **High-Quality Leads** - AI filtering for premium lead quality
- 📊 **Smart Export** - AI-organized data export to CSV, Google Sheets, Notion
- 🧠 **Learning Agent** - Continuously improves lead targeting
- 📱 **Intelligent UI** - AI-guided interface with real-time suggestions

## 🔮 Coming Soon

- 🕵️ **AI Lead Insights Agent** - Deep research on each lead's website, LinkedIn, Twitter profiles
- ✍️ **AI Email Writer Agent** - Personalized email crafting based on lead insights
- 📧 **Smart Email Sender** - Automated outreach with AI-generated personalized messages
- 📋 **Custom Prompts** - Define your outreach goals and key points for AI email generation

## 🐳 Docker Installation (Recommended)

```bash
# Quick start
docker run -d -p 5000:5000 tiz20lion/tiz-lead-scraper:latest

# With your OpenRouter AI key
docker run -d -p 5000:5000 -e OPENROUTER_API_KEY=your_key tiz20lion/tiz-lead-scraper:latest

# Open http://localhost:5000
```

## 🐍 Python Installation

```bash
# Clone repository
git clone https://github.com/Tiz20lion/tiz-lead-scraper.git
cd tiz-lead-scraper

# Install dependencies
pip install -r requirements.txt

# Set environment variables (optional - can be set in .env file)
export OPENROUTER_API_KEY=your_openrouter_key

# Run application with development runner (recommended)
python run_dev.py

# Alternative: Direct run
# python app/main.py

# Open http://localhost:5000
```

## 🛠️ Development Features

The `run_dev.py` script provides enhanced development experience:

- ✅ **Auto Port Management** - Automatically handles port 5000 conflicts
- 🔍 **Dependency Check** - Validates all required packages are installed
- 📁 **Directory Setup** - Creates necessary logs and data directories
- 🔧 **Environment Setup** - Configures default development settings
- 🔄 **Auto-reload** - Restarts server on code changes
- 📊 **Debug Logging** - Enhanced logging for development

## 🎯 Quick Setup

1. **Get OpenRouter API Key** - Sign up at [openrouter.ai](https://openrouter.ai) for AI-powered automation
2. **Add Target URLs** - Input your lead source URLs
3. **AI Prompt Enhancement** - Let AI optimize your search criteria
4. **Smart Extraction** - AI agent extracts up to 50,000 high-quality leads
5. **Export Data** - AI-organized export to CSV, Google Sheets, or Notion

## 🔧 Environment Variables

```bash
OPENROUTER_API_KEY=your_openrouter_key        # Required - AI engine
GOOGLE_SHEETS_CREDENTIALS=path_to_json        # Optional - Smart export
NOTION_TOKEN=your_notion_token                # Optional - AI database sync
```

## 📊 AI-Enhanced Data Fields

- **Smart Contact**: AI-verified Name, Email, Phone
- **Professional Intelligence**: Company, Job Title, Industry, Location  
- **Social Graph**: LinkedIn, Twitter, Instagram, Website
- **AI Quality Score**: Lead relevance and engagement potential

## 🛠️ AI Agent API

- **Health Check**: `GET /health`
- **AI Scraping**: `POST /api/v1/scrape` - Start intelligent extraction
- **Smart Export**: `GET /api/v1/export/{format}/{task_id}` - AI-organized data
- **Agent Docs**: http://localhost:5000/docs - Interactive AI API

## 🤖 AI Capabilities

**Prompt Enhancement**: AI analyzes and improves your search prompts for better targeting
**Query Intelligence**: Smart query generation based on your lead criteria  
**Quality Filtering**: AI evaluates and scores leads for relevance and engagement
**Learning System**: Agent learns from your preferences to improve results

## 👨‍💻 Built by Tiz

- **LinkedIn**: [Olajide Azeez](https://www.linkedin.com/in/olajide-azeez-a2133a258)
- **Instagram**: [@tizkiya](https://www.instagram.com/tizkiya)

⭐ **Star this AI-powered tool if it helps you generate better leads!**
