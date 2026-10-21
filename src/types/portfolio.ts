export type Currency = 'EUR' | 'USD' | 'GBP';

export type Sector = 
  | 'Tecnología' 
  | 'Salud' 
  | 'Consumo' 
  | 'Energía' 
  | 'Finanzas' 
  | 'Telecom' 
  | 'Otros';

export interface StockPosition {
  id: string;
  symbol: string;
  company: string;
  country: string;
  currency: Currency;
  shares: number;
  buyPrice: number;
  pmcWithCommission?: number;
  totalCommissionEUR?: number;
  currentPrice: number; // Siempre en EUROS (€) para los cálculos de la cartera
  priceUSD?: number; // Precio en dólares a título informativo si el valor cotiza en EE.UU.
  currentValueEUR: number;
  gainLossEUR: number;
  gainLossPercent: number;
  sector: Sector;
  color: string;
  isFavorite?: boolean;
  broker?: string;
  brokerId?: string;
  notes?: string;
  peRatio?: number;
  dividendYield?: number;
  high52?: number;
  low52?: number;
  dayChangePercent?: number;
  // Strategy & Investment Diary (Pages 10-11 of PDF)
  strategyReason?: string; // Motivo de compra: "Empresa que quiero mantener a largo plazo"
  targetPrice?: number; // Precio objetivo: 590 €
  maxBuyPrice?: number; // Precio máximo para aumentar: 450 €
  targetGainPercent?: number; // Objetivo: +30%
  strategyComment?: string; // Comentario: "Esperar resultados trimestrales"
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  company: string;
  currentPrice: number;
  targetPrice: number;
  interestedBuyPrice: number;
  currency: Currency;
  notes?: string;
}

export type OperationType = 'Compra' | 'Venta';

export interface Operation {
  id: string;
  date: string; // DD/MM/YYYY
  type: OperationType;
  symbol: string;
  company: string;
  shares: number;
  price: number;
  totalEUR: number;
  commissionEUR: number;
  broker?: string;
  currency?: Currency;
}

export interface ClosedPosition {
  id: string;
  operationId?: string;
  symbol: string;
  company: string;
  saleDate: string; // DD/MM/YYYY
  year: number;
  shares: number;
  salePrice: number;
  buyPrice?: number;
  resultEUR: number;
  resultPercent?: number;
}

export interface DividendRecord {
  id: string;
  date: string; // DD/MM/YYYY
  year: number;
  company: string;
  symbol: string;
  grossEUR: number;
  withholdingEUR: number; // Retención total acumulada para compatibilidad global
  netEUR: number;
  // Campos para Doble Retención Fiscal (Origen + Destino)
  shares?: number;                          // Número de acciones
  hasDoubleWithholding?: boolean;           // Si aplica doble retención internacional
  withholdingOriginEUR?: number;            // Retención en país de origen (ej. USA W-8BEN en €)
  withholdingOriginPercent?: number;        // Porcentaje retención origen (ej. 15%)
  withholdingOriginCountry?: string;        // País de origen (ej. "EEUU (USA)")
  withholdingDestinationEUR?: number;       // Retención en destino (España IRPF en €)
  withholdingDestinationPercent?: number;   // Porcentaje destino (ej. 19%)
  withholdingDestinationCountry?: string;   // País de destino (ej. "España")
  // Datos en divisa extranjera si aplica (ej. Trade Republic / Degiro slip)
  foreignCurrency?: string;                 // 'USD' | 'GBP' | 'CHF' | etc.
  grossForeign?: number;                    // Bruto en divisa extranjera (ej. 49.14 USD)
  withholdingOriginForeign?: number;        // Retención origen en divisa extranjera (ej. 7.37 USD)
  fxRate?: number;                          // Tipo de cambio aplicado (ej. 1.1539 USD/EUR)
}

export interface UpcomingDividend {
  id: string;
  date: string; // DD/MM/YYYY
  company: string;
  symbol: string;
  dividendPerShareEUR: number;
  estimatedTotalEUR?: number;
}

export interface Broker {
  id: string;
  name: string;
  type: string;
  active: boolean;
  notes?: string;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'current' 
  | 'detail' 
  | 'operations' 
  | 'closed' 
  | 'dividends' 
  | 'analytics' 
  | 'tax' 
  | 'reports' 
  | 'calendar' 
  | 'watchlist'
  | 'quotes'
  | 'config';

export interface MarketQuote {
  symbol: string;
  displaySymbol?: string;
  company: string;
  country: string;
  region: 'EEUU' | 'EUROPA' | 'ESPAÑA';
  exchange: string;
  currency: Currency;
  price: number;
  priceEUR: number;
  change: number;
  changePercent: number;
  dayHigh?: number;
  dayLow?: number;
  high52?: number;
  low52?: number;
  volume?: string | number;
  peRatio?: number;
  dividendYield?: number;
  sector?: string;
  lastUpdated?: string;
  isInPortfolio?: boolean;
  portfolioShares?: number;
  isInWatchlist?: boolean;
}

export type AlertType = 'take_profit' | 'stop_loss' | 'target_price' | 'custom_high' | 'custom_low';

export interface PortfolioAlert {
  id: string;
  symbol: string;
  company: string;
  type: AlertType;
  targetPriceEUR: number;
  condition: 'above' | 'below'; // 'above' para objetivos de subida / take-profit, 'below' para caídas / stop-loss
  createdDate: string;
  notes?: string;
  triggered?: boolean;
  triggeredDate?: string;
  active: boolean;
}

