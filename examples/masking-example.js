import { 
  createLogger, 
  ConsoleTransport, 
  LogLevel,
  DataMasker 
} from 'hermes-trace';

// Example 1: Basic masking configuration
const logger = createLogger({
  level: LogLevel.DEBUG,
  transports: [
    new ConsoleTransport({ level: LogLevel.DEBUG, format: 'json' })
  ],
  masking: {
    enabled: true,
    defaultMask: '***MASKED***',
    sensitiveFields: [
      'password',
      'secret',
      'token',
      'apiKey',
      'creditCard',
      'ssn',
      'email',
      'phone'
    ]
  }
});

// Example 2: Advanced masking with custom rules
const advancedLogger = createLogger({
  level: LogLevel.DEBUG,
  transports: [
    new ConsoleTransport({ level: LogLevel.DEBUG, format: 'json' })
  ],
  masking: {
    enabled: true,
    defaultMask: '***',
    rules: [
      {
        field: 'email',
        mask: '[EMAIL]',
        partial: true,
        preserveLength: false
      },
      {
        field: /.*[Pp]assword.*/,
        mask: '[PASSWORD]',
        partial: false,
        preserveLength: false
      },
      {
        field: 'creditCard',
        mask: 'X',
        partial: true,
        preserveLength: true
      }
    ],
    sensitiveFields: ['secret', 'token', 'apiKey']
  }
});

// Example 3: Custom masker function
const customLogger = createLogger({
  level: LogLevel.DEBUG,
  transports: [
    new ConsoleTransport({ level: LogLevel.DEBUG, format: 'json' })
  ],
  masking: {
    enabled: true,
    customMasker: (key, value) => {
      // Custom logic for specific fields
      if (key === 'userId' && typeof value === 'string') {
        return `user_${value.slice(-4)}`; // Show only last 4 characters
      }
      
      if (key === 'amount' && typeof value === 'number') {
        return '[AMOUNT_REDACTED]';
      }
      
      if (key.toLowerCase().includes('secret')) {
        return '[CLASSIFIED]';
      }
      
      // Return original value if no masking needed
      return value;
    }
  }
});

// Test data with sensitive information
const sensitiveData = {
  userId: '12345678',
  email: 'john.doe@example.com',
  password: 'mySecretPassword123',
  apiKey: 'sk-1234567890abcdef',
  creditCard: '4532-1234-5678-9012',
  ssn: '123-45-6789',
  phone: '+1-555-123-4567',
  address: '123 Main St, Anytown, USA',
  amount: 1299.99,
  publicInfo: 'This is safe to log',
  userPreferences: {
    theme: 'dark',
    notifications: true,
    sensitiveToken: 'abc123xyz789'
  }
};

console.log('=== Basic Masking Example ===');
logger.info('User login attempt', sensitiveData);
logger.error('Authentication failed', new Error('Invalid credentials'), {
  userInput: {
    username: 'john@example.com',
    password: 'wrongPassword',
    rememberMe: true
  }
});

console.log('\n=== Advanced Masking with Rules ===');
advancedLogger.info('Payment processing', {
  customerEmail: 'customer@example.com',
  userPassword: 'secretPassword',
  paymentDetails: {
    creditCard: '4111-1111-1111-1111',
    expiryDate: '12/25',
    cvv: '123'
  }
});

console.log('\n=== Custom Masker Example ===');
customLogger.info('Transaction completed', {
  userId: '987654321',
  amount: 2500.50,
  secretKey: 'top-secret-key',
  transactionId: 'txn_abc123',
  customerData: {
    name: 'John Doe',
    topSecretInfo: 'classified data'
  }
});

// Runtime masking configuration
console.log('\n=== Runtime Configuration ===');

// Add new sensitive fields
logger.addSensitiveField('customSecret');
logger.addSensitiveField('internalId');

// Add custom masking rules
logger.addMaskingRule({
  field: /.*[Ii]d$/,
  mask: '[ID]',
  partial: true,
  preserveLength: false
});

logger.info('Updated masking test', {
  customSecret: 'should-be-masked',
  internalId: 'internal_123456',
  userId: 'user_789',
  regularField: 'not masked'
});

// Using standalone DataMasker
console.log('\n=== Standalone DataMasker ===');
const masker = new DataMasker({
  enabled: true,
  defaultMask: '[REDACTED]',
  sensitiveFields: ['password', 'token'],
  rules: [
    {
      field: 'email',
      mask: '*',
      partial: true,
      preserveLength: true
    }
  ]
});

const testData = {
  username: 'john_doe',
  password: 'secret123',
  email: 'john@example.com',
  token: 'bearer_token_xyz',
  publicInfo: 'This is safe'
};

console.log('Original data:', testData);
console.log('Masked data:', masker.maskData(testData));

// Demonstrate automatic string masking
console.log('\n=== Automatic String Masking ===');
const textWithSensitiveInfo = `
  User email: john.doe@company.com
  Phone: +1-555-123-4567
  Credit Card: 4532 1234 5678 9012
  SSN: 123-45-6789
  Regular text that should not be masked.
`;

logger.info('Processing user data', { 
  rawText: textWithSensitiveInfo,
  processedAt: new Date().toISOString()
});

// Error masking example
console.log('\n=== Error Masking ===');
try {
  throw new Error('Database connection failed: password=secret123, host=db.example.com');
} catch (error) {
  logger.error('Database error occurred', error, {
    connectionString: 'postgresql://user:password@localhost:5432/mydb',
    retryAttempts: 3
  });
}

export default logger;