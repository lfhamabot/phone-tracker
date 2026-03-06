# 📱 Phone Tracker

**Inventory management and sales tracking for phone resellers.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-phones.bouchenafa.tech-blue)](https://phones.bouchenafa.tech)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📷 **IMEI Scanning** | Camera-based OCR for quick device registration |
| 📊 **Inventory Management** | Track devices from received → listed → sold |
| 💰 **Financial Tracking** | Cost price, listed price, selling price, net profit |
| 📱 **Mobile-First** | PWA with offline support and home screen installation |
| 🔍 **IMEI Lookup** | Check iCloud lock and SIM lock status |
| 📈 **Sales Analytics** | Platform breakdown, monthly reports, inventory valuation |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- SQLite3
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/lfhamabot/phone-tracker.git
cd phone-tracker

# Install dependencies
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3000
```

### Default Login
```
Username: Columbus
Password: Morocco
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite3 |
| **OCR** | Tesseract.js |
| **Auth** | Session-based |
| **Deployment** | Docker, Cloudflare Tunnel |

---

## 📊 API Endpoints

### Phones
```
GET    /api/phones          # List all phones
GET    /api/phones/:id      # Get phone details
POST   /api/phones          # Create new phone
PUT    /api/phones/:id      # Update phone
DELETE /api/phones/:id      # Delete phone
```

### Sales
```
POST   /api/phones/:id/sell # Mark phone as sold
GET    /api/sales           # List all sales
```

### Financial
```
GET    /api/financial       # Get financial overview
GET    /api/sold-history    # Get sales history
```

---

## 🗂️ Project Structure

```
phone-tracker/
├── 📄 server.js              # Express API server
├── 📄 package.json           # Dependencies
├── 📁 public/                # Static frontend files
│   ├── 📄 index.html         # Main app
│   ├── 📄 login.html         # Login page
│   ├── 📄 manifest.json      # PWA manifest
│   ├── 📄 sw.js              # Service Worker
│   ├── 🖼️ logo.jpg           # App logo
│   └── 📁 logos/             # Carrier logos
├── 📁 data/                  # Database storage
│   └── 📄 phones.db          # SQLite database
└── 📄 docker-compose.yml     # Docker setup
```

---

## 🎨 Screenshots

### Dashboard
- View all devices with status badges
- Filter by status, condition, carrier
- Search by IMEI or model

### Device Detail
- Complete device information
- Cost and pricing history
- IMEI check buttons (iCloud/SIM lock)
- Photo upload

### Financial Overview
- Platform breakdown (eBay, OfferUp, etc.)
- Inventory valuation
- Monthly sales report

---

## 🔧 Configuration

### Environment Variables
Create a `.env` file:
```env
PORT=3000
NODE_ENV=production
```

### Login Credentials
Change default credentials in `server.js`:
```javascript
const VALID_USERNAME = 'your-username';
const VALID_PASSWORD = 'your-password';
```

---

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or manually
docker build -t phone-tracker .
docker run -p 3000:3000 -v $(pwd)/data:/app/data phone-tracker
```

---

## 📱 PWA Installation

### Android
1. Open https://phones.bouchenafa.tech in Chrome
2. Tap **⋮** menu → "Add to Home screen"
3. Tap **Install**

### iOS
1. Open in Safari
2. Tap **Share** → "Add to Home Screen"

---

## 📝 Roadmap

- [ ] Barcode scanning for faster entry
- [ ] Bulk import from CSV
- [ ] Multi-user support with roles
- [ ] Photo gallery per device
- [ ] Automatic eBay listing integration
- [ ] Profit forecasting
- [ ] Supplier management

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🦞 Credits

Built by **L'fhama** for **Si Hassan**

---

## 🔗 Links

- **Live Site:** https://phones.bouchenafa.tech
- **GitHub:** https://github.com/lfhamabot/phone-tracker
- **Issues:** https://github.com/lfhamabot/phone-tracker/issues
