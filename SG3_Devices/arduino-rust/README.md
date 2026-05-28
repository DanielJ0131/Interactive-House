# Interactive House Rust Port | HKR

* Course: DA330B - Software Engineering
* Institution: Kristianstad University
* Daniel's Port

# Project Overview

Interactive House Rust Port is a Rust-focused continuation of our original Interactive House school project in Ubiquitous Computing (UbiComp).

I decided to continue developing the project and rebuild key parts in Rust. Our goal is to port core house logic, communication workflows, and selected user-facing integrations to Rust for stronger reliability, predictable performance, and safer concurrency.

The system explores human-controlled interaction with household devices to improve independence and self-control for individuals with disabilities, while introducing a modern systems-programming foundation.

# Rust Port Objectives

* Port selected backend and device-simulation components from mixed-language prototypes to Rust.
* Define stable interfaces between Rust services, mobile/web clients, and external data stores.
* Improve robustness with stronger type safety, clearer module boundaries, and testable async workflows.
* Preserve accessibility features while improving maintainability and deployment consistency.

# About the Rust Port Team

This version of the project is maintained by:

* Daniel Jönsson

I am taking what we built during school and evolving it into a cleaner, safer, and more maintainable Rust-based system.

# Dev Container

To use the container setup, open the repository root folder in VS Code. The `.devcontainer/` folder in the root will be picked up automatically when you choose to reopen the workspace in the container.