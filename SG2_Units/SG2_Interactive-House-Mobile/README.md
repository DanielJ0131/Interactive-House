# 📱 Interactive House Mobile

A React Native application built with **Expo**, **TypeScript**, and **NativeWind** (Tailwind CSS). This project is optimized for high-performance mobile UI development that works for both Android and iOS.

---

## Getting Started

Follow these steps to set up the development environment on your local machine.

### 1. Prerequisites
Ensure you have **Node.js** (LTS version recommended) and **npm** installed. To preview the app on a physical device, download the **Expo Go** app from the App Store or Google Play Store.

### 2. Installation
Navigate to the project root folder and install the necessary dependencies:

```bash
# Install all libraries listed in package.json
npm install
```

### 3. Running the App
```bash
# Start the development server
npx expo start -c
```

## Key Dependencies
* Expo - Framework for universal React applications.
* React Native - Component library for native mobile UI.
* NativeWind - Tailwind CSS styling for React Native components.
* TypeScript - Static typing for more reliable, scalable code.

## Detailed App Structure (Routing)

The `app/` directory uses Expo Router for file-based navigation. Here is what each file does:

### Root Level (`app/`)
* **`_layout.tsx`**: The main entry point. It wraps the entire app in global providers and defines the root stack.
* **`modal.tsx`**: A specialized screen for settings and checking database connections.
* **`+html.tsx`**: Provides the root HTML template for the web version of the app.
* **`+not-found.tsx`**: The "404" screen shown if the user navigates to an invalid route.

### Tab Navigation (`app/(tabs)/`)
These files define the core screens accessible via the bottom navigation bar:

* **`_layout.tsx`**: Configures the bottom tab bar (icons, labels, and behavior).
* **`index.tsx`**: The home or landing screen of the application.
* **`house_hub.tsx`**: The central dashboard for manual home automation (Light, Door, and Window toggles).
* **`ai.tsx`**: The AI interface. A dedicated tab for interacting with AI via text-based commands.
* **`speech.tsx`**: The Speech interface. A tab dedicated to capturing speech and processing voice commands.
* **`[room].tsx`**: A dynamic route for individual room pages (e.g., `/kitchen`, `/bedroom`), allowing for reusable control layouts.

