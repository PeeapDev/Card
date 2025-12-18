/**
 * Event Scanner Page
 *
 * QR code scanner for ticket validation at events.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import eventService, { Event, EventTicket, EventStaff } from '@/services/event.service';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ArrowLeft,
  QrCode,
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Hash,
  User,
  Ticket,
  RefreshCw,
} from 'lucide-react';

type ScanResult = 'idle' | 'scanning' | 'valid' | 'invalid' | 'already_used' | 'cancelled';

interface ScanHistory {
  id: string;
  ticketNumber: string;
  attendeeName?: string;
  result: ScanResult;
  timestamp: Date;
}

export function EventScannerPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>('idle');
  const [lastTicket, setLastTicket] = useState<EventTicket | null>(null);
  const [message, setMessage] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [validating, setValidating] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!eventId || !user?.id) return;

      setLoading(true);
      try {
        const eventData = await eventService.getEventById(eventId);
        setEvent(eventData);

        // Check if user is the event owner or a staff member
        if (eventData?.merchant_id === user.id) {
          // Owner can scan
          setStaffId(user.id);
        } else {
          // Check if user is staff
          const staffData = await eventService.getEventStaffByUserId(user.id);
          const eventStaff = staffData.find(
            (s) => s.event_id === eventId && s.invitation_status === 'accepted'
          );
          if (eventStaff) {
            setStaffId(eventStaff.id!);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      stopScanner();
    };
  }, [eventId, user]);

  const startScanner = async () => {
    if (!scannerContainerRef.current) return;

    try {
      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanFailure
      );

      setCameraActive(true);
      setScanning(true);
      setScanResult('scanning');
    } catch (error) {
      console.error('Error starting scanner:', error);
      alert('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setCameraActive(false);
    setScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    // Pause scanning while validating
    await stopScanner();
    await validateTicket(decodedText);
  };

  const onScanFailure = (error: any) => {
    // Ignore scan failures (no QR code detected)
  };

  const validateTicket = async (qrCode: string) => {
    if (!eventId || !staffId) return;

    setValidating(true);
    setScanResult('idle');

    try {
      const result = await eventService.scanTicket(qrCode, staffId, eventId);

      if (result.success) {
        setScanResult('valid');
        setLastTicket(result.ticket || null);
        setMessage(result.message);
        playSound('success');

        // Add to history
        setScanHistory((prev) => [
          {
            id: Date.now().toString(),
            ticketNumber: result.ticket?.ticket_number || qrCode,
            attendeeName: result.ticket?.attendee_name,
            result: 'valid',
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ]);
      } else {
        const resultType = result.message.includes('already used')
          ? 'already_used'
          : result.message.includes('cancelled')
          ? 'cancelled'
          : 'invalid';

        setScanResult(resultType);
        setLastTicket(result.ticket || null);
        setMessage(result.message);
        playSound('error');

        setScanHistory((prev) => [
          {
            id: Date.now().toString(),
            ticketNumber: result.ticket?.ticket_number || qrCode,
            attendeeName: result.ticket?.attendee_name,
            result: resultType,
            timestamp: new Date(),
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (error) {
      console.error('Error validating ticket:', error);
      setScanResult('invalid');
      setMessage('Error validating ticket');
      playSound('error');
    } finally {
      setValidating(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    await validateTicket(manualInput.trim());
    setManualInput('');
  };

  const playSound = (type: 'success' | 'error') => {
    try {
      const audio = new Audio(
        type === 'success'
          ? 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleR0DQ5zZ3qhtGwU9mNfeoX0fBz+a2dykaB4FM5bV3aSAIQk+mt3apGggBjOR0t2jgCMKP5zf3KBsIQY0k9HboIMiCD6b3dyibB8FMpHQ2p+DJAk+nN7dpG4eBzOS0tqfgyYKP5zd3aRvHwc0lNTan4QnCj+c3t2kcB8INZbV26CEKAs/nN/dpHAfCTaX19uhgiYKQJ3g3aNvHgk2l9fcoYQnCkCd4d2jbx4JNpfX3KGFKApAneDdo28eCTaY2NyhhigKQJ3h3aNvHgg2mNjcoYYoCkCd4d2jcB4INpjY3KGFKApAneDdo3AeCDaY2NyhhigKQJ3h3aNwHgg2l9fcoYUoCkCd4d2jbx4JNpjY3KGGKApAneDdo28eCDaY2NyhhigLQJ3g3aNwHwg2l9fcoYYpC0Cd4N2jbx4INpjY3KGGKQtAneHdo28eCDaY2NyhhikLQJ3g3aNwHwg2l9fcooYpCz+c4N2jcB8INpfX3KGGKQs/nN/dpHAfCDaX19uhhikLP5zf3aRwHwg2l9fboYYpCz+c392kcB8INpfX26KGKQs/nN/dpHAfCDaX19yihikLP5zf3aRwHwo2l9fcoYYpCz+c392kcCAKNpfX26GGKQs/nN/dpHAfCjaX19uhhinLP5zf3aRwHwo2l9fcoYYqzD+c392kcCAKNpfY3KGGKss/nN/dpHAgCjaX2Nyihirc'
          : 'data:audio/wav;base64,UklGRigDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQQDAAB/fH57e3p6eXl4eHd2dnZ1dXR0c3NycnFxcHBvb25ubW1tbGxramlpaGhnZ2ZmZWVkZGNjYmJhYWBgYF9fXl5dXVxcW1taWllZWFhXV1ZWVVVUVFNTUlJRUVBQT09OTk1NS0tKSklJR0dGRkVFRERDQ0JCQUA/Pz4+PT08PDs7Ojo5OTg4Nzc2NjU1NDQzMzIyMTEwMC8vLi4tLSwsKysqKikoKCgnJyYmJSUkJCMjIiIhISAgHx8eHh0dHBwbGxoaGRkYGBcXFhYVFRQUExMSEhEREBAP'
      );
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (error) {
      // Ignore audio errors
    }
  };

  const resetScanner = () => {
    setScanResult('idle');
    setLastTicket(null);
    setMessage('');
    startScanner();
  };

  const getResultStyles = () => {
    const styles: Record<ScanResult, { bg: string; icon: React.ReactNode; title: string }> = {
      idle: { bg: 'bg-gray-100', icon: <QrCode className="w-16 h-16" />, title: 'Ready to Scan' },
      scanning: {
        bg: 'bg-blue-100',
        icon: <Camera className="w-16 h-16 text-blue-600" />,
        title: 'Scanning...',
      },
      valid: {
        bg: 'bg-green-100',
        icon: <CheckCircle className="w-16 h-16 text-green-600" />,
        title: 'Valid Ticket!',
      },
      invalid: {
        bg: 'bg-red-100',
        icon: <XCircle className="w-16 h-16 text-red-600" />,
        title: 'Invalid Ticket',
      },
      already_used: {
        bg: 'bg-yellow-100',
        icon: <AlertTriangle className="w-16 h-16 text-yellow-600" />,
        title: 'Already Used',
      },
      cancelled: {
        bg: 'bg-red-100',
        icon: <XCircle className="w-16 h-16 text-red-600" />,
        title: 'Cancelled Ticket',
      },
    };
    return styles[scanResult] || styles.idle;
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!staffId) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You don't have permission to scan tickets for this event.
          </p>
          <Button onClick={() => navigate(`/merchant/events/${eventId}`)}>Back to Event</Button>
        </div>
      </MerchantLayout>
    );
  }

  const resultStyles = getResultStyles();

  return (
    <MerchantLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/merchant/events/${eventId}`)}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket Scanner</h1>
            <p className="text-gray-600 dark:text-gray-400">{event?.title}</p>
          </div>
        </div>

        {/* Scanner Area */}
        <Card className={`p-6 ${resultStyles.bg} dark:bg-opacity-20`}>
          {cameraActive ? (
            <div
              id="scanner-container"
              ref={scannerContainerRef}
              className="w-full aspect-square max-w-sm mx-auto rounded-lg overflow-hidden"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              {validating ? (
                <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
              ) : (
                resultStyles.icon
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-4">
                {validating ? 'Validating...' : resultStyles.title}
              </h2>
              {message && (
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-center">{message}</p>
              )}
            </div>
          )}

          {/* Last Ticket Info */}
          {lastTicket && !cameraActive && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-4">
                <Ticket className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {lastTicket.attendee_name || 'Guest'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ticket: {lastTicket.ticket_number}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4 mt-6">
            {cameraActive ? (
              <Button onClick={stopScanner} variant="outline" className="flex items-center gap-2">
                <CameraOff className="w-4 h-4" />
                Stop Camera
              </Button>
            ) : scanResult !== 'idle' && scanResult !== 'scanning' ? (
              <Button
                onClick={resetScanner}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="w-4 h-4" />
                Scan Next
              </Button>
            ) : (
              <Button
                onClick={startScanner}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Camera className="w-4 h-4" />
                Start Camera
              </Button>
            )}
          </div>
        </Card>

        {/* Manual Entry */}
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Manual Entry</h3>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                placeholder="Enter ticket number or QR code..."
              />
            </div>
            <Button
              type="submit"
              disabled={validating || !manualInput.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
            </Button>
          </form>
        </Card>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Recent Scans</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scanHistory.map((scan) => (
                <div
                  key={scan.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    scan.result === 'valid'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {scan.result === 'valid' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {scan.attendeeName || 'Guest'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{scan.ticketNumber}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {scan.timestamp.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </MerchantLayout>
  );
}
