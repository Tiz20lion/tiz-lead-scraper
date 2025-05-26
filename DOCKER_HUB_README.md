# Tiz Lead Scraper

🚀 **A powerful, production-ready web scraper for extracting leads from Apollo.io**

Extract up to 50,000 leads with beautiful animations and seamless integrations!

## 🎯 Features

- **Apollo.io Integration**: Extract leads with 10+ data fields
- **Multiple Export Options**: CSV, JSON, Google Sheets, Notion
- **Beautiful UI**: Glass-morphism design with smooth animations
- **Production Ready**: Built-in security, rate limiting, health checks
- **Easy Deployment**: One-command Docker setup

## 🚀 Quick Start

```bash
# Pull and run the latest version
docker run -d -p 5000:5000 --name tiz-lead-scraper tiz20lion/tiz-lead-scraper:latest

# Access the application
open http://localhost:5000
```

## 📋 What You Need

1. **Apify API Token** - Sign up at [apify.com](https://apify.com) for Apollo.io scraping
2. **Google Sheets API** (Optional) - For exporting to Google Sheets
3. **Notion Integration** (Optional) - For Notion database sync

## 🎮 How to Use

1. Enter Apollo.io search URLs
2. Set lead count (1-50,000)
3. Choose data fields to extract
4. Add your Apify API token
5. Click start and watch the magic happen!

## 📊 Export Options

- **CSV Download**: Instant CSV file download
- **JSON Download**: Structured JSON data export
- **Google Sheets**: Direct export to spreadsheets
- **Notion Database**: Sync with your Notion workspace

## 🔧 Advanced Usage

### With Docker Compose

```yaml
version: '3.8'
services:
  tiz-lead-scraper:
    image: tiz20lion/tiz-lead-scraper:latest
    ports:
      - "5000:5000"
    environment:
      - LOG_LEVEL=INFO
    restart: unless-stopped
```

### Environment Variables

- `LOG_LEVEL`: Set logging level (INFO, DEBUG, WARNING, ERROR)
- `RATE_LIMIT_REQUESTS`: API rate limit (default: 10)
- `RATE_LIMIT_WINDOW`: Rate limit window in seconds (default: 60)

## 🛠️ Development

Want to contribute? Check out the [GitHub repository](https://github.com/tiz20lion/tiz-lead-scraper) for the full source code and development setup.

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Full setup guide in the repository
- **Community**: Join discussions and get help

## 📈 Tags

- `latest`: Most recent stable version
- `v1.x.x`: Specific version releases
- `main`: Latest development build

## 👨‍💻 Meet the Developer

**Built with ❤️ by Tiz**

Full-Stack Developer & Lead Generation Expert who created this powerful tool to help businesses scale their outreach efforts. With expertise in Python, FastAPI, Docker, and modern web technologies, I specialize in building automation solutions that drive real business results.

### 🚀 Why This Tool Stands Out

- **Production-Ready**: Built with enterprise-grade security and scalability
- **Modern Architecture**: FastAPI backend with beautiful glass-morphism UI
- **Developer Experience**: Clean code, comprehensive documentation, easy deployment
- **Business Focus**: Designed to solve real lead generation challenges

### 🤝 Need Custom Development?

Looking for tailored automation solutions or custom web applications? I'd love to help bring your ideas to life!

**Connect with me:**
- 💼 **LinkedIn**: [Olajide Azeez](https://www.linkedin.com/in/olajide-azeez-a2133a258) - Let's discuss your project
- 📸 **Instagram**: [@tizkiya](https://www.instagram.com/tizkiya?igsh=MXFseXhlMGNvaGZwMQ==) - See my latest work

**Services I offer:**
- Custom Web Application Development
- API Development & Integration  
- Automation & Web Scraping Solutions
- Lead Generation Tools
- DevOps & Deployment

---

Built with ❤️ for the lead generation community!