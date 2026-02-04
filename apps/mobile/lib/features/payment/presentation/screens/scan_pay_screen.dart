import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/services/qr_payment_service.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../wallet/providers/wallet_provider.dart';
import '../../../cards/providers/card_provider.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../../shared/models/user_model.dart';

/// Scan to Pay Screen - Full QR payment flow with swipe gestures
/// - Swipe up from camera: Show wallet QR to receive payment
/// - Swipe down from camera: Show cards for NFC tap-to-pay
class ScanPayScreen extends ConsumerStatefulWidget {
  const ScanPayScreen({super.key});

  @override
  ConsumerState<ScanPayScreen> createState() => _ScanPayScreenState();
}

class _ScanPayScreenState extends ConsumerState<ScanPayScreen>
    with SingleTickerProviderStateMixin {
  final QRPaymentService _qrService = QRPaymentService();
  late MobileScannerController _scannerController;
  late PageController _verticalPageController;
  late AnimationController _slideIndicatorController;

  // Scanner mode state
  ScannerMode _currentMode = ScannerMode.scan;

  // Payment flow state
  PaymentFlowStep _currentStep = PaymentFlowStep.scanning;
  QRPaymentData? _qrData;
  CheckoutSession? _checkoutSession;
  PaymentRecipient? _recipient;
  String? _selectedWalletId;
  double _paymentAmount = 0;
  String _pin = '';
  bool _isTorchOn = false;
  String? _error;
  PaymentResult? _paymentResult;

  // NFC state
  String? _selectedCardId;
  bool _isNfcAvailable = false;

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
      torchEnabled: false,
    );
    _verticalPageController = PageController(initialPage: 1); // Start at scan (middle)
    _slideIndicatorController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _checkNfcAvailability();
  }

  Future<void> _checkNfcAvailability() async {
    // Check if device has NFC capability
    // For now, we'll assume NFC is available on Android
    setState(() => _isNfcAvailable = true);
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _verticalPageController.dispose();
    _slideIndicatorController.dispose();
    super.dispose();
  }

  void _onVerticalPageChanged(int page) {
    setState(() {
      switch (page) {
        case 0:
          _currentMode = ScannerMode.nfcPay;
          _scannerController.stop();
          break;
        case 1:
          _currentMode = ScannerMode.scan;
          if (_currentStep == PaymentFlowStep.scanning) {
            _scannerController.start();
          }
          break;
        case 2:
          _currentMode = ScannerMode.receiveQR;
          _scannerController.stop();
          break;
      }
    });
    HapticFeedback.selectionClick();
  }

  @override
  Widget build(BuildContext context) {
    // If we're in payment flow (not scanning), show the payment screens
    if (_currentStep != PaymentFlowStep.scanning) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: _buildPaymentAppBar(),
        body: _buildPaymentBody(),
      );
    }

    // Show the scanner with swipe navigation
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Vertical PageView for swipe navigation
          PageView(
            controller: _verticalPageController,
            scrollDirection: Axis.vertical,
            onPageChanged: _onVerticalPageChanged,
            physics: const BouncingScrollPhysics(),
            children: [
              // Page 0: NFC Tap to Pay (swipe down from scan)
              _buildNfcPayPage(),
              // Page 1: QR Scanner (center/default)
              _buildScannerPage(),
              // Page 2: Receive QR (swipe up from scan)
              _buildReceiveQRPage(),
            ],
          ),

          // Top bar with close and flash
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildCircleButton(
                    icon: Icons.close,
                    onPressed: () => context.pop(),
                  ),
                  if (_currentMode == ScannerMode.scan)
                    _buildCircleButton(
                      icon: _isTorchOn ? Icons.flash_on : Icons.flash_off,
                      onPressed: () {
                        _scannerController.toggleTorch();
                        setState(() => _isTorchOn = !_isTorchOn);
                      },
                    ),
                ],
              ),
            ),
          ),

          // Mode indicator dots
          Positioned(
            right: 16,
            top: 0,
            bottom: 0,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildModeIndicator(ScannerMode.nfcPay, Icons.contactless),
                  const SizedBox(height: 12),
                  _buildModeIndicator(ScannerMode.scan, Icons.qr_code_scanner),
                  const SizedBox(height: 12),
                  _buildModeIndicator(ScannerMode.receiveQR, Icons.qr_code),
                ],
              ),
            ),
          ),

          // Swipe hint at bottom
          if (_currentMode == ScannerMode.scan)
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: _buildSwipeHints(),
            ),
        ],
      ),
    );
  }

  Widget _buildCircleButton({
    required IconData icon,
    required VoidCallback onPressed,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.5),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: 24),
      ),
    );
  }

  Widget _buildModeIndicator(ScannerMode mode, IconData icon) {
    final isActive = _currentMode == mode;
    return GestureDetector(
      onTap: () {
        final page = mode == ScannerMode.nfcPay
            ? 0
            : mode == ScannerMode.scan
                ? 1
                : 2;
        _verticalPageController.animateToPage(
          page,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        );
      },
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isActive
              ? AppColors.primary
              : Colors.white.withValues(alpha: 0.2),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          color: Colors.white,
          size: isActive ? 20 : 16,
        ),
      ),
    );
  }

  Widget _buildSwipeHints() {
    return Column(
      children: [
        // Swipe up hint
        AnimatedBuilder(
          animation: _slideIndicatorController,
          builder: (context, child) {
            return Transform.translate(
              offset: Offset(0, -8 * _slideIndicatorController.value),
              child: child,
            );
          },
          child: Column(
            children: [
              const Icon(Icons.keyboard_arrow_up, color: Colors.white54),
              Text(
                'Swipe up to receive',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.7),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Text(
            'Point camera at QR code to pay',
            style: TextStyle(color: Colors.white, fontSize: 14),
          ),
        ),
        const SizedBox(height: 16),
        AnimatedBuilder(
          animation: _slideIndicatorController,
          builder: (context, child) {
            return Transform.translate(
              offset: Offset(0, 8 * _slideIndicatorController.value),
              child: child,
            );
          },
          child: Column(
            children: [
              Text(
                'Swipe down for NFC',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.7),
                  fontSize: 12,
                ),
              ),
              const Icon(Icons.keyboard_arrow_down, color: Colors.white54),
            ],
          ),
        ),
      ],
    );
  }

  // ============ SCANNER PAGE ============
  Widget _buildScannerPage() {
    return Stack(
      children: [
        // Camera preview
        MobileScanner(
          controller: _scannerController,
          onDetect: _onQRDetected,
        ),

        // Scan overlay
        Center(
          child: Container(
            width: MediaQuery.of(context).size.width * 0.7,
            height: MediaQuery.of(context).size.width * 0.7,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.primary, width: 3),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Stack(
              children: [
                // Corner decorations
                ..._buildCorners(),
              ],
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _buildCorners() {
    return [
      Positioned(top: -2, left: -2, child: _buildCorner(true, true)),
      Positioned(top: -2, right: -2, child: _buildCorner(true, false)),
      Positioned(bottom: -2, left: -2, child: _buildCorner(false, true)),
      Positioned(bottom: -2, right: -2, child: _buildCorner(false, false)),
    ];
  }

  Widget _buildCorner(bool isTop, bool isLeft) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        border: Border(
          top: isTop
              ? const BorderSide(color: AppColors.primary, width: 4)
              : BorderSide.none,
          bottom: !isTop
              ? const BorderSide(color: AppColors.primary, width: 4)
              : BorderSide.none,
          left: isLeft
              ? const BorderSide(color: AppColors.primary, width: 4)
              : BorderSide.none,
          right: !isLeft
              ? const BorderSide(color: AppColors.primary, width: 4)
              : BorderSide.none,
        ),
      ),
    );
  }

  // ============ RECEIVE QR PAGE ============
  Widget _buildReceiveQRPage() {
    final user = ref.watch(currentUserProvider);
    final wallets = ref.watch(walletsProvider);

    return Container(
      color: Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 80), // Space for top bar
            // User avatar
            CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.primary,
              backgroundImage: user?.avatarUrl != null
                  ? NetworkImage(user!.avatarUrl!)
                  : null,
              child: user?.avatarUrl == null
                  ? Text(
                      _getInitials(user),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            const SizedBox(height: 16),
            Text(
              user?.fullName ?? 'User',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 32),

            // QR Code
            Expanded(
              child: wallets.when(
                data: (walletList) {
                  if (walletList.isEmpty || user == null) {
                    return const Center(child: Text('No wallet available'));
                  }

                  final primaryWallet = walletList.firstWhere(
                    (w) => w.isPrimary,
                    orElse: () => walletList.first,
                  );

                  final qrData = _qrService.generateReceiveQR(
                    userId: user.id,
                    walletId: primaryWallet.id,
                    currency: primaryWallet.currency,
                  );

                  return Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 20,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: QrImageView(
                          data: qrData,
                          version: QrVersions.auto,
                          size: 200,
                          backgroundColor: Colors.white,
                          eyeStyle: const QrEyeStyle(
                            eyeShape: QrEyeShape.square,
                            color: AppColors.primary,
                          ),
                          dataModuleStyle: const QrDataModuleStyle(
                            dataModuleShape: QrDataModuleShape.square,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          primaryWallet.name,
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Balance: ${CurrencyFormatter.format(primaryWallet.balance, currency: primaryWallet.currency)}',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Scan this QR code to send me money',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, __) => const Center(child: Text('Failed to load wallet')),
              ),
            ),

            // Swipe down hint
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const Icon(Icons.keyboard_arrow_down, color: AppColors.textSecondary),
                  Text(
                    'Swipe down to scan',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(dynamic user) {
    if (user == null) return 'P';
    if (user.firstName != null && user.lastName != null) {
      return '${user.firstName![0]}${user.lastName![0]}'.toUpperCase();
    }
    return user.email?.substring(0, 2).toUpperCase() ?? 'P';
  }

  // ============ NFC PAY PAGE ============
  Widget _buildNfcPayPage() {
    final cards = ref.watch(issuedCardsProvider);

    return Container(
      color: const Color(0xFF1A1A2E), // Dark background for NFC
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 80),
            // NFC Icon animation
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.contactless,
                size: 64,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Tap to Pay',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _isNfcAvailable
                  ? 'Hold your phone near the payment terminal'
                  : 'NFC is not available on this device',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.7),
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Card selection
            Expanded(
              child: cards.when(
                data: (cardList) {
                  // Filter cards with balance
                  final cardsWithBalance = cardList.where((card) {
                    // Assuming cards have balance or we check linked wallet
                    return card.cardStatus == 'active';
                  }).toList();

                  if (cardsWithBalance.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.credit_card_off,
                            size: 64,
                            color: Colors.white.withValues(alpha: 0.3),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No cards available',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: () {
                              context.pop();
                              context.push(RouteNames.createCard);
                            },
                            child: const Text('Create a Card'),
                          ),
                        ],
                      ),
                    );
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    itemCount: cardsWithBalance.length,
                    itemBuilder: (context, index) {
                      final card = cardsWithBalance[index];
                      final isSelected = _selectedCardId == card.id;

                      return GestureDetector(
                        onTap: () {
                          setState(() => _selectedCardId = card.id);
                          HapticFeedback.selectionClick();
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: isSelected
                                  ? [AppColors.primary, AppColors.primaryDark]
                                  : [
                                      const Color(0xFF2D2D44),
                                      const Color(0xFF1F1F33),
                                    ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: isSelected
                                ? Border.all(color: AppColors.primary, width: 2)
                                : null,
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.credit_card,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      card.cardName ?? 'Virtual Card',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      card.maskedNumber ?? '**** ****',
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.7),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (isSelected)
                                const Icon(
                                  Icons.check_circle,
                                  color: Colors.white,
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(color: Colors.white),
                ),
                error: (_, __) => Center(
                  child: Text(
                    'Failed to load cards',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
                  ),
                ),
              ),
            ),

            // Ready to tap button
            if (_selectedCardId != null)
              Padding(
                padding: const EdgeInsets.all(24),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _startNfcPayment,
                    icon: const Icon(Icons.contactless),
                    label: const Text('Ready to Tap'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ),

            // Swipe up hint
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                children: [
                  Text(
                    'Swipe up to scan',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.5),
                      fontSize: 12,
                    ),
                  ),
                  Icon(
                    Icons.keyboard_arrow_up,
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _startNfcPayment() {
    // Start NFC payment session
    HapticFeedback.heavyImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Hold your phone near the payment terminal'),
        backgroundColor: AppColors.primary,
      ),
    );
    // TODO: Implement actual NFC payment
  }

  // ============ PAYMENT FLOW ============
  PreferredSizeWidget _buildPaymentAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(
        onPressed: _handleBack,
        icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
      ),
      title: Text(
        _getPaymentTitle(),
        style: const TextStyle(color: AppColors.textPrimary),
      ),
    );
  }

  String _getPaymentTitle() {
    switch (_currentStep) {
      case PaymentFlowStep.scanning:
        return 'Scan to Pay';
      case PaymentFlowStep.loading:
        return 'Loading...';
      case PaymentFlowStep.confirm:
        return 'Confirm Payment';
      case PaymentFlowStep.selectWallet:
        return 'Select Wallet';
      case PaymentFlowStep.enterPin:
        return 'Enter PIN';
      case PaymentFlowStep.processing:
        return 'Processing...';
      case PaymentFlowStep.success:
        return 'Payment Successful';
      case PaymentFlowStep.error:
        return 'Payment Failed';
    }
  }

  Widget _buildPaymentBody() {
    switch (_currentStep) {
      case PaymentFlowStep.scanning:
        return const SizedBox.shrink(); // Handled by main build
      case PaymentFlowStep.loading:
        return _buildLoadingView();
      case PaymentFlowStep.confirm:
        return _buildConfirmView();
      case PaymentFlowStep.selectWallet:
        return _buildWalletSelectionView();
      case PaymentFlowStep.enterPin:
        return _buildPinEntryView();
      case PaymentFlowStep.processing:
        return _buildProcessingView();
      case PaymentFlowStep.success:
        return _buildSuccessView();
      case PaymentFlowStep.error:
        return _buildErrorView();
    }
  }

  Widget _buildLoadingView() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 24),
          Text(
            'Loading payment details...',
            style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Recipient info
          if (_recipient != null || _checkoutSession != null)
            _buildRecipientCard(),

          const SizedBox(height: 24),

          // Amount
          Text(
            CurrencyFormatter.format(
              _paymentAmount,
              currency: _qrData?.currency ?? 'SLE',
            ),
            style: const TextStyle(
              fontSize: 40,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),

          if (_qrData?.description != null ||
              _checkoutSession?.description != null) ...[
            const SizedBox(height: 8),
            Text(
              _qrData?.description ?? _checkoutSession?.description ?? '',
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],

          const SizedBox(height: 32),

          // Selected wallet preview
          _buildSelectedWalletPreview(),

          const SizedBox(height: 32),

          // Confirm button
          AppButton(
            text: 'Continue to Payment',
            onPressed: _selectedWalletId != null
                ? () => setState(() => _currentStep = PaymentFlowStep.enterPin)
                : null,
          ),

          const SizedBox(height: 16),

          // Cancel button
          TextButton(
            onPressed: _handleBack,
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Widget _buildRecipientCard() {
    final name = _checkoutSession?.merchantName ??
        _recipient?.displayName ??
        'Payment';
    final logo = _checkoutSession?.merchantLogo ?? _recipient?.profilePicture;
    final initials =
        _recipient?.initials ?? name.substring(0, 2).toUpperCase();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: AppColors.primary,
            backgroundImage: logo != null ? NetworkImage(logo) : null,
            child: logo == null
                ? Text(
                    initials,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 24,
                    ),
                  )
                : null,
          ),
          const SizedBox(height: 12),
          Text(
            name,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          if (_recipient?.email != null) ...[
            const SizedBox(height: 4),
            Text(
              _recipient!.email!,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSelectedWalletPreview() {
    final wallets = ref.watch(walletsProvider);

    return wallets.when(
      data: (walletList) {
        // Auto-select first wallet with matching currency
        if (_selectedWalletId == null && walletList.isNotEmpty) {
          final currency =
              _qrData?.currency ?? _checkoutSession?.currency ?? 'SLE';
          final matchingWallet = walletList.firstWhere(
            (w) => w.currency == currency && w.balance >= _paymentAmount,
            orElse: () => walletList.first,
          );
          WidgetsBinding.instance.addPostFrameCallback((_) {
            setState(() => _selectedWalletId = matchingWallet.id);
          });
        }

        final selectedWallet = walletList.firstWhere(
          (w) => w.id == _selectedWalletId,
          orElse: () => walletList.first,
        );

        final hasInsufficientBalance = selectedWallet.balance < _paymentAmount;

        return GestureDetector(
          onTap: () =>
              setState(() => _currentStep = PaymentFlowStep.selectWallet),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: hasInsufficientBalance
                  ? AppColors.error.withValues(alpha: 0.1)
                  : AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color:
                    hasInsufficientBalance ? AppColors.error : AppColors.primary,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.account_balance_wallet,
                  color:
                      hasInsufficientBalance ? AppColors.error : AppColors.primary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        selectedWallet.name,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        'Balance: ${CurrencyFormatter.format(selectedWallet.balance, currency: selectedWallet.currency)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: hasInsufficientBalance
                              ? AppColors.error
                              : AppColors.textSecondary,
                        ),
                      ),
                      if (hasInsufficientBalance)
                        const Text(
                          'Insufficient balance',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.error,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.textSecondary),
              ],
            ),
          ),
        );
      },
      loading: () => const CircularProgressIndicator(),
      error: (_, __) => const Text('Failed to load wallets'),
    );
  }

  Widget _buildWalletSelectionView() {
    final wallets = ref.watch(walletsProvider);

    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Select wallet to pay from',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
          ),
        ),
        Expanded(
          child: wallets.when(
            data: (walletList) {
              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: walletList.length,
                itemBuilder: (context, index) {
                  final wallet = walletList[index];
                  final isSelected = wallet.id == _selectedWalletId;
                  final hasInsufficientBalance =
                      wallet.balance < _paymentAmount;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: GestureDetector(
                      onTap: hasInsufficientBalance
                          ? null
                          : () {
                              setState(() {
                                _selectedWalletId = wallet.id;
                                _currentStep = PaymentFlowStep.confirm;
                              });
                            },
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.primary.withValues(alpha: 0.1)
                              : hasInsufficientBalance
                                  ? AppColors.surfaceLight
                                  : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color:
                                isSelected ? AppColors.primary : AppColors.divider,
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.account_balance_wallet,
                              color: hasInsufficientBalance
                                  ? AppColors.textSecondary
                                  : AppColors.primary,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    wallet.name,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: hasInsufficientBalance
                                          ? AppColors.textSecondary
                                          : AppColors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    CurrencyFormatter.format(
                                      wallet.balance,
                                      currency: wallet.currency,
                                    ),
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: hasInsufficientBalance
                                          ? AppColors.error
                                          : AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (hasInsufficientBalance)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.error.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Text(
                                  'Low balance',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: AppColors.error,
                                  ),
                                ),
                              )
                            else if (isSelected)
                              const Icon(
                                Icons.check_circle,
                                color: AppColors.primary,
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) =>
                const Center(child: Text('Failed to load wallets')),
          ),
        ),
      ],
    );
  }

  Widget _buildPinEntryView() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.lock_outline, size: 64, color: AppColors.primary),
          const SizedBox(height: 24),
          const Text(
            'Enter your PIN',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Enter your 4-digit transaction PIN',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),

          // PIN dots
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(4, (index) {
              final isFilled = index < _pin.length;
              return Container(
                width: 20,
                height: 20,
                margin: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isFilled ? AppColors.primary : Colors.transparent,
                  border: Border.all(color: AppColors.primary, width: 2),
                ),
              );
            }),
          ),

          if (_error != null) ...[
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.error)),
          ],

          const SizedBox(height: 32),

          // Numpad
          _buildNumpad(),
        ],
      ),
    );
  }

  Widget _buildNumpad() {
    return SizedBox(
      width: 280,
      child: Column(
        children: [
          for (var row in [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['', '0', 'del'],
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: row.map((key) {
                  if (key.isEmpty) {
                    return const SizedBox(width: 70, height: 70);
                  }

                  return GestureDetector(
                    onTap: () => _onPinKeyPress(key),
                    child: Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: key == 'del'
                            ? const Icon(Icons.backspace_outlined)
                            : Text(
                                key,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProcessingView() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: CircularProgressIndicator(strokeWidth: 6),
          ),
          SizedBox(height: 32),
          Text(
            'Processing payment...',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8),
          Text(
            'Please wait',
            style: TextStyle(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                color: AppColors.success,
                size: 80,
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'Payment Successful!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.success,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              CurrencyFormatter.format(
                _paymentAmount,
                currency: _qrData?.currency ?? 'SLE',
              ),
              style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
            ),
            if (_paymentResult?.reference != null) ...[
              const SizedBox(height: 8),
              Text(
                'Ref: ${_paymentResult!.reference}',
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            ],
            const SizedBox(height: 48),
            AppButton(
              text: 'Done',
              onPressed: () => context.go(RouteNames.home),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.error_outline,
                color: AppColors.error,
                size: 80,
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'Payment Failed',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? 'An error occurred',
              style: const TextStyle(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),
            AppButton(
              text: 'Try Again',
              onPressed: _resetPayment,
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => context.go(RouteNames.home),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    );
  }

  // ============ EVENT HANDLERS ============
  void _onQRDetected(BarcodeCapture capture) async {
    if (_currentStep != PaymentFlowStep.scanning) return;
    if (_currentMode != ScannerMode.scan) return;
    if (capture.barcodes.isEmpty) return;

    final barcode = capture.barcodes.first;
    if (barcode.rawValue == null) return;

    // Pause scanner
    _scannerController.stop();

    // Haptic feedback
    HapticFeedback.mediumImpact();

    setState(() => _currentStep = PaymentFlowStep.loading);

    // Parse QR code
    final qrData = await _qrService.parseQRCode(barcode.rawValue!);

    if (qrData == null) {
      setState(() {
        _error = 'Invalid QR code';
        _currentStep = PaymentFlowStep.error;
      });
      return;
    }

    if (qrData.isExpired) {
      setState(() {
        _error = 'This QR code has expired';
        _currentStep = PaymentFlowStep.error;
      });
      return;
    }

    _qrData = qrData;

    // Handle different QR types
    switch (qrData.type) {
      case QRPaymentType.checkoutSession:
        await _handleCheckoutSession(qrData.sessionId!);
        break;
      case QRPaymentType.staticPayment:
      case QRPaymentType.paymentRequest:
      case QRPaymentType.merchantPayment:
        await _handleDirectPayment(qrData);
        break;
      case QRPaymentType.eventTicket:
        setState(() {
          _error = 'Event ticket validation coming soon';
          _currentStep = PaymentFlowStep.error;
        });
        break;
    }
  }

  Future<void> _handleCheckoutSession(String sessionId) async {
    final session = await _qrService.getCheckoutSession(sessionId);

    if (session == null) {
      setState(() {
        _error = 'Payment session not found';
        _currentStep = PaymentFlowStep.error;
      });
      return;
    }

    if (!session.isPending) {
      setState(() {
        _error = 'This payment has already been processed';
        _currentStep = PaymentFlowStep.error;
      });
      return;
    }

    if (session.isExpired) {
      setState(() {
        _error = 'This payment session has expired';
        _currentStep = PaymentFlowStep.error;
      });
      return;
    }

    setState(() {
      _checkoutSession = session;
      _paymentAmount = session.amount;
      _currentStep = PaymentFlowStep.confirm;
    });
  }

  Future<void> _handleDirectPayment(QRPaymentData qrData) async {
    final recipient =
        await _qrService.getRecipient(qrData.userId, qrData.walletId);

    if (recipient == null || recipient.walletId == null) {
      setState(() {
        _error = 'Recipient not found';
        _currentStep = PaymentFlowStep.error;
      });
      return;
    }

    setState(() {
      _recipient = recipient;
      _paymentAmount = qrData.amount ?? 0;
      _currentStep = PaymentFlowStep.confirm;
    });
  }

  void _onPinKeyPress(String key) {
    setState(() {
      _error = null;

      if (key == 'del') {
        if (_pin.isNotEmpty) {
          _pin = _pin.substring(0, _pin.length - 1);
        }
      } else if (_pin.length < 4) {
        _pin += key;

        // Auto-submit when 4 digits entered
        if (_pin.length == 4) {
          _processPayment();
        }
      }
    });
  }

  Future<void> _processPayment() async {
    setState(() {
      _currentStep = PaymentFlowStep.processing;
      _error = null;
    });

    // Get user from custom auth
    final user = ref.read(currentUserProvider);
    if (user == null) {
      setState(() {
        _error = 'Not authenticated';
        _currentStep = PaymentFlowStep.error;
      });
      return;
    }

    PaymentResult result;

    if (_checkoutSession != null) {
      result = await _qrService.processCheckoutPayment(
        sessionId: _checkoutSession!.id,
        payerWalletId: _selectedWalletId!,
        pin: _pin,
        payerUserId: user.id,
        payerName: user.fullName,
      );
    } else if (_recipient != null) {
      result = await _qrService.processDirectPayment(
        recipientWalletId: _recipient!.walletId!,
        payerWalletId: _selectedWalletId!,
        amount: _paymentAmount,
        pin: _pin,
        description: _qrData?.description,
        payerUserId: user.id,
      );
    } else {
      result = const PaymentResult(
        success: false,
        error: 'Invalid payment data',
      );
    }

    if (result.success) {
      HapticFeedback.heavyImpact();
      setState(() {
        _paymentResult = result;
        _currentStep = PaymentFlowStep.success;
      });

      // Refresh wallets
      ref.invalidate(walletsProvider);
    } else {
      setState(() {
        _error = result.error;
        _pin = '';
        _currentStep = PaymentFlowStep.enterPin;
      });
    }
  }

  void _handleBack() {
    switch (_currentStep) {
      case PaymentFlowStep.scanning:
        context.pop();
        break;
      case PaymentFlowStep.confirm:
        _resetPayment();
        break;
      case PaymentFlowStep.selectWallet:
        setState(() => _currentStep = PaymentFlowStep.confirm);
        break;
      case PaymentFlowStep.enterPin:
        setState(() {
          _pin = '';
          _currentStep = PaymentFlowStep.confirm;
        });
        break;
      default:
        context.pop();
    }
  }

  void _resetPayment() {
    _scannerController.start();
    setState(() {
      _currentStep = PaymentFlowStep.scanning;
      _currentMode = ScannerMode.scan;
      _qrData = null;
      _checkoutSession = null;
      _recipient = null;
      _selectedWalletId = null;
      _paymentAmount = 0;
      _pin = '';
      _error = null;
      _paymentResult = null;
    });
    _verticalPageController.animateToPage(
      1,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }
}

enum ScannerMode {
  scan,
  receiveQR,
  nfcPay,
}

enum PaymentFlowStep {
  scanning,
  loading,
  confirm,
  selectWallet,
  enterPin,
  processing,
  success,
  error,
}
