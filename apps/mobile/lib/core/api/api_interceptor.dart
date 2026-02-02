import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthInterceptor extends Interceptor {
  final Ref _ref;

  AuthInterceptor(this._ref);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Get the current session from Supabase
    final session = Supabase.instance.client.auth.currentSession;

    if (session != null) {
      options.headers['Authorization'] = 'Bearer ${session.accessToken}';
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Handle 401 Unauthorized - token expired
    if (err.response?.statusCode == 401) {
      try {
        // Attempt to refresh the token
        final response = await Supabase.instance.client.auth.refreshSession();

        if (response.session != null) {
          // Retry the request with the new token
          final opts = err.requestOptions;
          opts.headers['Authorization'] =
              'Bearer ${response.session!.accessToken}';

          final dio = Dio();
          final retryResponse = await dio.fetch(opts);
          return handler.resolve(retryResponse);
        }
      } catch (e) {
        // Refresh failed, sign out the user
        await Supabase.instance.client.auth.signOut();
      }
    }

    handler.next(err);
  }
}
