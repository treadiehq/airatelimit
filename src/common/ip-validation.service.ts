import { Injectable } from '@nestjs/common';

/**
 * IP Validation Service
 * 
 * Validates client IPs against allowed IP ranges using CIDR notation.
 * Supports both IPv4 and IPv6 addresses.
 * 
 * Examples of valid allowedIpRanges:
 * - "192.168.1.100" (exact IPv4 match)
 * - "10.0.0.0/8" (IPv4 CIDR - matches 10.0.0.0 to 10.255.255.255)
 * - "192.168.0.0/16" (IPv4 CIDR - matches 192.168.0.0 to 192.168.255.255)
 * - "2001:db8::/32" (IPv6 CIDR)
 * - "::1" (IPv6 localhost)
 */
@Injectable()
export class IpValidationService {
  /**
   * Check if a client IP is allowed based on the configured IP ranges
   * 
   * @param clientIp - The client's IP address
   * @param allowedIpRanges - Array of allowed IP addresses or CIDR ranges
   * @returns true if the IP is allowed, false otherwise
   */
  isIpAllowed(clientIp: string, allowedIpRanges: string[]): boolean {
    if (!allowedIpRanges || allowedIpRanges.length === 0) {
      // If no ranges configured, allow all (shouldn't happen if enabled)
      return true;
    }

    // Normalize the client IP (handle IPv4-mapped IPv6 addresses)
    const normalizedClientIp = this.normalizeIp(clientIp);
    
    for (const range of allowedIpRanges) {
      if (!range || range.trim() === '') continue;
      
      const trimmedRange = range.trim();
      
      if (trimmedRange.includes('/')) {
        // CIDR notation
        if (this.isIpInCidr(normalizedClientIp, trimmedRange)) {
          return true;
        }
      } else {
        // Exact IP match
        if (this.normalizeIp(trimmedRange) === normalizedClientIp) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Normalize an IP address
   * - Handles IPv4-mapped IPv6 (::ffff:192.168.1.1 -> 192.168.1.1)
   * - Lowercases IPv6
   * - Trims whitespace
   */
  private normalizeIp(ip: string): string {
    if (!ip) return '';
    
    let normalized = ip.trim().toLowerCase();
    
    // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
    if (normalized.startsWith('::ffff:')) {
      normalized = normalized.substring(7);
    }
    
    return normalized;
  }

  /**
   * Check if an IP address is within a CIDR range
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      const [rangeIp, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr, 10);
      
      if (isNaN(prefix)) {
        console.warn('Invalid CIDR prefix:', cidr);
        return false;
      }
      
      const normalizedRangeIp = this.normalizeIp(rangeIp);
      
      // Determine if IPv4 or IPv6
      const isIpv6 = ip.includes(':');
      const isRangeIpv6 = normalizedRangeIp.includes(':');
      
      // IP types must match
      if (isIpv6 !== isRangeIpv6) {
        return false;
      }
      
      if (isIpv6) {
        return this.isIpv6InCidr(ip, normalizedRangeIp, prefix);
      } else {
        return this.isIpv4InCidr(ip, normalizedRangeIp, prefix);
      }
    } catch (error) {
      console.warn('Error checking IP in CIDR:', error);
      return false;
    }
  }

  /**
   * Check if an IPv4 address is within a CIDR range
   */
  private isIpv4InCidr(ip: string, rangeIp: string, prefix: number): boolean {
    if (prefix < 0 || prefix > 32) {
      console.warn('Invalid IPv4 CIDR prefix:', prefix);
      return false;
    }
    
    const ipNum = this.ipv4ToNumber(ip);
    const rangeNum = this.ipv4ToNumber(rangeIp);
    
    if (ipNum === null || rangeNum === null) {
      return false;
    }
    
    // Create the mask (e.g., /24 -> 0xFFFFFF00)
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    
    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Convert IPv4 string to 32-bit number
   */
  private ipv4ToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    
    let num = 0;
    for (let i = 0; i < 4; i++) {
      const octet = parseInt(parts[i], 10);
      if (isNaN(octet) || octet < 0 || octet > 255) return null;
      num = (num << 8) | octet;
    }
    
    // Convert to unsigned 32-bit
    return num >>> 0;
  }

  /**
   * Check if an IPv6 address is within a CIDR range
   */
  private isIpv6InCidr(ip: string, rangeIp: string, prefix: number): boolean {
    if (prefix < 0 || prefix > 128) {
      console.warn('Invalid IPv6 CIDR prefix:', prefix);
      return false;
    }
    
    const ipBits = this.ipv6ToBits(ip);
    const rangeBits = this.ipv6ToBits(rangeIp);
    
    if (!ipBits || !rangeBits) {
      return false;
    }
    
    // Compare the first 'prefix' bits
    for (let i = 0; i < prefix; i++) {
      if (ipBits[i] !== rangeBits[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Convert IPv6 string to array of bits
   */
  private ipv6ToBits(ip: string): boolean[] | null {
    try {
      // Expand IPv6 address (handle :: shorthand)
      const expanded = this.expandIpv6(ip);
      if (!expanded) return null;
      
      const groups = expanded.split(':');
      if (groups.length !== 8) return null;
      
      const bits: boolean[] = [];
      for (const group of groups) {
        const num = parseInt(group, 16);
        if (isNaN(num) || num < 0 || num > 0xFFFF) return null;
        
        // Convert 16-bit group to 16 bits
        for (let i = 15; i >= 0; i--) {
          bits.push((num & (1 << i)) !== 0);
        }
      }
      
      return bits;
    } catch {
      return null;
    }
  }

  /**
   * Expand IPv6 :: shorthand to full form
   */
  private expandIpv6(ip: string): string | null {
    // Handle :: shorthand
    if (ip.includes('::')) {
      const parts = ip.split('::');
      if (parts.length > 2) return null; // Invalid: multiple ::
      
      const left = parts[0] ? parts[0].split(':') : [];
      const right = parts[1] ? parts[1].split(':') : [];
      
      const missing = 8 - left.length - right.length;
      if (missing < 0) return null;
      
      const middle = Array(missing).fill('0');
      const full = [...left, ...middle, ...right];
      
      // Pad each group to 4 chars
      return full.map(g => g.padStart(4, '0')).join(':');
    }
    
    // Already full form, just pad each group
    const groups = ip.split(':');
    if (groups.length !== 8) return null;
    
    return groups.map(g => g.padStart(4, '0')).join(':');
  }

  /**
   * Validate that a string is a valid IP address or CIDR range
   * Used for input validation in the dashboard
   */
  isValidIpOrCidr(input: string): boolean {
    if (!input || input.trim() === '') return false;
    
    const trimmed = input.trim();
    
    if (trimmed.includes('/')) {
      // CIDR notation
      const [ip, prefixStr] = trimmed.split('/');
      const prefix = parseInt(prefixStr, 10);
      
      if (isNaN(prefix)) return false;
      
      const isIpv6 = ip.includes(':');
      
      if (isIpv6) {
        return prefix >= 0 && prefix <= 128 && this.isValidIpv6(ip);
      } else {
        return prefix >= 0 && prefix <= 32 && this.isValidIpv4(ip);
      }
    } else {
      // Exact IP
      return this.isValidIpv4(trimmed) || this.isValidIpv6(trimmed);
    }
  }

  /**
   * Validate IPv4 address format
   */
  private isValidIpv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255 || part !== num.toString()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate IPv6 address format
   */
  private isValidIpv6(ip: string): boolean {
    // Basic validation - try to expand it
    return this.expandIpv6(ip) !== null;
  }
}
