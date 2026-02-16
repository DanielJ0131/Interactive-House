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

## Project Structure
app
├── (auth)               # Authentication flow (Modal-based)
│   ├── _layout.tsx      # Defines the sub-stack for the auth screens.
│   ├── login.tsx        # User Sign-in
│   └── signup.tsx       # Account Creation
├── (tabs)               # Main Application Hub (Authenticated)
│   ├── ai.tsx           # AI Assistant Interface
│   ├── device_hub.tsx   # Categorized Control Center (Actuators/Sensors)
│   ├── [device].tsx     # Dynamic Hardware Detail & Technical Specs
│   ├── home.tsx         # Primary Device Dashboard
│   ├── _layout.tsx      # Tab Navigation Configuration
│   └── speech.tsx       # Voice Command Processing
├── _layout.tsx          # Root Entry Point & Theme Provider
├── index.tsx            # Welcome / Landing Screen
├── modal.tsx            # System Connectivity & Database Status
├── +html.tsx            # Web Root Template
└── +not-found.tsx       # 404 Error Screen

