# Apollo.io Lead Scraper

A production-ready, Dockerized web scraper that extracts leads from Apollo.io using the Apify API, with seamless integrations to Google Sheets and Notion databases, featuring a modern animated single-page web interface.

## 🚀 Features

### Core Functionality
- **Apollo.io Integration**: Extract leads directly from Apollo.io using Apify API
- **Multi-URL Processing**: Process up to 10 Apollo.io URLs simultaneously
- **Configurable Lead Count**: Extract 1-1000+ leads per session
- **10+ Field Extraction**: name, email, phone, company, title, location, industry, LinkedIn, Twitter, website
- **Real-time Progress Tracking**: Live updates with background task processing
- **Export Options**: CSV, JSON, Google Sheets, and Notion database sync

### User Interface
- **Modern Animated UI**: Smooth transitions with Animate.css and GSAP
- **Dual-Panel Design**: Responsive CSS Grid layout
- **Dark/Light Themes**: Toggle with smooth transitions
- **Real-time Progress Bars**: Visual feedback with percentage indicators
- **Toast Notifications**: User-friendly feedback system
- **Hover Effects**: Micro-interactions for enhanced UX

### Technical Features
- **FastAPI Backend**: Async/await implementation for optimal performance
- **Docker Integration**: Multi-stage builds with health monitoring
- **Security First**: CSRF protection, rate limiting, security headers
- **Structured Logging**: JSON format with comprehensive error tracking
- **Environment Config**: Secure credential management
- **Retry Logic**: Exponential backoff for external API calls

## 📋 Prerequisites

### Required API Keys and Credentials

1. **Apify API Token**
   - Sign up at [Apify](https://apify.com/)
   - Navigate to Settings > Integrations
   - Copy your API token

2. **Google Sheets Integration**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Sheets API
   - Create Service Account credentials
   - Download the JSON credentials file

3. **Notion Integration**
   - Go to [Notion Integrations](https://www.notion.so/my-integrations)
   - Create a new integration
   - Copy the integration secret (this will be your `NOTION_TOKEN`)
   - To create a Notion database:
     - Within your workspace, click "+"
     - Click "Database"
     - Define columns for your leads
     - Click "..." → "Connections" → Select your integration
     - Copy the database ID from the URL (the part after `https://www.notion.so/` and before `?`)

## 🛠️ Installation & Setup

### Option 1: Docker Compose (Recommended)

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd apollo-scraper
   ```

2. **Environment Configuration**
   Create a `.env` file:
   ```env
   # API Tokens
   APIFY_API_TOKEN=your_apify_token_here
   GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
   NOTION_TOKEN=secret_your_notion_token
   NOTION_DATABASE_ID=your_notion_db_id

   # Security
   SECRET_KEY=your-super-secret-key-here
   ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.com

   # Rate Limiting
   RATE_LIMIT_REQUESTS=10
   RATE_LIMIT_WINDOW=60

   # Logging
   LOG_LEVEL=INFO
   DEBUG=false
   ```

3. **Launch Application**
   ```bash
   docker-compose up -d
   ```

4. **Access Interface**
   Open [http://localhost:8000](http://localhost:8000)

### Option 2: Direct Python Installation

1. **Install Dependencies**
   ```bash
   pip install fastapi uvicorn pydantic structlog apify-client google-api-python-client notion-client tenacity python-multipart pydantic-settings
   ```

2. **Set Environment Variables**
   ```bash
   export APIFY_API_TOKEN="your_token"
   export GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'
   export NOTION_TOKEN="your_notion_token"
   export NOTION_DATABASE_ID="your_database_id"
   