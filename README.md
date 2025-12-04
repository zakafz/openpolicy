<p align="center">
  <a href="https://openpolicyhq.com">
    <img src="https://openpolicyhq.com/icon-openpolicy-white.svg" alt="OpenPolicy Logo" width="140" height="140">
  </a>
</p>

<h1 align="center">OpenPolicy</h1>

<p align="center">
  The open-source platform for managing legal and public documents.
  <br />
  <a href="https://openpolicyhq.com"><strong>Explore the website</strong></a>
  <br />
  <a href="https://github.com/zakafz/openpolicy/issues">Report Bug</a>
  ·
  <a href="https://github.com/zakafz/openpolicy/issues">Request Feature</a>
</p>

<div align="center">
  
  ![GitHub License](https://img.shields.io/github/license/zakafz/openpolicy?style=plastic)
  ![GitHub Tag](https://img.shields.io/github/v/tag/zakafz/openpolicy?style=plastic&color=%234169E1)
  ![GitHub branch status](https://img.shields.io/github/checks-status/zakafz/openpolicy/main?style=plastic)
  
</div>

<br />

![OpenPolicy Dashboard](https://openpolicyhq.com/demo-1.png)

## About OpenPolicy 

OpenPolicy is a new open-source platform designed to simplify the creation, management, and publishing of legal and public documents. Whether you're a startup needing a Privacy Policy or an enterprise managing complex compliance documentation, OpenPolicy provides a solution that is both simple and secure.

We believe that legal documentation shouldn't be a hassle. It should be:
*   **Accessible**: Publish instantly to a custom domain.
*   **Collaborative**: Work with your team in real-time. (Coming soon)
*   **Versioned**: Keep track of every change. (Coming soon)

## Features 

OpenPolicy is packed with features to help you manage your policies effectively. And more are coming soon!

- [x] **AI-Powered Writing**: Built-in AI Copilot for autocompletion and Command mode for generating, editing, and summarizing text.
- [x] **Rich Text Editor**: Advanced editor with support for markdown, tables, and **Excalidraw** diagrams.
- [ ] **Multi-Workspace Support**: Organize documents by team, project, or client with isolated workspaces. (Coming soon)
- [x] **Custom Domains**: Connect your own domain (e.g., `docs.acme.com`) with automatic SSL.
- [x] **Document Management**:
  - **Status Workflow**: Draft, Publish, and Archive states.
  - **SEO Optimized**: Automatic dynamic metadata generation for better discoverability.
- [x] **Custom Branding**: Workspaces get unique slugs (e.g., `acme.openpolicyhq.com`).

## Tech Stack 

Built with the best modern web technologies.

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Payments**: [Polar.sh](https://polar.sh/)
- **Editor**: [PlateJS](https://platejs.org/)
- **Monitoring**: [Sentry](https://sentry.io/)

## Getting Started 

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A Supabase project
- A Polar.sh account (for payments)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zakafz/openpolicy.git
   cd openpolicy
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add the following variables. See `env.example` for more template.

4. **Run the development server:**
   ```bash
   pnpm dev
   ```

5. **Open the app:**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Contributing 

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 

Distributed under the GPL-3.0 License. See `LICENSE` for more information.

## Contact 

Support: [support@openpolicyhq.com](mailto:support@openpolicyhq.com)

Contact page: [contact](https://openpolicyhq.com/contact)
