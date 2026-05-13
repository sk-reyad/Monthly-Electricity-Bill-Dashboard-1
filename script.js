/*
  Electricity Bill Dashboard — exact Google Sheets API version
  -----------------------------------------------------------------
  Paste a restricted Google Sheets API key below OR paste it in the
  dashboard setup box. This version does NOT create fake/future sheets.
  It reads the real visible sheet tabs from the spreadsheet metadata,
  excludes hidden tabs and sheets before SEP-2025, then loads values.
*/

const CONFIG = {
  sheetId: "1JN07L26kiBKr-oG1dN0-GYBlQtQ1U1YUmQhUx5MRD2U",
  googleApiKey: "AIzaSyAHM0WKN7CJPgKaB0bNlsd2CW4jcsTwOLQ", // Optional: paste your Google Sheets API key here, or use the setup box in the website.
  minMonth: { year: 2025, monthIndex: 8 }, // SEP-2025. January = 0.
  range: "A1:Z140",
  refreshEveryMs: 5 * 60 * 1000,
  requestTimeoutMs: 20000,
  storageKey: "electricityDashboardGoogleSheetsApiKey",
};

const MONTHS = [
  { short: "JAN", full: "January", aliases: ["JAN", "JANUARY"] },
  { short: "FEB", full: "February", aliases: ["FEB", "FEBRUARY"] },
  { short: "MAR", full: "March", aliases: ["MAR", "MARCH"] },
  { short: "APR", full: "April", aliases: ["APR", "APRIL"] },
  { short: "MAY", full: "May", aliases: ["MAY"] },
  { short: "JUN", full: "June", aliases: ["JUN", "JUNE"] },
  { short: "JUL", full: "July", aliases: ["JUL", "JULY"] },
  { short: "AUG", full: "August", aliases: ["AUG", "AUGUST"] },
  { short: "SEP", full: "September", aliases: ["SEP", "SEPT", "SEPTEMBER"] },
  { short: "OCT", full: "October", aliases: ["OCT", "OCTOBER"] },
  { short: "NOV", full: "November", aliases: ["NOV", "NOVEMBER"] },
  { short: "DEC", full: "December", aliases: ["DEC", "DECEMBER"] },
];

const state = {
  sheets: [],
  monthData: new Map(),
  selectedSheet: "",
  refreshTimer: null,
};

const els = {
  setupPanel: document.getElementById("setupPanel"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  saveApiKeyBtn: document.getElementById("saveApiKeyBtn"),
  clearApiKeyBtn: document.getElementById("clearApiKeyBtn"),
  sheetSelect: document.getElementById("sheetSelect"),
  refreshBtn: document.getElementById("refreshBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  openSheetLink: document.getElementById("openSheetLink"),
  statusBox: document.getElementById("statusBox"),
  selectedTitle: document.getElementById("selectedTitle"),
  loadedAt: document.getElementById("loadedAt"),
  compareWith: document.getElementById("compareWith"),
  mainKpis: document.getElementById("mainKpis"),
  dueChart: document.getElementById("dueChart"),
  unitPriceTrendChart: document.getElementById("unitPriceTrendChart"),
  billSplitChart: document.getElementById("billSplitChart"),
  highestUsageChart: document.getElementById("highestUsageChart"),
  dueAdvanceMatrix: document.getElementById("dueAdvanceMatrix"),
  tenantSearch: document.getElementById("tenantSearch"),
  tenantTableBody: document.getElementById("tenantTableBody"),
  monthTableBody: document.getElementById("monthTableBody"),
  kpiTemplate: document.getElementById("kpiTemplate"),
};

els.openSheetLink.href = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/edit?usp=sharing`;

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).toUpperCase();
}

function compactKey(value) {
  return normalizeKey(value).replace(/[^A-Z0-9]/g, "");
}

function escapeHtml(value) {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isFormulaError(value) {
  return /^#(DIV\/0!|VALUE!|REF!|NAME\?|N\/A|NUM!|NULL!)$/i.test(normalizeText(value));
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = normalizeText(value);
  if (!raw || isFormulaError(raw)) return null;

  const cleaned = raw
    .replace(/,/g, "")
    .replace(/[৳$€£₹]/g, "")
    .replace(/[^0-9.\-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function safeNumber(value) {
  const number = parseNumber(value);
  return number === null ? 0 : number;
}

function sumNumbers(values) {
  const parsed = values.map(parseNumber).filter((value) => value !== null);
  return parsed.length ? parsed.reduce((sum, value) => sum + value, 0) : null;
}

function formatMoney(value) {
  const number = parseNumber(value);
  if (number === null) return "—";
  const sign = number < 0 ? "−" : "";
  const absolute = Math.abs(number).toLocaleString("en-BD", { maximumFractionDigits: 2 });
  return `${sign}৳${absolute}`;
}

function formatNumber(value, suffix = "") {
  const number = parseNumber(value);
  if (number === null) return "—";
  return `${number.toLocaleString("en-BD", { maximumFractionDigits: 2 })}${suffix}`;
}

function formatPlain(value) {
  const text = normalizeText(value);
  return text && !isFormulaError(text) ? text : "—";
}

function compactNumber(value) {
  const number = parseNumber(value);
  if (number === null) return "—";
  const sign = number < 0 ? "-" : "";
  const absolute = Math.abs(number);
  if (absolute >= 100000) return `${sign}${(absolute / 100000).toFixed(1)}L`;
  if (absolute >= 1000) return `${sign}${(absolute / 1000).toFixed(1)}K`;
  return `${sign}${absolute.toFixed(0)}`;
}

function compactMoney(value) {
  const number = parseNumber(value);
  if (number === null) return "—";
  const sign = number < 0 ? "-" : "";
  const absolute = Math.abs(number);
  if (absolute >= 100000) return `${sign}৳${(absolute / 100000).toFixed(1)}L`;
  if (absolute >= 1000) return `${sign}৳${(absolute / 1000).toFixed(1)}K`;
  return `${sign}৳${absolute.toFixed(0)}`;
}

function monthIndexFromName(value) {
  const key = normalizeKey(value).replace(/[^A-Z]/g, "");
  return MONTHS.findIndex((month) => month.aliases.includes(key));
}

function parseSheetDate(sheetName) {
  const cleaned = normalizeKey(sheetName).replace(/[_/]+/g, "-");
  const match = cleaned.match(/^([A-Z]+)[\s.-]*(\d{2}|\d{4})$/);
  if (!match) return null;
  const monthIndex = monthIndexFromName(match[1]);
  if (monthIndex === -1) return null;
  const rawYear = Number(match[2]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  return { year, monthIndex, value: year * 12 + monthIndex };
}

function isAllowedMonthSheet(sheetName) {
  const parsed = parseSheetDate(sheetName);
  if (!parsed) return false;
  const minValue = CONFIG.minMonth.year * 12 + CONFIG.minMonth.monthIndex;
  return parsed.value >= minValue;
}

function sortSheetNamesLatestFirst(names) {
  return [...new Set(names)]
    .filter(isAllowedMonthSheet)
    .sort((a, b) => {
      const dateA = parseSheetDate(a);
      const dateB = parseSheetDate(b);
      if (dateA && dateB) return dateB.value - dateA.value;
      return normalizeText(a).localeCompare(normalizeText(b));
    });
}

function rowText(row) {
  return row.map(normalizeText).filter(Boolean).join(" ");
}

function rowKey(row) {
  return normalizeKey(rowText(row));
}

function getApiKey() {
  const hardcoded = normalizeText(CONFIG.googleApiKey);
  if (hardcoded) return hardcoded;
  return normalizeText(localStorage.getItem(CONFIG.storageKey));
}

function setStatus(message, type = "") {
  els.statusBox.textContent = message;
  els.statusBox.className = `status-box ${type}`.trim();
}

function setLoading(loading) {
  els.refreshBtn.disabled = loading;
  els.saveApiKeyBtn.disabled = loading;
  els.sheetSelect.disabled = loading || state.sheets.length === 0;
  els.refreshBtn.textContent = loading ? "Refreshing..." : "Refresh dashboard";
}

function renderApiPanel() {
  const hasKey = Boolean(getApiKey());
  els.setupPanel.classList.toggle("hidden", hasKey);
  if (hasKey) els.apiKeyInput.value = "";
}


function getSavedTheme() {
  return localStorage.getItem("electricityDashboardTheme") || "light";
}

function applyTheme(theme) {
  const safeTheme = theme === "dark" ? "dark" : "light";
  document.body.classList.toggle("dark-mode", safeTheme === "dark");
  localStorage.setItem("electricityDashboardTheme", safeTheme);

  if (els.themeToggleBtn) {
    els.themeToggleBtn.textContent = safeTheme === "dark" ? "Light mode" : "Dark mode";
    els.themeToggleBtn.setAttribute("aria-pressed", safeTheme === "dark" ? "true" : "false");
    els.themeToggleBtn.setAttribute(
      "aria-label",
      safeTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
  }
}

function initializeTheme() {
  applyTheme(getSavedTheme());
}


function timeoutPromise(ms, message) {
  return new Promise((_, reject) => window.setTimeout(() => reject(new Error(message)), ms));
}

async function fetchJsonWithTimeout(url, message) {
  const response = await Promise.race([
    fetch(url),
    timeoutPromise(CONFIG.requestTimeoutMs, message || "Request timed out."),
  ]);

  let payload;
  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    const apiMessage = payload?.error?.message || `HTTP ${response.status}`;
    throw new Error(apiMessage);
  }

  return payload;
}

async function fetchSheetMetadata(apiKey) {
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}`);
  url.searchParams.set("fields", "sheets.properties(title,index,hidden)");
  url.searchParams.set("key", apiKey);
  return fetchJsonWithTimeout(url.toString(), "Sheet metadata request timed out.");
}

function readVisibleMonthSheetNames(metadata) {
  const names = (metadata.sheets || [])
    .map((sheet) => sheet.properties || {})
    .filter((props) => !props.hidden)
    .map((props) => props.title)
    .filter(Boolean)
    .filter(isAllowedMonthSheet);
  return sortSheetNamesLatestFirst(names);
}

function rangeForSheet(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'!${CONFIG.range}`;
}

async function batchGetRows(apiKey, sheetNames) {
  const chunks = [];
  for (let i = 0; i < sheetNames.length; i += 12) chunks.push(sheetNames.slice(i, i + 12));

  const resultMap = new Map();
  for (const chunk of chunks) {
    const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values:batchGet`);
    chunk.forEach((name) => url.searchParams.append("ranges", rangeForSheet(name)));
    url.searchParams.set("majorDimension", "ROWS");
    url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
    url.searchParams.set("dateTimeRenderOption", "FORMATTED_STRING");
    url.searchParams.set("key", apiKey);

    const payload = await fetchJsonWithTimeout(url.toString(), "Sheet values request timed out.");
    (payload.valueRanges || []).forEach((rangeData, index) => {
      resultMap.set(chunk[index], normalizeRowWidth(rangeData.values || []));
    });
  }

  return resultMap;
}

function normalizeRowWidth(rows) {
  const width = Math.max(1, ...rows.map((row) => row.length));
  return rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ""));
}

function firstFilledRowAfter(rows, startIndex) {
  for (let index = startIndex + 1; index < rows.length; index += 1) {
    if (rows[index].some((cell) => normalizeText(cell))) return index;
  }
  return -1;
}

function looksLikeMainHeader(row) {
  const key = rowKey(row);
  return (key.includes("TOTAL UNIT") || key.includes("TOTAL USAGE") || key.includes("MONTHLY USAGE")) && key.includes("RECHARGE");
}

function looksLikeTenantHeader(row) {
  const key = rowKey(row);
  return key.includes("SUB") && key.includes("METER") && key.includes("TOTAL BILL") && key.includes("PAID") && key.includes("DUE");
}

function findColumnIndex(row, variants) {
  const variantKeys = variants.map(compactKey);
  for (let index = 0; index < row.length; index += 1) {
    const cellKey = compactKey(row[index]);
    if (!cellKey) continue;
    if (variantKeys.some((variant) => cellKey.includes(variant) || variant.includes(cellKey))) return index;
  }
  return -1;
}

function valueFromColumn(row, index) {
  return index === -1 ? "" : row[index];
}

function collectFormulaWarnings(dataRow, headerRow) {
  const warnings = [];
  dataRow.forEach((value, index) => {
    if (!isFormulaError(value)) return;
    const label = normalizeText(headerRow[index]) || `Column ${index + 1}`;
    warnings.push(`${label}: ${value}`);
  });
  return warnings;
}

function getSheetTitle(rows, fallbackSheetName) {
  const titleRow = rows.find((row) => row.some((cell) => normalizeKey(cell).includes("MONTH OF")));
  if (titleRow) return rowText(titleRow);
  const date = parseSheetDate(fallbackSheetName);
  if (!date) return fallbackSheetName;
  return `Month of ${MONTHS[date.monthIndex].full}-${date.year}`;
}

function findTenantNameAbove(rows, headerIndex) {
  for (let index = headerIndex - 1; index >= Math.max(0, headerIndex - 8); index -= 1) {
    const text = rowText(rows[index]);
    const key = normalizeKey(text);
    if (!text) continue;
    if (key.includes("MONTHLY") || key.includes("MONTH OF") || key.includes("MAIN METER")) continue;
    if (key.includes("TOTAL UNIT") || key.includes("RECHARGE") || key.includes("SUB METER")) continue;
    return text;
  }
  return `User ${headerIndex + 1}`;
}

function parseMainMeter(rows) {
  const result = {
    totalUnit: null,
    rechargeAmount: null,
    perUnitPrice: null,
    totalCommonBill: null,
    formulaWarnings: [],
    fallbackNotes: [],
  };

  const mainIndex = rows.findIndex((row) => rowKey(row).includes("MAIN METER"));
  const headerIndex = rows.findIndex((row, index) => (mainIndex === -1 || index > mainIndex) && looksLikeMainHeader(row));
  if (headerIndex === -1) return result;

  const dataIndex = firstFilledRowAfter(rows, headerIndex);
  if (dataIndex === -1) return result;

  const headerRow = rows[headerIndex];
  const dataRow = rows[dataIndex];
  result.formulaWarnings = collectFormulaWarnings(dataRow, headerRow);

  const totalUnitIndex = findColumnIndex(headerRow, ["TOTAL UNIT", "TOTAL MONTHLY USAGE", "MONTHLY USAGE", "TOTAL USAGE"]);
  const rechargeIndex = findColumnIndex(headerRow, ["RECHARGE AMOUNT", "TOTAL MONTHLY RECHARGE", "MONTHLY RECHARGE", "RECHARGE"]);
  const unitPriceIndex = findColumnIndex(headerRow, ["PER UNIT PRICE", "UNIT PRICE"]);
  const commonBillIndex = findColumnIndex(headerRow, ["TOTAL COMMON BILL", "COMMON BILL"]);

  result.totalUnit = parseNumber(valueFromColumn(dataRow, totalUnitIndex));
  result.rechargeAmount = parseNumber(valueFromColumn(dataRow, rechargeIndex));
  result.perUnitPrice = parseNumber(valueFromColumn(dataRow, unitPriceIndex));
  result.totalCommonBill = parseNumber(valueFromColumn(dataRow, commonBillIndex));

  if (result.perUnitPrice === null && result.rechargeAmount !== null && result.totalUnit) {
    result.perUnitPrice = result.rechargeAmount / result.totalUnit;
    result.fallbackNotes.push("Per unit price calculated from recharge ÷ total monthly usage.");
  }

  return result;
}

function parseTenants(rows) {
  const tenants = [];

  rows.forEach((headerRow, headerIndex) => {
    if (!looksLikeTenantHeader(headerRow)) return;
    const dataIndex = firstFilledRowAfter(rows, headerIndex);
    if (dataIndex === -1) return;

    const dataRow = rows[dataIndex];
    const subMeterIndex = findColumnIndex(headerRow, ["SUB-METER UNIT", "SUB METER UNIT", "SUBMETER UNIT", "SUB METER", "USAGE"]);
    const meterBillIndex = findColumnIndex(headerRow, ["METER BILL"]);
    const commonBillIndex = findColumnIndex(headerRow, ["COMMON SPACE BILL", "COMMON BILL"]);
    const totalBillIndex = findColumnIndex(headerRow, ["TOTAL BILL"]);
    const paidIndex = findColumnIndex(headerRow, ["PAID", "PAID AMOUNT"]);
    const dueIndex = findColumnIndex(headerRow, ["DUE", "DUE AMOUNT"]);
    const paymentDateIndex = findColumnIndex(headerRow, ["PAYMENT DATE", "DATE"]);

    const tenant = {
      name: findTenantNameAbove(rows, headerIndex),
      subMeterUnit: parseNumber(valueFromColumn(dataRow, subMeterIndex)),
      meterBill: parseNumber(valueFromColumn(dataRow, meterBillIndex)),
      commonSpaceBill: parseNumber(valueFromColumn(dataRow, commonBillIndex)),
      totalBill: parseNumber(valueFromColumn(dataRow, totalBillIndex)),
      paid: parseNumber(valueFromColumn(dataRow, paidIndex)),
      due: parseNumber(valueFromColumn(dataRow, dueIndex)),
      paymentDate: formatPlain(valueFromColumn(dataRow, paymentDateIndex)),
      formulaWarnings: collectFormulaWarnings(dataRow, headerRow),
      fallbackNotes: [],
    };

    tenants.push(tenant);
  });

  return tenants;
}

function applyFallbackCalculations(mainMeter, tenants) {
  tenants.forEach((tenant) => {
    if (tenant.meterBill === null && tenant.subMeterUnit !== null && mainMeter.perUnitPrice !== null) {
      tenant.meterBill = tenant.subMeterUnit * mainMeter.perUnitPrice;
      tenant.fallbackNotes.push("Meter bill calculated from sub-meter unit × per unit price.");
    }
  });

  const missingCommon = tenants.filter((tenant) => tenant.commonSpaceBill === null);
  if (mainMeter.totalCommonBill !== null && tenants.length && missingCommon.length === tenants.length) {
    const commonShare = mainMeter.totalCommonBill / tenants.length;
    missingCommon.forEach((tenant) => {
      tenant.commonSpaceBill = commonShare;
      tenant.fallbackNotes.push("Common space bill split equally because tenant common bill was blank/error.");
    });
  }

  tenants.forEach((tenant) => {
    if (tenant.totalBill === null && (tenant.meterBill !== null || tenant.commonSpaceBill !== null)) {
      tenant.totalBill = safeNumber(tenant.meterBill) + safeNumber(tenant.commonSpaceBill);
      tenant.fallbackNotes.push("Total bill calculated from meter bill + common space bill.");
    }

    if (tenant.due === null && tenant.totalBill !== null) {
      tenant.due = tenant.totalBill - safeNumber(tenant.paid);
      tenant.fallbackNotes.push("Due calculated from total bill − paid.");
    }
  });
}

function tenantTotals(tenants) {
  return {
    subMeterUnit: sumNumbers(tenants.map((tenant) => tenant.subMeterUnit)),
    meterBill: sumNumbers(tenants.map((tenant) => tenant.meterBill)),
    commonSpaceBill: sumNumbers(tenants.map((tenant) => tenant.commonSpaceBill)),
    totalBill: sumNumbers(tenants.map((tenant) => tenant.totalBill)),
    paid: sumNumbers(tenants.map((tenant) => tenant.paid)),
    due: sumNumbers(tenants.map((tenant) => tenant.due)),
  };
}

function parseSheet(sheetName, rows) {
  const title = getSheetTitle(rows, sheetName);
  const mainMeter = parseMainMeter(rows);
  const tenants = parseTenants(rows);
  applyFallbackCalculations(mainMeter, tenants);
  const totals = tenantTotals(tenants);

  if (mainMeter.totalCommonBill === null && totals.commonSpaceBill !== null) {
    mainMeter.totalCommonBill = totals.commonSpaceBill;
    mainMeter.fallbackNotes.push("Total common bill calculated from tenant common-space bills.");
  }

  const warningCount = mainMeter.formulaWarnings.length + tenants.reduce((sum, tenant) => sum + tenant.formulaWarnings.length, 0);
  const fallbackCount = mainMeter.fallbackNotes.length + tenants.reduce((sum, tenant) => sum + tenant.fallbackNotes.length, 0);

  return { sheetName, title, rows, mainMeter, tenants, totals, warningCount, fallbackCount, loadedAt: new Date() };
}

async function loadAllSheets() {
  const apiKey = getApiKey();
  renderApiPanel();

  if (!apiKey) {
    state.sheets = [];
    state.monthData.clear();
    state.selectedSheet = "";
    populateDropdown();
    renderEmpty();
    setStatus("Paste a Google Sheets API key to load all real visible tabs. This exact version intentionally does not use fake month scanning.", "error");
    return;
  }

  setLoading(true);
  setStatus("Reading real visible sheet tabs from Google Sheets API...");

  try {
    const previousSelected = state.selectedSheet;
    const metadata = await fetchSheetMetadata(apiKey);
    const sheetNames = readVisibleMonthSheetNames(metadata);

    if (!sheetNames.length) {
      throw new Error("No visible month sheets from SEP-2025 onward were found.");
    }

    setStatus(`Found ${sheetNames.length} visible month sheet(s). Loading values...`);
    const rowsMap = await batchGetRows(apiKey, sheetNames);

    const parsedMonths = sheetNames
      .map((name) => parseSheet(name, rowsMap.get(name) || []))
      .filter((month) => month.rows.length > 0);

    state.monthData.clear();
    parsedMonths.forEach((month) => state.monthData.set(month.sheetName, month));
    state.sheets = sortSheetNamesLatestFirst(parsedMonths.map((month) => month.sheetName));
    state.selectedSheet = state.sheets.includes(previousSelected) ? previousSelected : state.sheets[0];

    populateDropdown();
    renderDashboard();
    const loadedNames = state.sheets.join(", ");
    setStatus(`Loaded ${state.sheets.length} real visible month sheet(s): ${loadedNames}. Hidden sheets and pre-SEP-2025 sheets are excluded.`, "success");
  } catch (error) {
    state.sheets = [];
    state.monthData.clear();
    state.selectedSheet = "";
    populateDropdown();
    renderEmpty();
    setStatus(`Dashboard could not load: ${error.message}. Check that the API key is valid, Google Sheets API is enabled, and this spreadsheet is view-accessible.`, "error");
  } finally {
    setLoading(false);
    renderApiPanel();
  }
}

function populateDropdown() {
  if (!state.sheets.length) {
    els.sheetSelect.innerHTML = `<option>No sheet loaded</option>`;
    els.sheetSelect.disabled = true;
    return;
  }

  els.sheetSelect.innerHTML = state.sheets
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
  els.sheetSelect.value = state.selectedSheet;
  els.sheetSelect.disabled = false;
}

function createKpi(label, value, note = "", noteClass = "") {
  const node = els.kpiTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".kpi-label").textContent = label;
  node.querySelector(".kpi-value").textContent = value;
  const noteNode = node.querySelector(".kpi-note");
  noteNode.textContent = note;
  if (noteClass) noteNode.classList.add(noteClass);
  return node;
}

function sortedMonthsAscending() {
  return [...state.monthData.values()].sort((a, b) => {
    const dateA = parseSheetDate(a.sheetName);
    const dateB = parseSheetDate(b.sheetName);
    if (!dateA || !dateB) return a.sheetName.localeCompare(b.sheetName);
    return dateA.value - dateB.value;
  });
}

function previousMonthFor(sheetName) {
  const months = sortedMonthsAscending();
  const index = months.findIndex((month) => month.sheetName === sheetName);
  return index > 0 ? months[index - 1] : null;
}

function changeText(current, previous, formatter, suffix) {
  const currentValue = parseNumber(current);
  const previousValue = parseNumber(previous);
  if (currentValue === null || previousValue === null) return { text: "Previous data unavailable", className: "neutral" };
  const difference = currentValue - previousValue;
  if (Math.abs(difference) < 0.005) return { text: `No change ${suffix}`, className: "neutral" };
  const percent = previousValue ? ` (${Math.abs((difference / previousValue) * 100).toFixed(1)}%)` : "";
  return {
    text: `${difference > 0 ? "+" : "-"}${formatter(Math.abs(difference))}${percent} ${suffix}`,
    className: difference > 0 ? "up" : "down",
  };
}

function dueClass(value) {
  const number = parseNumber(value);
  if (number === null || Math.abs(number) < 0.005) return "amount-zero-due";
  return number > 0 ? "amount-positive-due" : "amount-negative-due";
}

function statusForDue(value) {
  const number = parseNumber(value);
  if (number === null) return { label: "Unknown", className: "unknown" };
  if (number > 0.009) return { label: "Due", className: "due" };
  if (number < -0.009) return { label: "Advance", className: "advance" };
  return { label: "Clear", className: "clear" };
}

function renderMainKpis(month, previous) {
  const main = month.mainMeter;
  const usage = previous ? changeText(main.totalUnit, previous.mainMeter.totalUnit, (v) => formatNumber(v, " units"), `vs ${previous.sheetName}`) : { text: "First loaded month", className: "neutral" };
  const recharge = previous ? changeText(main.rechargeAmount, previous.mainMeter.rechargeAmount, formatMoney, `vs ${previous.sheetName}`) : { text: "First loaded month", className: "neutral" };
  const unitPrice = previous ? changeText(main.perUnitPrice, previous.mainMeter.perUnitPrice, formatMoney, `vs ${previous.sheetName}`) : { text: "First loaded month", className: "neutral" };
  const common = previous ? changeText(main.totalCommonBill, previous.mainMeter.totalCommonBill, formatMoney, `vs ${previous.sheetName}`) : { text: "First loaded month", className: "neutral" };

  els.mainKpis.replaceChildren(
    createKpi("Total Monthly Usage", formatNumber(main.totalUnit, " units"), usage.text, usage.className),
    createKpi("Total Monthly Recharge", formatMoney(main.rechargeAmount), recharge.text, recharge.className),
    createKpi("Per Unit Price", formatMoney(main.perUnitPrice), unitPrice.text, unitPrice.className),
    createKpi("Total Common Bill", formatMoney(main.totalCommonBill), common.text, common.className),
  );
}

function renderTenantTable(month, previous) {
  const search = normalizeKey(els.tenantSearch.value);
  const rows = month.tenants.filter((tenant) => !search || normalizeKey(tenant.name).includes(search));

  if (!rows.length) {
    els.tenantTableBody.innerHTML = `<tr><td colspan="9">No user rows found for this sheet.</td></tr>`;
    return;
  }

  els.tenantTableBody.innerHTML = rows.map((tenant) => {
    const previousTenant = previous?.tenants.find((item) => normalizeKey(item.name) === normalizeKey(tenant.name));
    const usageChange = previousTenant ? changeText(tenant.subMeterUnit, previousTenant.subMeterUnit, (v) => formatNumber(v, " units"), `vs ${previous.sheetName}`) : { text: "No previous match", className: "neutral" };
    const status = statusForDue(tenant.due);

    return `
      <tr>
        <td><strong>${escapeHtml(tenant.name)}</strong></td>
        <td>${formatNumber(tenant.subMeterUnit, " units")}</td>
        <td><span class="change ${usageChange.className}">${escapeHtml(usageChange.text)}</span></td>
        <td><span class="money-value">${formatMoney(tenant.meterBill)}</span></td>
        <td><span class="money-value">${formatMoney(tenant.commonSpaceBill)}</span></td>
        <td><strong class="money-value">${formatMoney(tenant.totalBill)}</strong></td>
        <td><span class="money-value">${formatMoney(tenant.paid)}</span></td>
        <td><span class="money-value ${dueClass(tenant.due)}">${formatMoney(tenant.due)}</span></td>
        <td><span class="badge ${status.className}">${status.label}</span></td>
      </tr>`;
  }).join("");
}

function renderDueChart(month) {
  const rows = month.tenants
    .map((tenant) => ({ name: tenant.name, due: Math.max(0, safeNumber(tenant.due)) }))
    .filter((item) => item.due > 0.009)
    .sort((a, b) => b.due - a.due);

  if (!rows.length) {
    els.dueChart.innerHTML = `<div class="empty-state">No positive due amount found for the selected sheet.</div>`;
    return;
  }

  const max = Math.max(...rows.map((row) => row.due));
  els.dueChart.innerHTML = rows.map((row) => {
    const width = Math.max(2, (row.due / max) * 100);
    return `
      <div class="bar-row" title="${escapeHtml(row.name)}: ${formatMoney(row.due)}">
        <span class="bar-label">${escapeHtml(row.name)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${width}%"></span></span>
        <span class="bar-value">${formatMoney(row.due)}</span>
      </div>`;
  }).join("");
}



function chartY(value, min, max, innerHeight, top) {
  if (max === min) return top + innerHeight / 2;
  return top + innerHeight - ((value - min) / (max - min)) * innerHeight;
}

function makeSeriesPath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
}

function sortedMonthsDescending() {
  return sortedMonthsAscending().reverse();
}

function renderLineChart(container, title, data, series, formatter, options = {}) {
  if (!container) return;

  if (data.length < 2) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(title)} chart will appear after at least two month sheets are loaded.</div>`;
    return;
  }

  const values = data.flatMap((row) => series.map((item) => parseNumber(row[item.key])).filter((value) => value !== null));
  if (!values.length) {
    container.innerHTML = `<div class="empty-state">No numeric data found for ${escapeHtml(title)}.</div>`;
    return;
  }

  const width = 860;
  const height = 318;
  const padding = { top: 24, right: 28, bottom: 58, left: 72 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = rawMax === rawMin ? Math.max(Math.abs(rawMax), 1) : rawMax - rawMin;
  const buffer = rawRange * 0.09;
  const min = options.startAtZero ? 0 : Math.min(0, rawMin) - buffer;
  const max = options.startAtZero ? rawMax + buffer : Math.max(0, rawMax) + buffer;
  const safeMax = max === min ? max + 1 : max;
  const x = (index) => padding.left + (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
  const y = (value) => chartY(value, min, safeMax, innerHeight, padding.top);

  const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const gridY = padding.top + innerHeight - ratio * innerHeight;
    const labelValue = min + ratio * (safeMax - min);
    return `<line class="grid-line" x1="${padding.left}" x2="${width - padding.right}" y1="${gridY}" y2="${gridY}"></line><text class="axis-label" x="8" y="${gridY + 4}">${escapeHtml(formatter(labelValue))}</text>`;
  }).join("");

  const labelStep = data.length > 12 ? Math.ceil(data.length / 12) : 1;
  const labels = data.map((row, index) => {
    if (index % labelStep !== 0 && index !== data.length - 1) return "";
    return `<text class="axis-label" text-anchor="middle" x="${x(index)}" y="${height - 20}">${escapeHtml(row.sheetName)}</text>`;
  }).join("");

  const paths = series.map((item, seriesIndex) => {
    const className = seriesIndex === 0 ? "primary" : seriesIndex === 1 ? "secondary" : "third";
    const points = data.map((row, index) => {
      const value = parseNumber(row[item.key]);
      if (value === null) return null;
      return { x: x(index), y: y(value), label: row.sheetName, value };
    }).filter(Boolean);

    if (!points.length) return "";

    const path = makeSeriesPath(points);
    const dots = points.map((point) => {
      const pointLabel = `${item.label} — ${point.label}: ${formatter(point.value)}`;
      return `<circle class="chart-dot-${className}" cx="${point.x}" cy="${point.y}" r="6" tabindex="0" role="button" data-tooltip="${escapeHtml(pointLabel)}" aria-label="${escapeHtml(pointLabel)}"><title>${escapeHtml(pointLabel)}</title></circle>`;
    }).join("");

    return `<path class="chart-line-${className}" d="${path}"></path>${dots}`;
  }).join("");

  const legend = series.map((item, index) => {
    const className = index === 0 ? "primary" : index === 1 ? "secondary" : "third";
    return `<span><i class="${className}"></i>${escapeHtml(item.label)}</span>`;
  }).join("");

  container.innerHTML = `
    <div class="panel-heading chart-panel-heading">
      <p class="eyebrow">Price trend</p>
      <h2>${escapeHtml(title)}</h2>
    </div>
    <div class="legend">${legend}</div>
    <svg class="svg-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">
      ${grid}
      ${paths}
      ${labels}
    </svg>
    <p class="chart-hint">Hover or tap a point to see the exact value.</p>`;

  const hint = container.querySelector(".chart-hint");
  const defaultHint = "Hover or tap a point to see the exact value.";
  let lockedTooltip = "";

  container.querySelectorAll("[data-tooltip]").forEach((point) => {
    const showTooltip = () => {
      const value = point.getAttribute("data-tooltip") || defaultHint;
      if (hint) hint.textContent = value;
    };

    point.addEventListener("mouseenter", showTooltip);
    point.addEventListener("focus", showTooltip);
    point.addEventListener("click", () => {
      lockedTooltip = point.getAttribute("data-tooltip") || "";
      showTooltip();
    });
    point.addEventListener("mouseleave", () => {
      if (!lockedTooltip && hint) hint.textContent = defaultHint;
    });
    point.addEventListener("blur", () => {
      if (!lockedTooltip && hint) hint.textContent = defaultHint;
    });
  });
}

function renderGroupedBarChart(container, title, data, series, formatter) {
  if (!container) return;

  if (!data.length) {
    container.innerHTML = `<div class="empty-state">No data found for ${escapeHtml(title)}.</div>`;
    return;
  }

  const values = data.flatMap((row) => series.map((item) => Math.max(0, Math.abs(safeNumber(row[item.key])))));
  const max = Math.max(1, ...values);

  const legend = series.map((item, index) => {
    const className = index === 0 ? "primary" : index === 1 ? "secondary" : "third";
    return `<span><i class="${className}"></i>${escapeHtml(item.label)}</span>`;
  }).join("");

  const rows = data.map((row) => {
    const bars = series.map((item, index) => {
      const className = index === 0 ? "primary" : index === 1 ? "secondary" : "third";
      const value = safeNumber(row[item.key]);
      const width = Math.max(2, (Math.abs(value) / max) * 100);
      return `
        <div class="split-bar-line">
          <span class="split-bar-label">${escapeHtml(item.shortLabel || item.label)}</span>
          <span class="split-bar-track"><span class="split-bar-fill ${className}" style="width:${width}%"></span></span>
          <span class="split-bar-value">${escapeHtml(formatter(value))}</span>
        </div>`;
    }).join("");

    return `
      <div class="split-row">
        <strong>${escapeHtml(row.sheetName)}</strong>
        <div class="split-bars">${bars}</div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <p class="chart-title">${escapeHtml(title)}</p>
    <div class="legend">${legend}</div>
    <div class="split-chart">${rows}</div>`;
}

function renderHighestUsageChart() {
  const container = els.highestUsageChart;
  if (!container) return;

  const months = sortedMonthsDescending();
  const allUnits = months.flatMap((month) => month.tenants.map((tenant) => Math.abs(safeNumber(tenant.subMeterUnit))));
  const max = Math.max(1, ...allUnits);

  const cards = months.map((month) => {
    const tenants = [...month.tenants]
      .filter((tenant) => parseNumber(tenant.subMeterUnit) !== null)
      .sort((a, b) => Math.abs(safeNumber(b.subMeterUnit)) - Math.abs(safeNumber(a.subMeterUnit)));

    if (!tenants.length) return "";

    const highestName = tenants[0].name;
    const rows = tenants.map((tenant) => {
      const unit = safeNumber(tenant.subMeterUnit);
      const width = Math.max(2, (Math.abs(unit) / max) * 100);
      const isHighest = normalizeKey(tenant.name) === normalizeKey(highestName);

      return `
        <div class="usage-user-row ${isHighest ? "highest" : ""}">
          <span>${escapeHtml(tenant.name)}${isHighest ? " <em>Highest</em>" : ""}</span>
          <span class="usage-track"><span class="usage-fill" style="width:${width}%"></span></span>
          <b>${formatNumber(tenant.subMeterUnit, " units")}</b>
        </div>`;
    }).join("");

    return `
      <div class="usage-month-card">
        <div class="usage-month-head">
          <strong>${escapeHtml(month.sheetName)}</strong>
          <span>Highest: ${escapeHtml(highestName)}</span>
        </div>
        <div class="usage-user-list">${rows}</div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <p class="chart-title">Highest Usage User by Month</p>
    <p class="chart-subtitle">Each month shows all users, with the highest usage user highlighted.</p>
    <div class="usage-comparison-chart">${cards || `<div class="empty-state">No user usage data found.</div>`}</div>`;
}

function formatDueAdvanceCell(value) {
  const number = parseNumber(value);
  if (number === null || Math.abs(number) < 0.005) {
    return { text: "Clear", className: "clear" };
  }
  if (number > 0) {
    return { text: `${formatMoney(number)} Due`, className: "due" };
  }
  return { text: `${formatMoney(Math.abs(number))} Advance`, className: "advance" };
}

function renderDueAdvanceMatrix() {
  const container = els.dueAdvanceMatrix;
  if (!container) return;

  const months = sortedMonthsDescending();
  const userNames = [...new Set(months.flatMap((month) => month.tenants.map((tenant) => tenant.name)))]
    .filter(Boolean)
    .sort((a, b) => normalizeText(a).localeCompare(normalizeText(b)));

  if (!months.length || !userNames.length) {
    container.innerHTML = `<div class="empty-state">No tenant due/advance data found.</div>`;
    return;
  }

  const cards = userNames.map((name) => {
    const monthCells = months.map((month) => {
      const tenant = month.tenants.find((item) => normalizeKey(item.name) === normalizeKey(name));
      const dueInfo = formatDueAdvanceCell(tenant?.due);
      return `
        <span class="due-month-cell ${dueInfo.className}">
          <small>${escapeHtml(month.sheetName)}</small>
          <b>${escapeHtml(dueInfo.text)}</b>
        </span>`;
    }).join("");

    return `
      <div class="due-user-card">
        <strong>${escapeHtml(name)}</strong>
        <div class="due-month-grid">${monthCells}</div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <p class="chart-title">Due / Advance by User and Month</p>
    <div class="matrix-legend">
      <span><i class="due"></i> Due</span>
      <span><i class="advance"></i> Advance</span>
      <span><i class="clear"></i> Clear</span>
    </div>
    <div class="due-advance-list">${cards}</div>`;
}



function renderAnalyticsCharts() {
  const ascendingData = sortedMonthsAscending().map((month) => ({
    sheetName: month.sheetName,
    perUnitPrice: month.mainMeter.perUnitPrice,
  }));

  const descendingData = sortedMonthsDescending().map((month) => ({
    sheetName: month.sheetName,
    commonBill: month.mainMeter.totalCommonBill,
    meterBill: month.totals.meterBill,
  }));

  renderLineChart(
    els.unitPriceTrendChart,
    "Per-unit Price Trend",
    ascendingData,
    [{ key: "perUnitPrice", label: "Per-unit price" }],
    formatMoney,
    { startAtZero: true },
  );

  renderGroupedBarChart(
    els.billSplitChart,
    "Common Bill vs Meter Bill Split",
    descendingData,
    [
      { key: "meterBill", label: "Meter bill", shortLabel: "Meter" },
      { key: "commonBill", label: "Common bill", shortLabel: "Common" },
    ],
    formatMoney,
  );

  renderHighestUsageChart();
  renderDueAdvanceMatrix();
}


function renderMonthTable() {
  const rows = sortedMonthsAscending().reverse();
  if (!rows.length) {
    els.monthTableBody.innerHTML = `<tr><td colspan="9">No month sheets loaded.</td></tr>`;
    return;
  }

  els.monthTableBody.innerHTML = rows.map((month) => `
    <tr>
      <td><strong>${escapeHtml(month.sheetName)}</strong></td>
      <td>${formatNumber(month.mainMeter.totalUnit, " units")}</td>
      <td>${formatMoney(month.mainMeter.rechargeAmount)}</td>
      <td>${formatMoney(month.mainMeter.perUnitPrice)}</td>
      <td>${formatMoney(month.mainMeter.totalCommonBill)}</td>
      <td>${formatMoney(month.totals.totalBill)}</td>
      <td>${formatMoney(month.totals.paid)}</td>
      <td><span class="money-value ${dueClass(month.totals.due)}">${formatMoney(month.totals.due)}</span></td>
      <td>${month.tenants.length}</td>
    </tr>`).join("");
}

function renderDashboard() {
  const month = state.monthData.get(state.selectedSheet);
  if (!month) {
    renderEmpty();
    return;
  }

  const previous = previousMonthFor(month.sheetName);
  els.sheetSelect.value = month.sheetName;
  els.selectedTitle.textContent = `${month.title} (${month.sheetName})`;
  els.loadedAt.textContent = `Last loaded: ${month.loadedAt.toLocaleString("en-GB")}`;
  els.compareWith.textContent = previous ? `Compared with: ${previous.sheetName}` : "No previous loaded month";

  renderMainKpis(month, previous);
  renderTenantTable(month, previous);
  renderDueChart(month);
  renderAnalyticsCharts();
  renderMonthTable();
}

function renderEmpty() {
  els.selectedTitle.textContent = "No data loaded";
  els.loadedAt.textContent = "—";
  els.compareWith.textContent = "—";
  els.mainKpis.replaceChildren(
    createKpi("Total Monthly Usage", "—"),
    createKpi("Total Monthly Recharge", "—"),
    createKpi("Per Unit Price", "—"),
    createKpi("Total Common Bill", "—"),
  );
  els.dueChart.innerHTML = `<div class="empty-state">No due chart available.</div>`;
  if (els.unitPriceTrendChart) els.unitPriceTrendChart.innerHTML = `<div class="empty-state">No unit price chart available.</div>`;
  if (els.billSplitChart) els.billSplitChart.innerHTML = `<div class="empty-state">No bill split chart available.</div>`;
  if (els.highestUsageChart) els.highestUsageChart.innerHTML = `<div class="empty-state">No highest usage chart available.</div>`;
  if (els.dueAdvanceMatrix) els.dueAdvanceMatrix.innerHTML = `<div class="empty-state">No due/advance matrix available.</div>`;
  els.tenantTableBody.innerHTML = `<tr><td colspan="9">No data loaded.</td></tr>`;
  els.monthTableBody.innerHTML = `<tr><td colspan="9">No data loaded.</td></tr>`;
}

function wireEvents() {
  els.sheetSelect.addEventListener("change", () => {
    state.selectedSheet = els.sheetSelect.value;
    renderDashboard();
  });

  els.refreshBtn.addEventListener("click", () => loadAllSheets());

  if (els.themeToggleBtn) {
    els.themeToggleBtn.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
      applyTheme(nextTheme);
    });
  }

  els.saveApiKeyBtn.addEventListener("click", () => {
    const key = normalizeText(els.apiKeyInput.value);
    if (!key) {
      setStatus("Please paste a Google Sheets API key first.", "error");
      return;
    }
    localStorage.setItem(CONFIG.storageKey, key);
    renderApiPanel();
    loadAllSheets();
  });

  els.clearApiKeyBtn.addEventListener("click", () => {
    localStorage.removeItem(CONFIG.storageKey);
    state.sheets = [];
    state.monthData.clear();
    state.selectedSheet = "";
    renderApiPanel();
    populateDropdown();
    renderEmpty();
    setStatus("Saved API key cleared from this browser. Paste a key again to load the dashboard.", "error");
  });

  els.tenantSearch.addEventListener("input", () => {
    const month = state.monthData.get(state.selectedSheet);
    if (month) renderTenantTable(month, previousMonthFor(month.sheetName));
  });
}

function startAutoRefresh() {
  if (state.refreshTimer) window.clearInterval(state.refreshTimer);
  state.refreshTimer = window.setInterval(() => {
    if (getApiKey()) loadAllSheets();
  }, CONFIG.refreshEveryMs);
}

initializeTheme();
wireEvents();
renderEmpty();
populateDropdown();
renderApiPanel();
loadAllSheets();
startAutoRefresh();
