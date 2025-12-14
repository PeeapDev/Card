import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  Truck,
  Bus,
  Bike,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  QrCode,
  CreditCard,
  Sparkles,
  MapPin,
  User,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { clsx } from 'clsx';

interface TransportSetupWizardProps {
  onComplete: (profile: DriverProfile) => void;
  userName?: string;
}

export interface DriverProfile {
  vehicleType: string;
  vehicleName: string;
  operatingArea: string;
  phoneNumber: string;
  paymentMethods: {
    qr: boolean;
    card: boolean;
    mobile: boolean;
  };
}

const vehicleTypes = [
  { id: 'taxi', name: 'Taxi / Cab', icon: Car, color: 'yellow' },
  { id: 'keke', name: 'Keke / Tricycle', icon: Bike, color: 'green' },
  { id: 'okada', name: 'Okada / Motorcycle', icon: Bike, color: 'orange' },
  { id: 'bus', name: 'Bus / Minibus', icon: Bus, color: 'blue' },
  { id: 'truck', name: 'Truck / Delivery', icon: Truck, color: 'purple' },
  { id: 'other', name: 'Other', icon: Car, color: 'gray' },
];

const operatingAreas = [
  'Freetown',
  'Bo',
  'Kenema',
  'Makeni',
  'Koidu',
  'Lungi',
  'Port Loko',
  'Waterloo',
  'Other',
];

export function TransportSetupWizard({ onComplete, userName }: TransportSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<DriverProfile>({
    vehicleType: '',
    vehicleName: '',
    operatingArea: '',
    phoneNumber: '',
    paymentMethods: {
      qr: true,
      card: true,
      mobile: true,
    },
  });

  const totalSteps = 4;

  const canProceed = () => {
    switch (step) {
      case 1:
        return profile.vehicleType !== '';
      case 2:
        return profile.operatingArea !== '';
      case 3:
        return Object.values(profile.paymentMethods).some(Boolean);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Step {step} of {totalSteps}
          </span>
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
            {Math.round((step / totalSteps) * 100)}% Complete
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {/* Step 1: Welcome & Vehicle Type */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <Car className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome{userName ? `, ${userName}` : ''}!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Let's set up your driver payment collection in just a few steps.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  What type of vehicle do you operate?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {vehicleTypes.map((vehicle) => {
                    const Icon = vehicle.icon;
                    const isSelected = profile.vehicleType === vehicle.id;
                    return (
                      <motion.button
                        key={vehicle.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setProfile({ ...profile, vehicleType: vehicle.id, vehicleName: vehicle.name })}
                        className={clsx(
                          'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                          isSelected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <div className={clsx(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          isSelected
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className={clsx(
                          'text-sm font-medium',
                          isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                        )}>
                          {vehicle.name}
                        </span>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Operating Area */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Where do you operate?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Select your primary operating area
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {operatingAreas.map((area) => {
                  const isSelected = profile.operatingArea === area;
                  return (
                    <motion.button
                      key={area}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setProfile({ ...profile, operatingArea: area })}
                      className={clsx(
                        'p-4 rounded-xl border-2 transition-all text-center',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <span className={clsx(
                        'font-medium',
                        isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {area}
                      </span>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 mx-auto mt-2" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 3: Payment Methods */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  How will you accept payments?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Select the payment methods you want to offer
                </p>
              </div>

              <div className="space-y-4">
                {/* QR Code */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setProfile({
                    ...profile,
                    paymentMethods: { ...profile.paymentMethods, qr: !profile.paymentMethods.qr }
                  })}
                  className={clsx(
                    'w-full p-5 rounded-xl border-2 transition-all flex items-center gap-4',
                    profile.paymentMethods.qr
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-14 h-14 rounded-xl flex items-center justify-center',
                    profile.paymentMethods.qr
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  )}>
                    <QrCode className="w-7 h-7" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">QR Code</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Passenger scans your QR code to pay instantly
                    </p>
                  </div>
                  <div className={clsx(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                    profile.paymentMethods.qr
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}>
                    {profile.paymentMethods.qr && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                </motion.button>

                {/* Card */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setProfile({
                    ...profile,
                    paymentMethods: { ...profile.paymentMethods, card: !profile.paymentMethods.card }
                  })}
                  className={clsx(
                    'w-full p-5 rounded-xl border-2 transition-all flex items-center gap-4',
                    profile.paymentMethods.card
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-14 h-14 rounded-xl flex items-center justify-center',
                    profile.paymentMethods.card
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  )}>
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">Peeap Card</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Accept payments from Peeap cardholders
                    </p>
                  </div>
                  <div className={clsx(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                    profile.paymentMethods.card
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}>
                    {profile.paymentMethods.card && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                </motion.button>

                {/* Mobile Money */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setProfile({
                    ...profile,
                    paymentMethods: { ...profile.paymentMethods, mobile: !profile.paymentMethods.mobile }
                  })}
                  className={clsx(
                    'w-full p-5 rounded-xl border-2 transition-all flex items-center gap-4',
                    profile.paymentMethods.mobile
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className={clsx(
                    'w-14 h-14 rounded-xl flex items-center justify-center',
                    profile.paymentMethods.mobile
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  )}>
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">Mobile Money</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Orange Money, Africell Money payments
                    </p>
                  </div>
                  <div className={clsx(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                    profile.paymentMethods.mobile
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}>
                    {profile.paymentMethods.mobile && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Ready */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  You're all set!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your driver payment collection is ready to go
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Your Setup Summary</h3>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-xl">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <Car className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vehicle Type</p>
                    <p className="font-medium text-gray-900 dark:text-white">{profile.vehicleName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Operating Area</p>
                    <p className="font-medium text-gray-900 dark:text-white">{profile.operatingArea}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Payment Methods</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {[
                        profile.paymentMethods.qr && 'QR Code',
                        profile.paymentMethods.card && 'Card',
                        profile.paymentMethods.mobile && 'Mobile Money',
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">What you can do now:</p>
                {[
                  'Collect payments from passengers instantly',
                  'Track all your earnings in one place',
                  'Withdraw to mobile money anytime',
                  'No cash handling needed',
                ].map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {benefit}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className={clsx('flex-1', step === 1 && 'w-full')}
        >
          {step === totalSteps ? (
            <>
              Start Collecting
              <Sparkles className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
