# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-11-26

### 🚀 Launched
- **Initial Release**: OpenPolicy is now live!
- **Multi-Workspace Support**: Create and manage isolated workspaces for different projects or clients.
- **Rich Text Editor**: A powerful, Notion-style editor powered by Tiptap for seamless policy writing.
- **Document Management**:
  - Create, edit, and delete documents.
  - **Status Workflow**: Manage document lifecycle with Draft, Published, and Archived states.
  - **Versioning**: Track changes (internal foundation laid).
- **Dynamic SEO**: Automatic metadata generation for workspaces and documents to ensure better discoverability.
- **Custom Branding**: Unique workspace slugs (e.g., `acme.openpolicy.com` support ready).
- **Authentication**: Secure login via GitHub and Google using Supabase Auth.
- **Payments & Billing**: Integrated with Polar.sh for seamless subscription management.
- **Global Limits**: Enforced workspace limits (currently 1 per user) to manage platform usage.
- **Modern UI**: Built with Next.js 15, Tailwind CSS, and Shadcn/UI for a premium experience.

### 🐛 Fixed
- Resolved issues with document status synchronization.
- Fixed duplicate workspace slug validation.
- Improved error handling during workspace creation.
- Removed debug logs for a cleaner production build.

---

## 🔮 Upcoming Features (Roadmap)

### Q1 2026
- **Team Collaboration**: Invite members to your workspace with granular permissions (Viewer, Editor, Admin).
- **Custom Domains**: Connect your own domain (e.g., `policies.yourcompany.com`) instead of using the OpenPolicy subdomain.
- **API Access**: Programmatic access to your documents for integration with your own apps and CI/CD pipelines.
- **Advanced Analytics**: Track views and engagement on your public policy pages.
- **Version History UI**: View and restore previous versions of your documents.
- **Templates Library**: Start with pre-made templates for Privacy Policies, Terms of Service, and more.
- **Dark Mode**: Full dark mode support for public document pages.
