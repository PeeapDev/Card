import 'package:intl/intl.dart';

class DateFormatter {
  // Formatters
  static final DateFormat _fullDateFormat = DateFormat('MMMM d, yyyy');
  static final DateFormat _shortDateFormat = DateFormat('MMM d, yyyy');
  static final DateFormat _numericDateFormat = DateFormat('dd/MM/yyyy');
  static final DateFormat _timeFormat = DateFormat('HH:mm');
  static final DateFormat _time12Format = DateFormat('h:mm a');
  static final DateFormat _dateTimeFormat = DateFormat('MMM d, yyyy h:mm a');
  static final DateFormat _dayFormat = DateFormat('EEEE');
  static final DateFormat _monthYearFormat = DateFormat('MMMM yyyy');

  // Format methods
  static String fullDate(DateTime date) {
    return _fullDateFormat.format(date);
  }

  static String shortDate(DateTime date) {
    return _shortDateFormat.format(date);
  }

  static String numericDate(DateTime date) {
    return _numericDateFormat.format(date);
  }

  static String time(DateTime date, {bool use24Hour = true}) {
    return use24Hour ? _timeFormat.format(date) : _time12Format.format(date);
  }

  static String dateTime(DateTime date) {
    return _dateTimeFormat.format(date);
  }

  static String dayName(DateTime date) {
    return _dayFormat.format(date);
  }

  static String monthYear(DateTime date) {
    return _monthYearFormat.format(date);
  }

  // Relative time
  static String relative(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      final minutes = difference.inMinutes;
      return '$minutes ${minutes == 1 ? 'minute' : 'minutes'} ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return '$hours ${hours == 1 ? 'hour' : 'hours'} ago';
    } else if (difference.inDays < 7) {
      final days = difference.inDays;
      if (days == 1) {
        return 'Yesterday';
      }
      return '$days days ago';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return '$weeks ${weeks == 1 ? 'week' : 'weeks'} ago';
    } else if (difference.inDays < 365) {
      final months = (difference.inDays / 30).floor();
      return '$months ${months == 1 ? 'month' : 'months'} ago';
    } else {
      final years = (difference.inDays / 365).floor();
      return '$years ${years == 1 ? 'year' : 'years'} ago';
    }
  }

  // Check if date is today
  static bool isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  // Check if date is yesterday
  static bool isYesterday(DateTime date) {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return date.year == yesterday.year &&
        date.month == yesterday.month &&
        date.day == yesterday.day;
  }

  // Smart date format (Today, Yesterday, or date)
  static String smart(DateTime date) {
    if (isToday(date)) {
      return 'Today, ${time(date, use24Hour: false)}';
    } else if (isYesterday(date)) {
      return 'Yesterday, ${time(date, use24Hour: false)}';
    } else {
      return dateTime(date);
    }
  }

  // Transaction group header
  static String transactionHeader(DateTime date) {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return shortDate(date);
    }
  }
}
