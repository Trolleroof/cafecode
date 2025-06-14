# CodeCraft IDE

A beginner-friendly online IDE designed for self-taught developers and bootcamp students. Write code, get instant help, and learn by doing.

## 🚀 Project Structure

This project consists of three main components:

### 1. **Next.js Application** (Main App)
- **Location**: Root directory
- **Technology**: Next.js 13+ with TypeScript, Tailwind CSS, and shadcn/ui
- **Purpose**: Main CodeCraft IDE application with homepage and IDE interface
- **Port**: 3000 (default)

### 2. **Frontend Server** (Express.js)
- **Location**: `./frontend/`
- **Technology**: Node.js with Express.js
- **Purpose**: Standalone frontend server for demonstration
- **Port**: 3001

### 3. **Backend Server** (Python)
- **Location**: `./backend/`
- **Technology**: Python HTTP Server
- **Purpose**: Simple backend API server
- **Port**: 8000

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.7+

### Running the Main Next.js Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit: http://localhost:3000

### Running the Frontend Server

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the server
npm start
```

Visit: http://localhost:3001

### Running the Backend Server

```bash
# Navigate to backend directory
cd backend

# Run the Python server
python main.py
```

Visit: http://localhost:8000

## 📁 Project Structure

```
codecraft-ide/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles with custom animations
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Homepage component
│   └── ide/
│       └── page.tsx       # IDE interface
├── components/            # Reusable React components
│   ├── Header.tsx         # Navigation header
│   ├── Footer.tsx         # Site footer
│   └── ui/               # shadcn/ui components
├── frontend/             # Standalone Express.js server
│   ├── package.json
│   ├── server.js
│   └── public/
│       └── index.html
├── backend/              # Python backend server
│   ├── main.py           # Main server file
│   └── requirements.txt  # Python dependencies
├── lib/                  # Utility functions
├── tailwind.config.ts    # Tailwind CSS configuration
├── next.config.js        # Next.js configuration
└── package.json          # Main project dependencies
```

## ✨ Features

### Main Application Features
- **Beautiful Landing Page**: Modern design with animations and gradients
- **Interactive IDE**: Code editor with syntax highlighting
- **AI Chat Assistant**: Simulated AI help for coding questions
- **Multi-language Support**: JavaScript, Python, and HTML
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components

### Technical Features
- **Next.js 13+**: App Router, Server Components, and TypeScript
- **Tailwind CSS**: Utility-first CSS framework with custom animations
- **shadcn/ui**: High-quality, accessible UI components
- **Lucide Icons**: Beautiful, customizable icons
- **Static Export**: Optimized for deployment to static hosting

## 🎨 Design System

The application uses a comprehensive design system with:
- **Color Palette**: Primary (blue) and accent (teal) colors with multiple shades
- **Typography**: Inter font family with proper hierarchy
- **Spacing**: 8px grid system for consistent layouts
- **Animations**: Custom CSS animations for enhanced user experience
- **Components**: Modular, reusable components following best practices

## 🚀 Deployment

### Next.js Application
The main application is configured for static export and can be deployed to:
- Vercel (recommended)
- Netlify
- GitHub Pages
- Any static hosting service

### Frontend Server
Can be deployed to:
- Heroku
- Railway
- DigitalOcean App Platform
- Any Node.js hosting service

### Backend Server
Can be deployed to:
- Heroku
- PythonAnywhere
- DigitalOcean Droplets
- Any Python hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Images from [Pexels](https://pexels.com/)

---

**CodeCraft IDE** - Empowering the next generation of developers with an intuitive, beginner-friendly coding environment.