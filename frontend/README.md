# Frontend Application

This directory contains the frontend for the tabishare application, built with [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Vite](https://vitejs.dev/).

## Development

All commands should be run from the **root** of the repository.

### Running the Development Server

To start the local development server with hot-reloading, run:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Running Storybook

We use [Storybook](https://storybook.js.org/) to develop and document UI components in isolation. To run Storybook, use:

```bash
npm run storybook
```

Storybook will be available at `http://localhost:6006`.

## Directory Structure

-   `src/`: Main source code directory.
    -   `components/`: Reusable UI components.
        -   `ui/`: Components from [shadcn/ui](https://ui.shadcn.com/).
    -   `lib/`: Utility functions and helper scripts.
    -   `assets/`: Static assets like images and SVGs.
    -   `App.tsx`: The main application component.
    -   `main.tsx`: The entry point of the application.
-   `tests/`: Contains all the test files.
-   `public/`: Static assets that are not processed by Vite.
-   `.storybook/`: Storybook configuration files.

## Key Libraries

-   **UI Framework**: [React](https://react.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Drag and Drop**: [@dnd-kit](https://dndkit.com/)
-   **Linting**: [ESLint](https://eslint.org/)
-   **Formatting**: [Prettier](https://prettier.io/)
