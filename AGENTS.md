# AGENT GUIDANCE: Pendaftaran Ujian Sidang

This repository contains a Google Apps Script project for managing thesis/skripsi examination registrations.

## Key Files & Architecture

*   `Code.gs`: Server-side logic (Google Apps Script, JavaScript-like). Handles form submissions, Google Sheet interactions, Google Drive file uploads, and status checks.
*   `Index.html`: Client-side user interface (HTML, CSS, JavaScript). Manages the multi-step form, file uploads, and client-server communication via `google.script.run`.
*   `README.md`: Essential setup and deployment instructions.

## Critical Setup & Configuration

1.  **Google Spreadsheet ID:** The `SPREADSHEET_ID` constant in `Code.gs` **must be updated** with the ID of the deployed Google Spreadsheet.
2.  **Google Drive Folder ID:** The `FOLDER_ID` constant in `Code.gs` **must be updated** with the ID of the Google Drive folder for file uploads.
3.  **Deployment:** The project is deployed as a Web App from the Google Apps Script editor. Refer to `README.md` for detailed steps (Sections "CARA DEPLOY").
    *   `Execute as: Me (your email)`
    *   `Who has access: Anyone` (for public access) or `Anyone with Google account`.

## Workflow & Important Notes

*   **Client-Server Communication:** Uses `google.script.run` for asynchronous calls from `Index.html` to functions in `Code.gs`.
*   **File Uploads:** Files are processed as Base64 strings on the client (`Index.html`) and then handled by `Code.gs` for upload to Google Drive. All uploaded files must be PDFs and max 10MB.
*   **Data Storage:** All registration data is stored in a Google Spreadsheet across specific sheets: `Pendaftaran`, `Status Ujian`, `Log Aktivitas`. Refer to `README.md` for expected column headers.
*   **NIM Duplication:** The system checks for duplicate NIMs (`cekDuplikasiNIM` in `Code.gs`) to prevent re-registration for active statuses.
*   **Testing:** Traditional automated tests (e.g., Jest, Pytest) are not used. Testing involves:
    *   Deploying the Web App and interacting with the UI.
    *   Manually running `Code.gs` functions (e.g., `debugCekStatus()`) from the Google Apps Script editor and inspecting `Logger.log` output.
*   **No Build Step:** There is no explicit build or compilation step for this project. Changes to `Code.gs` or `Index.html` are directly deployed via the Google Apps Script editor.
*   **Email Notification:** The `sendEmailKonfirmasi` function in `Code.gs` is currently commented out (`// sendEmailKonfirmasi(...)`). If email notifications are desired, it needs to be uncommented and potentially configured with an admin email.
