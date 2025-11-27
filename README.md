# OpenPolicy

OpenPolicy is a modern, open-source platform designed to simplify the creation, management, and publishing of legal and policy documents. Whether you're a startup needing a Privacy Policy or an enterprise managing complex compliance documentation, OpenPolicy provides a solution that is both simple and secure.

![OpenPolicy Dashboard](https://openpolicyhq.com/opengraph-image.png)

## Features

- **Multi-Workspace Support**: Organize documents by team, project, or client with isolated workspaces. (Coming soon)
- **Rich Text Editor**: Powerful editor for creating and managing documents.
- **Document Management**:
  - **Status Workflow**: Draft, Publish, and Archive states.
  - **SEO Optimized**: Automatic dynamic metadata generation for better discoverability.
- **Custom Branding**: Workspaces get unique slugs (e.g., `acme.openpolicy.com` support ready).

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Payments**: [Polar.sh](https://polar.sh/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Shadcn/UI](https://ui.shadcn.com/)
- **Editor**: [Tiptap](https://tiptap.dev/)
- **Monitoring**: [Sentry](https://sentry.io/)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn
- A Supabase project
- A Polar.sh account (for payments)

### Environment Variables

Create a `.env.local` file in the root directory and add the following variables (see `env.example` for reference):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Polar (Payments)
POLAR_ACCESS_TOKEN=your_polar_access_token
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/openpolicy.git
   cd openpolicy
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Run the development server:**
   ```bash
   pnpm dev
   ```

4. **Open the app:**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

## mb Project Structure

```
openpolicy/
├── app/                # Next.js App Router pages & layouts
│   ├── (auth)/         # Authentication routes
│   ├── [workspace]/    # Dynamic workspace routes
│   ├── api/            # API routes (webhooks, etc.)
│   └── dashboard/      # Protected dashboard views
├── components/         # Reusable UI components
│   ├── ui/             # Shadcn/UI primitives
│   └── tiptap/         # Editor components
├── lib/                # Utilities, hooks, and service clients
├── types/              # TypeScript definitions
└── public/             # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
