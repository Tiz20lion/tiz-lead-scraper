# 🤖 Tiz AI Lead Scraper

[![Docker Pulls](https://img.shields.io/docker/pulls/tiz20lion/tiz-lead-scraper)](https://hub.docker.com/r/tiz20lion/tiz-lead-scraper)
[![Docker Image Size](https://img.shields.io/docker/image-size/tiz20lion/tiz-lead-scraper/latest)](https://hub.docker.com/r/tiz20lion/tiz-lead-scraper)

**AI-Powered Lead Generation Agent - Intelligent automation for high-quality leads**

## 🚀 Quick Start

```bash
# Start AI agent instantly
docker run -d -p 5000:5000 tiz20lion/tiz-lead-scraper:latest

# With your OpenRouter AI key
docker run -d -p 5000:5000 -e OPENROUTER_API_KEY=your_key tiz20lion/tiz-lead-scraper:latest

# Production AI setup with persistent data
docker run -d \
  --name tiz-ai-scraper \
  --restart unless-stopped \
  -p 5000:5000 \
  -e OPENROUTER_API_KEY=your_key \
  -v tiz-data:/app/data \
  tiz20lion/tiz-lead-scraper:latest

# Open http://localhost:5000
```

## 🐳 Docker Compose

```yaml
version: '3.8'
services:
  tiz-ai-scraper:
    image: tiz20lion/tiz-lead-scraper:latest
    container_name: tiz-ai-scraper
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - OPENROUTER_API_KEY=your_openrouter_key
    volumes:
      - tiz-data:/app/data

volumes:
  tiz-data:
```

## 🤖 AI Features

- 🧠 **AI-Enhanced Prompts** - Smart optimization for better targeting
- 🔍 **AI Search Queries** - Intelligent query generation and refinement
- ⭐ **High-Quality Leads** - AI filtering for premium results
- 📊 **Smart Export** - AI-organized CSV, Google Sheets, Notion exports
- 🎯 **Learning Agent** - Continuously improves lead quality
- 📱 **Intelligent UI** - AI-guided interface with real-time suggestions

## 🔮 Coming Soon

- 🕵️ **AI Lead Insights Agent** - Deep research on each lead's website, LinkedIn, Twitter profiles
- ✍️ **AI Email Writer Agent** - Personalized email crafting based on lead insights
- 📧 **Smart Email Sender** - Automated outreach with AI-generated personalized messages
- 📋 **Custom Prompts** - Define your outreach goals and key points for AI email generation

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key for AI automation | Yes |
| `GOOGLE_SHEETS_CREDENTIALS` | Path to Google service account JSON | No |
| `NOTION_TOKEN` | Notion integration token for AI database sync | No |
| `LOG_LEVEL` | Logging level (INFO, DEBUG) | No |

## 📋 How to Use

1. **Get OpenRouter API Key** - Sign up at [openrouter.ai](https://openrouter.ai) for AI-powered automation
2. **Start Container** - Use one of the commands above
3. **Open Browser** - Navigate to http://localhost:5000
4. **Add Target URLs** - Input your lead source URLs
5. **AI Enhancement** - Let the agent optimize your prompts and queries
6. **Smart Extraction** - AI extracts up to 50,000 high-quality leads
7. **Export Data** - AI-organized export to your preferred format

## 📊 AI-Enhanced Data

**Smart Contact**: AI-verified Name, Email, Phone
**Professional Intelligence**: Company, Job Title, Industry, Location  
**Social Graph**: LinkedIn, Twitter, Instagram, Website
**AI Quality Score**: Lead relevance and engagement potential

## 🛠️ AI Agent API

- `GET /health` - Health check
- `POST /api/v1/scrape` - Start intelligent extraction
- `GET /api/v1/export/{format}/{task_id}` - AI-organized data export
- `GET /docs` - Interactive AI API documentation

## 🤖 AI Capabilities

**Prompt Enhancement**: Analyzes and improves your search prompts automatically
**Query Intelligence**: Generates optimal search queries based on your criteria
**Quality Filtering**: AI evaluates and scores leads for maximum relevance
**Learning System**: Agent learns from patterns to improve future results

## 🔗 Links

- **📖 GitHub**: [Tiz20lion/tiz-lead-scraper](https://github.com/Tiz20lion/tiz-lead-scraper)
- **🐛 Issues**: [Report bugs](https://github.com/Tiz20lion/tiz-lead-scraper/issues)

## 👨‍💻 Built by Tiz

- **LinkedIn**: [Olajide Azeez](https://www.linkedin.com/in/olajide-azeez-a2133a258)
- **Instagram**: [@tizkiya](https://www.instagram.com/tizkiya)

⭐ **Star the [GitHub repo](https://github.com/Tiz20lion/tiz-lead-scraper) if this AI agent helps you!**