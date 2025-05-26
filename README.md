# 🚀 Tiz Lead Scraper

[![Docker Build](https://github.com/tiz20lion/tiz-lead-scraper/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/tiz20lion/tiz-lead-scraper/actions/workflows/docker-publish.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/tiz20lion/tiz-lead-scraper)](https://hub.docker.com/r/tiz20lion/tiz-lead-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful, production-ready web scraper for extracting leads from Apollo.io with seamless Google Sheets and Notion integration. Built with modern web technologies and packaged for easy deployment.

## ✨ Features

- **🎯 Apollo.io Integration**: Extract up to 50,000 leads with 10+ data fields
- **📊 Multiple Export Options**: CSV, JSON, Google Sheets, and Notion
- **🎨 Modern UI**: Beautiful glass-morphism design with smooth animations
- **🔒 Secure**: Built-in CSRF protection and rate limiting
- **🐳 Docker Ready**: One-click deployment with Docker Compose
- **📱 Responsive**: Works perfectly on desktop and mobile devices

## 🐍 Python Setup & Installation

### Prerequisites

- **Python 3.11+** installed on your system
- **Git** for cloning the repository

### Step 1: Clone Repository

```bash
git clone https://github.com/tiz20lion/tiz-lead-scraper.git
cd tiz-lead-scraper
```

### Step 2: Install Dependencies

#### Option A: Using pip (Recommended)

First, create a `requirements.txt` file in your project root:
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
structlog==23.2.0
tenacity==8.2.3
python-multipart==0.0.6
apify-client==1.7.1
notion-client==2.2.1
google-api-python-client==2.108.0
google-auth==2.23.4
```

Then set up your environment:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Option B: Using the included packages
The project includes these key dependencies:
```
fastapi>=0.104.1
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
structlog>=23.2.0
tenacity>=8.2.3
python-multipart>=0.0.6
apify-client>=1.7.1
notion-client>=2.2.1
google-api-python-client>=2.108.0
google-auth>=2.23.4
```

### Step 3: Run the Application

#### Start the server:
```bash
# From the project root directory
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

#### Alternative startup method:
```bash
# Navigate to app directory first
cd app
python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

### Step 4: Access Your Application

Open your web browser and go to:
```
http://localhost:5000
```

The beautiful Tiz Lead Scraper interface will be ready to use!

### 🔧 Configuration

Set up these environment variables for full functionality:

```bash
# Required for Apollo.io scraping
APIFY_API_TOKEN=your_apify_token_here

# Optional: For Google Sheets integration
GOOGLE_SHEETS_CREDENTIALS=your_google_credentials_json

# Optional: For Notion integration  
NOTION_TOKEN=your_notion_integration_secret
NOTION_DATABASE_ID=your_notion_database_id

# Optional: Security settings
SECRET_KEY=your_secret_key_here
```

### 🛠️ Troubleshooting Python Setup

#### Common Issues & Solutions:

**1. Module Import Errors:**
```bash
# If you get "ModuleNotFoundError", try running from project root:
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000
```

**2. Port Already in Use:**
```bash
# Use a different port if 5000 is occupied:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**3. Python Version Issues:**
```bash
# Ensure you're using Python 3.11+:
python --version

# On some systems, use python3:
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 5000
```

**4. Virtual Environment Issues:**
```bash
# If activation fails, try:
# Windows (PowerShell):
venv\Scripts\Activate.ps1

# Windows (Command Prompt):
venv\Scripts\activate.bat
```

**5. Dependency Installation Problems:**
```bash
# Upgrade pip first:
python -m pip install --upgrade pip

# Install with verbose output:
pip install -v fastapi uvicorn pydantic structlog tenacity python-multipart apify-client notion-client google-api-python-client google-auth
```

## 🚀 Quick Start with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

### Method 1: Docker Hub (Recommended)

Pull and run the pre-built image:
```bash
docker run -d -p 5000:5000 --name tiz-lead-scraper tiz20lion/tiz-lead-scraper:latest
```

### Method 2: GitHub Repository

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tiz20lion/tiz-lead-scraper.git
   cd tiz-lead-scraper
   ```

2. **Quick start (Windows):**
   ```bash
   start.bat
   ```

3. **Quick start (Linux/Mac):**
   ```bash
   ./start.sh
   ```

4. **Manual Docker Compose:**
   ```bash
   docker-compose up -d
   ```

5. **Access the application:**
   Open your browser and visit: `http://localhost:5000`

That's it! Your Tiz Lead Scraper is now running! 🎉

## 📋 Getting Your API Keys

### For Apollo.io Scraping:
1. Sign up at [Apify.com](https://apify.com)
2. Go to Account Settings → Integrations
3. Copy your API token
4. Enter it in the web interface when scraping

### For Google Sheets Integration (Optional):
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable Google Sheets API
3. Create service account credentials
4. Download the JSON credentials file
5. Upload the credentials through the web interface

### For Notion Integration (Optional):
1. Visit [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration
3. Copy the integration secret
4. Create a database and connect your integration
5. Enter credentials through the web interface

## 🎮 How to Use

1. **Enter Apollo.io URLs**: Paste the URLs you want to scrape
2. **Set Lead Count**: Use the slider or type a specific number (1-50,000)
3. **Choose Data Fields**: Select which information to extract
4. **Add API Token**: Enter your Apify API token
5. **Start Scraping**: Click the animated start button
6. **Export Results**: Download as CSV/JSON or export to Sheets/Notion

## 🐳 Docker Commands

```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down

# Rebuild after changes
docker-compose up --build -d

# Remove everything (including volumes)
docker-compose down -v
```

## 📁 Project Structure

```
tiz-lead-scraper/
├── app/                    # Main application code
│   ├── api/               # API routes and middleware
│   ├── clients/           # External service clients
│   ├── core/              # Configuration and security
│   ├── models/            # Data models
│   ├── static/            # Frontend assets
│   └── main.py            # Application entry point
├── logs/                  # Application logs (auto-created)
├── data/                  # Data storage (auto-created)
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
└── README.md             # This file
```

## 🔧 Configuration

The application can be customized through environment variables in `docker-compose.yml`:

- `SECRET_KEY`: Application secret key
- `LOG_LEVEL`: Logging level (INFO, DEBUG, WARNING, ERROR)
- `RATE_LIMIT_REQUESTS`: API rate limit (requests per window)
- `RATE_LIMIT_WINDOW`: Rate limit window in seconds

## 🛠️ Troubleshooting

### Container won't start:
- Check if port 5000 is available: `lsof -i :5000`
- View logs: `docker-compose logs`

### Can't access the application:
- Ensure Docker is running
- Try `http://localhost:5000` instead of `127.0.0.1`
- Check firewall settings

### Scraping fails:
- Verify your Apify API token is valid
- Check Apollo.io URLs are accessible
- Review application logs for specific errors

## 📈 Performance

The Docker setup includes:
- **Memory**: 1GB limit, 512MB reserved
- **CPU**: 1 core limit, 0.5 core reserved
- **Health Checks**: Automatic container health monitoring
- **Auto Restart**: Container restarts automatically on failure

## 🔒 Security Features

- CSRF token protection
- Rate limiting (10 requests per minute by default)
- Secure headers middleware
- Input validation and sanitization
- No sensitive data in logs

## 📞 Support

If you encounter any issues:
1. Check the logs: `docker-compose logs -f`
2. Ensure all API keys are correctly configured
3. Verify your URLs are valid Apollo.io search pages
4. Check network connectivity

## 👨‍💻 About the Developer

**Built with ❤️ by Tiz**

Full-Stack Developer & Lead Generation Expert specializing in modern web applications, automation, and scalable solutions. Passionate about creating beautiful, functional tools that help businesses grow and succeed.

### 🚀 Skills & Expertise
- **Backend Development**: Python, FastAPI, Django, Node.js
- **Frontend Development**: React, Vue.js, Modern CSS, Responsive Design
- **DevOps & Deployment**: Docker, CI/CD, Cloud Platforms
- **Data & Automation**: Web Scraping, API Integrations, Lead Generation
- **Database Management**: PostgreSQL, MongoDB, Redis

### 🤝 Let's Connect & Collaborate

**Looking for custom development or have a project in mind?**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/olajide-azeez-a2133a258)
[![Instagram](https://img.shields.io/badge/Instagram-Follow-E4405F?style=for-the-badge&logo=instagram)](https://www.instagram.com/tizkiya?igsh=MXFseXhlMGNvaGZwMQ==)

**Why work with me?**
- ✅ **Proven Expertise**: Successfully built and deployed multiple production applications
- ✅ **Modern Stack**: Always using the latest technologies and best practices
- ✅ **Business Focus**: Understanding your needs and delivering solutions that drive results
- ✅ **Quality Code**: Clean, scalable, and maintainable code with comprehensive documentation
- ✅ **Fast Delivery**: Efficient development process with regular updates and communication

**Services I Offer:**
- 🛠️ Custom Web Application Development
- 🤖 Automation & Web Scraping Solutions
- 📊 Lead Generation & CRM Integration
- 🚀 API Development & Integration
- 🐳 DevOps & Deployment Solutions

**Ready to bring your ideas to life? Let's discuss your next project!**

---

## 🎉 Get Started Today!

Your Tiz Lead Scraper is ready to help you extract valuable leads from Apollo.io with beautiful animations and seamless integrations!