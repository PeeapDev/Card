class Validators {
  // Email validation
  static String? email(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }

    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );

    if (!emailRegex.hasMatch(value)) {
      return 'Please enter a valid email address';
    }

    return null;
  }

  // Phone number validation (Sierra Leone format)
  static String? phone(String? value) {
    if (value == null || value.isEmpty) {
      return 'Phone number is required';
    }

    // Remove spaces and dashes
    final cleanNumber = value.replaceAll(RegExp(r'[\s-]'), '');

    // Sierra Leone phone format: +232XXXXXXXX or 0XXXXXXXX
    final phoneRegex = RegExp(r'^(\+232|0)?[0-9]{8,9}$');

    if (!phoneRegex.hasMatch(cleanNumber)) {
      return 'Please enter a valid phone number';
    }

    return null;
  }

  // Password validation
  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }

    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }

    if (!value.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!value.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain at least one lowercase letter';
    }

    if (!value.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain at least one number';
    }

    return null;
  }

  // Simple password validation (for PIN etc)
  static String? simplePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }

    if (value.length < 6) {
      return 'Password must be at least 6 characters';
    }

    return null;
  }

  // PIN validation
  static String? pin(String? value) {
    if (value == null || value.isEmpty) {
      return 'PIN is required';
    }

    if (value.length != 4 && value.length != 6) {
      return 'PIN must be 4 or 6 digits';
    }

    if (!RegExp(r'^[0-9]+$').hasMatch(value)) {
      return 'PIN must contain only numbers';
    }

    // Check for sequential or repeated digits
    if (_isSequential(value) || _isRepeated(value)) {
      return 'PIN is too simple. Please choose a more secure PIN';
    }

    return null;
  }

  // Required field validation
  static String? required(String? value, [String? fieldName]) {
    if (value == null || value.trim().isEmpty) {
      return '${fieldName ?? 'This field'} is required';
    }
    return null;
  }

  // Name validation
  static String? name(String? value) {
    if (value == null || value.isEmpty) {
      return 'Name is required';
    }

    if (value.length < 2) {
      return 'Name must be at least 2 characters';
    }

    if (value.length > 50) {
      return 'Name must not exceed 50 characters';
    }

    return null;
  }

  // Amount validation
  static String? amount(String? value, {double? min, double? max}) {
    if (value == null || value.isEmpty) {
      return 'Amount is required';
    }

    final amount = double.tryParse(value.replaceAll(',', ''));

    if (amount == null) {
      return 'Please enter a valid amount';
    }

    if (amount <= 0) {
      return 'Amount must be greater than 0';
    }

    if (min != null && amount < min) {
      return 'Minimum amount is $min';
    }

    if (max != null && amount > max) {
      return 'Maximum amount is $max';
    }

    return null;
  }

  // OTP validation
  static String? otp(String? value, {int length = 6}) {
    if (value == null || value.isEmpty) {
      return 'OTP is required';
    }

    if (value.length != length) {
      return 'OTP must be $length digits';
    }

    if (!RegExp(r'^[0-9]+$').hasMatch(value)) {
      return 'OTP must contain only numbers';
    }

    return null;
  }

  // Confirm password validation
  static String? confirmPassword(String? value, String? password) {
    if (value == null || value.isEmpty) {
      return 'Please confirm your password';
    }

    if (value != password) {
      return 'Passwords do not match';
    }

    return null;
  }

  // Business name validation
  static String? businessName(String? value) {
    if (value == null || value.isEmpty) {
      return 'Business name is required';
    }

    if (value.length < 3) {
      return 'Business name must be at least 3 characters';
    }

    if (value.length > 100) {
      return 'Business name must not exceed 100 characters';
    }

    return null;
  }

  // Helper methods
  static bool _isSequential(String value) {
    const ascending = '0123456789';
    const descending = '9876543210';

    for (int i = 0; i <= ascending.length - value.length; i++) {
      if (ascending.substring(i, i + value.length) == value) {
        return true;
      }
      if (descending.substring(i, i + value.length) == value) {
        return true;
      }
    }

    return false;
  }

  static bool _isRepeated(String value) {
    if (value.isEmpty) return false;

    final firstChar = value[0];
    return value.split('').every((char) => char == firstChar);
  }
}
