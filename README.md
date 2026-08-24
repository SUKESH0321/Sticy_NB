# Desktop Sticky Notes

A persistent, interactive, and draggable desktop sticky notes application built with React, Vite, TypeScript, and packaged using Electron.

---

## 🚀 Key Features

*   **Draggable Canvas:** Drag notes anywhere on the screen with physics-based inertia and drag boundaries.
*   **Layer Depth Ordering:** Clicking or dragging a note automatically brings it to the front, managing overlapping notes cleanly.
*   **Customizable Colors:** Change note background colors dynamically using a custom color picker dropdown.
*   **Persistent Storage:** All notes are automatically saved to `localStorage` and restored on application startup.
*   **Responsive Desktop Client:** Rendered inside an Electron desktop window container but fully responsive.
*   **Google Gemini AI Ready:** The codebase is pre-configured with `@google/genai` for future AI-powered integrations.

---

## 🛠️ Technical Stack & Architecture

### 🖥️ Main Process (Electron Desktop Wrapper)
Located in `electron/main.js`. It is responsible for:
*   Spinning up the Electron browser frame with a default size of `1024x768`.
*   Directing the window client target depending on the environment:
    *   **Development:** Loads Vite's local hot-reloaded development port (`http://localhost:3000`).
    *   **Production:** Loads the compiled static single-page application from `dist/index.html`.

### 🎨 Renderer Process (React Web UI)
Located in the `src/` directory. It is built using:
*   **React 19:** Utilizes state hooks (`useState`, `useEffect`) to coordinate the overall canvas layout and individual notes.
*   **Tailwind CSS v4:** Handles high-performance styles, animations, and transitions.
*   **Motion (Framer Motion v12):** Orchestrates drag handles, smooth dragging offsets, and color-picking transition cards.
*   **Lucide React:** Supplies modern vector-based icon designs.

### 📁 Project Structure

```text
Sticy_NB/
├── electron/
│   └── main.js          # Electron main process script
├── src/
│   ├── App.tsx          # Main React Application & Canvas State
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global CSS stylesheet (Tailwind imports)
├── .env.local           # Environment variables (API keys, ports)
├── package.json         # Project metadata & npm dependencies
├── vite.config.ts       # Vite configuration with Tailwind integration
└── tsconfig.json        # TypeScript compiler options
```

---

## ⚙️ How to Run & Build

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   npm (installed automatically with Node.js)

### 1. Setup & Installation
Clone the repository and install the project's dependencies:
```bash
# Navigate to the project folder
cd Sticy_NB

# Install required node modules
npm install
```

### 2. Environment Variables Configuration
Duplicate or create a `.env.local` file in the root directory (`Sticy_NB/`) to specify configuration settings:
```ini
# Gemini API key used for integrating Google generative AI models
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

# Development URL for Vite dev-server routing
APP_URL="http://localhost:3000"
```

### 3. Run the App

#### A. Run as a Desktop App (Electron) — **Recommended**
Runs Vite compilation concurrently with Electron, launching the desktop window wrapper:
```bash
npm run electron:dev
```

#### B. Run in the Browser (Web Only)
Launches Vite dev server on `http://localhost:3000` to preview in your web browser:
```bash
npm run dev
```

### 4. Build and Package
*   **Compile Web Assets:** Generates the production bundle in the `/dist` directory.
    ```bash
    npm run build
    ```
*   **Package for Desktop:** Packs the application into a standalone Windows executable inside the `/release` directory.
    ```bash
    npm run electron:build
    ```
