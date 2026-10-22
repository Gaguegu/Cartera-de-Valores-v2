/**
 * Utility formatters for Spanish currency, percentage, and dates
 */

export function formatEUR(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, minDecimals: number = 2, maxDecimals: number = 2): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatPercent(value: number, includeSign: boolean = true): string {
  const formatted = formatNumber(Math.abs(value), 1, 2);
  if (value > 0 && includeSign) {
    return `+${formatted}%`;
  }
  if (value < 0 && includeSign) {
    return `-${formatted}%`;
  }
  return `${formatted}%`;
}

export function formatCurrencyVal(value: number, currency: string = 'EUR'): string {
  return `${formatNumber(value, 2, 2)} ${currency}`;
}

/**
 * Downloads data as a CSV file compatible with Excel in Spanish (; separator, UTF-8 BOM)
 */
export function downloadCSV(filename: string, rows: (string | number)[][], headers: string[]) {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.map(h => `"${h}"`).join(';'),
    ...rows.map(row =>
      row
        .map(cell => {
          if (typeof cell === 'number') {
            return `"${formatNumber(cell)}"`;
          }
          return `"${String(cell).replace(/"/g, '""')}"`;
        })
        .join(';')
    ),
  ].join('\r\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Retorna la lista dinámica de ejercicios fiscales ordenados descendentemente (ej. 2027, 2026, 2025).
 * Incluye automáticamente desde el año actual (2026, 2027, 2028...) hasta 2025,
 * más cualquier año futuro registrado en operaciones, ventas o dividendos.
 */
export function getAvailableFiscalYears(
  extraYears: (number | string | undefined)[] = [],
  minYear: number = 2025
): number[] {
  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(currentYear, 2026);
  const yearsSet = new Set<number>();

  // Genera automáticamente desde el año actual (o superior) hasta el 2025
  for (let y = maxYear; y >= minYear; y--) {
    yearsSet.add(y);
  }

  // Agrega cualquier año futuro o adicional presente en los datos
  for (const ey of extraYears) {
    if (ey !== undefined && ey !== null) {
      const num = typeof ey === 'number' ? ey : parseInt(String(ey), 10);
      if (!isNaN(num) && num >= minYear) {
        yearsSet.add(num);
      }
    }
  }

  return Array.from(yearsSet).sort((a, b) => b - a);
}

/**
 * Safely parses the 4-digit fiscal year from any date string format:
 * DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, or standard Date parsing.
 */
export function parseYearFromDate(dateStr?: string): number {
  if (!dateStr) return new Date().getFullYear();
  const parts = String(dateStr).trim().split(/[/-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && y > 1900) return y;
    }
    if (parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      if (!isNaN(y) && y > 1900) return y;
    }
  }
  const d = new Date(dateStr);
  const parsed = d.getFullYear();
  return isNaN(parsed) || parsed < 1900 ? new Date().getFullYear() : parsed;
}

/**
 * Convierte cualquier fecha en formato DD/MM/YYYY, YYYY-MM-DD, o timestamp en un valor numérico milisegundos
 * para ordenar operaciones cronológicamente de forma exacta.
 */
export function parseDateToTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const parts = String(dateStr).trim().split(/[/-]/);
  if (parts.length === 3) {
    // DD/MM/YYYY o DD-MM-YYYY
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    // YYYY-MM-DD
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
  }
  const d = new Date(dateStr);
  const t = d.getTime();
  return isNaN(t) ? 0 : t;
}

export interface CountryWithholdingProfile {
  name: string;
  flag: string;
  originRate: string;
  destRate: string;
  summary: string;
}

export const COUNTRY_WITHHOLDINGS: Record<string, CountryWithholdingProfile> = {
  'EE.UU.': {
    name: 'EE.UU.',
    flag: '🇺🇸',
    originRate: '15% (W-8BEN)',
    destRate: '19% (IRPF)',
    summary: '15% Origen + 19% Destino',
  },
  'España': {
    name: 'España',
    flag: '🇪🇸',
    originRate: '0%',
    destRate: '19% (IRPF)',
    summary: '19% IRPF Nacional',
  },
  'Alemania': {
    name: 'Alemania',
    flag: '🇩🇪',
    originRate: '26,38%',
    destRate: '19% (IRPF)',
    summary: '26,38% Origen + 19% Destino',
  },
  'Francia': {
    name: 'Francia',
    flag: '🇫🇷',
    originRate: '12,8% / 25%',
    destRate: '19% (IRPF)',
    summary: '12,8% Origen + 19% Destino',
  },
  'Países Bajos': {
    name: 'Países Bajos',
    flag: '🇳🇱',
    originRate: '15%',
    destRate: '19% (IRPF)',
    summary: '15% Origen + 19% Destino',
  },
  'Reino Unido': {
    name: 'Reino Unido',
    flag: '🇬🇧',
    originRate: '0%',
    destRate: '19% (IRPF)',
    summary: '0% Origen + 19% Destino',
  },
  'Suiza': {
    name: 'Suiza',
    flag: '🇨🇭',
    originRate: '35%',
    destRate: '19% (IRPF)',
    summary: '35% Origen + 19% Destino',
  },
};

export function normalizeCountryName(countryRaw?: string): string {
  if (!countryRaw) return 'Otros';
  const c = countryRaw.trim().toUpperCase();
  if (c.includes('ESTADOS UNIDOS') || c.includes('EEUU') || c.includes('USA') || c === 'US') return 'EE.UU.';
  if (c.includes('ESPAÑA') || c.includes('SPAIN') || c === 'ES') return 'España';
  if (c.includes('ALEMANIA') || c.includes('GERMANY') || c === 'DE') return 'Alemania';
  if (c.includes('FRANCIA') || c.includes('FRANCE') || c === 'FR') return 'Francia';
  if (c.includes('REINO UNIDO') || c.includes('UK') || c === 'GB') return 'Reino Unido';
  if (c.includes('PAÍSES BAJOS') || c.includes('HOLANDA') || c.includes('NETHERLANDS') || c === 'NL') return 'Países Bajos';
  if (c.includes('SUIZA') || c.includes('SWITZERLAND') || c === 'CH') return 'Suiza';
  return countryRaw;
}

export function getDividendCountry(
  dividend: { symbol?: string; country?: string; withholdingOriginCountry?: string },
  positions?: { symbol: string; country?: string }[]
): string {
  if (dividend.country) return normalizeCountryName(dividend.country);
  if (dividend.withholdingOriginCountry) return normalizeCountryName(dividend.withholdingOriginCountry);
  if (positions && dividend.symbol) {
    const pos = positions.find(p => p.symbol.toUpperCase() === dividend.symbol!.toUpperCase());
    if (pos?.country) return normalizeCountryName(pos.country);
  }
  const sym = (dividend.symbol || '').toUpperCase();
  if (['IBE', 'SAN', 'BBVA', 'ITX', 'NTGY', 'REP', 'TEF', 'ACS', 'FER'].includes(sym)) return 'España';
  if (['SIE', 'SAP', 'BMW', 'BAS', 'ALV', 'DAI'].includes(sym)) return 'Alemania';
  if (['ASML'].includes(sym)) return 'Países Bajos';
  return 'EE.UU.';
}


