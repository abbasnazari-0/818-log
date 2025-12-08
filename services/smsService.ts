// SMS Service for sending SMS via api.sms.ir

interface SMSConfig {
  username: string;
  password: string;
  lineNumber: string;
}

interface SMSResult {
  success: boolean;
  messageId?: number;
  cost?: number;
  error?: string;
}

interface BulkSMSResult {
  totalSent: number;
  totalFailed: number;
  results: {
    phone: string;
    success: boolean;
    messageId?: number;
    error?: string;
  }[];
}

// SMS Configuration - You should move these to environment variables in production
const SMS_CONFIG: SMSConfig = {
  username: '09149017284', // Replace with actual username
  password: '7ckBJlS8kIszNrI4SE4htQxoB5DuiBxknwKaRN2rvKLWI0jg',   // Replace with actual API key
  lineNumber: '30007487128961' // Replace with actual line number
};

/**
 * Send a single SMS
 */
export const sendSMS = async (mobile: string, text: string): Promise<SMSResult> => {
  try {
    const url = new URL('https://api.sms.ir/v1/send');
    url.searchParams.append('username', SMS_CONFIG.username);
    url.searchParams.append('password', SMS_CONFIG.password);
    url.searchParams.append('line', SMS_CONFIG.lineNumber);
    url.searchParams.append('mobile', mobile);
    url.searchParams.append('text', text);

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    const data = await response.json();

    if (data.status === 1) {
      return {
        success: true,
        messageId: data.data?.messageId,
        cost: data.data?.cost,
      };
    } else {
      return {
        success: false,
        error: data.message || 'خطا در ارسال پیامک',
      };
    }
  } catch (error) {
    console.error('SMS Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطای نامشخص در ارسال پیامک',
    };
  }
};

/**
 * Replace placeholders in message template with actual customer data
 */
export const replacePlaceholders = (
  template: string,
  customerData: {
    name?: string;
    phone?: string;
    address?: string;
  }
): string => {
  let result = template;
  
  result = result.replace(/\{\{NAME\}\}/g, customerData.name || '');
  result = result.replace(/\{\{PHONE\}\}/g, customerData.phone || '');
  result = result.replace(/\{\{ADDRESS\}\}/g, customerData.address || '');
  
  return result;
};

/**
 * Send SMS to multiple customers
 */
export const sendBulkSMS = async (
  customers: Array<{
    customerId: string;
    customerName: string;
    customerPhone?: string;
    address?: string;
  }>,
  messageTemplate: string,
  onProgress?: (sent: number, total: number) => void
): Promise<BulkSMSResult> => {
  const results: BulkSMSResult['results'] = [];
  let totalSent = 0;
  let totalFailed = 0;

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    
    // Skip customers without phone number
    if (!customer.customerPhone) {
      results.push({
        phone: '',
        success: false,
        error: 'شماره تلفن موجود نیست',
      });
      totalFailed++;
      continue;
    }

    // Replace placeholders with actual data
    const personalizedMessage = replacePlaceholders(messageTemplate, {
      name: customer.customerName,
      phone: customer.customerPhone,
      address: customer.address,
    });

    // Send SMS
    const result = await sendSMS(customer.customerPhone, personalizedMessage);
    
    results.push({
      phone: customer.customerPhone,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });

    if (result.success) {
      totalSent++;
    } else {
      totalFailed++;
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, customers.length);
    }

    // Add a small delay between requests to avoid rate limiting
    if (i < customers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return {
    totalSent,
    totalFailed,
    results,
  };
};

/**
 * Validate phone number format (Iranian mobile numbers)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Iranian mobile numbers: 09xxxxxxxxx (11 digits) or 989xxxxxxxxx (12 digits)
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return true;
  }
  if (cleaned.length === 12 && cleaned.startsWith('989')) {
    return true;
  }
  
  return false;
};

/**
 * Format phone number to standard format
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Convert 989xxxxxxxxx to 09xxxxxxxxx
  if (cleaned.length === 12 && cleaned.startsWith('989')) {
    return '0' + cleaned.substring(2);
  }
  
  return cleaned;
};

export const smsService = {
  sendSMS,
  sendBulkSMS,
  replacePlaceholders,
  validatePhoneNumber,
  formatPhoneNumber,
};
