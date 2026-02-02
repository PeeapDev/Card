import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final Map<String, NumberFormat> _formatters = {};

  static NumberFormat _getFormatter(String currency) {
    if (!_formatters.containsKey(currency)) {
      _formatters[currency] = NumberFormat.currency(
        symbol: getCurrencySymbol(currency),
        decimalDigits: getDecimalDigits(currency),
      );
    }
    return _formatters[currency]!;
  }

  static String getCurrencySymbol(String currency) {
    switch (currency.toUpperCase()) {
      case 'SLE':
        return 'Le ';
      case 'USD':
        return '\$';
      case 'EUR':
        return '\u20AC';
      case 'GBP':
        return '\u00A3';
      case 'NGN':
        return '\u20A6';
      case 'GHS':
        return 'GH\u20B5';
      default:
        return '$currency ';
    }
  }

  static int getDecimalDigits(String currency) {
    switch (currency.toUpperCase()) {
      case 'SLE':
        return 2;
      case 'USD':
      case 'EUR':
      case 'GBP':
        return 2;
      default:
        return 2;
    }
  }

  static String format(double amount, {String currency = 'SLE'}) {
    return _getFormatter(currency).format(amount);
  }

  static String formatCompact(double amount, {String currency = 'SLE'}) {
    final symbol = getCurrencySymbol(currency);

    if (amount >= 1000000000) {
      return '$symbol${(amount / 1000000000).toStringAsFixed(1)}B';
    } else if (amount >= 1000000) {
      return '$symbol${(amount / 1000000).toStringAsFixed(1)}M';
    } else if (amount >= 1000) {
      return '$symbol${(amount / 1000).toStringAsFixed(1)}K';
    }

    return format(amount, currency: currency);
  }

  static String formatWithoutSymbol(double amount, {String currency = 'SLE'}) {
    final decimalDigits = getDecimalDigits(currency);
    final formatter = NumberFormat('#,##0.${'0' * decimalDigits}');
    return formatter.format(amount);
  }

  static double parse(String value, {String currency = 'SLE'}) {
    try {
      // Remove currency symbol and whitespace
      final cleanValue = value
          .replaceAll(getCurrencySymbol(currency), '')
          .replaceAll(',', '')
          .trim();
      return double.parse(cleanValue);
    } catch (e) {
      return 0.0;
    }
  }
}
