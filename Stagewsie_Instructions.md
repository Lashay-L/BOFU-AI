

⏺ Stagewise CLI Setup Instructions

  Complete setup guide for upgrading from old Stagewise integration or installing fresh.

  📋 Prerequisites

  - Node.js and npm installed
  - A React/Vue/Angular project with a development server
  - Code editor (Cursor, VSCode, etc.)

  ---
  🔄 Scenario 1: Upgrading from Old Stagewise Integration

  Step 1: Remove Old Dependencies

  Check for old Stagewise packages in package.json:
  // Remove these if present:
  "@stagewise/toolbar"
  "@stagewise/toolbar-react"
  "@stagewise/toolbar-vue"
  "@stagewise/toolbar-next"
  "@stagewise-plugins/react"
  "@stagewise-plugins/vue"
  "@stagewise-plugins/angular"

  Remove the dependency:
  npm uninstall @stagewise/toolbar-react
  # or whichever old package you had

  Step 2: Remove Old Integration Code

  Search for old integration code:
  # Search for old imports and usage
  grep -r "stagewise\|StagewiseToolbar\|setupToolbar" src/

  Common locations to check:
  - src/main.tsx or src/main.js
  - src/App.tsx or src/App.js
  - Any component files

  Remove code like:
  // Remove these patterns:
  import { StagewiseToolbar } from '@stagewise/toolbar-react';
  import('@stagewise/toolbar-react').then(({ StagewiseToolbar }) => { ... });
  setupToolbar();
  <StagewiseToolbar config={...} />

  Step 3: Test Build

  npm run build
  Ensure no errors after removal.

  ---
  🆕 Scenario 2: Fresh Installation (No Previous Stagewise)

  Skip to Step 4 below if you don't have any previous Stagewise integration.

  ---
  ⚙️ Step 4: Install New Stagewise CLI

  Add Concurrent Script Support

  npm install --save-dev concurrently

  Update package.json Scripts

  Add these scripts to your package.json:
  {
    "scripts": {
      "dev": "vite", // or your existing dev command
      "dev:with-stagewise": "concurrently \"vite --port 5174\" \"npx stagewise@latest --app-port 5174 
  --port 3001\"",
      "stagewise": "npx stagewise@latest",
      "stagewise:bridge": "npx stagewise@latest -b"
    }
  }

  Adjust ports if needed:
  - Replace vite --port 5174 with your dev server command and preferred port
  - Use different port for Stagewise (e.g., 3001) than your app

  Create Stagewise Configuration (Optional)

  # Create stagewise.json in project root
  echo '{"appPort": 5174, "framework": "react", "buildTool": "vite"}' > stagewise.json

  ---
  🚀 Step 5: First Time Setup

  Start the Services

  npm run dev:with-stagewise

  Complete Authentication

  1. Browser will open automatically for authentication
  2. Select your code editor (Cursor, VSCode, etc.)
  3. Complete the login process
  4. Grant necessary permissions

  Verify Setup

  After authentication completes, you should see:
  # Terminal output should show:
  [0] VITE v5.x.x ready in XXXms
  [0] ➜ Local: http://localhost:5174/
  [1] STAGEWISE v0.4.1
  [1] ✓ Stagewise ready at http://localhost:3001/

  Access your apps:
  - 🔮 Stagewise Enhanced: http://localhost:3001/ (with AI features)
  - 📱 Direct App: http://localhost:5174/ (your regular app)

  ---
  📝 Step 6: Usage Instructions

  Daily Development

  # Start both services together (recommended)
  npm run dev:with-stagewise

  # Or start separately:
  npm run dev        # Terminal 1
  npm run stagewise  # Terminal 2

  Bridge Mode (No Authentication)

  # If you only want IDE integration without full AI agent
  npm run stagewise:bridge

  Authentication Management

  # Check auth status
  npx stagewise@latest auth status

  # Login/re-authenticate
  npx stagewise@latest auth login

  # Logout
  npx stagewise@latest auth logout

  ---
  🔧 Troubleshooting

  Port Conflicts

  # If you get "Port in use" errors:
  # 1. Change ports in package.json
  # 2. Or kill existing processes:
  pkill -f "vite\|stagewise"

  Authentication Issues

  # Clear auth and re-login:
  npx stagewise@latest auth logout
  npx stagewise@latest auth login

  Proxy Errors

  # Ensure your app port matches the --app-port flag
  # Example: if Vite runs on 5173, use --app-port 5173

  Build Errors After Upgrade

  # Make sure all old Stagewise code is removed:
  grep -r "@stagewise\|StagewiseToolbar" src/
  npm run build

  ---
  📊 Configuration Reference

  Common Framework Configurations

  React + Vite:
  {
    "scripts": {
      "dev:with-stagewise": "concurrently \"vite --port 5174\" \"npx stagewise@latest --app-port 5174 
  --port 3001\""
    }
  }

  React + Create React App:
  {
    "scripts": {
      "dev:with-stagewise": "concurrently \"npm start\" \"npx stagewise@latest --app-port 3000 --port 
  3001\""
    }
  }

  Next.js:
  {
    "scripts": {
      "dev:with-stagewise": "concurrently \"next dev -p 3000\" \"npx stagewise@latest --app-port 3000 
  --port 3001\""
    }
  }

  Vue + Vite:
  {
    "scripts": {
      "dev:with-stagewise": "concurrently \"vite --port 5173\" \"npx stagewise@latest --app-port 5173 
  --port 3001\""
    }
  }

  CLI Options Reference

  # Basic usage
  npx stagewise@latest

  # With specific ports
  npx stagewise@latest --app-port 5174 --port 3001

  # Bridge mode (IDE only, no auth needed)
  npx stagewise@latest -b

  # Silent mode (no prompts, requires auth)
  npx stagewise@latest --silent

  # Custom workspace
  npx stagewise@latest --workspace /path/to/project

  # With auth token
  npx stagewise@latest --token YOUR_TOKEN

  ---
  ✅ Success Checklist

  - Old Stagewise dependencies removed
  - Old integration code removed
  - Build passes without errors
  - concurrently installed
  - Scripts added to package.json
  - First authentication completed
  - Both services start successfully
  - Enhanced app accessible on Stagewise port
  - AI features working in code editor

  ---
  🔗 Useful Links

  - https://stagewise.io/docs
  - https://stagewise.io/docs/auth
  - https://stagewise.io/docs/cli

  ---
  🎉 You're all set! Your Stagewise CLI integration is ready for AI-powered development