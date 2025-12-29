/**
 * Merchant Statement Page
 *
 * Displays monthly merchant statements with:
 * - Summary (gross, fees, net)
 * - Charts (daily revenue, payment methods)
 * - Full transaction list with fee breakdown
 * - PDF download capability
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import {
  statementService,
  generateMerchantStatement,
  generatePDF,
  getMonthName,
  type MerchantStatementData,
} from '@/services/statement.service';
import {
  StatementHeader,
  StatementSummary,
  StatementCharts,
  StatementTransactionTable,
} from '@/components/statements';
import { Button } from '@/components/ui';
import {
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
} from 'lucide-react';

export function MerchantStatementPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statementData, setStatementData] = useState<MerchantStatementData | null>(null);
  const [availableMonths, setAvailableMonths] = useState<{ month: number; year: number }[]>([]);

  // Current selected month
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const statementRef = useRef<HTMLDivElement>(null);

  // Load available months
  useEffect(() => {
    async function loadAvailableMonths() {
      if (!business?.id) return;
      try {
        const months = await statementService.getAvailableStatementMonths(business.id);
        setAvailableMonths(months);
      } catch (err) {
        console.error('Error loading available months:', err);
      }
    }
    loadAvailableMonths();
  }, [business?.id]);

  // Load statement data
  useEffect(() => {
    async function loadStatement() {
      if (!business?.id) {
        setError('No business selected');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await generateMerchantStatement(
          business.id,
          selectedMonth,
          selectedYear
        );
        setStatementData(data);
      } catch (err: any) {
        console.error('Error loading statement:', err);
        setError(err.message || 'Failed to load statement');
      } finally {
        setLoading(false);
      }
    }

    loadStatement();
  }, [business?.id, selectedMonth, selectedYear]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
    if (isCurrentMonth) return; // Can't go to future

    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!statementData) return;

    setDownloading(true);
    try {
      const filename = `statement-${business?.name?.replace(/\s+/g, '-').toLowerCase()}-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
      await generatePDF('statement-content', filename);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Check if next month is available
  const now2 = new Date();
  const canGoNext = !(selectedMonth === now2.getMonth() + 1 && selectedYear === now2.getFullYear());

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading statement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">{error}</p>
          <p className="text-sm text-gray-500">Please select a business to view statements.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header with controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statements</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Monthly transaction reports with fee breakdown
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 min-w-[140px] text-center">
              <span className="font-medium text-gray-900 dark:text-white">
                {getMonthName(selectedMonth)} {selectedYear}
              </span>
            </div>
            <button
              onClick={goToNextMonth}
              disabled={!canGoNext}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Download button */}
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading || !statementData}
            className="flex items-center gap-2"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Quick month selector */}
      {availableMonths.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex gap-2">
            {availableMonths.slice(0, 6).map(({ month, year }) => (
              <button
                key={`${year}-${month}`}
                onClick={() => {
                  setSelectedMonth(month);
                  setSelectedYear(year);
                }}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${
                  month === selectedMonth && year === selectedYear
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {getMonthName(month).slice(0, 3)} {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Statement content - this is what gets converted to PDF */}
      <div
        id="statement-content"
        ref={statementRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 print:shadow-none print:border-none"
      >
        {statementData && (
          <>
            <StatementHeader
              type="merchant"
              name={statementData.merchant.name}
              email={statementData.merchant.email}
              phone={statementData.merchant.phone}
              month={selectedMonth}
              year={selectedYear}
              generatedAt={statementData.generatedAt}
            />

            <StatementSummary summary={statementData.summary} />

            <StatementCharts
              dailyRevenue={statementData.dailyRevenue}
              paymentMethods={statementData.paymentMethods}
            />

            <StatementTransactionTable
              transactions={statementData.transactions}
              showFees={true}
            />

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500">
              <p>This statement was generated by Peeap Payment Platform</p>
              <p>For questions, contact support@peeap.com</p>
            </div>
          </>
        )}

        {!statementData && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No transactions found for {getMonthName(selectedMonth)} {selectedYear}
            </p>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #statement-content, #statement-content * {
            visibility: visible;
          }
          #statement-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default MerchantStatementPage;
