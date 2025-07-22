/**
 * Blocklist Manager Service
 *
 * Manages a list of blocked IP addresses.
 *
 * @module blocklistManager
 * @author DAASR Team
 * @version 1.0.0
 */

class BlocklistManager {
  constructor() {
    // Using a Set for efficient add, delete, and has operations (O(1) average time complexity)
    this.blockedIPs = new Set();
  }

  /**
   * Add an IP address to the blocklist.
   * @param {string} ip - The IP address to block.
   * @returns {boolean} - True if the IP was added, false if it was already in the list.
   */
  add(ip) {
    if (this.blockedIPs.has(ip)) {
      return false;
    }
    this.blockedIPs.add(ip);
    return true;
  }

  /**
   * Remove an IP address from the blocklist.
   * @param {string} ip - The IP address to unblock.
   * @returns {boolean} - True if the IP was removed, false if it was not in the list.
   */
  remove(ip) {
    return this.blockedIPs.delete(ip);
  }

  /**
   * Check if an IP address is in the blocklist.
   * @param {string} ip - The IP address to check.
   * @returns {boolean} - True if the IP is blocked, false otherwise.
   */
  isBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Get the entire list of blocked IPs.
   * @returns {string[]} - An array of blocked IP addresses.
   */
  getBlocklist() {
    return [...this.blockedIPs];
  }
}

// Create a singleton instance to be shared across the application
const blocklistManager = new BlocklistManager();

module.exports = blocklistManager;
