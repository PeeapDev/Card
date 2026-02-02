import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import 'core/config/env_config.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/encryption_service.dart';
import 'core/services/sync_service.dart';
import 'firebase_options.dart';

/// Background message handler for Firebase Cloud Messaging
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  debugPrint('Handling background message: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Set up Firebase Messaging background handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Initialize Supabase
  await Supabase.initialize(
    url: EnvConfig.supabaseUrl,
    anonKey: EnvConfig.supabaseAnonKey,
  );

  // Initialize encryption service
  final encryptionService = EncryptionService();
  await encryptionService.initialize();

  runApp(
    ProviderScope(
      overrides: [
        encryptionServiceProvider.overrideWithValue(encryptionService),
      ],
      child: const PeeapApp(),
    ),
  );
}

class PeeapApp extends ConsumerStatefulWidget {
  const PeeapApp({super.key});

  @override
  ConsumerState<PeeapApp> createState() => _PeeapAppState();
}

class _PeeapAppState extends ConsumerState<PeeapApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Initialize sync service after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeSyncService();
    });
  }

  Future<void> _initializeSyncService() async {
    try {
      final syncService = ref.read(syncServiceProvider);
      await syncService.initialize();
      debugPrint('Sync service initialized');
    } catch (e) {
      debugPrint('Failed to initialize sync service: $e');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    // Sync when app comes to foreground
    if (state == AppLifecycleState.resumed) {
      final syncService = ref.read(syncServiceProvider);
      syncService.syncAll();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final syncState = ref.watch(syncStatusProvider);

    return MaterialApp.router(
      title: 'Peeap',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
      builder: (context, child) {
        return Stack(
          children: [
            child ?? const SizedBox(),
            // Sync status indicator
            if (syncState == SyncState.syncing)
              Positioned(
                top: MediaQuery.of(context).padding.top + 4,
                left: 0,
                right: 0,
                child: const Center(
                  child: _SyncIndicator(),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Sync indicator widget
class _SyncIndicator extends StatelessWidget {
  const _SyncIndicator();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 12,
            height: 12,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'Syncing...',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onPrimaryContainer,
            ),
          ),
        ],
      ),
    );
  }
}
