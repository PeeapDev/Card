import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  verifySierraLeoneId,
  getVerificationStatus,
  getProviderKyc,
  initiatePhoneOtp,
  verifyPhoneOtp,
  fileToBase64,
  normalizeSLPhoneNumber,
  detectProvider,
  VerificationStatus,
  VerificationResult,
} from '@/services/verification.service';

type Step = 'review-info' | 'id-scan' | 'selfie-capture' | 'phone-verify' | 'processing' | 'result';

// Quality check types
interface QualityCheck {
  brightness: 'good' | 'too_dark' | 'too_bright' | 'checking';
  blur: 'sharp' | 'blurry' | 'checking';
  alignment: 'aligned' | 'misaligned' | 'checking';
  overall: 'ready' | 'not_ready' | 'checking';
}

// InputField component moved outside to prevent re-creation on parent re-renders
const InputField = memo(({
  label,
  required,
  children,
  hint
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
  </div>
));

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
}

const steps = [
  { key: 'review-info', label: 'Personal Info', icon: 'user' },
  { key: 'id-scan', label: 'ID Document', icon: 'id-card' },
  { key: 'selfie-capture', label: 'Selfie', icon: 'camera' },
  { key: 'phone-verify', label: 'Verification', icon: 'phone' },
];

export const VerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qualityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [step, setStep] = useState<Step>('review-info');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>(null);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
  });
  const [infoConfirmed, setInfoConfirmed] = useState(false);

  // Date of birth separate fields for easier selection
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Update dateOfBirth when any DOB field changes
  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      const dateStr = `${dobYear}-${dobMonth}-${dobDay}`;
      if (userInfo.dateOfBirth !== dateStr) {
        setUserInfo(prev => ({ ...prev, dateOfBirth: dateStr }));
      }
    }
  }, [dobDay, dobMonth, dobYear]);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [idCardBase64, setIdCardBase64] = useState<string | null>(null);
  const [qualityCheck, setQualityCheck] = useState<QualityCheck>({
    brightness: 'checking',
    blur: 'checking',
    alignment: 'checking',
    overall: 'checking',
  });
  const [scanningMessage, setScanningMessage] = useState('Position your ID card within the frame');
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const readyCountRef = useRef(0);
  const autoCaptureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Selfie capture state with liveness detection
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [selfieRecording, setSelfieRecording] = useState(false);
  const [selfieCountdown, setSelfieCountdown] = useState(0);
  const [selfieCameraActive, setSelfieCameraActive] = useState(false);
  const selfieVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfieStreamRef = useRef<MediaStream | null>(null);

  // Liveness detection state
  type LivenessStep = 'ready' | 'look_left' | 'look_right' | 'open_mouth' | 'recording' | 'complete';
  const [livenessStep, setLivenessStep] = useState<LivenessStep>('ready');
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [livenessConfirmed, setLivenessConfirmed] = useState({
    lookLeft: false,
    lookRight: false,
    openMouth: false,
  });
  const livenessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [provider, setProvider] = useState<string>('');
  const [simName, setSimName] = useState<string | null>(null);
  const [otpRequestId, setOtpRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setUserInfo({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phone || '',
        dateOfBirth: '',
        gender: '',
        address: '',
      });
      const phone = user.phone || '';
      if (phone) {
        setProvider(detectProvider(phone));
      }
    }
  }, [user]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const s = await getVerificationStatus();
      setStatus(s);
      if (s.overallVerified) {
        setStep('result');
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const handleInfoChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }));
    if (field === 'phoneNumber') {
      setProvider(detectProvider(value));
    }
  };

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera not supported on this browser. Please use a modern browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Use back camera on mobile, fallback to any
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready before playing
        videoRef.current.onloadedmetadata = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              setCameraActive(true);

              // Start quality check interval after video is playing
              if (qualityCheckIntervalRef.current) {
                clearInterval(qualityCheckIntervalRef.current);
              }
              qualityCheckIntervalRef.current = setInterval(() => {
                analyzeFrame();
              }, 500);
            }
          } catch (playErr) {
            console.error('Video play error:', playErr);
            setCameraError('Failed to start video stream. Please try again.');
          }
        };
      } else {
        setCameraError('Video element not ready. Please try again.');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found. Please ensure your device has a camera.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Camera is in use by another application. Please close other apps using the camera.');
      } else if (err.name === 'OverconstrainedError') {
        // Try again with simpler constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = async () => {
              try {
                if (videoRef.current) {
                  await videoRef.current.play();
                  setCameraActive(true);
                  if (qualityCheckIntervalRef.current) {
                    clearInterval(qualityCheckIntervalRef.current);
                  }
                  qualityCheckIntervalRef.current = setInterval(() => {
                    analyzeFrame();
                  }, 500);
                }
              } catch (playErr) {
                setCameraError('Failed to start video stream.');
              }
            };
          }
        } catch (fallbackErr) {
          setCameraError('Failed to access camera. Please try again.');
        }
      } else {
        setCameraError(`Camera error: ${err.message || 'Unknown error'}. Please try again.`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (qualityCheckIntervalRef.current) {
      clearInterval(qualityCheckIntervalRef.current);
      qualityCheckIntervalRef.current = null;
    }
    if (autoCaptureTimeoutRef.current) {
      clearInterval(autoCaptureTimeoutRef.current);
      autoCaptureTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setAutoCapturing(false);
    setCaptureCountdown(0);
    readyCountRef.current = 0;
  }, []);

  // Analyze current video frame for quality
  const analyzeFrame = useCallback(() => {
    const video = displayVideoRef.current || videoRef.current;
    if (!video || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0);

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Analyze brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    let brightnessStatus: QualityCheck['brightness'] = 'good';
    if (avgBrightness < 60) {
      brightnessStatus = 'too_dark';
    } else if (avgBrightness > 200) {
      brightnessStatus = 'too_bright';
    }

    // Analyze blur using Laplacian variance (edge detection)
    const grayData = new Float32Array(canvas.width * canvas.height);
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      grayData[idx] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }

    let laplacianVariance = 0;
    const width = canvas.width;
    const height = canvas.height;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const laplacian =
          -grayData[idx - width] - grayData[idx - 1] +
          4 * grayData[idx] -
          grayData[idx + 1] - grayData[idx + width];
        laplacianVariance += laplacian * laplacian;
      }
    }
    laplacianVariance /= ((width - 2) * (height - 2));

    const blurStatus: QualityCheck['blur'] = laplacianVariance > 100 ? 'sharp' : 'blurry';

    // Simple alignment check - assume aligned if brightness is uniform across card area
    const centerRegion = getCenterRegionBrightness(data, canvas.width, canvas.height);
    const alignmentStatus: QualityCheck['alignment'] = centerRegion.hasContent ? 'aligned' : 'misaligned';

    // Overall status
    const isReady = brightnessStatus === 'good' && blurStatus === 'sharp' && alignmentStatus === 'aligned';

    setQualityCheck({
      brightness: brightnessStatus,
      blur: blurStatus,
      alignment: alignmentStatus,
      overall: isReady ? 'ready' : 'not_ready',
    });

    // Auto-capture logic: capture after 3 consecutive "ready" checks (~1.5 seconds)
    if (isReady && video.videoWidth > 0 && video.videoHeight > 0) {
      readyCountRef.current++;

      if (readyCountRef.current >= 3 && !autoCapturing) {
        // Start auto-capture countdown
        setAutoCapturing(true);
        setCaptureCountdown(3);

        // Countdown and capture
        let countdown = 3;
        const countdownInterval = setInterval(() => {
          countdown--;
          setCaptureCountdown(countdown);

          if (countdown <= 0) {
            clearInterval(countdownInterval);
            // Longer delay to ensure video frame is fully ready
            setTimeout(() => {
              // Double-check video is still ready before capture
              const captureVideo = displayVideoRef.current || videoRef.current;
              if (captureVideo && captureVideo.videoWidth > 0 && captureVideo.videoHeight > 0 && captureVideo.readyState >= 2) {
                console.log('Auto-capture: video ready, capturing now');
                captureImage();
              } else {
                console.warn('Auto-capture: video not ready, retrying...');
                // Retry after another delay
                setTimeout(() => {
                  captureImage();
                }, 300);
              }
            }, 200);
          }
        }, 600); // Slightly slower countdown for better stability

        autoCaptureTimeoutRef.current = countdownInterval as any;
      }
    } else {
      // Reset ready count and cancel auto-capture if conditions are no longer met
      readyCountRef.current = 0;
      if (autoCapturing) {
        setAutoCapturing(false);
        setCaptureCountdown(0);
        if (autoCaptureTimeoutRef.current) {
          clearInterval(autoCaptureTimeoutRef.current);
          autoCaptureTimeoutRef.current = null;
        }
      }
    }

    // Update scanning message
    if (brightnessStatus === 'too_dark') {
      setScanningMessage('Too dark - move to a brighter area');
    } else if (brightnessStatus === 'too_bright') {
      setScanningMessage('Too bright - avoid direct light');
    } else if (blurStatus === 'blurry') {
      setScanningMessage('Hold steady - image is blurry');
    } else if (alignmentStatus === 'misaligned') {
      setScanningMessage('Position ID card within the frame');
    } else if (autoCapturing) {
      setScanningMessage(`Capturing in ${captureCountdown}...`);
    } else {
      setScanningMessage('Hold steady - auto-capturing...');
    }
  }, [autoCapturing, captureCountdown]);

  // Helper to check if center region has content (card present)
  const getCenterRegionBrightness = (data: Uint8ClampedArray, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const regionWidth = width * 0.6;
    const regionHeight = height * 0.4;

    let edgeCount = 0;
    let pixelCount = 0;

    for (let y = Math.floor(centerY - regionHeight / 2); y < centerY + regionHeight / 2; y++) {
      for (let x = Math.floor(centerX - regionWidth / 2); x < centerX + regionWidth / 2; x++) {
        const idx = (y * width + x) * 4;
        if (idx >= 0 && idx < data.length - 4) {
          const nextIdx = idx + 4;
          const diff = Math.abs(data[idx] - data[nextIdx]) +
                       Math.abs(data[idx + 1] - data[nextIdx + 1]) +
                       Math.abs(data[idx + 2] - data[nextIdx + 2]);
          if (diff > 30) edgeCount++;
          pixelCount++;
        }
      }
    }

    // If there's enough edge detail, assume card is present
    return { hasContent: pixelCount > 0 && (edgeCount / pixelCount) > 0.05 };
  };

  // Capture the current frame
  const captureImage = useCallback(() => {
    // Try both video elements and use whichever has valid dimensions
    let video: HTMLVideoElement | null = null;

    // First try displayVideoRef (visible video)
    if (displayVideoRef.current && displayVideoRef.current.videoWidth > 0 && displayVideoRef.current.videoHeight > 0) {
      video = displayVideoRef.current;
      console.log('Using displayVideoRef for capture', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
    }
    // Fall back to hidden videoRef
    else if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
      video = videoRef.current;
      console.log('Using videoRef (hidden) for capture', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState
      });
    }

    if (!video) {
      console.error('No video element with valid dimensions available for capture');
      console.error('displayVideoRef:', displayVideoRef.current ? {
        videoWidth: displayVideoRef.current.videoWidth,
        videoHeight: displayVideoRef.current.videoHeight,
        readyState: displayVideoRef.current.readyState
      } : 'null');
      console.error('videoRef:', videoRef.current ? {
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        readyState: videoRef.current.readyState
      } : 'null');
      return;
    }

    // Check video readyState (4 = HAVE_ENOUGH_DATA)
    if (video.readyState < 2) {
      console.error('Video not ready, readyState:', video.readyState);
      return;
    }

    try {
      // Create a new canvas for capture
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;

      const ctx = captureCanvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      // Draw the current frame
      ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

      // Get the image as base64
      const imageDataUrl = captureCanvas.toDataURL('image/jpeg', 0.9);

      // Verify we got valid image data (must be longer than just the header)
      if (!imageDataUrl || imageDataUrl === 'data:,' || imageDataUrl.length < 1000) {
        console.error('Failed to capture image - invalid data URL, length:', imageDataUrl?.length);
        return;
      }

      console.log('Image captured successfully, data URL length:', imageDataUrl.length, 'starts with:', imageDataUrl.substring(0, 50));

      setIdCardPreview(imageDataUrl);
      setIdCardBase64(imageDataUrl);

      // Stop the camera after capture
      stopCamera();
    } catch (err) {
      console.error('Error during image capture:', err);
    }
  }, [stopCamera]);

  // Cleanup camera on unmount or step change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Auto-start camera when entering id-scan step
  useEffect(() => {
    if (step === 'id-scan' && !idCardPreview) {
      startCamera();
    }
  }, [step, idCardPreview, startCamera]);

  // Selfie camera functions
  const startSelfieCamera = useCallback(async () => {
    try {
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera not supported on this browser.');
        return;
      }

      // Use front-facing camera for selfie
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      selfieStreamRef.current = stream;
      setSelfieCameraActive(true);
    } catch (err: any) {
      console.error('Selfie camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera access.');
      } else {
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  }, []);

  const stopSelfieCamera = useCallback(() => {
    if (selfieStreamRef.current) {
      selfieStreamRef.current.getTracks().forEach(track => track.stop());
      selfieStreamRef.current = null;
    }
    setSelfieCameraActive(false);
    setSelfieRecording(false);
    setSelfieCountdown(0);
    setLivenessStep('ready');
    setLivenessProgress(0);
    setLivenessConfirmed({ lookLeft: false, lookRight: false, openMouth: false });
    if (livenessTimeoutRef.current) {
      clearTimeout(livenessTimeoutRef.current);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Voice prompt function
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Start liveness detection
  const startLivenessCheck = useCallback(() => {
    setLivenessStep('look_left');
    setLivenessProgress(0);
    setTimeout(() => {
      speak('Please slowly turn your head to the left');
    }, 500);
  }, [speak]);

  // Confirm current liveness step (called when user taps the button)
  const confirmLivenessStep = useCallback(() => {
    if (livenessStep === 'look_left') {
      setLivenessConfirmed(prev => ({ ...prev, lookLeft: true }));
      setLivenessProgress(33);
      setLivenessStep('look_right');
      setTimeout(() => {
        speak('Good! Now slowly turn your head to the right');
      }, 300);
    } else if (livenessStep === 'look_right') {
      setLivenessConfirmed(prev => ({ ...prev, lookRight: true }));
      setLivenessProgress(66);
      setLivenessStep('open_mouth');
      setTimeout(() => {
        speak('Great! Now open and close your mouth');
      }, 300);
    } else if (livenessStep === 'open_mouth') {
      setLivenessConfirmed(prev => ({ ...prev, openMouth: true }));
      setLivenessProgress(100);
      setLivenessStep('recording');
      setTimeout(() => {
        speak('Perfect! Hold still, capturing your photo');
      }, 300);
      // Auto-capture after liveness is complete
      setTimeout(() => {
        captureSelfie();
      }, 1500);
    }
  }, [livenessStep, speak]);

  // Capture the selfie photo
  const captureSelfie = useCallback(() => {
    const video = selfieVideoRef.current;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror the image since video is mirrored
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        if (imageDataUrl && imageDataUrl.length > 1000) {
          console.log('Selfie captured successfully, size:', imageDataUrl.length);
          setSelfiePreview(imageDataUrl);
          setSelfieBase64(imageDataUrl);
          setLivenessStep('complete');
          speak('Verification complete! You can now continue.');
          stopSelfieCamera();
        } else {
          console.error('Failed to capture selfie');
          setCameraError('Failed to capture selfie. Please try again.');
          setLivenessStep('ready');
        }
      }
    } else {
      console.error('Video not ready for capture');
      setCameraError('Camera not ready. Please try again.');
      setLivenessStep('ready');
    }
  }, [stopSelfieCamera, speak]);

  const startSelfieRecording = useCallback(() => {
    if (!selfieVideoRef.current || !selfieStreamRef.current) {
      console.error('Selfie video not ready');
      return;
    }

    setSelfieRecording(true);
    setSelfieCountdown(5);

    // 5 second countdown
    let countdown = 5;
    const countdownInterval = setInterval(() => {
      countdown--;
      setSelfieCountdown(countdown);

      if (countdown <= 0) {
        clearInterval(countdownInterval);

        // Capture the final frame as the selfie
        const video = selfieVideoRef.current;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

            if (imageDataUrl && imageDataUrl.length > 1000) {
              console.log('Selfie captured successfully, size:', imageDataUrl.length);
              setSelfiePreview(imageDataUrl);
              setSelfieBase64(imageDataUrl);
              stopSelfieCamera();
            } else {
              console.error('Failed to capture selfie');
              setCameraError('Failed to capture selfie. Please try again.');
              setSelfieRecording(false);
            }
          }
        } else {
          console.error('Video not ready for capture');
          setCameraError('Camera not ready. Please try again.');
          setSelfieRecording(false);
        }
      }
    }, 1000);
  }, [stopSelfieCamera]);

  const retakeSelfie = useCallback(() => {
    setSelfiePreview(null);
    setSelfieBase64(null);
    startSelfieCamera();
  }, [startSelfieCamera]);

  // Auto-start selfie camera when entering selfie step
  useEffect(() => {
    if (step === 'selfie-capture' && !selfiePreview) {
      startSelfieCamera();
    }
    return () => {
      if (step !== 'selfie-capture') {
        stopSelfieCamera();
      }
    };
  }, [step, selfiePreview, startSelfieCamera, stopSelfieCamera]);

  const handleVerifyPhone = async () => {
    if (!userInfo.phoneNumber) {
      setError('Please enter your phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const normalized = normalizeSLPhoneNumber(userInfo.phoneNumber);
      const kycResult = await getProviderKyc(normalized, provider);
      if (kycResult.success && kycResult.data) {
        setSimName(kycResult.data.accountHolderName);
        setPhoneVerified(true);
      } else {
        const otpResult = await initiatePhoneOtp(normalized);
        if (otpResult.success && otpResult.requestId) {
          setOtpRequestId(otpResult.requestId);
        } else {
          setError(otpResult.message || 'Failed to send verification code');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Phone verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpRequestId || otp.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const normalized = normalizeSLPhoneNumber(userInfo.phoneNumber);
      const result = await verifyPhoneOtp(normalized, otp, otpRequestId);
      if (result.verified) {
        setPhoneVerified(true);
        setOtpRequestId(null);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      setError(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!idCardBase64) {
      setError('Please scan your ID card');
      return;
    }
    if (!selfieBase64) {
      setError('Please take a selfie');
      return;
    }
    setLoading(true);
    setError(null);
    setStep('processing');
    try {
      const normalized = normalizeSLPhoneNumber(userInfo.phoneNumber);
      const verificationResult = await verifySierraLeoneId({
        idCardFrontBase64: idCardBase64,
        selfieBase64: selfieBase64,
        mimeType: 'image/jpeg',
        phoneNumber: normalized,
      });
      setResult(verificationResult);
      setStep('result');
      if (verificationResult.verified) {
        await loadStatus();
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed');
      setStep('id-scan');
    } finally {
      setLoading(false);
    }
  };

  // Reset captured image and restart camera
  const retakePhoto = useCallback(() => {
    setIdCardPreview(null);
    setIdCardBase64(null);
    startCamera();
  }, [startCamera]);

  const currentStepIndex = steps.findIndex(s => s.key === step);

  // Memoize the provider hint to avoid unnecessary re-renders
  const providerHint = provider ? `Network: ${provider.charAt(0).toUpperCase() + provider.slice(1)}` : undefined;

  const StepIcon = ({ type, active, completed }: { type: string; active: boolean; completed: boolean }) => {
    const iconClass = `w-5 h-5 ${completed ? 'text-white' : active ? 'text-white' : 'text-gray-400'}`;

    if (completed) {
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }

    switch (type) {
      case 'user':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'id-card':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        );
      case 'camera':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'phone':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 mx-12" />
        {/* Progress line filled */}
        <div
          className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400 mx-12 transition-all duration-500"
          style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%`, maxWidth: 'calc(100% - 6rem)' }}
        />

        {steps.map((s, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <div key={s.key} className="flex flex-col items-center relative z-10">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
                ${isCompleted
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-900/50'
                  : isActive
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/50 scale-110'
                    : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600'
                }
              `}>
                <StepIcon type={s.icon} active={isActive} completed={isCompleted} />
              </div>
              <span className={`
                mt-3 text-xs font-semibold tracking-wide uppercase transition-colors
                ${isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}
              `}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderReviewInfo = () => (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Personal Information
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Please confirm your details match your official ID document
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">Why do we need this?</p>
            <p className="text-blue-700 dark:text-blue-300 mt-0.5">
              Your information will be matched with your ID card to verify your identity securely.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputField label="First Name" required>
          <input
            type="text"
            value={userInfo.firstName}
            onChange={(e) => handleInfoChange('firstName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all"
            placeholder="Enter first name"
          />
        </InputField>

        <InputField label="Last Name" required>
          <input
            type="text"
            value={userInfo.lastName}
            onChange={(e) => handleInfoChange('lastName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all"
            placeholder="Enter last name"
          />
        </InputField>
      </div>

      <InputField label="Phone Number" required hint={providerHint}>
        <div className="flex">
          <div className="flex items-center px-4 border border-r-0 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded-l-xl">
            <span className="text-gray-600 dark:text-gray-300 font-medium">+232</span>
          </div>
          <input
            type="tel"
            value={userInfo.phoneNumber.replace('+232', '').replace(/^232/, '')}
            onChange={(e) => handleInfoChange('phoneNumber', e.target.value)}
            placeholder="76 123 456"
            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-r-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all"
          />
        </div>
      </InputField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputField label="Date of Birth">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={dobDay}
              onChange={(e) => setDobDay(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all appearance-none cursor-pointer text-center"
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={String(day).padStart(2, '0')}>{day}</option>
              ))}
            </select>
            <select
              value={dobMonth}
              onChange={(e) => setDobMonth(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all appearance-none cursor-pointer text-center"
            >
              <option value="">Month</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                <option key={month} value={String(i + 1).padStart(2, '0')}>{month}</option>
              ))}
            </select>
            <select
              value={dobYear}
              onChange={(e) => setDobYear(e.target.value)}
              className="w-full px-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all appearance-none cursor-pointer text-center"
            >
              <option value="">Year</option>
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
          </div>
        </InputField>

        <InputField label="Gender">
          <select
            value={userInfo.gender}
            onChange={(e) => handleInfoChange('gender', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all appearance-none cursor-pointer"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </InputField>
      </div>

      <InputField label="Address">
        <input
          type="text"
          value={userInfo.address}
          onChange={(e) => handleInfoChange('address', e.target.value)}
          placeholder="Enter your residential address"
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all"
        />
      </InputField>

      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <label className="flex items-start space-x-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={infoConfirmed}
            onChange={(e) => setInfoConfirmed(e.target.checked)}
            className="mt-0.5 w-5 h-5 text-blue-600 rounded-md border-gray-300 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
            I confirm that the information provided above is accurate and matches my official identification documents
          </span>
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <button
        onClick={() => {
          if (!userInfo.firstName || !userInfo.lastName || !userInfo.phoneNumber) {
            setError('Please fill in all required fields');
            return;
          }
          if (!infoConfirmed) {
            setError('Please confirm that your information is correct');
            return;
          }
          setError(null);
          setStep('id-scan');
        }}
        disabled={!infoConfirmed}
        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:shadow-none flex items-center justify-center space-x-2"
      >
        <span>Continue to ID Upload</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </button>
    </div>
  );

  const renderIdScan = () => (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Scan ID Document
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Position your Sierra Leone National ID card within the frame
        </p>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Error */}
      {cameraError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-red-700 dark:text-red-300">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captured Image Preview */}
      {idCardPreview ? (
        <div className="space-y-4">
          <div className="relative">
            <div className="rounded-2xl overflow-hidden border-4 border-emerald-500 shadow-lg shadow-emerald-500/20">
              {idCardPreview.startsWith('data:image') ? (
                <img
                  src={idCardPreview}
                  alt="ID Card Preview"
                  className="w-full h-auto min-h-[200px] object-contain bg-gray-100 dark:bg-gray-800"
                  onError={(e) => {
                    console.error('Image failed to load, data URL starts with:', idCardPreview?.substring(0, 100));
                    console.error('Full data URL length:', idCardPreview?.length);
                  }}
                  onLoad={() => {
                    console.log('Preview image loaded successfully');
                  }}
                />
              ) : (
                <div className="w-full h-[200px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <div className="text-center p-4">
                    <svg className="w-12 h-12 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-600 dark:text-red-400">Invalid image data</p>
                    <button onClick={retakePhoto} className="mt-2 text-sm text-blue-600 underline">Try again</button>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-white">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Image captured ({Math.round((idCardPreview?.length || 0) / 1024)}KB)</span>
                </div>
                <button
                  onClick={retakePhoto}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Retake
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ID Card Sample Reference - show when camera not started */}
          {!cameraActive && !cameraError && (
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-600">
                <img
                  src="/images/sl-national-id.jpg"
                  alt="Sierra Leone National ID Card Sample"
                  className="w-full h-auto"
                />
              </div>
              <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                Your ID card should look similar to this
              </p>
            </div>
          )}

          {/* Hidden video element - used for initial stream connection */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'fixed',
              top: -9999,
              left: -9999,
              width: 640,
              height: 480,
              visibility: 'hidden'
            }}
          />

          {/* Camera View */}
          {cameraActive && streamRef.current && (
            <div className="relative">
              {/* Video container with overlay */}
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl">
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={(el) => {
                    if (el) {
                      displayVideoRef.current = el;
                      if (streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }
                  }}
                  className="w-full h-auto min-h-[300px] object-cover"
                />

                {/* ID Card alignment overlay - larger area for close-up scanning */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Dark overlay with transparent card area */}
                  <div className="absolute inset-0 bg-black/30" />
                  <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                               w-[95%] h-[75%] border-2 border-white/60 rounded-lg bg-transparent"
                    style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }}
                  >
                    {/* Corner markers - smaller for less obstruction */}
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl" />
                    <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br" />

                    {/* Scanning guide text */}
                    <div className="absolute top-2 left-0 right-0 text-center">
                      <span className="text-white/80 text-xs font-medium bg-black/40 px-2 py-1 rounded">
                        Align ID card to fill this area
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto-capture countdown overlay */}
                {autoCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-emerald-500/90 flex items-center justify-center animate-pulse">
                      <span className="text-4xl font-bold text-white">{captureCountdown}</span>
                    </div>
                  </div>
                )}

                {/* Scanning message */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div className={`px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium ${
                    autoCapturing
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : qualityCheck.overall === 'ready'
                      ? 'bg-emerald-500/80 text-white'
                      : 'bg-black/60 text-white'
                  }`}>
                    {autoCapturing ? `Capturing in ${captureCountdown}...` : scanningMessage}
                  </div>
                </div>
              </div>

              {/* Quality indicators */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className={`p-3 rounded-xl text-center ${
                  qualityCheck.brightness === 'good'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : qualityCheck.brightness === 'checking'
                    ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                }`}>
                  <div className={`w-6 h-6 mx-auto mb-1 ${
                    qualityCheck.brightness === 'good' ? 'text-emerald-500' :
                    qualityCheck.brightness === 'checking' ? 'text-gray-400' : 'text-amber-500'
                  }`}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className={`text-xs font-medium ${
                    qualityCheck.brightness === 'good' ? 'text-emerald-700 dark:text-emerald-300' :
                    qualityCheck.brightness === 'checking' ? 'text-gray-500' : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {qualityCheck.brightness === 'good' ? 'Good light' :
                     qualityCheck.brightness === 'too_dark' ? 'Too dark' :
                     qualityCheck.brightness === 'too_bright' ? 'Too bright' : 'Checking...'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl text-center ${
                  qualityCheck.blur === 'sharp'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : qualityCheck.blur === 'checking'
                    ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                }`}>
                  <div className={`w-6 h-6 mx-auto mb-1 ${
                    qualityCheck.blur === 'sharp' ? 'text-emerald-500' :
                    qualityCheck.blur === 'checking' ? 'text-gray-400' : 'text-amber-500'
                  }`}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <span className={`text-xs font-medium ${
                    qualityCheck.blur === 'sharp' ? 'text-emerald-700 dark:text-emerald-300' :
                    qualityCheck.blur === 'checking' ? 'text-gray-500' : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {qualityCheck.blur === 'sharp' ? 'Sharp' :
                     qualityCheck.blur === 'blurry' ? 'Blurry' : 'Checking...'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl text-center ${
                  qualityCheck.alignment === 'aligned'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : qualityCheck.alignment === 'checking'
                    ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                }`}>
                  <div className={`w-6 h-6 mx-auto mb-1 ${
                    qualityCheck.alignment === 'aligned' ? 'text-emerald-500' :
                    qualityCheck.alignment === 'checking' ? 'text-gray-400' : 'text-amber-500'
                  }`}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                  </div>
                  <span className={`text-xs font-medium ${
                    qualityCheck.alignment === 'aligned' ? 'text-emerald-700 dark:text-emerald-300' :
                    qualityCheck.alignment === 'checking' ? 'text-gray-500' : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {qualityCheck.alignment === 'aligned' ? 'Aligned' :
                     qualityCheck.alignment === 'misaligned' ? 'Adjust card' : 'Checking...'}
                  </span>
                </div>
              </div>

              {/* Status message */}
              <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {autoCapturing
                  ? 'Auto-capturing - hold steady!'
                  : qualityCheck.overall === 'ready'
                  ? 'All checks passed - auto-capturing soon...'
                  : 'Adjust position until all checks pass'}
              </p>
            </div>
          )}

          {/* Start camera button (if camera not active and no error) */}
          {!cameraActive && !cameraError && (
            <button
              onClick={startCamera}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Start Camera to Scan ID</span>
            </button>
          )}
        </>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex space-x-3 pt-2">
        <button
          onClick={() => {
            stopCamera();
            setStep('review-info');
          }}
          className="flex-1 py-3.5 px-4 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (!idCardBase64) {
              setError('Please scan your ID card');
              return;
            }
            setError(null);
            setStep('selfie-capture');
          }}
          disabled={!idCardBase64}
          className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:shadow-none flex items-center justify-center space-x-2"
        >
          <span>Continue</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </div>
  );

  const renderSelfieCapture = () => (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Take a Selfie
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Look at the camera and hold still for 5 seconds
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">Face verification</p>
            <p className="text-blue-700 dark:text-blue-300 mt-0.5">
              This helps us verify you are the same person as on your ID card.
            </p>
          </div>
        </div>
      </div>

      {/* Camera Error */}
      {cameraError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-red-700 dark:text-red-300">{cameraError}</p>
              <button
                onClick={startSelfieCamera}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liveness Progress Bar */}
      {selfieCameraActive && livenessStep !== 'ready' && livenessStep !== 'complete' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Liveness Check</span>
            <span className="text-sm font-medium text-blue-600">{livenessProgress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${livenessProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className={livenessConfirmed.lookLeft ? 'text-green-600' : 'text-gray-400'}>
              {livenessConfirmed.lookLeft ? '✓' : '○'} Turn Left
            </span>
            <span className={livenessConfirmed.lookRight ? 'text-green-600' : 'text-gray-400'}>
              {livenessConfirmed.lookRight ? '✓' : '○'} Turn Right
            </span>
            <span className={livenessConfirmed.openMouth ? 'text-green-600' : 'text-gray-400'}>
              {livenessConfirmed.openMouth ? '✓' : '○'} Open Mouth
            </span>
          </div>
        </div>
      )}

      {/* Selfie Preview */}
      {selfiePreview ? (
        <div className="space-y-4">
          <div className="relative">
            <div className="rounded-2xl overflow-hidden border-4 border-emerald-500 shadow-lg shadow-emerald-500/20">
              <img
                src={selfiePreview}
                alt="Selfie Preview"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-white">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Liveness verified</span>
                </div>
                <button
                  onClick={retakeSelfie}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Retake
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Selfie Camera View */}
          {selfieCameraActive && selfieStreamRef.current && (
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl">
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={(el) => {
                    if (el) {
                      selfieVideoRef.current = el;
                      if (selfieStreamRef.current && el.srcObject !== selfieStreamRef.current) {
                        el.srcObject = selfieStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }
                  }}
                  className="w-full h-auto min-h-[300px] object-cover scale-x-[-1]"
                />

                {/* Face oval guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={`relative w-48 h-64 border-4 rounded-full transition-colors duration-300 ${
                    livenessStep === 'recording' ? 'border-green-400 animate-pulse' :
                    livenessStep !== 'ready' ? 'border-blue-400' : 'border-white/60'
                  }`}>
                    <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
                  </div>
                </div>

                {/* Liveness instruction arrows */}
                {livenessStep === 'look_left' && (
                  <div className="absolute inset-0 flex items-center justify-start pl-4 pointer-events-none">
                    <div className="animate-pulse">
                      <svg className="w-16 h-16 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
                      </svg>
                    </div>
                  </div>
                )}
                {livenessStep === 'look_right' && (
                  <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none">
                    <div className="animate-pulse">
                      <svg className="w-16 h-16 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                      </svg>
                    </div>
                  </div>
                )}
                {livenessStep === 'open_mouth' && (
                  <div className="absolute inset-0 flex items-end justify-center pb-24 pointer-events-none">
                    <div className="animate-bounce text-4xl">👄</div>
                  </div>
                )}

                {/* Recording indicator */}
                {livenessStep === 'recording' && (
                  <div className="absolute top-4 left-0 right-0 flex justify-center">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-red-500 rounded-full animate-pulse">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                      <span className="text-white font-medium text-sm">Capturing...</span>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div className={`px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium ${
                    livenessStep === 'recording' ? 'bg-green-500 text-white' :
                    livenessStep !== 'ready' ? 'bg-blue-500 text-white' : 'bg-black/60 text-white'
                  }`}>
                    {livenessStep === 'ready' && 'Position your face in the oval and tap Start'}
                    {livenessStep === 'look_left' && '← Turn your head LEFT, then tap Done'}
                    {livenessStep === 'look_right' && 'Turn your head RIGHT, then tap Done →'}
                    {livenessStep === 'open_mouth' && 'Open and close your mouth, then tap Done'}
                    {livenessStep === 'recording' && 'Hold still... Capturing photo'}
                  </div>
                </div>
              </div>

              {/* Action buttons based on liveness step */}
              <div className="mt-4 space-y-3">
                {livenessStep === 'ready' && (
                  <button
                    onClick={startLivenessCheck}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Start Liveness Check</span>
                  </button>
                )}

                {(livenessStep === 'look_left' || livenessStep === 'look_right' || livenessStep === 'open_mouth') && (
                  <button
                    onClick={confirmLivenessStep}
                    className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Done - Next Step</span>
                  </button>
                )}

                {livenessStep === 'recording' && (
                  <div className="w-full py-4 px-6 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold rounded-xl flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Start camera button (if camera not active and no error) */}
          {!selfieCameraActive && !cameraError && (
            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                We'll guide you through a quick liveness check to verify you're a real person
              </p>
              <button
                onClick={startSelfieCamera}
                className="py-4 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                Start Camera
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex space-x-3 pt-2">
        <button
          onClick={() => {
            stopSelfieCamera();
            setStep('id-scan');
          }}
          className="flex-1 py-3.5 px-4 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (!selfieBase64) {
              setError('Please take a selfie');
              return;
            }
            setError(null);
            setStep('phone-verify');
          }}
          disabled={!selfieBase64}
          className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:shadow-none flex items-center justify-center space-x-2"
        >
          <span>Continue</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </div>
  );

  const renderPhoneVerify = () => (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Verify Phone Number
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          We'll verify your phone is registered to you through your mobile provider
        </p>
      </div>

      {/* Phone display card */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              provider === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
              provider === 'africell' ? 'bg-blue-100 dark:bg-blue-900/30' :
              provider === 'qcell' ? 'bg-purple-100 dark:bg-purple-900/30' :
              'bg-gray-100 dark:bg-gray-700'
            }`}>
              <svg className={`w-6 h-6 ${
                provider === 'orange' ? 'text-orange-600' :
                provider === 'africell' ? 'text-blue-600' :
                provider === 'qcell' ? 'text-purple-600' :
                'text-gray-500'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Phone Number</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
                {normalizeSLPhoneNumber(userInfo.phoneNumber)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            {provider && provider !== 'unknown' && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                provider === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                provider === 'africell' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
              }`}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </span>
            )}
            {phoneVerified && (
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium">Verified</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SIM Name Match */}
      {simName && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800/50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-medium">SIM Registered To</p>
              <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{simName}</p>
            </div>
          </div>
        </div>
      )}

      {/* OTP Input */}
      {otpRequestId && !phoneVerified && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Enter the 6-digit code sent to your phone
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono font-bold border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 transition-all"
          />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex space-x-3 pt-2">
        <button
          onClick={() => setStep('id-scan')}
          className="flex-1 py-3.5 px-4 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Back
        </button>

        {!phoneVerified && !otpRequestId && (
          <button
            onClick={handleVerifyPhone}
            disabled={loading}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:shadow-none flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Verify Phone'
            )}
          </button>
        )}

        {otpRequestId && !phoneVerified && (
          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all"
          >
            {loading ? 'Verifying...' : 'Confirm Code'}
          </button>
        )}

        {phoneVerified && (
          <button
            onClick={handleSubmitVerification}
            disabled={loading}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:shadow-none flex items-center justify-center space-x-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                <span>Complete Verification</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center py-12">
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900/30" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
        <div className="absolute inset-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Verifying Your Identity
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
        Please wait while we process your documents and verify your information
      </p>

      <div className="max-w-sm mx-auto space-y-3">
        {['Processing ID card', 'Extracting information', 'Matching records'].map((text, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="text-center py-6">
      {result?.verified || status?.overallVerified ? (
        <>
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verification Complete!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
            Your identity has been verified. You now have full access to all features.
          </p>

          {result?.nin && (
            <div className="inline-block mb-6 px-6 py-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium mb-1">Your NIN</p>
              <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                {result.nin}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Unlimited Transfers' },
              { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Virtual Cards' },
              { icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', label: 'Withdrawals' },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                <svg className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{item.label}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Submission Received!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-xs mx-auto">
            Your verification documents have been submitted successfully.
          </p>

          {/* Waiting period notice */}
          <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-100 dark:border-blue-800 rounded-2xl max-w-sm mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-semibold text-blue-800 dark:text-blue-200">Review in Progress</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
              Our team will review your documents within <strong>1 business day</strong>.
              You'll receive a notification once your verification is complete.
            </p>
          </div>

          {/* What happens next */}
          <div className="mb-6 max-w-sm mx-auto text-left">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">What happens next:</p>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Our team reviews your ID and selfie</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">We verify your phone number matches your ID</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">You'll get a notification with your verified badge</p>
              </div>
            </div>
          </div>

          {result?.issues && result.issues.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-left max-w-sm mx-auto">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">Notes:</p>
              <ul className="space-y-1">
                {result.issues.map((issue, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-amber-700 dark:text-amber-300">
                    <span className="text-amber-500 mt-1">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <button
        onClick={() => navigate('/dashboard')}
        className="w-full max-w-sm mx-auto py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25"
      >
        {result?.verified || status?.overallVerified ? 'Go to Dashboard' : 'Done'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen py-8 px-4 flex flex-col">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Identity Verification
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Complete verification to unlock all features
            </p>
          </div>

          {/* Step indicator */}
          {step !== 'processing' && step !== 'result' && renderStepIndicator()}

          {/* Main content card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 p-6 sm:p-8 flex-1">
            {step === 'review-info' && renderReviewInfo()}
            {step === 'id-scan' && renderIdScan()}
            {step === 'selfie-capture' && renderSelfieCapture()}
            {step === 'phone-verify' && renderPhoneVerify()}
            {step === 'processing' && renderProcessing()}
            {step === 'result' && renderResult()}
          </div>

          {/* Help text */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Need help? <a href="/support" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
