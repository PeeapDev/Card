import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../shared/widgets/empty_state.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Sample notifications
    final notifications = [
      {
        'id': '1',
        'type': 'transaction',
        'title': 'Payment Received',
        'message': 'You received Le 50,000 from John Doe',
        'time': DateTime.now().subtract(const Duration(minutes: 5)),
        'read': false,
      },
      {
        'id': '2',
        'type': 'security',
        'title': 'New Login Detected',
        'message': 'Your account was accessed from a new device',
        'time': DateTime.now().subtract(const Duration(hours: 2)),
        'read': false,
      },
      {
        'id': '3',
        'type': 'promo',
        'title': 'Special Offer!',
        'message': 'Get 10% cashback on your next bill payment',
        'time': DateTime.now().subtract(const Duration(days: 1)),
        'read': true,
      },
      {
        'id': '4',
        'type': 'transaction',
        'title': 'Withdrawal Successful',
        'message': 'Le 100,000 has been sent to your Orange Money',
        'time': DateTime.now().subtract(const Duration(days: 2)),
        'read': true,
      },
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () {
              // TODO: Mark all as read
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: notifications.isEmpty
          ? const EmptyState(
              icon: Icons.notifications_off_outlined,
              title: 'No Notifications',
              description: 'You\'re all caught up!',
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final notification = notifications[index];
                final isRead = notification['read'] as bool;

                return Dismissible(
                  key: Key(notification['id'] as String),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    color: AppColors.error,
                    child: const Icon(Icons.delete, color: Colors.white),
                  ),
                  onDismissed: (direction) {
                    // TODO: Delete notification
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isRead ? Colors.white : AppColors.primary.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: !isRead
                          ? Border.all(color: AppColors.primary.withOpacity(0.2))
                          : null,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: _getNotificationColor(
                                    notification['type'] as String)
                                .withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _getNotificationIcon(notification['type'] as String),
                            color: _getNotificationColor(
                                notification['type'] as String),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      notification['title'] as String,
                                      style: TextStyle(
                                        fontWeight:
                                            isRead ? FontWeight.w500 : FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                  ),
                                  if (!isRead)
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: AppColors.primary,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                notification['message'] as String,
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                DateFormatter.relative(
                                    notification['time'] as DateTime),
                                style: const TextStyle(
                                  color: AppColors.textHint,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  IconData _getNotificationIcon(String type) {
    switch (type) {
      case 'transaction':
        return Icons.swap_horiz;
      case 'security':
        return Icons.security;
      case 'promo':
        return Icons.local_offer;
      default:
        return Icons.notifications;
    }
  }

  Color _getNotificationColor(String type) {
    switch (type) {
      case 'transaction':
        return AppColors.success;
      case 'security':
        return AppColors.warning;
      case 'promo':
        return AppColors.accent;
      default:
        return AppColors.primary;
    }
  }
}
