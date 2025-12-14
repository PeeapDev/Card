"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Building2,
} from "lucide-react";

// Types
interface WalletData {
  balance: number;
  pendingIn: number;
  pendingOut: number;
  currency: string;
  lastUpdated: string;
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  reference: string;
  status: "completed" | "pending" | "failed";
  createdAt: string;
}

// Mock data - Using New Leone (NLe) amounts
const mockWallet: WalletData = {
  balance: 2500,       // NLe 2,500
  pendingIn: 350,      // NLe 350
  pendingOut: 75,      // NLe 75
  currency: "SLE",
  lastUpdated: new Date().toISOString(),
};

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "credit",
    amount: 500,       // NLe 500
    description: "Payment from Customer A",
    reference: "TXN-001234",
    status: "completed",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    type: "debit",
    amount: 250,       // NLe 250
    description: "Payout to Supplier B",
    reference: "TXN-001233",
    status: "completed",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    type: "credit",
    amount: 1200,      // NLe 1,200
    description: "Invoice #INV-0042 paid",
    reference: "TXN-001232",
    status: "completed",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "4",
    type: "credit",
    amount: 150,       // NLe 150
    description: "Subscription payment",
    reference: "TXN-001231",
    status: "pending",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "5",
    type: "debit",
    amount: 45,        // NLe 45
    description: "Card purchase - Office Supplies",
    reference: "TXN-001230",
    status: "completed",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

// Format currency using New Leone (NLe)
function formatCurrency(amount: number, _currency: string = "SLE") {
  return `NLe ${new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-SL", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData>(mockWallet);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleWithdraw = () => {
    // TODO: Implement actual withdraw logic
    console.log("Withdrawing:", withdrawAmount);
    setIsWithdrawOpen(false);
    setWithdrawAmount("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const StatusIcon = ({ status }: { status: Transaction["status"] }) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">
            Manage your business wallet and funds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              {formatCurrency(wallet.balance, wallet.currency)}
            </div>
            <div className="flex gap-3">
              <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    Withdraw
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Withdraw Funds</DialogTitle>
                    <DialogDescription>
                      Transfer funds to your linked bank account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Available balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(wallet.balance)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount to withdraw</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          SLE
                        </span>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="pl-12"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount(Math.floor(wallet.balance * 0.25).toString())}
                      >
                        25%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount(Math.floor(wallet.balance * 0.5).toString())}
                      >
                        50%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount(Math.floor(wallet.balance * 0.75).toString())}
                      >
                        75%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWithdrawAmount(wallet.balance.toString())}
                      >
                        Max
                      </Button>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleWithdraw}
                      disabled={!withdrawAmount || parseFloat(withdrawAmount) > wallet.balance}
                    >
                      Withdraw {withdrawAmount && formatCurrency(parseFloat(withdrawAmount))}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="secondary" className="gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Fund Wallet
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Pending In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{formatCurrency(wallet.pendingIn)}
              </div>
              <p className="text-xs text-muted-foreground">Expected within 24h</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Pending Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                -{formatCurrency(wallet.pendingOut)}
              </div>
              <p className="text-xs text-muted-foreground">Processing withdrawals</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{formatCurrency(2450000)}</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> 12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(15750000)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(13250000)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest wallet activity</CardDescription>
            </div>
            <Button variant="outline" asChild>
              <a href="/dashboard/transactions">View All</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    tx.type === "credit" ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {tx.type === "credit" ? (
                    <ArrowDownLeft className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <StatusIcon status={tx.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(tx.createdAt)}</span>
                    <span>|</span>
                    <button
                      onClick={() => copyToClipboard(tx.reference)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {tx.reference}
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div
                  className={`text-sm font-bold ${
                    tx.type === "credit" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.type === "credit" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Linked Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>Bank accounts and cards for withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Sierra Leone Commercial Bank</p>
                <p className="text-sm text-muted-foreground">****4532</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Default
              </Badge>
            </div>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <CreditCard className="h-6 w-6" />
              <span>Add Bank Account</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
