import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';

export interface OcrResult {
  success: boolean;
  text: string;
  extractedData?: ExtractedIdData;
  error?: string;
}

export interface ExtractedIdData {
  documentType?: string;
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  expiryDate?: string;
  nationality?: string;
  gender?: string;
  address?: string;
  issuingCountry?: string;
  issuingAuthority?: string;
  mrz?: string; // Machine Readable Zone for passports
  confidence: number;
}

export interface SierraLeoneIdData extends ExtractedIdData {
  nin?: string; // National Identification Number
  placeOfBirth?: string;
  district?: string;
  chiefdom?: string;
  section?: string;
  cardNumber?: string;
  dateOfIssue?: string;
}

export interface DocumentVerificationResult {
  isValid: boolean;
  documentType: string;
  extractedData: ExtractedIdData;
  matchScore: number;
  issues: string[];
  ocrText: string;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly replicate: Replicate | null = null;
  private readonly isConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    const apiToken = this.configService.get<string>('REPLICATE_API_TOKEN');

    if (!apiToken) {
      this.logger.warn('REPLICATE_API_TOKEN not configured - OCR service will return mock data for testing');
      this.isConfigured = false;
    } else {
      this.replicate = new Replicate({
        auth: apiToken,
      });
      this.isConfigured = true;
      this.logger.log('DeepSeek OCR service initialized with Replicate API');
    }
  }

  /**
   * Process document image with DeepSeek OCR
   */
  async processDocument(base64Image: string, mimeType: string = 'image/jpeg'): Promise<OcrResult> {
    // Return mock data for testing when OCR is not configured
    if (!this.isConfigured || !this.replicate) {
      this.logger.warn('OCR not configured - returning mock data for testing');
      return {
        success: true,
        text: 'MOCK OCR DATA - Configure REPLICATE_API_TOKEN for real OCR',
        extractedData: {
          documentType: 'NATIONAL_ID',
          documentNumber: 'NIN123456789',
          firstName: 'Test',
          lastName: 'User',
          fullName: 'Test User',
          dateOfBirth: '1990-01-15',
          nationality: 'Sierra Leonean',
          gender: 'M',
          confidence: 95,
        },
      };
    }

    try {
      // Convert base64 to data URL for Replicate
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      this.logger.log('Processing document with DeepSeek OCR...');

      // Call DeepSeek OCR via Replicate
      const output = await this.replicate.run(
        'lucataco/deepseek-ocr:latest',
        {
          input: {
            image: dataUrl,
          },
        },
      );

      const text = typeof output === 'string' ? output : JSON.stringify(output);

      this.logger.log('OCR processing complete');

      // Extract structured data from OCR text
      const extractedData = this.parseIdDocument(text);

      return {
        success: true,
        text,
        extractedData,
      };
    } catch (error: any) {
      this.logger.error(`OCR processing failed: ${error.message}`);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * Verify ID document and extract data
   */
  async verifyIdDocument(
    documentBase64: string,
    mimeType: string,
    expectedData: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
    },
  ): Promise<DocumentVerificationResult> {
    const ocrResult = await this.processDocument(documentBase64, mimeType);

    const issues: string[] = [];
    let matchScore = 0;
    const maxScore = 3; // firstName, lastName, dateOfBirth

    if (!ocrResult.success || !ocrResult.extractedData) {
      return {
        isValid: false,
        documentType: 'UNKNOWN',
        extractedData: { confidence: 0 },
        matchScore: 0,
        issues: ['Failed to process document with OCR'],
        ocrText: ocrResult.text || '',
      };
    }

    const extracted = ocrResult.extractedData;

    // Compare first name
    if (expectedData.firstName && extracted.firstName) {
      if (this.fuzzyMatch(expectedData.firstName, extracted.firstName)) {
        matchScore++;
      } else {
        issues.push(`First name mismatch: expected "${expectedData.firstName}", found "${extracted.firstName}"`);
      }
    }

    // Compare last name
    if (expectedData.lastName && extracted.lastName) {
      if (this.fuzzyMatch(expectedData.lastName, extracted.lastName)) {
        matchScore++;
      } else {
        issues.push(`Last name mismatch: expected "${expectedData.lastName}", found "${extracted.lastName}"`);
      }
    }

    // Compare date of birth
    if (expectedData.dateOfBirth && extracted.dateOfBirth) {
      if (this.datesMatch(expectedData.dateOfBirth, extracted.dateOfBirth)) {
        matchScore++;
      } else {
        issues.push(`Date of birth mismatch: expected "${expectedData.dateOfBirth}", found "${extracted.dateOfBirth}"`);
      }
    }

    // Check document expiry
    if (extracted.expiryDate) {
      const expiryDate = new Date(extracted.expiryDate);
      if (expiryDate < new Date()) {
        issues.push('Document has expired');
      }
    }

    const scorePercentage = (matchScore / maxScore) * 100;
    const isValid = scorePercentage >= 66 && issues.filter(i => !i.includes('mismatch')).length === 0;

    return {
      isValid,
      documentType: extracted.documentType || 'UNKNOWN',
      extractedData: extracted,
      matchScore: scorePercentage,
      issues,
      ocrText: ocrResult.text,
    };
  }

  /**
   * Parse OCR text to extract ID document fields
   */
  private parseIdDocument(text: string): ExtractedIdData {
    const data: ExtractedIdData = {
      confidence: 0,
    };

    const upperText = text.toUpperCase();

    // Detect document type
    if (upperText.includes('PASSPORT') || upperText.includes('PASAPORTE')) {
      data.documentType = 'PASSPORT';
    } else if (upperText.includes('DRIVER') || upperText.includes('DRIVING') || upperText.includes('LICENSE')) {
      data.documentType = 'DRIVERS_LICENSE';
    } else if (upperText.includes('NATIONAL') || upperText.includes('IDENTITY') || upperText.includes('ID CARD')) {
      data.documentType = 'NATIONAL_ID';
    }

    // Extract document number (various formats)
    const docNumberPatterns = [
      /(?:document\s*(?:no|number|#)?:?\s*)([A-Z0-9]{6,12})/i,
      /(?:passport\s*(?:no|number|#)?:?\s*)([A-Z0-9]{6,12})/i,
      /(?:license\s*(?:no|number|#)?:?\s*)([A-Z0-9]{6,15})/i,
      /(?:id\s*(?:no|number|#)?:?\s*)([A-Z0-9]{6,12})/i,
      /\b([A-Z]{1,2}\d{6,9})\b/, // Common passport format
    ];

    for (const pattern of docNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.documentNumber = match[1];
        break;
      }
    }

    // Extract names
    const namePatterns = [
      /(?:surname|last\s*name|family\s*name):?\s*([A-Z][A-Za-z\-']+)/i,
      /(?:given\s*name|first\s*name|forename):?\s*([A-Z][A-Za-z\-'\s]+)/i,
      /(?:full\s*name|name):?\s*([A-Z][A-Za-z\-'\s]+)/i,
    ];

    const surnameMatch = text.match(/(?:surname|last\s*name|family\s*name):?\s*([A-Z][A-Za-z\-']+)/i);
    if (surnameMatch) {
      data.lastName = surnameMatch[1].trim();
    }

    const givenNameMatch = text.match(/(?:given\s*name|first\s*name|forename):?\s*([A-Z][A-Za-z\-'\s]+)/i);
    if (givenNameMatch) {
      data.firstName = givenNameMatch[1].trim().split(/\s+/)[0]; // Take first word
    }

    const fullNameMatch = text.match(/(?:full\s*name|name):?\s*([A-Z][A-Za-z\-'\s]+)/i);
    if (fullNameMatch) {
      data.fullName = fullNameMatch[1].trim();
      // Try to split full name if first/last not found
      if (!data.firstName || !data.lastName) {
        const parts = data.fullName.split(/\s+/);
        if (parts.length >= 2) {
          data.firstName = data.firstName || parts[0];
          data.lastName = data.lastName || parts[parts.length - 1];
        }
      }
    }

    // Extract dates
    const datePatterns = [
      /(?:date\s*of\s*birth|dob|birth\s*date|born):?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(?:date\s*of\s*birth|dob|birth\s*date|born):?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i,
      /(?:expiry|expires|exp|valid\s*until):?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    ];

    const dobMatch = text.match(/(?:date\s*of\s*birth|dob|birth\s*date|born):?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i);
    if (dobMatch) {
      data.dateOfBirth = this.normalizeDate(dobMatch[1]);
    }

    const expiryMatch = text.match(/(?:expiry|expires|exp|valid\s*until):?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i);
    if (expiryMatch) {
      data.expiryDate = this.normalizeDate(expiryMatch[1]);
    }

    // Extract nationality/country
    const nationalityMatch = text.match(/(?:nationality|citizen|country):?\s*([A-Za-z\s]+)/i);
    if (nationalityMatch) {
      data.nationality = nationalityMatch[1].trim();
    }

    // Extract gender
    const genderMatch = text.match(/(?:sex|gender):?\s*(M|F|MALE|FEMALE)/i);
    if (genderMatch) {
      data.gender = genderMatch[1].toUpperCase().startsWith('M') ? 'MALE' : 'FEMALE';
    }

    // Extract MRZ (Machine Readable Zone) for passports
    const mrzMatch = text.match(/([A-Z0-9<]{44,90})/);
    if (mrzMatch) {
      data.mrz = mrzMatch[1];
      // Parse MRZ for additional data if needed
      this.parseMrz(mrzMatch[1], data);
    }

    // Calculate confidence based on extracted fields
    let fieldsFound = 0;
    if (data.documentType) fieldsFound++;
    if (data.documentNumber) fieldsFound++;
    if (data.firstName || data.lastName || data.fullName) fieldsFound++;
    if (data.dateOfBirth) fieldsFound++;
    if (data.expiryDate) fieldsFound++;
    if (data.nationality) fieldsFound++;

    data.confidence = Math.min((fieldsFound / 6) * 100, 100);

    return data;
  }

  /**
   * Parse MRZ (Machine Readable Zone) data
   */
  private parseMrz(mrz: string, data: ExtractedIdData): void {
    // Remove any newlines or spaces
    const cleanMrz = mrz.replace(/[\s\n]/g, '');

    // TD3 format (passport): 2 lines of 44 characters
    if (cleanMrz.length >= 88) {
      const line1 = cleanMrz.substring(0, 44);
      const line2 = cleanMrz.substring(44, 88);

      // Line 1: Document type + Country + Name
      const namePart = line1.substring(5, 44).replace(/</g, ' ').trim();
      const nameParts = namePart.split(/\s{2,}/);
      if (nameParts.length >= 2) {
        data.lastName = data.lastName || nameParts[0].trim();
        data.firstName = data.firstName || nameParts[1].split(/\s+/)[0].trim();
      }

      // Line 2: Doc number + Nationality + DOB + Sex + Expiry
      const docNum = line2.substring(0, 9).replace(/</g, '');
      if (docNum) data.documentNumber = data.documentNumber || docNum;

      const nationality = line2.substring(10, 13).replace(/</g, '');
      if (nationality && nationality.length === 3) {
        data.issuingCountry = nationality;
      }

      // DOB in YYMMDD format
      const dobRaw = line2.substring(13, 19);
      if (dobRaw.match(/\d{6}/)) {
        const year = parseInt(dobRaw.substring(0, 2));
        const fullYear = year > 50 ? 1900 + year : 2000 + year;
        data.dateOfBirth = data.dateOfBirth || `${fullYear}-${dobRaw.substring(2, 4)}-${dobRaw.substring(4, 6)}`;
      }

      // Expiry in YYMMDD format
      const expRaw = line2.substring(21, 27);
      if (expRaw.match(/\d{6}/)) {
        const year = parseInt(expRaw.substring(0, 2));
        const fullYear = 2000 + year; // Expiry dates are always in 2000s
        data.expiryDate = data.expiryDate || `${fullYear}-${expRaw.substring(2, 4)}-${expRaw.substring(4, 6)}`;
      }
    }
  }

  /**
   * Normalize date string to ISO format
   */
  private normalizeDate(dateStr: string): string {
    try {
      // Try parsing common formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // Handle DD/MM/YYYY or DD-MM-YYYY
      const parts = dateStr.split(/[\/-]/);
      if (parts.length === 3) {
        const [day, month, year] = parts.map(p => parseInt(p));
        const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
        return `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    } catch {
      // Return as-is if parsing fails
    }
    return dateStr;
  }

  /**
   * Fuzzy string matching for names
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return true;

    // Contains check (for middle names or extra names)
    if (s1.includes(s2) || s2.includes(s1)) return true;

    // Levenshtein distance for typos
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = (maxLength - distance) / maxLength;

    return similarity >= 0.8; // 80% similarity threshold
  }

  /**
   * Compare dates allowing for format differences
   */
  private datesMatch(date1: string, date2: string): boolean {
    try {
      const d1 = new Date(this.normalizeDate(date1));
      const d2 = new Date(this.normalizeDate(date2));

      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    } catch {
      return false;
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Process Sierra Leone National ID card
   */
  async processSierraLeoneId(base64Image: string, mimeType: string = 'image/jpeg'): Promise<OcrResult> {
    // Return mock data for testing when OCR is not configured
    if (!this.isConfigured || !this.replicate) {
      this.logger.warn('OCR not configured - returning mock Sierra Leone ID data for testing');
      return {
        success: true,
        text: 'MOCK SL ID DATA - Configure REPLICATE_API_TOKEN for real OCR',
        extractedData: {
          documentType: 'SIERRA_LEONE_NID',
          nin: 'NIN-2024-TEST-12345',
          firstName: 'Mohamed',
          lastName: 'Kamara',
          fullName: 'Mohamed Kamara',
          dateOfBirth: '1992-05-20',
          gender: 'M',
          placeOfBirth: 'Freetown',
          district: 'Western Area Urban',
          nationality: 'Sierra Leonean',
          confidence: 95,
        } as SierraLeoneIdData,
      };
    }

    try {
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      this.logger.log('Processing Sierra Leone National ID card...');

      const output = await this.replicate.run(
        'lucataco/deepseek-ocr:latest',
        {
          input: {
            image: dataUrl,
          },
        },
      );

      const text = typeof output === 'string' ? output : JSON.stringify(output);

      this.logger.log('Sierra Leone ID OCR processing complete');

      // Extract Sierra Leone specific data
      const extractedData = this.parseSierraLeoneId(text);

      return {
        success: true,
        text,
        extractedData,
      };
    } catch (error: any) {
      this.logger.error(`Sierra Leone ID OCR processing failed: ${error.message}`);
      return {
        success: false,
        text: '',
        error: error.message,
      };
    }
  }

  /**
   * Parse Sierra Leone National ID card text
   */
  private parseSierraLeoneId(text: string): SierraLeoneIdData {
    const data: SierraLeoneIdData = {
      documentType: 'SIERRA_LEONE_NID',
      issuingCountry: 'SL',
      nationality: 'Sierra Leonean',
      confidence: 0,
    };

    const upperText = text.toUpperCase();

    // Extract NIN (National Identification Number) - Format: Typically alphanumeric
    const ninPatterns = [
      /(?:NIN|N\.?I\.?N\.?|NATIONAL\s*(?:ID|IDENTIFICATION)\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{8,15})/i,
      /(?:ID\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{8,15})/i,
      /\b([A-Z]{2,3}\d{6,12})\b/, // Common Sierra Leone NIN format
      /\b(\d{8,12}[A-Z]?)\b/, // Alternative format
    ];

    for (const pattern of ninPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.nin = match[1].toUpperCase();
        data.documentNumber = data.nin;
        break;
      }
    }

    // Extract Card Number (different from NIN)
    const cardNumberMatch = text.match(/(?:CARD\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9\-]{8,20})/i);
    if (cardNumberMatch) {
      data.cardNumber = cardNumberMatch[1];
    }

    // Extract Full Name - Sierra Leone IDs often have full name on one line
    const fullNamePatterns = [
      /(?:NAME|FULL\s*NAME)[:\s]*([A-Z][A-Za-z\-'\s]+)/i,
      /(?:SURNAME|FAMILY\s*NAME)[:\s]*([A-Z][A-Za-z\-']+)/i,
    ];

    const surnameMatch = text.match(/(?:SURNAME|FAMILY\s*NAME|LAST\s*NAME)[:\s]*([A-Z][A-Za-z\-']+)/i);
    if (surnameMatch) {
      data.lastName = surnameMatch[1].trim();
    }

    const givenNameMatch = text.match(/(?:GIVEN\s*NAME|FIRST\s*NAME|OTHER\s*NAME|FORENAME)[:\s]*([A-Z][A-Za-z\-'\s]+)/i);
    if (givenNameMatch) {
      data.firstName = givenNameMatch[1].trim().split(/\s+/)[0];
    }

    const fullNameMatch = text.match(/(?:FULL\s*NAME|NAME)[:\s]*([A-Z][A-Za-z\-'\s]+)/i);
    if (fullNameMatch) {
      data.fullName = fullNameMatch[1].trim();
      // Try to extract first and last if not already found
      if (!data.firstName || !data.lastName) {
        const parts = data.fullName.split(/\s+/);
        if (parts.length >= 2) {
          data.firstName = data.firstName || parts[0];
          data.lastName = data.lastName || parts[parts.length - 1];
        }
      }
    }

    // Extract Date of Birth
    const dobPatterns = [
      /(?:DATE\s*OF\s*BIRTH|DOB|BIRTH\s*DATE|BORN)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(?:DATE\s*OF\s*BIRTH|DOB|BIRTH\s*DATE|BORN)[:\s]*(\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i,
    ];

    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.dateOfBirth = this.normalizeDate(match[1]);
        break;
      }
    }

    // Extract Date of Issue
    const issueMatch = text.match(/(?:DATE\s*OF\s*ISSUE|ISSUE\s*DATE|ISSUED)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i);
    if (issueMatch) {
      data.dateOfIssue = this.normalizeDate(issueMatch[1]);
    }

    // Extract Expiry Date
    const expiryMatch = text.match(/(?:EXPIRY|EXPIRES|EXP|VALID\s*UNTIL|VALID\s*THRU)[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})/i);
    if (expiryMatch) {
      data.expiryDate = this.normalizeDate(expiryMatch[1]);
    }

    // Extract Gender/Sex
    const genderMatch = text.match(/(?:SEX|GENDER)[:\s]*(M|F|MALE|FEMALE)/i);
    if (genderMatch) {
      data.gender = genderMatch[1].toUpperCase().startsWith('M') ? 'MALE' : 'FEMALE';
    }

    // Extract Place of Birth
    const pobMatch = text.match(/(?:PLACE\s*OF\s*BIRTH|POB|BIRTH\s*PLACE)[:\s]*([A-Za-z\-'\s]+)/i);
    if (pobMatch) {
      data.placeOfBirth = pobMatch[1].trim();
    }

    // Extract District (specific to Sierra Leone)
    const districtMatch = text.match(/(?:DISTRICT)[:\s]*([A-Za-z\-'\s]+)/i);
    if (districtMatch) {
      data.district = districtMatch[1].trim();
    }

    // Extract Chiefdom (specific to Sierra Leone)
    const chiefdomMatch = text.match(/(?:CHIEFDOM)[:\s]*([A-Za-z\-'\s]+)/i);
    if (chiefdomMatch) {
      data.chiefdom = chiefdomMatch[1].trim();
    }

    // Extract Section (specific to Sierra Leone)
    const sectionMatch = text.match(/(?:SECTION)[:\s]*([A-Za-z\-'\s]+)/i);
    if (sectionMatch) {
      data.section = sectionMatch[1].trim();
    }

    // Extract Address
    const addressMatch = text.match(/(?:ADDRESS|RESIDENCE)[:\s]*([A-Za-z0-9\-',\.\s]+)/i);
    if (addressMatch) {
      data.address = addressMatch[1].trim();
    }

    // Calculate confidence based on extracted fields
    let fieldsFound = 0;
    if (data.nin) fieldsFound += 2; // NIN is most important
    if (data.firstName) fieldsFound++;
    if (data.lastName) fieldsFound++;
    if (data.fullName) fieldsFound++;
    if (data.dateOfBirth) fieldsFound++;
    if (data.gender) fieldsFound++;
    if (data.placeOfBirth) fieldsFound++;
    if (data.district) fieldsFound++;

    data.confidence = Math.min((fieldsFound / 10) * 100, 100);

    return data;
  }
}
