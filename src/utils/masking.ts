import { MaskingConfig, MaskingRule } from '../types';

export class DataMasker {
  private config: Required<MaskingConfig>;
  private sensitiveFieldPatterns: RegExp[];

  constructor(config: MaskingConfig = {}) {
    this.config = {
      enabled: true,
      defaultMask: '***',
      rules: [],
      sensitiveFields: [
        'password',
        'secret',
        'token',
        'apiKey',
        'api_key',
        'accessToken',
        'access_token',
        'refreshToken',
        'refresh_token',
        'sessionToken',
        'session_token',
        'privateKey',
        'private_key',
        'creditCard',
        'credit_card',
        'ssn',
        'social_security',
        'email',
        'phone',
        'phoneNumber',
        'phone_number',
        'address',
        'zipCode',
        'zip_code',
        'postalCode',
        'postal_code'
      ],
      customMasker: null,
      ...config,
    };

    this.sensitiveFieldPatterns = this.config.sensitiveFields.map(field => 
      new RegExp(`^${field}$`, 'i')
    );
  }

  public maskData(data: any): any {
    if (!this.config.enabled) return data;
    
    if (data === null || data === undefined) return data;
    
    if (typeof data === 'string') {
      return this.maskString(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.maskData(item));
    }
    
    if (typeof data === 'object') {
      return this.maskObject(data);
    }
    
    return data;
  }

  private maskObject(obj: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.config.customMasker) {
        masked[key] = this.config.customMasker(key, value);
        continue;
      }
      
      const rule = this.findMatchingRule(key);
      if (rule) {
        masked[key] = this.applyMaskingRule(value, rule);
      } else if (this.isSensitiveField(key)) {
        masked[key] = this.maskValue(value, this.config.defaultMask);
      } else {
        masked[key] = this.maskData(value);
      }
    }
    
    return masked;
  }

  private findMatchingRule(key: string): MaskingRule | undefined {
    return this.config.rules.find(rule => {
      if (typeof rule.field === 'string') {
        return key.toLowerCase() === rule.field.toLowerCase();
      } else {
        return rule.field.test(key);
      }
    });
  }

  private applyMaskingRule(value: any, rule: MaskingRule): any {
    if (value === null || value === undefined) return value;
    
    const mask = rule.mask || this.config.defaultMask;
    
    if (typeof value === 'string') {
      if (rule.partial) {
        return this.partialMask(value, mask, rule.preserveLength);
      } else {
        return rule.preserveLength ? this.preserveLengthMask(value, mask) : mask;
      }
    }
    
    return mask;
  }

  private isSensitiveField(key: string): boolean {
    return this.sensitiveFieldPatterns.some(pattern => pattern.test(key));
  }

  private maskValue(value: any, mask: string): any {
    if (value === null || value === undefined) return value;
    
    if (typeof value === 'string') {
      return this.preserveLengthMask(value, mask);
    }
    
    if (typeof value === 'number') {
      return mask;
    }
    
    if (typeof value === 'object') {
      return mask;
    }
    
    return mask;
  }

  private maskString(str: string): string {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
    const creditCardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
    const ssnRegex = /\b\d{3}-?\d{2}-?\d{4}\b/g;
    
    return str
      .replace(emailRegex, this.partialMaskEmail)
      .replace(phoneRegex, this.config.defaultMask)
      .replace(creditCardRegex, this.partialMaskCreditCard)
      .replace(ssnRegex, this.config.defaultMask);
  }

  private partialMask(value: string, mask: string, preserveLength?: boolean): string {
    if (value.length <= 4) {
      return preserveLength ? this.preserveLengthMask(value, mask) : mask;
    }
    
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = preserveLength 
      ? mask.repeat(value.length - 4)
      : mask;
    
    return `${start}${middle}${end}`;
  }

  private preserveLengthMask(value: string, mask: string): string {
    if (mask.length === 1) {
      return mask.repeat(value.length);
    }
    return mask;
  }

  private partialMaskEmail = (email: string): string => {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${this.config.defaultMask}@${domain}`;
    }
    const maskedLocal = `${local[0]}${this.config.defaultMask}${local[local.length - 1]}`;
    return `${maskedLocal}@${domain}`;
  };

  private partialMaskCreditCard = (card: string): string => {
    const digits = card.replace(/\D/g, '');
    if (digits.length < 8) return this.config.defaultMask;
    
    const last4 = digits.slice(-4);
    const masked = this.config.defaultMask.repeat(digits.length - 4);
    return `${masked}${last4}`;
  };

  public addSensitiveField(field: string): void {
    if (!this.config.sensitiveFields.includes(field)) {
      this.config.sensitiveFields.push(field);
      this.sensitiveFieldPatterns.push(new RegExp(`^${field}$`, 'i'));
    }
  }

  public addMaskingRule(rule: MaskingRule): void {
    this.config.rules.push(rule);
  }

  public removeSensitiveField(field: string): void {
    const index = this.config.sensitiveFields.indexOf(field);
    if (index > -1) {
      this.config.sensitiveFields.splice(index, 1);
      this.sensitiveFieldPatterns = this.config.sensitiveFields.map(f => 
        new RegExp(`^${f}$`, 'i')
      );
    }
  }

  public setCustomMasker(masker: (key: string, value: any) => any): void {
    this.config.customMasker = masker;
  }

  public getMaskingConfig(): MaskingConfig {
    return { ...this.config };
  }
}