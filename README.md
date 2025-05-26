# 🚀 Tiz Lead Scraper - Docker Edition

A powerful, production-ready web scraper for extracting leads from Apollo.io with seamless Google Sheets and Notion integration. Built with modern web technologies and packaged for easy deployment.

## ✨ Features

- **🎯 Apollo.io Integration**: Extract up to 50,000 leads with 10+ data fields
- **📊 Multiple Export Options**: CSV, JSON, Google Sheets, and Notion
- **🎨 Modern UI**: Beautiful glass-morphism design with smooth animations
- **🔒 Secure**: Built-in CSRF protection and rate limiting
- **🐳 Docker Ready**: One-click deployment with Docker Compose
- **📱 Responsive**: Works perfectly on desktop and mobile devices

## 🚀 Quick Start with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed on your system
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

### Installation

1. **Download the application:**
   ```bash
   git clone <your-repository-url>
   cd tiz-lead-scraper
   ```

2. **Start the application:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
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

## 🎉 Success!

Your Tiz Lead Scraper is now ready to help you extract valuable leads from Apollo.io with beautiful animations and seamless integrations!