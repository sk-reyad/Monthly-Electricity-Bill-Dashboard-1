# Electricity Bill Dashboard

A modern, responsive, live Google Sheets dashboard for tracking monthly electricity usage, recharge amount, per-unit price, common bill, tenant bills, paid amounts, due amounts, and month-to-month comparisons.

This project is built with plain **HTML**, **CSS**, and **JavaScript**. It connects directly to a Google Sheet using the **Google Sheets API**, reads real visible sheet tabs, and displays each monthly sheet through a dropdown selector.

---

## Project Overview

This dashboard is designed for an electricity bill ledger where each month is stored in a separate Google Sheet tab, such as:

```text
SEP-25, OCT-25, NOV-25, DEC-25, JAN-26, FEB-26, MAR-26, APR-26, MAY-26
```

When the dashboard loads, it reads the real sheet tabs from the spreadsheet, filters only valid visible month sheets from **SEP-2025 onward**, and then loads the data for those sheets.

The dashboard does **not** create fake future sheets. Newly added valid month sheets will automatically appear after refreshing the dashboard, as long as they are visible and follow the supported month naming format.

---

## Main Features

### 1. Live Google Sheets Connection

The dashboard connects to a Google Sheet using the Google Sheets API. It reads sheet metadata first, then loads the values from each valid month sheet.

It supports:

- Real visible sheet tab detection
- Automatic inclusion of newly added valid month sheets
- Hidden sheet exclusion
- Pre-SEP-2025 sheet exclusion
- Live refresh using the refresh button
- Auto-refresh every 5 minutes

---

### 2. Month Sheet Dropdown

The dashboard includes a dropdown menu where users can select a month sheet.

Only valid month tabs are shown. For example:

```text
MAY-26
APR-26
MAR-26
FEB-26
JAN-26
DEC-25
NOV-25
OCT-25
SEP-25
```

When a month is selected, the dashboard updates all KPI cards, tenant details, charts, and monthly summary data for that selected sheet.

---

### 3. Main Monthly KPI Cards

At the top of the selected month section, the dashboard displays four important monthly values:

- **Total Monthly Usage**
- **Total Monthly Recharge**
- **Per Unit Price**
- **Total Common Bill**

These values are extracted from the main meter section of the selected Google Sheet tab.

The dashboard also compares the selected month with the previous loaded month where possible.

---

### 4. Collection Overview

The collection section summarizes the tenant billing condition for the selected month.

It displays:

- **Total Tenant Bill**
- **Total Paid**
- **Total Due**

It also shows useful insights such as:

- Usage change from the previous month
- Highest positive due user
- Data health information
- Formula warning count
- Fallback calculation count

---

### 5. Tenant Details Table

The tenant table displays each user’s bill information clearly.

The table includes:

- User name
- Sub-meter unit
- Usage comparison with previous month
- Meter bill
- Common space bill
- Total bill
- Paid amount
- Due amount
- Payment status

The dashboard removed the unnecessary **Payment Date** column to keep the table cleaner.

---

### 6. Due Amount Formatting

The Due column uses clear visual formatting:

- Positive due amount is shown in **bold red**
- Negative due amount is shown in **bold green**
- Zero or unavailable due is shown in a neutral color

The money values are also kept on one line so that the minus sign and amount do not break into separate lines.

---

### 7. Positive Due Chart

The dashboard includes a horizontal bar chart for users who have a positive due amount.

This helps quickly identify which users still have pending payments.

If no user has a positive due amount, the chart displays a clean empty-state message.

---

### 8. Month-to-Month Comparison Charts

The dashboard includes two main trend charts:

#### Usage Chart

Compares:

- Total monthly usage
- Users’ total sub-meter usage

#### Money Chart

Compares:

- Monthly recharge
- Total tenant bill
- Total due

These charts help analyze trends across all loaded month sheets.

---

### 9. Monthly Snapshot Table

The Monthly Snapshot table summarizes all loaded month sheets.

It includes:

- Sheet name
- Total monthly usage
- Total monthly recharge
- Per unit price
- Total common bill
- Total tenant bill
- Total paid
- Total due
- Number of users

This table gives a quick overview of all available months in one place.

---

### 10. Search Functionality

The tenant table includes a search box.

You can search by user name, and the table will instantly filter matching users for the selected month.

---

### 11. Modern Responsive Design

The dashboard uses a modern card-based layout with:

- Large hero section
- Glass-style control card
- Soft shadows
- Rounded panels
- Responsive grid layout
- Mobile-friendly design
- Clean tables with horizontal scrolling on smaller screens

The layout works on desktop, tablet, and mobile screens.

---

### 12. Hover Effects and Animations

The CSS includes subtle animations and hover effects to make the dashboard feel more alive.

Included effects:

- Page fade-in animation
- Floating card entrance animation
- Hero card hover glow
- KPI card lift effect
- Button shine animation
- Table row hover highlight
- Bar chart grow animation
- Line chart draw animation
- Chart dot pop animation
- Reduced-motion support for accessibility

---

## File Structure

```text
electricity-dashboard/
│
├── index.html
├── style.css
└── script.js
```

### `index.html`

This file contains the main structure of the dashboard.

It includes:

- Hero section
- Month selector dropdown
- Refresh button
- API key setup panel
- KPI sections
- Tenant table
- Charts
- Monthly snapshot table
- Template for KPI cards

### `style.css`

This file controls the full design and visual experience.

It includes:

- Theme variables
- Responsive layout
- Card styling
- Table styling
- Due color formatting
- Chart styling
- Hover effects
- Animations
- Mobile responsiveness
- Reduced-motion support

### `script.js`

This file handles the dashboard logic.

It includes:

- Google Sheets API configuration
- Sheet metadata loading
- Visible month sheet detection
- Hidden/pre-SEP-2025 sheet filtering
- Sheet data loading
- Main meter parsing
- Tenant data parsing
- Fallback calculations
- KPI rendering
- Tenant table rendering
- Due chart rendering
- Trend chart rendering
- Monthly snapshot rendering
- Search filtering
- Manual refresh
- Auto-refresh

---

## Google Sheet Requirements

For the dashboard to work properly, your Google Sheet should follow a consistent monthly tab structure.

### Supported Sheet Tab Naming

Use month names like:

```text
SEP-25
OCT-25
NOV-25
DEC-25
JAN-26
FEB-26
MAR-26
APR-26
MAY-26
```

The dashboard supports common month abbreviations such as:

```text
JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, SEPT, OCT, NOV, DEC
```

### Sheet Filtering Rules

The dashboard only loads sheets that meet these rules:

- Sheet must be visible
- Sheet name must look like a valid month
- Sheet must be from **SEP-2025 or later**
- Hidden sheets are ignored
- Older sheets before SEP-2025 are ignored

---

## Data Fields Used by the Dashboard

The dashboard tries to detect columns using flexible header matching.

### Main Meter Section

The main meter section should contain fields similar to:

- Total Unit
- Total Monthly Usage
- Monthly Usage
- Recharge Amount
- Total Monthly Recharge
- Per Unit Price
- Total Common Bill

### Tenant Section

Each tenant section should contain fields similar to:

- Sub-meter Unit
- Meter Bill
- Common Space Bill
- Total Bill
- Paid
- Due

The code tries to detect these fields from the header rows and then reads the first filled data row below each header.

---

## Fallback Calculations

The dashboard includes fallback logic to keep the display useful even if some fields are missing or formula cells return errors.

Examples:

### Per Unit Price

If per unit price is missing but recharge and total usage exist, the dashboard calculates:

```text
Per Unit Price = Recharge Amount / Total Monthly Usage
```

### Meter Bill

If meter bill is missing but sub-meter unit and per unit price exist, the dashboard calculates:

```text
Meter Bill = Sub-meter Unit × Per Unit Price
```

### Common Space Bill

If tenant common bill values are missing but total common bill exists, the dashboard splits the common bill equally among tenants.

### Total Bill

If total bill is missing, the dashboard calculates:

```text
Total Bill = Meter Bill + Common Space Bill
```

### Due

If due is missing, the dashboard calculates:

```text
Due = Total Bill − Paid
```

---

## How to Set Up the Dashboard Locally

### Step 1: Download the Files

Make sure these three files are in the same folder:

```text
index.html
style.css
script.js
```

### Step 2: Enable Google Sheets API

Go to Google Cloud Console and create or select a project.

Then:

1. Go to **APIs & Services**
2. Open **Library**
3. Search for **Google Sheets API**
4. Enable it

### Step 3: Create an API Key

Go to:

```text
APIs & Services > Credentials > Create Credentials > API Key
```

Copy the API key.

### Step 4: Add the API Key

There are two possible ways.

#### Option A: Paste in the Dashboard

Open `index.html` in your browser. If no key is saved, the setup panel will appear. Paste the key there and click **Save key & load**.

The key will be saved only in that browser’s local storage.

#### Option B: Paste in `script.js`

Open `script.js` and find:

```js
googleApiKey: ""
```

Then paste your key inside the quotes.

Example:

```js
googleApiKey: "YOUR_GOOGLE_SHEETS_API_KEY"
```

---

## Important Security Warning

Do **not** publicly host this project with a real API key inside `script.js`.

If the API key is inside frontend JavaScript, anyone can open the browser developer tools and see it.

For private or public hosting, the safer setup is:

- Keep the frontend files public
- Move the Google Sheets API request to a backend/serverless function
- Store the API key in environment variables
- Let the frontend call your own backend endpoint

Recommended free hosting options:

- Vercel + Serverless Function
- Netlify + Netlify Function
- Cloudflare Pages + Function/Worker

If you already committed an API key to GitHub or shared it publicly, rotate or delete that key from Google Cloud Console and create a new restricted key.

---

## Recommended API Key Restrictions

For better safety, restrict your API key.

Recommended restrictions:

- Restrict API usage to **Google Sheets API**
- Restrict by website/domain if hosting online
- Rotate the key if it was exposed
- Do not commit unrestricted keys to GitHub

---

## How to Use the Dashboard

1. Open the dashboard.
2. Wait for the sheet data to load.
3. Use the month dropdown to select a sheet.
4. Check the top KPI cards for monthly usage, recharge, per-unit price, and common bill.
5. Review the collection overview for total bill, paid, and due.
6. Use the tenant table to see each user’s detailed bill.
7. Use the search box to find a specific user quickly.
8. Review the due chart to identify pending payments.
9. Check the trend charts to compare month-to-month usage and billing.
10. Use the Monthly Snapshot table for an overall summary of all loaded sheets.

---

## Auto-Update Behavior

The dashboard updates in three ways:

### 1. Page Load

When the page opens, it loads the latest visible month sheets and their data.

### 2. Manual Refresh

Click the **Refresh dashboard** button to reload all sheet metadata and values.

### 3. Auto Refresh

The dashboard automatically refreshes every 5 minutes.

This means if a sheet value changes or a new valid month sheet is added, the dashboard can show the updated information after refresh.

---

## Customization Guide

### Change the Google Sheet ID

In `script.js`, find:

```js
sheetId: "YOUR_SPREADSHEET_ID"
```

Replace it with your own spreadsheet ID.

### Change the Starting Month

By default, sheets before SEP-2025 are ignored.

In `script.js`, find:

```js
minMonth: { year: 2025, monthIndex: 8 }
```

JavaScript month index starts from 0, so:

```text
January = 0
February = 1
March = 2
April = 3
May = 4
June = 5
July = 6
August = 7
September = 8
October = 9
November = 10
December = 11
```

### Change Refresh Time

In `script.js`, find:

```js
refreshEveryMs: 5 * 60 * 1000
```

This means 5 minutes.

Example for 1 minute:

```js
refreshEveryMs: 1 * 60 * 1000
```

### Change the Data Range

In `script.js`, find:

```js
range: "A1:Z140"
```

Increase this if your sheet has more rows or columns.

Example:

```js
range: "A1:AD200"
```

---

## Design Highlights

The design focuses on clarity and modern dashboard presentation.

It includes:

- Blue-cyan gradient hero section
- Soft glass control card
- Clean KPI cards
- Rounded white panels
- Table row hover effects
- Color-coded due values
- Animated charts
- Subtle hover motion
- Responsive grid system
- Mobile-friendly layout

---

## Browser Support

This dashboard works best in modern browsers such as:

- Google Chrome
- Microsoft Edge
- Firefox
- Safari

Because it uses modern JavaScript features and the Fetch API, very old browsers may not work properly.

---

## Limitations

- The dashboard depends on the structure of the Google Sheet.
- If the sheet headers are changed too much, the parser may fail to detect some values.
- A frontend-only API key is visible to users.
- For secure public hosting, use a backend/serverless proxy.
- The dashboard displays data from the sheet, so anyone who can access the dashboard can see the displayed electricity data.

---

## Future Improvements

Possible improvements include:

- Backend proxy for secure API key handling
- Login protection
- Export dashboard data as PDF
- Export monthly summary as CSV
- Add user-wise payment history
- Add due notification system
- Add dark mode
- Add admin settings panel
- Add custom chart filters

---

## Credits

Developed for managing and visualizing a monthly electricity bill ledger using Google Sheets, HTML, CSS, and JavaScript.
