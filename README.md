# GAF Analysis Dashboard

A comprehensive health analytics dashboard integrating Garmin data for personal optimization.

## Project info

**URL**: https://lovable.dev/projects/0d606591-4286-49d7-9db9-0354e9ea0bd2

## TODO / Future Improvements

### High Priority
- [ ] **Migrate to Official Garmin Health API**: Currently using web-scraping approach with email/password. Should migrate to official OAuth 1.0a based Garmin Health API for better stability, security, and compliance.
  - Requires application submission to Garmin
  - Implement proper OAuth flow
  - More stable and secure data access

### Garmin Data Integration Roadmap
- [ ] **Real-time Data Streaming**: Implement continuous data synchronization instead of manual pull triggers
  - Set up webhooks or scheduled API pulls for automatic data updates
  - Real-time HRV, sleep, and activity data integration
  - Automated pattern detection and alerts based on incoming data streams
- [ ] **Enhanced Data Processing**: Improve data validation and correlation analysis
  - Advanced HRV timing corrections and baseline calibration
  - Multi-device data fusion (Garmin + other wearables)
  - Predictive health analytics based on historical patterns

### Current Implementation
The current system provides:
- **Manual Data Sync**: Users can manually trigger Garmin data synchronization through the profile settings
- **Basic Integration**: HRV, sleep, body battery, stress, and activity data collection
- **User Credential Management**: Secure storage of Garmin Connect credentials in user profiles
- **Data Storage**: Raw Garmin data stored in database with processing triggers for GAF analysis

### Technical Debt
- [ ] Implement proper error handling for Garmin API failures
- [ ] Add data validation for incoming Garmin metrics
- [ ] Optimize database queries for analytics
- [ ] Add automated testing for critical analysis functions
- [ ] Implement proper encryption for stored credentials (currently basic JSON storage)

### UI/UX Improvements
- [ ] **Journal Edit Dialog Reorganization**: Reorganize the field layout in the journal edit dialog (`JournalEditDialog.tsx`) to match the structure and organization of the daily entry form (`DailyEntry.tsx`)
  - Follow the same tab structure (Morning/Day/Evening)
  - Align field grouping and order to maintain consistency
  - Ensure both interfaces provide the same user experience flow
  - Current status: Field values have been aligned with database constraints, but layout needs restructuring

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0d606591-4286-49d7-9db9-0354e9ea0bd2) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0d606591-4286-49d7-9db9-0354e9ea0bd2) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
