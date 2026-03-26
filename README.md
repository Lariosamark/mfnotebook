# MFNotebook — Smart Field Documentation Platform

A professional OneNote-style notebook application built with **Next.js** (Vite + React), **Tailwind CSS**, **Supabase** (auth), and **Neon** (database).

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 |
| Authentication | Supabase Auth |
| Database | Neon (PostgreSQL serverless) |
| Rich Text | TipTap v2 |
| File Uploads | react-dropzone |

---

## 📋 Features

### 👤 Authentication (Supabase)
- Email/password login and sign-up
- Auto profile creation on first login
- Session persistence

### 📓 Notebooks (OneNote-style)
- Create / rename / delete notebooks with emoji + color
- Sections (colored tabs) inside each notebook
- Pages inside sections
- Rich text editor (bold, italic, headings, lists, code, images, links, colors)
- Auto-save with debounce (800ms)
- Pin pages for quick access

### 🗂️ Site Folders
- Create folders with **Site Name** + **Location**
- Upload images (drag & drop or click)
- Image captions support
- Grid / list view
- Lightbox image viewer

### 🛡️ Admin Panel
- View all users and their notebooks
- Browse any employee's notes
- Edit / update note content
- Leave admin comments on employee pages
- Delete comments
- Delete pages
- Change user roles (admin ↔ employee)
- Remove users

---

## ⚡ Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd mfnotebook
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxx
VITE_DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Email Auth** in Authentication settings
3. Copy your project URL and anon key to `.env`

### 4. Set up Neon Database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string to `.env`
3. Run the schema in the Neon SQL editor:

```sql
-- Copy and paste the entire content of SCHEMA_SQL from src/lib/neon.js
```

Or run via the app (schema is exported from `src/lib/neon.js` as `SCHEMA_SQL`).

### 5. Create your first admin user

After signing up via the app, run this in Neon:

```sql
UPDATE mf_users SET role = 'admin' WHERE email = 'your@email.com';
```

### 6. Start development

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 🗄️ Database Schema (Neon)

```
mf_users          — User profiles (linked to Supabase auth)
mf_notebooks      — Notebooks per user
mf_sections       — Sections inside notebooks
mf_pages          — Pages inside sections (rich text content)
mf_page_comments  — Admin comments on pages
mf_site_folders   — Site folders with name + location
mf_site_images    — Images inside site folders
```

---

## 🏗️ Project Structure

```
src/
├── components/
│   ├── auth/         LoginPage
│   ├── layout/       Sidebar, TopBar
│   ├── notebook/     NotebookList, SectionPanel, PageEditor, NoteEditor
│   └── ui/           Toast, Modal, ConfirmModal, Skeleton
├── contexts/
│   ├── AuthContext   Supabase auth + profile
│   └── AppContext    Global UI state
├── hooks/
│   ├── useNotebooks  CRUD for notebooks/sections/pages/comments
│   └── useFolders    CRUD for site folders/images/users
├── lib/
│   ├── supabase.js   Supabase client
│   ├── neon.js       Neon DB client + schema
│   └── utils.js      Helpers
└── pages/
    ├── NotebooksPage
    ├── FoldersPage
    └── AdminPage
```

---

## 📦 Build for Production

```bash
npm run build
npm run preview
```

---

## 🔐 Role System

| Feature | Employee | Admin |
|---------|----------|-------|
| Create notebooks | ✅ | ✅ |
| Edit own pages | ✅ | ✅ |
| Create site folders | ✅ | ✅ |
| Upload images | ✅ | ✅ |
| View admin comments | ✅ (read-only) | ✅ |
| Leave comments on any page | ❌ | ✅ |
| Edit any employee's pages | ❌ | ✅ |
| Delete any page | ❌ | ✅ |
| Delete site folders | ❌ | ✅ |
| Manage users / change roles | ❌ | ✅ |
