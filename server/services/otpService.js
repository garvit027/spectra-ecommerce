// A simple service to handle OTP generation.
// In a real application, this might also contain logic for sending the OTP
// via a third-party service.

/**
 * Generates a 6-digit one-time password (OTP).
 * @returns {string} The generated OTP as a string.
 */
export const generateOTP = () => {
  // Generate a random 6-digit number and convert it to a string
  return Math.floor(100000 + Math.random() * 900000).toString();
};
