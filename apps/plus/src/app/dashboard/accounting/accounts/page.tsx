"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Edit, Scale } from "lucide-react";

const accountTypes = [
  { id: "asset", name: "Assets", color: "blue" },
  { id: "liability", name: "Liabilities", color: "orange" },
  { id: "equity", name: "Equity", color: "purple" },
  { id: "revenue", name: "Revenue", color: "green" },
  { id: "expense", name: "Expenses", color: "red" },
];

const mockAccounts = [
  // Assets
  { id: "1000", code: "1000", name: "Cash", type: "asset", subtype: "Current Asset", balance: 125000 },
  { id: "1100", code: "1100", name: "Accounts Receivable", type: "asset", subtype: "Current Asset", balance: 45000 },
  { id: "1200", code: "1200", name: "Inventory - Fuel", type: "asset", subtype: "Current Asset", balance: 85000 },
  { id: "1300", code: "1300", name: "Prepaid Expenses", type: "asset", subtype: "Current Asset", balance: 12000 },
  { id: "1500", code: "1500", name: "Equipment", type: "asset", subtype: "Fixed Asset", balance: 150000 },
  { id: "1600", code: "1600", name: "Vehicles", type: "asset", subtype: "Fixed Asset", balance: 75000 },

  // Liabilities
  { id: "2000", code: "2000", name: "Accounts Payable", type: "liability", subtype: "Current Liability", balance: 35000 },
  { id: "2100", code: "2100", name: "Salaries Payable", type: "liability", subtype: "Current Liability", balance: 18000 },
  { id: "2200", code: "2200", name: "Taxes Payable", type: "liability", subtype: "Current Liability", balance: 12000 },
  { id: "2500", code: "2500", name: "Long-term Loan", type: "liability", subtype: "Long-term Liability", balance: 100000 },

  // Equity
  { id: "3000", code: "3000", name: "Owner's Capital", type: "equity", subtype: "Equity", balance: 200000 },
  { id: "3100", code: "3100", name: "Retained Earnings", type: "equity", subtype: "Equity", balance: 127000 },

  // Revenue
  { id: "4000", code: "4000", name: "Fuel Sales", type: "revenue", subtype: "Operating Revenue", balance: 450000 },
  { id: "4100", code: "4100", name: "Service Revenue", type: "revenue", subtype: "Operating Revenue", balance: 35000 },
  { id: "4200", code: "4200", name: "Other Income", type: "revenue", subtype: "Non-Operating Revenue", balance: 8000 },

  // Expenses
  { id: "5000", code: "5000", name: "Cost of Goods Sold", type: "expense", subtype: "Direct Cost", balance: 280000 },
  { id: "5100", code: "5100", name: "Salaries Expense", type: "expense", subtype: "Operating Expense", balance: 85000 },
  { id: "5200", code: "5200", name: "Rent Expense", type: "expense", subtype: "Operating Expense", balance: 24000 },
  { id: "5300", code: "5300", name: "Utilities Expense", type: "expense", subtype: "Operating Expense", balance: 12000 },
  { id: "5400", code: "5400", name: "Depreciation Expense", type: "expense", subtype: "Operating Expense", balance: 18000 },
];

export default function ChartOfAccountsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAccountCode, setNewAccountCode] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SL", {
      style: "currency",
      currency: "SLE",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: "bg-blue-100 text-blue-700",
      liability: "bg-orange-100 text-orange-700",
      equity: "bg-purple-100 text-purple-700",
      revenue: "bg-green-100 text-green-700",
      expense: "bg-red-100 text-red-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  const getAccountsByType = (type: string) => {
    return mockAccounts.filter(a => a.type === type);
  };

  const getTotalByType = (type: string) => {
    return mockAccounts
      .filter(a => a.type === type)
      .reduce((sum, a) => sum + a.balance, 0);
  };

  const handleCreateAccount = () => {
    if (!newAccountCode || !newAccountName || !newAccountType) return;
    // In real implementation, this would save to the database
    setIsCreateDialogOpen(false);
    setNewAccountCode("");
    setNewAccountName("");
    setNewAccountType("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">
            Manage your account categories and balances
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Account</DialogTitle>
              <DialogDescription>
                Add a new account to your chart of accounts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountCode">Account Code</Label>
                  <Input
                    id="accountCode"
                    placeholder="e.g., 1000"
                    value={newAccountCode}
                    onChange={(e) => setNewAccountCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select value={newAccountType} onValueChange={setNewAccountType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="e.g., Cash on Hand"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAccount} disabled={!newAccountCode || !newAccountName || !newAccountType}>
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {accountTypes.map((type) => (
          <Card key={type.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{type.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatCurrency(getTotalByType(type.id))}</div>
              <p className="text-xs text-muted-foreground">
                {getAccountsByType(type.id).length} accounts
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>Organized by account type</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["asset", "liability", "equity", "revenue", "expense"]}>
            {accountTypes.map((type) => (
              <AccordionItem key={type.id} value={type.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Scale className="h-4 w-4" />
                    <span>{type.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {getAccountsByType(type.id).length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {getAccountsByType(type.id).map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm text-muted-foreground w-16">
                            {account.code}
                          </span>
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-xs text-muted-foreground">{account.subtype}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{formatCurrency(account.balance)}</span>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
