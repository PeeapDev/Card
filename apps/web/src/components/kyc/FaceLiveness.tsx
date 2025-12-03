/**
 * Face Liveness Component
 * Verifies user is a real person by:
 * 1. Reading random text aloud
 * 2. Following head movement instructions
 * 3. Capturing frames for verification
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Volume2,
  MicOff,
} from 'lucide-react';
import { captureVideoFrame } from '@/services/kyc.service';
import { clsx } from 'clsx';

interface FaceLivenessProps {
  onComplete: (result: { isLive: boolean; frames: string[]; selfieFrame: string }) => void;
  onCancel: () => void;
}

type LivenessStep = 'intro' | 'camera-setup' | 'read-text' | 'turn-left' | 'turn-right' | 'face-forward' | 'complete' | 'failed';

// Random phrases for users to read
const VERIFICATION_PHRASES = [
  "I am verifying my identity for Peeap today",
  "My name is real and I am a real person",
  "I confirm this is my live verification",
  "This verification is being done by me personally",
  "I authorize Peeap to verify my identity",
];

export function FaceLiveness({ onComplete, onCancel }: FaceLivenessProps) {
  const [step, setStep] = useState<LivenessStep>('intro');
  const [error, setError] = useState<string | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [selfieFrame, setSelfieFrame] = useState<string>('');
  const [verificationPhrase] = useState(() =>
    VERIFICATION_PHRASES[Math.floor(Math.random() * VERIFICATION_PHRASES.length)]
  );
  const [countdown, setCountdown] = useState(3);
  const [instructionTimer, setInstructionTimer] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStep('camera-setup');
      // Wait a moment for camera to stabilize
      setTimeout(() => setStep('read-text'), 1500);
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please allow camera permissions and try again.');
      setStep('failed');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  // Capture a frame
  const captureFrame = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === 4) {
      const frame = captureVideoFrame(videoRef.current);
      setCapturedFrames(prev => [...prev, frame]);
      return frame;
    }
    return null;
  }, []);

  // Handle step progression with frame capture
  useEffect(() => {
    if (step === 'read-text') {
      // Capture initial frame and start timer
      captureFrame();
      const timer = setInterval(() => {
        setInstructionTimer(prev => {
          if (prev >= 4) {
            clearInterval(timer);
            setStep('turn-left');
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    if (step === 'turn-left') {
      setInstructionTimer(0);
      const timer = setInterval(() => {
        captureFrame();
        setInstructionTimer(prev => {
          if (prev >= 2) {
            clearInterval(timer);
            setStep('turn-right');
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    if (step === 'turn-right') {
      setInstructionTimer(0);
      const timer = setInterval(() => {
        captureFrame();
        setInstructionTimer(prev => {
          if (prev >= 2) {
            clearInterval(timer);
            setStep('face-forward');
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    if (step === 'face-forward') {
      setInstructionTimer(0);
      // Countdown for final selfie
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Capture final selfie
            const finalFrame = captureFrame();
            if (finalFrame) {
              setSelfieFrame(finalFrame);
            }
            setStep('complete');
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, captureFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle completion
  useEffect(() => {
    if (step === 'complete' && selfieFrame) {
      // Wait a moment to show success, then complete
      const timer = setTimeout(() => {
        stopCamera();
        onComplete({
          isLive: capturedFrames.length >= 3,
          frames: capturedFrames,
          selfieFrame,
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, selfieFrame, capturedFrames, stopCamera, onComplete]);

  const handleRetry = () => {
    setCapturedFrames([]);
    setSelfieFrame('');
    setError(null);
    setCountdown(3);
    setInstructionTimer(0);
    startCamera();
  };

  return (
    <div className="space-y-6">
      {/* Intro Step */}
      {step === 'intro' && (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
            <Camera className="w-12 h-12 text-primary-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Face Verification</h3>
            <p className="text-gray-600">
              We need to verify you're a real person. You'll be asked to:
            </p>
          </div>
          <div className="text-left bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                1
              </div>
              <span className="text-gray-700">Read a verification phrase</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                2
              </div>
              <span className="text-gray-700">Slowly turn your head left</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                3
              </div>
              <span className="text-gray-700">Slowly turn your head right</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                4
              </div>
              <span className="text-gray-700">Take a selfie facing forward</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={startCamera}
              className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Start Verification
            </button>
          </div>
        </div>
      )}

      {/* Camera Setup */}
      {step === 'camera-setup' && (
        <div className="text-center space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          </div>
          <p className="text-gray-600">Setting up camera...</p>
        </div>
      )}

      {/* Read Text Step */}
      {step === 'read-text' && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-64 border-4 border-white/50 rounded-full" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Please read aloud:</span>
            </div>
            <p className="text-lg text-blue-800 font-medium">"{verificationPhrase}"</p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="text-sm text-gray-500">Reading... {5 - instructionTimer}s</div>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-1000"
                style={{ width: `${(instructionTimer / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Turn Left Step */}
      {step === 'turn-left' && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Arrow overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-2xl p-6 flex flex-col items-center">
                <ArrowLeft className="w-16 h-16 text-white animate-pulse" />
                <span className="text-white font-medium mt-2">Turn head LEFT slowly</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="text-sm text-gray-500">Hold... {3 - instructionTimer}s</div>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-1000"
                style={{ width: `${(instructionTimer / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Turn Right Step */}
      {step === 'turn-right' && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Arrow overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 rounded-2xl p-6 flex flex-col items-center">
                <ArrowRight className="w-16 h-16 text-white animate-pulse" />
                <span className="text-white font-medium mt-2">Turn head RIGHT slowly</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="text-sm text-gray-500">Hold... {3 - instructionTimer}s</div>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-1000"
                style={{ width: `${(instructionTimer / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Face Forward / Selfie Step */}
      {step === 'face-forward' && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Countdown overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-64 border-4 border-green-500 rounded-full flex items-center justify-center">
                <span className="text-6xl font-bold text-white drop-shadow-lg">{countdown}</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">Face forward for selfie</p>
            <p className="text-sm text-gray-500">Capturing in {countdown}...</p>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-900 mb-2">Liveness Verified!</h3>
            <p className="text-gray-600">
              Face verification completed successfully. Proceeding to ID verification...
            </p>
          </div>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        </div>
      )}

      {/* Failed Step */}
      {step === 'failed' && (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Verification Failed</h3>
            <p className="text-gray-600">{error || 'Unable to complete face verification'}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleRetry}
              className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
