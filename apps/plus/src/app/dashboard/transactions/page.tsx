"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Calendar,
  RefreshCw,
} from "lucide-react";

// Types
interface Transaction {
  id: string;
  type: "credit" | "debit";
  category: "payment" | "withdrawal" | "refund" | "invoice" | "subscription" | "card" | "transfer";
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  description: string;
  reference: string;
  status: "completed" | "pending" | "failed" | "cancelled";
  customer?: {
    name: string;
    email: string;
  };
  metadata?: Record<string, string>;
  createdAt: string;
}

// Mock data
const mockTransactions: Transaction[] = [
  {
    id: "txn_001",
    type: "credit",
    category: "payment",
    amount: 500000,
    fee: 10000,
    netAmount: 490000,
    currency: "SLE",
    description: "Payment from Customer A",
    reference: "TXN-001234",
    status: "completed",
    customer: { name: "John Doe", email: "john@example.com" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "txn_002",
    type: "debit",
    category: "withdrawal",
    amount: 250000,
    fee: 5000,
    netAmount: 255000,
    currency: "SLE",
    description: "Payout to Bank Account",
    reference: "TXN-001233",
    status: "completed",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "txn_003",
    type: "credit",
    category: "invoice",
    amount: 1200000,
    fee: 24000,
    netAmount: 1176000,
    currency: "SLE",
    description: "Invoice #INV-0042 paid",
    reference: "TXN-001232",
    status: "completed",
    customer: { name: "Acme Corp", email: "billing@acme.com" },
    metadata: { invoiceId: "INV-0042" },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "txn_004",
    type: "credit",
    category: "subscription",
    amount: 150000,
    fee: 3000,
    netAmount: 147000,
    currency: "SLE",
    description: "Monthly Subscription - Premium Plan",
    reference: "TXN-001231",
    status: "pending",
    customer: { name: "Jane Smith", email: "jane@example.com" },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "txn_005",
    type: "debit",
    category: "card",
    amount: 45000,
    fee: 0,
    netAmount: 45000,
    currency: "SLE",
    description: "Employee Card - Office Supplies",
    reference: "TXN-001230",
    status: "completed",
    metadata: { cardHolder: "Mike Johnson", cardLast4: "4532" },
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "txn_006",
    type: "debit",
    category: "refund",
    amount: 75000,
    fee: 0,
    netAmount: 75000,
    currency: "SLE",
    description: "Refund for Invoice #INV-0038",
    reference: "TXN-001229",
    status: "completed",
    customer: { name: "Bob Wilson", email: "bob@example.com" },
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "txn_007",
    type: "credit",
    category: "transfer",
    amount: 2000000,
    fee: 0,
    netAmount: 2000000,
    currency: "SLE",
    description: "Internal Transfer from Main Wallet",
    reference: "TXN-001228",
    status: "failed",
    createdAt: new Date(Date.now() - 345600000).toISOString(),
  },
];

function formatCurrency(amount: number, _currency: string = "SLE") {
  return `NLe ${new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-SL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusColors = {
  completed: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-800",
  failed: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const statusIcons = {
  completed: CheckCircle,
  pending: Clock,
  failed: XCircle,
  cancelled: AlertCircle,
};

const categoryLabels: Record<string, string> = {
  payment: "Payment",
  withdrawal: "Withdrawal",
  refund: "Refund",
  invoice: "Invoice",
  subscription: "Subscription",
  card: "Card",
  transfer: "Transfer",
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.customer?.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || tx.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  const totalCredits = filteredTransactions
    .filter((tx) => tx.type === "credit" && tx.status === "completed")
    .reduce((sum, tx) => sum + tx.netAmount, 0);

  const totalDebits = filteredTransactions
    .filter((tx) => tx.type === "debit" && tx.status === "completed")
    .reduce((sum, tx) => sum + tx.netAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage all your payment transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{formatCurrency(totalCredits)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter((tx) => tx.type === "credit").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatCurrency(totalDebits)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter((tx) => tx.type === "debit").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalCredits - totalDebits >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalCredits - totalDebits >= 0 ? "+" : ""}
              {formatCurrency(totalCredits - totalDebits)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.length} total transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, reference, or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credits</SelectItem>
                <SelectItem value="debit">Debits</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => {
                  const StatusIcon = statusIcons[tx.status];
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              tx.type === "credit" ? "bg-green-100" : "bg-red-100"
                            }`}
                          >
                            {tx.type === "credit" ? (
                              <ArrowDownLeft className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tx.description}</p>
                            <button
                              onClick={() => copyToClipboard(tx.reference)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              {tx.reference}
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabels[tx.category]}</Badge>
                      </TableCell>
                      <TableCell>
                        {tx.customer ? (
                          <div>
                            <p className="text-sm font-medium">{tx.customer.name}</p>
                            <p className="text-xs text-muted-foreground">{tx.customer.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === "credit" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "credit" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {tx.fee > 0 ? formatCurrency(tx.fee) : "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === "credit" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "credit" ? "+" : "-"}
                        {formatCurrency(tx.netAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[tx.status]}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(tx.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy ID
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {tx.category === "invoice" && tx.metadata?.invoiceId && (
                              <DropdownMenuItem>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Invoice
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
