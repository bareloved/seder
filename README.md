# Income Tracker

A modern income tracking application built with Next.js, Drizzle ORM, and Tailwind CSS.

## Features

- **Income Management**: Add, edit, and view income records.
- **Data Visualization**: KPI cards and summaries for income data.
- **Filtering**: Filter income records by various criteria.
- **Responsive Design**: Built with Tailwind CSS and Radix UI for a modern, accessible interface.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Validation**: [Zod](https://zod.dev/)

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/bareloved/income-tracker.git
   cd income-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your database connection string:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

### Database Setup

This project uses Drizzle Kit for database migrations.

1. Generate migrations:
   ```bash
   npm run db:generate
   ```

2. Push schema changes to the database:
   ```bash
   npm run db:push
   ```

3. (Optional) Open Drizzle Studio to view/manage data:
   ```bash
   npm run db:studio
   ```

### Running the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `npm run dev`: Runs the app in development mode.
- `npm run build`: Builds the app for production.
- `npm run start`: Runs the built app in production mode.
- `npm run lint`: Lints the codebase.
- `npm run db:generate`: Generates Drizzle migrations.
- `npm run db:migrate`: Runs Drizzle migrations.
- `npm run db:push`: Pushes the schema to the database directly.
- `npm run db:studio`: Opens Drizzle Studio.

## License

[MIT](LICENSE)

