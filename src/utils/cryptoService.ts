/**
 * Cryptographic service for Cartera de Valores
 * Uses Web Crypto API (SubtleCrypto) with PBKDF2 (SHA-256, 100,000 iterations)
 * and AES-GCM (256-bit) for zero-knowledge local encryption.
 */

import {
  StockPosition,
  Operation,
  ClosedPosition,
  DividendRecord,
  UpcomingDividend,
  Broker,
  WatchlistItem,
} from '../types/portfolio';

export interface AppPortfolioBackupData {
  positions: StockPosition[];
  operations: Operation[];
  closedPositions: ClosedPosition[];
  dividends: DividendRecord[];
  upcomingDividends: UpcomingDividend[];
  brokers: Broker[];
  watchlist: WatchlistItem[];
  cashEUR: number;
  exportedAt: string;
  exportedAtFormatted: string;
  appVersion?: string;
}

export interface EncryptedBackupPackage {
  app: 'Cartera de Valores';
  format: 'CARTERA_VALORES_SECURE_BACKUP_V1';
  encrypted: true;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // hex
  iv: string; // hex
  ciphertext: string; // base64
  createdAt: string; // ISO
  createdAtFormatted: string; // Spanish date-time
  version: string;
  summary: {
    totalPositions: number;
    totalOperations: number;
    totalClosed: number;
    totalDividends: number;
    totalBrokers: number;
    cashEUR: number;
  };
  warning: string;
}

// Helpers for buffer conversions
function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0);
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Derives a PBKDF2 key from password and salt for AES-GCM
 */
async function deriveAesKey(password: string, salt: Uint8Array, iterations = 100000): Promise<CryptoKey> {
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Hashes a master password for local authentication verification
 */
export async function hashMasterPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? hexToBuffer(saltHex) : window.crypto.getRandomValues(new Uint8Array(16));
  
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  return {
    hash: bufferToHex(derivedBits),
    salt: bufferToHex(salt),
  };
}

/**
 * Verifies if entered password matches stored hash
 */
export async function verifyMasterPassword(password: string, expectedHash: string, saltHex: string): Promise<boolean> {
  try {
    const result = await hashMasterPassword(password, saltHex);
    return result.hash === expectedHash;
  } catch (err) {
    console.error('Password verification failed:', err);
    return false;
  }
}

/**
 * Formats current date and time for Spain / Europe (e.g., 10/10/2026, 12:45:30)
 */
export function formatBackupDateTime(date = new Date()): { formatted: string; filenamePart: string } {
  const d = date;
  const pad = (n: number) => String(n).padStart(2, '0');

  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  const formatted = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  const filenamePart = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

  return { formatted, filenamePart };
}

/**
 * Generates an encrypted backup file using AES-256-GCM.
 * The file cannot be read in any text editor without the password.
 */
export async function createEncryptedBackup(
  data: AppPortfolioBackupData,
  password: string,
  appVersion = 'v1.0.0'
): Promise<{ blob: Blob; filename: string; packageData: EncryptedBackupPackage }> {
  if (!password || password.trim().length === 0) {
    throw new Error('Se requiere una contraseña para cifrar la copia de seguridad.');
  }

  const { formatted, filenamePart } = formatBackupDateTime();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive AES-GCM key
  const aesKey = await deriveAesKey(password, salt);

  // Complete data payload
  const fullPayload: AppPortfolioBackupData = {
    ...data,
    exportedAt: new Date().toISOString(),
    exportedAtFormatted: formatted,
    appVersion,
  };

  const payloadString = JSON.stringify(fullPayload);
  const encodedPayload = textEncoder.encode(payloadString);

  // Encrypt with AES-GCM
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    aesKey,
    encodedPayload
  );

  const ciphertextBase64 = bufferToBase64(encryptedBuffer);

  const packageData: EncryptedBackupPackage = {
    app: 'Cartera de Valores',
    format: 'CARTERA_VALORES_SECURE_BACKUP_V1',
    encrypted: true,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 100000,
    salt: bufferToHex(salt),
    iv: bufferToHex(iv),
    ciphertext: ciphertextBase64,
    createdAt: new Date().toISOString(),
    createdAtFormatted: formatted,
    version: appVersion,
    summary: {
      totalPositions: data.positions?.length || 0,
      totalOperations: data.operations?.length || 0,
      totalClosed: data.closedPositions?.length || 0,
      totalDividends: data.dividends?.length || 0,
      totalBrokers: data.brokers?.length || 0,
      cashEUR: data.cashEUR || 0,
    },
    warning:
      'ADVERTENCIA: Este archivo contiene datos financieros cifrados con grado militar AES-256-GCM. No puede abrirse ni leerse sin la contraseña de la aplicación.',
  };

  const jsonContent = JSON.stringify(packageData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const filename = `Copia_Seguridad_Cartera_${filenamePart}.cartera`;

  return { blob, filename, packageData };
}

/**
 * Decrypts and validates a backup file with the entered password.
 * Fails securely if the password is wrong or the file is corrupted.
 */
export async function decryptAndValidateBackup(
  rawContent: string,
  password: string
): Promise<{
  success: boolean;
  data?: AppPortfolioBackupData;
  error?: string;
  metadata?: {
    createdAt: string;
    createdAtFormatted: string;
    version: string;
    summary: EncryptedBackupPackage['summary'];
  };
}> {
  try {
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return { success: false, error: 'El archivo seleccionado no tiene un formato válido (JSON corrupto).' };
    }

    // Check if it's our encrypted format
    if (parsed.encrypted && parsed.format === 'CARTERA_VALORES_SECURE_BACKUP_V1') {
      const packageData = parsed as EncryptedBackupPackage;

      if (!packageData.salt || !packageData.iv || !packageData.ciphertext) {
        return { success: false, error: 'El archivo de copia de seguridad está dañado o incompleto.' };
      }

      const salt = hexToBuffer(packageData.salt);
      const iv = hexToBuffer(packageData.iv);
      const ciphertext = base64ToBuffer(packageData.ciphertext);

      try {
        const aesKey = await deriveAesKey(password, salt, packageData.iterations || 100000);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv as any,
            tagLength: 128,
          },
          aesKey,
          ciphertext as any
        );

        const decryptedJson = textDecoder.decode(decryptedBuffer);
        const backupData: AppPortfolioBackupData = JSON.parse(decryptedJson);

        return {
          success: true,
          data: backupData,
          metadata: {
            createdAt: packageData.createdAt,
            createdAtFormatted: packageData.createdAtFormatted || 'Fecha no disponible',
            version: packageData.version || 'v1.0.0',
            summary: packageData.summary,
          },
        };
      } catch (cryptoErr) {
        // Tag mismatch or key derivation failed -> incorrect password
        return {
          success: false,
          error: 'Contraseña incorrecta. El archivo no se puede descifrar sin su clave original.',
        };
      }
    }

    // Legacy fallback: If user tries to import an older unencrypted backup
    if (parsed.positions || parsed.operations || parsed.exportDate) {
      // Safe check if it's an unencrypted legacy JSON
      const positions = typeof parsed.positions === 'string' ? JSON.parse(parsed.positions) : parsed.positions || [];
      const operations = typeof parsed.operations === 'string' ? JSON.parse(parsed.operations) : parsed.operations || [];
      const closedPositions = typeof parsed.closedPositions === 'string' ? JSON.parse(parsed.closedPositions) : parsed.closedPositions || [];
      const dividends = typeof parsed.dividends === 'string' ? JSON.parse(parsed.dividends) : parsed.dividends || [];
      const upcomingDividends = typeof parsed.upcomingDividends === 'string' ? JSON.parse(parsed.upcomingDividends) : parsed.upcomingDividends || [];
      const brokers = typeof parsed.brokers === 'string' ? JSON.parse(parsed.brokers) : parsed.brokers || [];
      const watchlist = parsed.watchlist ? (typeof parsed.watchlist === 'string' ? JSON.parse(parsed.watchlist) : parsed.watchlist) : [];
      const cashEUR = Number(parsed.cashEUR || 0);

      const legacyData: AppPortfolioBackupData = {
        positions,
        operations,
        closedPositions,
        dividends,
        upcomingDividends,
        brokers,
        watchlist,
        cashEUR,
        exportedAt: parsed.exportDate || new Date().toISOString(),
        exportedAtFormatted: parsed.exportDate ? new Date(parsed.exportDate).toLocaleString('es-ES') : 'Copia sin fecha',
        appVersion: 'Legacy',
      };

      return {
        success: true,
        data: legacyData,
        metadata: {
          createdAt: parsed.exportDate || new Date().toISOString(),
          createdAtFormatted: legacyData.exportedAtFormatted,
          version: 'Copia anterior (sin cifrar)',
          summary: {
            totalPositions: positions.length,
            totalOperations: operations.length,
            totalClosed: closedPositions.length,
            totalDividends: dividends.length,
            totalBrokers: brokers.length,
            cashEUR,
          },
        },
      };
    }

    return {
      success: false,
      error: 'El archivo no es una copia de seguridad reconocida de Cartera de Valores.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error al procesar el archivo: ${err?.message || 'Error desconocido'}`,
    };
  }
}

/**
 * Generates a cryptographically secure random password or PIN
 * Supports maximum 20 characters as requested by user
 */
export function generateSecurePassword(
  length = 20,
  type: 'mixed' | 'numeric' | 'alphanumeric' = 'mixed'
): string {
  const safeLength = Math.min(20, Math.max(4, length));
  
  if (type === 'numeric') {
    // 20 purely numeric digits
    const digits = '0123456789';
    const randomBytes = new Uint32Array(safeLength);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map(n => digits[n % digits.length])
      .join('');
  }

  if (type === 'alphanumeric') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const randomBytes = new Uint32Array(safeLength);
    window.crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map(n => chars[n % chars.length])
      .join('');
  }

  // Mixed: letters, numbers, symbols
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  const symbols = '!@#$%&*-_+=?';
  const allChars = lowers + uppers + nums + symbols;

  const randomBytes = new Uint32Array(safeLength);
  window.crypto.getRandomValues(randomBytes);
  
  return Array.from(randomBytes)
    .map(n => allChars[n % allChars.length])
    .join('');
}

