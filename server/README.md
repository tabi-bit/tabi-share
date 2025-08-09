# Backend Server

This directory contains the backend server for the tabishare application, built with Python and [FastAPI](https://fastapi.tiangolo.com/).

## Setup

It is recommended to use a virtual environment to manage Python dependencies.

1.  **Create and activate a virtual environment:**

    ```bash
    # Navigate to the server directory
    cd server

    # Create a virtual environment
    python3 -m venv venv

    # Activate the environment
    # On macOS/Linux:
    source venv/bin/activate
    # On Windows:
    # venv\Scripts\activate
    ```

2.  **Install dependencies:**

    Once the virtual environment is activated, install the required packages.

    ```bash
    pip install -r requirements.txt
    ```

## Running the Development Server

To run the FastAPI server in development mode with live reloading, use the following command:

```bash
uvicorn main:app --reload
```

The server will be available at `http://localhost:8000`.

## API Endpoints

The API endpoints are defined in `main.py`. As the application grows, these will be organized into separate modules.
